-- RPC get_access_context(p_tenant_id uuid default null)
-- Encapsulates access context in a single call for the SaaS foundation.
-- Returns: is_super_admin, tenant_id, tenant_role, tenant_status, allowed_tenants
-- Persists profiles.last_tenant_id when tenant is valid.

create or replace function public.get_access_context(p_tenant_id uuid default null)
returns table (
  is_super_admin boolean,
  tenant_id uuid,
  tenant_role text,
  tenant_status text,
  allowed_tenants jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_super_admin boolean;
  v_tenant_id uuid;
  v_tenant_role text;
  v_tenant_status text;
  v_allowed_tenants jsonb;
  v_candidate uuid;
  v_valid boolean := false;
  v_profile profiles%rowtype;
  v_tenant tenants%rowtype;
  v_member boolean;
begin
  if v_uid is null then
    return query select
      false::boolean,
      null::uuid,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  v_is_super_admin := public.is_super_admin();

  -- Resolve tenant_id
  if p_tenant_id is not null then
    v_candidate := p_tenant_id;
    if v_is_super_admin then
      select t.id, t.status into v_tenant from tenants t where t.id = v_candidate;
      v_valid := found;
    else
      v_member := public.is_tenant_member(v_candidate);
      v_valid := v_member;
      if v_valid then
        select t.id, t.status into v_tenant from tenants t where t.id = v_candidate;
      end if;
    end if;
  else
    -- Try profiles.last_tenant_id then profiles.default_tenant_id
    select * into v_profile from profiles where user_id = v_uid;
    if found then
      v_candidate := coalesce(v_profile.last_tenant_id, v_profile.default_tenant_id);
    else
      v_candidate := null;
    end if;

    if v_candidate is not null then
      if v_is_super_admin then
        select t.id, t.status into v_tenant from tenants t where t.id = v_candidate;
        v_valid := found;
      else
        v_member := public.is_tenant_member(v_candidate);
        v_valid := v_member;
        if v_valid then
          select t.id, t.status into v_tenant from tenants t where t.id = v_candidate;
        end if;
      end if;
    end if;
  end if;

  if v_valid then
    v_tenant_id := v_tenant.id;
    v_tenant_status := v_tenant.status;
    -- tenant_role: lookup tenant_users
    if v_is_super_admin then
      select tu.role into v_tenant_role from tenant_users tu
        where tu.tenant_id = v_tenant_id and tu.user_id = v_uid;
      if not found then
        v_tenant_role := null; -- super_admin without membership
      end if;
    else
      select tu.role into v_tenant_role from tenant_users tu
        where tu.tenant_id = v_tenant_id and tu.user_id = v_uid;
      -- membership was validated, should exist
    end if;
  else
    v_tenant_id := null;
    v_tenant_role := null;
    v_tenant_status := null;
  end if;

  -- allowed_tenants
  if v_is_super_admin then
    select coalesce(
      jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug, 'status', t.status)),
      '[]'::jsonb
    ) into v_allowed_tenants from tenants t;
  else
    select coalesce(
      jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug, 'status', t.status)),
      '[]'::jsonb
    ) into v_allowed_tenants
    from tenants t
    inner join tenant_users tu on tu.tenant_id = t.id and tu.user_id = v_uid;
  end if;

  -- Persist last_tenant_id when tenant is valid
  if v_tenant_id is not null then
    update profiles
    set last_tenant_id = v_tenant_id, updated_at = now()
    where user_id = v_uid;
  end if;

  return query select v_is_super_admin, v_tenant_id, v_tenant_role, v_tenant_status, v_allowed_tenants;
end;
$$;

comment on function public.get_access_context(uuid) is
  'Returns access context: is_super_admin, tenant_id, tenant_role, tenant_status, allowed_tenants. Persists profiles.last_tenant_id when tenant is valid.';
