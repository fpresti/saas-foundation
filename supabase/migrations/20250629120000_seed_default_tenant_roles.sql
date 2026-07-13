-- V11: Default tenant roles (admin, member, guest) + seed on tenant create.
-- V17: Invitations always member_type = member.
-- accept_invitation assigns default member role.

create or replace function public.seed_default_tenant_roles(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_admin_id uuid;
  v_member_id uuid;
  v_guest_id uuid;
begin
  if exists (select 1 from public.roles r where r.tenant_id = p_tenant_id limit 1) then
    return;
  end if;

  insert into public.roles (tenant_id, code, name, description, is_system)
  values (p_tenant_id, 'admin', 'Administrator', 'Day-to-day tenant administration', true)
  returning id into v_admin_id;

  insert into public.roles (tenant_id, code, name, description, is_system)
  values (p_tenant_id, 'member', 'Member', 'Standard collaborator', true)
  returning id into v_member_id;

  insert into public.roles (tenant_id, code, name, description, is_system)
  values (p_tenant_id, 'guest', 'Guest', 'Read-only viewer', true)
  returning id into v_guest_id;

  insert into public.role_permissions (role_id, permission_id)
  select v_admin_id, p.id
  from public.permissions p
  where p.code in (
    'profile.self.read',
    'profile.self.update',
    'tenant.members.read',
    'tenant.members.invite',
    'tenant.members.update',
    'tenant.members.delete',
    'tenant.roles.read',
    'tenant.roles.assign',
    'tenant.settings.read',
    'tenant.settings.update',
    'subscription.read'
  )
  on conflict do nothing;

  insert into public.role_permissions (role_id, permission_id)
  select v_member_id, p.id
  from public.permissions p
  where p.code in (
    'profile.self.read',
    'profile.self.update',
    'tenant.members.read',
    'tenant.settings.read',
    'subscription.read'
  )
  on conflict do nothing;

  insert into public.role_permissions (role_id, permission_id)
  select v_guest_id, p.id
  from public.permissions p
  where p.code in (
    'profile.self.read',
    'profile.self.update',
    'tenant.settings.read'
  )
  on conflict do nothing;
end;
$$;

comment on function public.seed_default_tenant_roles(uuid) is
  'Idempotent: creates admin, member, guest system roles with default permissions for a tenant.';

-- Backfill existing tenants
do $$
declare
  r record;
begin
  for r in select t.id from public.tenants t
  loop
    perform public.seed_default_tenant_roles(r.id);
  end loop;
end;
$$;

create or replace function public.create_tenant_with_owner(
  p_tenant_name text,
  p_slug text,
  p_tax_id text,
  p_plan_name text default 'free'
)
returns table (tenant_id uuid, plan_id uuid)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_tenant_id uuid;
  v_plan_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_plan_id
  from public.plans
  where name = p_plan_name;

  if v_plan_id is null then
    raise exception 'Plan not found: %', p_plan_name;
  end if;

  insert into public.tenants (name, slug, tax_id)
  values (p_tenant_name, p_slug, p_tax_id)
  returning id into v_tenant_id;

  insert into public.subscriptions (tenant_id, plan_id, status, started_at)
  values (v_tenant_id, v_plan_id, 'active', now());

  insert into public.tenant_members (tenant_id, user_id, member_type)
  values (v_tenant_id, auth.uid(), 'owner');

  perform public.seed_default_tenant_roles(v_tenant_id);

  insert into public.profiles (user_id, default_tenant_id, last_tenant_id)
  values (auth.uid(), v_tenant_id, v_tenant_id)
  on conflict (user_id) do update
  set default_tenant_id = excluded.default_tenant_id,
      last_tenant_id = excluded.last_tenant_id,
      updated_at = now();

  tenant_id := v_tenant_id;
  plan_id := v_plan_id;
  return next;
end;
$$;

create or replace function public.create_invitation(
  p_tenant_id uuid,
  p_email text,
  p_member_type text default 'member',
  p_expires_in_hours integer default 72
)
returns table (
  invitation_id uuid,
  tenant_id uuid,
  email text,
  member_type text,
  token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_token text;
  v_token_hash text;
  v_expires_at timestamptz;
  v_inv_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_expires_in_hours is null or p_expires_in_hours <= 0 or p_expires_in_hours > 24 * 30 then
    raise exception 'Invalid expires_in_hours';
  end if;

  if not (
    public.is_super_admin()
    or public.has_permission(p_tenant_id, 'tenant.members.invite')
  ) then
    raise exception 'Not allowed';
  end if;

  if exists (
    select 1
    from public.tenant_members tm
    join auth.users u on u.id = tm.user_id
    where tm.tenant_id = p_tenant_id
      and lower(u.email) = lower(p_email)
  ) then
    raise exception 'User already belongs to this tenant';
  end if;

  v_token := public.generate_token();
  v_token_hash := public.hash_token(v_token);
  v_expires_at := now() + make_interval(hours => p_expires_in_hours);

  insert into public.invitations (
    tenant_id,
    email,
    member_type,
    token_hash,
    expires_at,
    sent_at
  )
  values (
    p_tenant_id,
    lower(p_email),
    'member',
    v_token_hash,
    v_expires_at,
    now()
  )
  returning id into v_inv_id;

  invitation_id := v_inv_id;
  tenant_id := p_tenant_id;
  email := lower(p_email);
  member_type := 'member';
  token := v_token;
  expires_at := v_expires_at;
  return next;
end;
$$;

create or replace function public.accept_invitation(p_token text)
returns table (
  invitation_id uuid,
  tenant_id uuid,
  member_type text
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
#variable_conflict use_column
declare
  v_hash text;
  v_inv public.invitations%rowtype;
  v_member_role_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_hash := public.hash_token(p_token);

  select *
  into v_inv
  from public.invitations i
  where i.token_hash = v_hash
    and i.accepted_at is null
    and i.expires_at > now()
  limit 1;

  if v_inv.id is null then
    raise exception 'Invalid or expired invitation';
  end if;

  insert into public.tenant_members as tm (tenant_id, user_id, member_type)
  values (v_inv.tenant_id, auth.uid(), 'member')
  on conflict (tenant_id, user_id) do update
  set member_type = 'member',
      updated_at = now();

  select r.id
  into v_member_role_id
  from public.roles r
  where r.tenant_id = v_inv.tenant_id
    and r.code = 'member'
  limit 1;

  if v_member_role_id is not null then
    insert into public.tenant_member_roles (tenant_id, user_id, role_id)
    values (v_inv.tenant_id, auth.uid(), v_member_role_id)
    on conflict (tenant_id, user_id, role_id) do nothing;
  end if;

  update public.invitations i
  set accepted_at = now(),
      accepted_by = auth.uid(),
      updated_at = now()
  where i.id = v_inv.id;

  insert into public.profiles as p (user_id, last_tenant_id)
  values (auth.uid(), v_inv.tenant_id)
  on conflict (user_id) do update
  set last_tenant_id = excluded.last_tenant_id,
      updated_at = now();

  return query select v_inv.id, v_inv.tenant_id, 'member'::text;
end;
$$;
