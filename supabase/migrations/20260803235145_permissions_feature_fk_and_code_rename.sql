-- Link permissions to features; rename codes to {feature}.{action}.
-- Rebuild feature gating via permissions.feature_id ∩ plan_features.
-- Update seed/RPC helpers that hardcode old permission codes.

-- ---------------------------------------------------------------------------
-- 1) Ensure platform feature exists
-- ---------------------------------------------------------------------------
insert into public.features (code, name, description)
values ('platform', 'Platform', 'Platform administration (superadmin catalog)')
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    updated_at = now();

-- Attach platform feature to all plans (entitlement irrelevant for platform.*;
-- kept for catalog consistency)
insert into public.plan_features (plan_id, feature_id)
select pl.id, f.id
from public.plans pl
cross join public.features f
where f.code = 'platform'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 2) Add permissions.feature_id
-- ---------------------------------------------------------------------------
alter table public.permissions
  add column if not exists feature_id uuid references public.features (id) on delete restrict;

create index if not exists permissions_feature_id_idx on public.permissions (feature_id);

-- ---------------------------------------------------------------------------
-- 3) Rename permission codes → {feature}.{action}
-- ---------------------------------------------------------------------------
-- Map: old_code → new_code, feature_code
do $$
declare
  r record;
  v_feature_id uuid;
begin
  for r in
    select * from (values
      ('profile.self.read', 'profile.read', 'profile'),
      ('profile.self.update', 'profile.update', 'profile'),
      ('tenant.members.read', 'members.read', 'members'),
      ('tenant.members.invite', 'members.invite', 'members'),
      ('tenant.members.update', 'members.update', 'members'),
      ('tenant.members.delete', 'members.delete', 'members'),
      ('tenant.roles.read', 'roles.read', 'roles'),
      ('tenant.roles.assign', 'roles.assign', 'roles'),
      ('tenant.roles.create', 'roles.create', 'roles'),
      ('tenant.roles.update', 'roles.update', 'roles'),
      ('tenant.roles.delete', 'roles.delete', 'roles'),
      ('tenant.permissions.read', 'roles.permissions_read', 'roles'),
      ('tenant.settings.read', 'settings.read', 'settings'),
      ('tenant.settings.update', 'settings.update', 'settings'),
      ('subscription.read', 'subscription.read', 'subscription'),
      ('platform.features.read', 'platform.features_read', 'platform'),
      ('platform.features.write', 'platform.features_write', 'platform'),
      ('platform.plans.read', 'platform.plans_read', 'platform'),
      ('platform.plans.write', 'platform.plans_write', 'platform'),
      ('platform.permissions.read', 'platform.permissions_read', 'platform'),
      ('platform.permissions.write', 'platform.permissions_write', 'platform'),
      ('platform.tenants.read', 'platform.tenants_read', 'platform'),
      ('platform.tenants.suspend', 'platform.tenants_suspend', 'platform')
    ) as m(old_code, new_code, feature_code)
  loop
    select f.id into v_feature_id
    from public.features f
    where f.code = r.feature_code;

    if v_feature_id is null then
      raise exception 'Missing feature %', r.feature_code;
    end if;

    -- If new code already exists (idempotent re-run), just set feature_id
    if exists (select 1 from public.permissions p where p.code = r.new_code) then
      update public.permissions
      set feature_id = v_feature_id,
          updated_at = now()
      where code = r.new_code;

      -- Drop leftover old row if different
      if r.old_code <> r.new_code then
        delete from public.permissions where code = r.old_code;
      end if;
    elsif exists (select 1 from public.permissions p where p.code = r.old_code) then
      update public.permissions
      set code = r.new_code,
          feature_id = v_feature_id,
          updated_at = now()
      where code = r.old_code;
    end if;
  end loop;
end;
$$;

-- Rebuild feature_permissions from permissions.feature_id (product features only)
delete from public.feature_permissions;

insert into public.feature_permissions (feature_id, permission_id)
select p.feature_id, p.id
from public.permissions p
join public.features f on f.id = p.feature_id
where f.code <> 'platform'
  and p.feature_id is not null
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 4) has_permission: gate via permissions.feature_id ∩ plan_features
-- ---------------------------------------------------------------------------
create or replace function public.has_permission(
  p_tenant_id uuid,
  p_permission_code text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  v_code text := nullif(trim(p_permission_code), '');
  v_is_platform boolean;
  v_has_via_role boolean;
  v_feature_ok boolean;
begin
  if auth.uid() is null or p_tenant_id is null or v_code is null then
    return false;
  end if;

  if public.is_super_admin() then
    return true;
  end if;

  v_is_platform := v_code like 'platform.%';

  if v_is_platform then
    return false;
  end if;

  if public.is_tenant_owner(p_tenant_id) then
    return true;
  end if;

  if not public.is_tenant_member(p_tenant_id) then
    return false;
  end if;

  select exists (
    select 1
    from public.tenant_member_roles tmr
    join public.roles r
      on r.id = tmr.role_id
     and r.tenant_id = tmr.tenant_id
    join public.role_permissions rp
      on rp.role_id = r.id
    join public.permissions p
      on p.id = rp.permission_id
    where tmr.tenant_id = p_tenant_id
      and tmr.user_id = auth.uid()
      and p.code = v_code
  )
  into v_has_via_role;

  if not v_has_via_role then
    return false;
  end if;

  select exists (
    select 1
    from public.permissions p
    join public.subscriptions s
      on s.tenant_id = p_tenant_id
    join public.plan_features pf
      on pf.plan_id = s.plan_id
     and pf.feature_id = p.feature_id
    where p.code = v_code
      and p.feature_id is not null
      and s.status in ('active', 'trialing')
  )
  into v_feature_ok;

  return coalesce(v_feature_ok, false);
end;
$$;

comment on function public.has_permission(uuid, text) is
  'Effective access: super_admin OR (owner for non-platform) OR (role permission ∩ plan feature via permissions.feature_id).';

-- ---------------------------------------------------------------------------
-- 5) Refresh default role seeds with new codes
-- ---------------------------------------------------------------------------
create or replace function public.seed_default_tenant_roles(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_manager_id uuid;
  v_collaborator_id uuid;
  v_viewer_id uuid;
begin
  if exists (
    select 1 from public.roles r
    where r.tenant_id = p_tenant_id and r.code = 'tenant_manager'
  ) then
    return;
  end if;

  if exists (
    select 1 from public.roles r
    where r.tenant_id = p_tenant_id
      and r.code in ('admin', 'member', 'guest')
  ) and not exists (
    select 1 from public.roles r
    where r.tenant_id = p_tenant_id
      and r.code in ('tenant_manager', 'collaborator', 'viewer')
  ) then
    return;
  end if;

  if exists (select 1 from public.roles r where r.tenant_id = p_tenant_id limit 1) then
    return;
  end if;

  insert into public.roles (tenant_id, code, name, description, is_system)
  values (
    p_tenant_id, 'tenant_manager', 'Tenant manager',
    'Day-to-day tenant administration (members, roles assign, settings)', true
  )
  returning id into v_manager_id;

  insert into public.roles (tenant_id, code, name, description, is_system)
  values (p_tenant_id, 'collaborator', 'Collaborator', 'Standard collaborator', true)
  returning id into v_collaborator_id;

  insert into public.roles (tenant_id, code, name, description, is_system)
  values (p_tenant_id, 'viewer', 'Viewer', 'Read-only viewer', true)
  returning id into v_viewer_id;

  insert into public.role_permissions (role_id, permission_id)
  select v_manager_id, p.id
  from public.permissions p
  where p.code in (
    'profile.read', 'profile.update',
    'members.read', 'members.invite', 'members.update', 'members.delete',
    'roles.read', 'roles.assign', 'roles.permissions_read',
    'settings.read', 'settings.update',
    'subscription.read'
  )
  on conflict do nothing;

  insert into public.role_permissions (role_id, permission_id)
  select v_collaborator_id, p.id
  from public.permissions p
  where p.code in (
    'profile.read', 'profile.update',
    'members.read', 'settings.read', 'subscription.read'
  )
  on conflict do nothing;

  insert into public.role_permissions (role_id, permission_id)
  select v_viewer_id, p.id
  from public.permissions p
  where p.code in ('profile.read', 'profile.update', 'settings.read')
  on conflict do nothing;
end;
$$;

-- Refresh role_permissions on existing tenants to new codes (idempotent)
do $$
declare
  r record;
  v_manager_id uuid;
  v_collaborator_id uuid;
  v_viewer_id uuid;
begin
  for r in select t.id as tenant_id from public.tenants t
  loop
    select id into v_manager_id from public.roles
    where tenant_id = r.tenant_id and code = 'tenant_manager' limit 1;
    select id into v_collaborator_id from public.roles
    where tenant_id = r.tenant_id and code = 'collaborator' limit 1;
    select id into v_viewer_id from public.roles
    where tenant_id = r.tenant_id and code = 'viewer' limit 1;

    if v_manager_id is not null then
      delete from public.role_permissions where role_id = v_manager_id;
      insert into public.role_permissions (role_id, permission_id)
      select v_manager_id, p.id from public.permissions p
      where p.code in (
        'profile.read', 'profile.update',
        'members.read', 'members.invite', 'members.update', 'members.delete',
        'roles.read', 'roles.assign', 'roles.permissions_read',
        'settings.read', 'settings.update', 'subscription.read'
      );
    end if;

    if v_collaborator_id is not null then
      delete from public.role_permissions where role_id = v_collaborator_id;
      insert into public.role_permissions (role_id, permission_id)
      select v_collaborator_id, p.id from public.permissions p
      where p.code in (
        'profile.read', 'profile.update',
        'members.read', 'settings.read', 'subscription.read'
      );
    end if;

    if v_viewer_id is not null then
      delete from public.role_permissions where role_id = v_viewer_id;
      insert into public.role_permissions (role_id, permission_id)
      select v_viewer_id, p.id from public.permissions p
      where p.code in ('profile.read', 'profile.update', 'settings.read');
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) RPC / RLS helpers that hardcoded old codes
-- ---------------------------------------------------------------------------
create or replace function public.set_tenant_member_roles(
  p_tenant_id uuid,
  p_user_id uuid,
  p_role_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_role_id uuid;
  v_ok boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not (
    public.is_super_admin()
    or public.is_tenant_owner(p_tenant_id)
    or public.has_permission(p_tenant_id, 'roles.assign')
  ) then
    raise exception 'Not allowed';
  end if;

  if not exists (
    select 1 from public.tenant_members tm
    where tm.tenant_id = p_tenant_id and tm.user_id = p_user_id
  ) then
    raise exception 'Member not found';
  end if;

  if p_role_ids is null then
    p_role_ids := array[]::uuid[];
  end if;

  foreach v_role_id in array p_role_ids
  loop
    select exists (
      select 1 from public.roles r
      where r.id = v_role_id and r.tenant_id = p_tenant_id
    ) into v_ok;

    if not v_ok then
      raise exception 'Invalid role for tenant';
    end if;
  end loop;

  delete from public.tenant_member_roles tmr
  where tmr.tenant_id = p_tenant_id
    and tmr.user_id = p_user_id
    and (cardinality(p_role_ids) = 0 or tmr.role_id <> all (p_role_ids));

  insert into public.tenant_member_roles (tenant_id, user_id, role_id)
  select p_tenant_id, p_user_id, x.role_id
  from unnest(p_role_ids) as x(role_id)
  on conflict do nothing;
end;
$$;

drop policy if exists tenant_member_roles_insert on public.tenant_member_roles;
create policy tenant_member_roles_insert on public.tenant_member_roles
  for insert to authenticated
  with check (
    public.is_super_admin()
    or public.is_tenant_owner(tenant_id)
    or public.has_permission(tenant_id, 'roles.assign')
  );

drop policy if exists tenant_member_roles_delete on public.tenant_member_roles;
create policy tenant_member_roles_delete on public.tenant_member_roles
  for delete to authenticated
  using (
    public.is_super_admin()
    or public.is_tenant_owner(tenant_id)
    or public.has_permission(tenant_id, 'roles.assign')
  );

drop policy if exists tenant_member_roles_select on public.tenant_member_roles;
create policy tenant_member_roles_select on public.tenant_member_roles
  for select to authenticated
  using (
    public.is_super_admin()
    or public.is_tenant_owner(tenant_id)
    or public.has_permission(tenant_id, 'roles.read')
    or (public.is_tenant_member(tenant_id) and user_id = auth.uid())
  );

drop policy if exists roles_select on public.roles;
create policy roles_select on public.roles
  for select to authenticated
  using (
    public.is_super_admin()
    or public.has_permission(tenant_id, 'roles.read')
  );

-- list_tenant_members / invites still call has_permission with old codes in older
-- migration bodies; replace the live functions that still hardcode them.
-- Drop first: OUT column order differs from earlier list_tenant_members versions.
drop function if exists public.list_tenant_members(uuid);

create or replace function public.list_tenant_members(p_tenant_id uuid)
returns table (
  user_id uuid,
  member_type text,
  active boolean,
  email text,
  given_name text,
  family_name text,
  avatar_url text
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if not (
    public.is_super_admin()
    or public.has_permission(p_tenant_id, 'members.read')
  ) then
    raise exception 'Not allowed';
  end if;

  return query
  select
    tm.user_id,
    tm.member_type,
    tm.active,
    u.email::text,
    pr.given_name,
    pr.family_name,
    pr.avatar_url
  from public.tenant_members tm
  join auth.users u on u.id = tm.user_id
  left join public.profiles pr on pr.user_id = tm.user_id
  where tm.tenant_id = p_tenant_id
  order by tm.member_type desc, u.email;
end;
$$;

comment on function public.list_tenant_members(uuid) is
  'Members list for UI. Caller needs members.read.';

revoke execute on function public.list_tenant_members(uuid) from anon;
grant execute on function public.list_tenant_members(uuid) to authenticated;

-- Invitation RPCs: tenant.members.invite → members.invite
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
    or public.has_permission(p_tenant_id, 'members.invite')
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

  delete from public.invitations i
  where i.tenant_id = p_tenant_id
    and lower(i.email) = lower(p_email)
    and i.accepted_at is null
    and i.expires_at <= now();

  if exists (
    select 1
    from public.invitations i
    where i.tenant_id = p_tenant_id
      and lower(i.email) = lower(p_email)
      and i.accepted_at is null
      and i.expires_at > now()
  ) then
    raise exception 'A pending invitation already exists for this email';
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

create or replace function public.revoke_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_tenant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select i.tenant_id
  into v_tenant_id
  from public.invitations i
  where i.id = p_invitation_id
    and i.accepted_at is null
    and i.expires_at > now();

  if v_tenant_id is null then
    raise exception 'Invitation not found or no longer pending';
  end if;

  if not (
    public.is_super_admin()
    or public.has_permission(v_tenant_id, 'members.invite')
  ) then
    raise exception 'Not allowed';
  end if;

  delete from public.invitations
  where id = p_invitation_id
    and tenant_id = v_tenant_id
    and accepted_at is null;
end;
$$;

create or replace function public.resend_invitation(p_invitation_id uuid)
returns table (
  invitation_id uuid,
  tenant_id uuid,
  email text,
  token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_inv public.invitations%rowtype;
  v_token text;
  v_expires_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_inv
  from public.invitations i
  where i.id = p_invitation_id
    and i.accepted_at is null;

  if v_inv.id is null then
    raise exception 'Invitation not found or already accepted';
  end if;

  if not (
    public.is_super_admin()
    or public.has_permission(v_inv.tenant_id, 'members.invite')
  ) then
    raise exception 'Not allowed';
  end if;

  v_token := public.generate_token();
  v_expires_at := now() + interval '72 hours';

  update public.invitations i
  set token_hash = public.hash_token(v_token),
      expires_at = v_expires_at,
      sent_at = now(),
      updated_at = now()
  where i.id = v_inv.id;

  invitation_id := v_inv.id;
  tenant_id := v_inv.tenant_id;
  email := v_inv.email;
  token := v_token;
  expires_at := v_expires_at;
  return next;
end;
$$;

-- One-shot legacy role remap helper: keep permission codes in sync
create or replace function public.migrate_tenant_system_roles(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_manager_id uuid;
  v_collaborator_id uuid;
  v_viewer_id uuid;
  v_old_admin uuid;
  v_old_member uuid;
  v_old_guest uuid;
begin
  select r.id into v_old_admin from public.roles r
  where r.tenant_id = p_tenant_id and r.code = 'admin' limit 1;
  select r.id into v_old_member from public.roles r
  where r.tenant_id = p_tenant_id and r.code = 'member' limit 1;
  select r.id into v_old_guest from public.roles r
  where r.tenant_id = p_tenant_id and r.code = 'guest' limit 1;

  select r.id into v_manager_id from public.roles r
  where r.tenant_id = p_tenant_id and r.code = 'tenant_manager' limit 1;
  select r.id into v_collaborator_id from public.roles r
  where r.tenant_id = p_tenant_id and r.code = 'collaborator' limit 1;
  select r.id into v_viewer_id from public.roles r
  where r.tenant_id = p_tenant_id and r.code = 'viewer' limit 1;

  if v_manager_id is null then
    insert into public.roles (tenant_id, code, name, description, is_system)
    values (
      p_tenant_id, 'tenant_manager', 'Tenant manager',
      'Day-to-day tenant administration (members, roles assign, settings)', true
    )
    returning id into v_manager_id;
  end if;

  if v_collaborator_id is null then
    insert into public.roles (tenant_id, code, name, description, is_system)
    values (p_tenant_id, 'collaborator', 'Collaborator', 'Standard collaborator', true)
    returning id into v_collaborator_id;
  end if;

  if v_viewer_id is null then
    insert into public.roles (tenant_id, code, name, description, is_system)
    values (p_tenant_id, 'viewer', 'Viewer', 'Read-only viewer', true)
    returning id into v_viewer_id;
  end if;

  delete from public.role_permissions
  where role_id in (v_manager_id, v_collaborator_id, v_viewer_id);

  insert into public.role_permissions (role_id, permission_id)
  select v_manager_id, p.id
  from public.permissions p
  where p.code in (
    'profile.read', 'profile.update',
    'members.read', 'members.invite', 'members.update', 'members.delete',
    'roles.read', 'roles.assign', 'roles.permissions_read',
    'settings.read', 'settings.update', 'subscription.read'
  );

  insert into public.role_permissions (role_id, permission_id)
  select v_collaborator_id, p.id
  from public.permissions p
  where p.code in (
    'profile.read', 'profile.update',
    'members.read', 'settings.read', 'subscription.read'
  );

  insert into public.role_permissions (role_id, permission_id)
  select v_viewer_id, p.id
  from public.permissions p
  where p.code in (
    'profile.read', 'profile.update', 'settings.read'
  );

  if v_old_admin is not null then
    insert into public.tenant_member_roles (tenant_id, user_id, role_id)
    select tmr.tenant_id, tmr.user_id, v_manager_id
    from public.tenant_member_roles tmr
    where tmr.tenant_id = p_tenant_id and tmr.role_id = v_old_admin
    on conflict do nothing;
  end if;

  if v_old_member is not null then
    insert into public.tenant_member_roles (tenant_id, user_id, role_id)
    select tmr.tenant_id, tmr.user_id, v_collaborator_id
    from public.tenant_member_roles tmr
    where tmr.tenant_id = p_tenant_id and tmr.role_id = v_old_member
    on conflict do nothing;
  end if;

  if v_old_guest is not null then
    insert into public.tenant_member_roles (tenant_id, user_id, role_id)
    select tmr.tenant_id, tmr.user_id, v_viewer_id
    from public.tenant_member_roles tmr
    where tmr.tenant_id = p_tenant_id and tmr.role_id = v_old_guest
    on conflict do nothing;
  end if;

  if v_old_admin is not null then
    delete from public.tenant_member_roles
    where tenant_id = p_tenant_id and role_id = v_old_admin;
    delete from public.role_permissions where role_id = v_old_admin;
    delete from public.roles where id = v_old_admin;
  end if;

  if v_old_member is not null then
    delete from public.tenant_member_roles
    where tenant_id = p_tenant_id and role_id = v_old_member;
    delete from public.role_permissions where role_id = v_old_member;
    delete from public.roles where id = v_old_member;
  end if;

  if v_old_guest is not null then
    delete from public.tenant_member_roles
    where tenant_id = p_tenant_id and role_id = v_old_guest;
    delete from public.role_permissions where role_id = v_old_guest;
    delete from public.roles where id = v_old_guest;
  end if;
end;
$$;
