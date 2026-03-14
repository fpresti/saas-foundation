-- Fix: tenant_users dropped → tenant_members. Also replace is_tenant_member if it still used tenant_users.
-- Apply: supabase db push OR paste supabase/FIX_RUN_IN_SUPABASE_SQL_EDITOR.sql in Dashboard.

create or replace function public.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tenant_members tm
    where tm.tenant_id = p_tenant_id and tm.user_id = auth.uid()
  );
$$;

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
    if v_is_super_admin then
      select tm.member_type into v_tenant_role from tenant_members tm
        where tm.tenant_id = v_tenant_id and tm.user_id = v_uid;
      if not found then
        v_tenant_role := null;
      end if;
    else
      select tm.member_type into v_tenant_role from tenant_members tm
        where tm.tenant_id = v_tenant_id and tm.user_id = v_uid;
    end if;
  else
    v_tenant_id := null;
    v_tenant_role := null;
    v_tenant_status := null;
  end if;

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
    inner join tenant_members tm on tm.tenant_id = t.id and tm.user_id = v_uid;
  end if;

  if v_tenant_id is not null then
    update profiles
    set last_tenant_id = v_tenant_id, updated_at = now()
    where user_id = v_uid;
  end if;

  return query select v_is_super_admin, v_tenant_id, v_tenant_role, v_tenant_status, v_allowed_tenants;
end;
$$;

comment on function public.get_access_context(uuid) is
  'Returns access context using tenant_members (member_type as tenant_role). Persists profiles.last_tenant_id when tenant is valid.';
