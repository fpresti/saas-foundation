-- #38: has_permission = (super_admin) OR (owner ∩ ¬platform.*) OR (role permission ∩ plan feature).
-- Eligible subscription statuses for feature gating: active, trialing.

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

  -- Platform codes are never granted via tenant roles or owner bypass.
  if v_is_platform then
    return false;
  end if;

  -- Owner hard-gate for tenant-scoped permissions (no feature check).
  if public.is_tenant_owner(p_tenant_id) then
    return true;
  end if;

  -- Must be an active member of the tenant.
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

  -- Feature gate: permission must be enabled by a feature on the tenant's active plan.
  select exists (
    select 1
    from public.subscriptions s
    join public.plan_features pf
      on pf.plan_id = s.plan_id
    join public.feature_permissions fp
      on fp.feature_id = pf.feature_id
    join public.permissions p
      on p.id = fp.permission_id
    where s.tenant_id = p_tenant_id
      and s.status in ('active', 'trialing')
      and p.code = v_code
  )
  into v_feature_ok;

  return coalesce(v_feature_ok, false);
end;
$$;

comment on function public.has_permission(uuid, text) is
  'Effective access: super_admin OR (owner for non-platform) OR (role permission ∩ plan feature). platform.* never via roles.';

revoke all on function public.has_permission(uuid, text) from public;
revoke all on function public.has_permission(uuid, text) from anon;
grant execute on function public.has_permission(uuid, text) to authenticated;
