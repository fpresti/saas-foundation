-- #37/#39/#40/#41: redesign system roles, migrate data, plan change + assign roles RPCs.
--
-- Role matrix (members; owner bypasses via is_tenant_owner):
--   tenant_manager: profile.*, members.*, roles.read/assign, permissions.read, settings.*, subscription.read
--   collaborator:   profile.*, members.read, settings.read, subscription.read
--   viewer:         profile.*, settings.read
-- Mapping: admin→tenant_manager, member→collaborator, guest→viewer.

-- ---------------------------------------------------------------------------
-- Seed function (new tenants)
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
  -- Idempotent: if new taxonomy already present, only ensure permissions; skip legacy create.
  if exists (
    select 1 from public.roles r
    where r.tenant_id = p_tenant_id and r.code = 'tenant_manager'
  ) then
    return;
  end if;

  -- If only legacy roles exist, migration block below handles remap; for brand-new tenants
  -- there are no roles yet.
  if exists (
    select 1 from public.roles r
    where r.tenant_id = p_tenant_id
      and r.code in ('admin', 'member', 'guest')
  ) and not exists (
    select 1 from public.roles r
    where r.tenant_id = p_tenant_id
      and r.code in ('tenant_manager', 'collaborator', 'viewer')
  ) then
    -- Defer to migrate_tenant_system_roles for existing tenants.
    return;
  end if;

  if exists (select 1 from public.roles r where r.tenant_id = p_tenant_id limit 1) then
    return;
  end if;

  insert into public.roles (tenant_id, code, name, description, is_system)
  values (
    p_tenant_id,
    'tenant_manager',
    'Tenant manager',
    'Day-to-day tenant administration (members, roles assign, settings)',
    true
  )
  returning id into v_manager_id;

  insert into public.roles (tenant_id, code, name, description, is_system)
  values (
    p_tenant_id,
    'collaborator',
    'Collaborator',
    'Standard collaborator',
    true
  )
  returning id into v_collaborator_id;

  insert into public.roles (tenant_id, code, name, description, is_system)
  values (
    p_tenant_id,
    'viewer',
    'Viewer',
    'Read-only viewer',
    true
  )
  returning id into v_viewer_id;

  insert into public.role_permissions (role_id, permission_id)
  select v_manager_id, p.id
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
    'tenant.permissions.read',
    'tenant.settings.read',
    'tenant.settings.update',
    'subscription.read'
  )
  on conflict do nothing;

  insert into public.role_permissions (role_id, permission_id)
  select v_collaborator_id, p.id
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
  select v_viewer_id, p.id
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
  'Idempotent: creates tenant_manager, collaborator, viewer system roles with default permissions.';

-- ---------------------------------------------------------------------------
-- Migrate existing tenants: remap admin/member/guest → new codes
-- ---------------------------------------------------------------------------

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

  -- Refresh role_permissions for new system roles
  delete from public.role_permissions
  where role_id in (v_manager_id, v_collaborator_id, v_viewer_id);

  insert into public.role_permissions (role_id, permission_id)
  select v_manager_id, p.id
  from public.permissions p
  where p.code in (
    'profile.self.read', 'profile.self.update',
    'tenant.members.read', 'tenant.members.invite', 'tenant.members.update', 'tenant.members.delete',
    'tenant.roles.read', 'tenant.roles.assign', 'tenant.permissions.read',
    'tenant.settings.read', 'tenant.settings.update', 'subscription.read'
  );

  insert into public.role_permissions (role_id, permission_id)
  select v_collaborator_id, p.id
  from public.permissions p
  where p.code in (
    'profile.self.read', 'profile.self.update',
    'tenant.members.read', 'tenant.settings.read', 'subscription.read'
  );

  insert into public.role_permissions (role_id, permission_id)
  select v_viewer_id, p.id
  from public.permissions p
  where p.code in (
    'profile.self.read', 'profile.self.update', 'tenant.settings.read'
  );

  -- Remap assignments
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

  -- Drop legacy assignments + roles
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

comment on function public.migrate_tenant_system_roles(uuid) is
  'One-shot/idempotent remap of admin|member|guest to tenant_manager|collaborator|viewer for a tenant.';

do $$
declare
  r record;
begin
  for r in select t.id from public.tenants t
  loop
    perform public.migrate_tenant_system_roles(r.id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- accept_invitation: default role collaborator
-- ---------------------------------------------------------------------------

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
  v_default_role_id uuid;
  v_auth_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_auth_email := lower(trim(auth.jwt() ->> 'email'));
  if v_auth_email is null or v_auth_email = '' then
    raise exception 'Authenticated user email is missing';
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

  if lower(trim(v_inv.email)) <> v_auth_email then
    raise exception 'Invitation email does not match signed-in user';
  end if;

  insert into public.tenant_members as tm (tenant_id, user_id, member_type)
  values (v_inv.tenant_id, auth.uid(), 'member')
  on conflict (tenant_id, user_id) do update
  set member_type = 'member',
      updated_at = now();

  select r.id
  into v_default_role_id
  from public.roles r
  where r.tenant_id = v_inv.tenant_id
    and r.code = 'collaborator'
  limit 1;

  if v_default_role_id is not null then
    insert into public.tenant_member_roles (tenant_id, user_id, role_id)
    values (v_inv.tenant_id, auth.uid(), v_default_role_id)
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

-- ---------------------------------------------------------------------------
-- #40: change_tenant_plan (owner / super_admin)
-- ---------------------------------------------------------------------------

create or replace function public.change_tenant_plan(
  p_tenant_id uuid,
  p_plan_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_plan_exists boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not (public.is_super_admin() or public.is_tenant_owner(p_tenant_id)) then
    raise exception 'Not allowed';
  end if;

  select exists (select 1 from public.plans pl where pl.id = p_plan_id)
  into v_plan_exists;

  if not v_plan_exists then
    raise exception 'Plan not found';
  end if;

  insert into public.subscriptions as s (tenant_id, plan_id, status, started_at)
  values (p_tenant_id, p_plan_id, 'active', now())
  on conflict (tenant_id) do update
  set plan_id = excluded.plan_id,
      updated_at = now();
end;
$$;

comment on function public.change_tenant_plan(uuid, uuid) is
  'Owner or super_admin sets the tenant subscription plan (entitlement only; no billing in phase 1).';

revoke all on function public.change_tenant_plan(uuid, uuid) from public;
revoke all on function public.change_tenant_plan(uuid, uuid) from anon;
grant execute on function public.change_tenant_plan(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- #41: assign / replace member roles
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
    or public.has_permission(p_tenant_id, 'tenant.roles.assign')
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

comment on function public.set_tenant_member_roles(uuid, uuid, uuid[]) is
  'Replace the set of roles for a tenant member. Requires tenant.roles.assign, owner, or super_admin.';

revoke all on function public.set_tenant_member_roles(uuid, uuid, uuid[]) from public;
revoke all on function public.set_tenant_member_roles(uuid, uuid, uuid[]) from anon;
grant execute on function public.set_tenant_member_roles(uuid, uuid, uuid[]) to authenticated;

-- Allow users with tenant.roles.assign (not only owner) to mutate tenant_member_roles via table
-- when not using the RPC; keep owner/super_admin. Phase 1 primary path is the RPC above.
drop policy if exists tenant_member_roles_insert on public.tenant_member_roles;
create policy tenant_member_roles_insert on public.tenant_member_roles
  for insert to authenticated
  with check (
    public.is_super_admin()
    or public.is_tenant_owner(tenant_id)
    or public.has_permission(tenant_id, 'tenant.roles.assign')
  );

drop policy if exists tenant_member_roles_delete on public.tenant_member_roles;
create policy tenant_member_roles_delete on public.tenant_member_roles
  for delete to authenticated
  using (
    public.is_super_admin()
    or public.is_tenant_owner(tenant_id)
    or public.has_permission(tenant_id, 'tenant.roles.assign')
  );

drop policy if exists tenant_member_roles_select on public.tenant_member_roles;
create policy tenant_member_roles_select on public.tenant_member_roles
  for select to authenticated
  using (
    public.is_super_admin()
    or public.is_tenant_owner(tenant_id)
    or public.has_permission(tenant_id, 'tenant.roles.read')
    or (public.is_tenant_member(tenant_id) and user_id = auth.uid())
  );

-- Roles list: members with tenant.roles.read (owner bypasses via has_permission)
drop policy if exists roles_select on public.roles;
create policy roles_select on public.roles
  for select to authenticated
  using (
    public.is_super_admin()
    or public.has_permission(tenant_id, 'tenant.roles.read')
  );
