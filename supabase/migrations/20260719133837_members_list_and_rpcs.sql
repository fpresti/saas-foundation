-- list_tenant_members includes active; owner RPCs for type/active/profile.

drop function if exists public.list_tenant_members(uuid);

create function public.list_tenant_members(p_tenant_id uuid)
returns table (
  user_id uuid,
  email text,
  member_type text,
  given_name text,
  family_name text,
  avatar_url text,
  active boolean
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not (
    public.is_super_admin()
    or public.has_permission(p_tenant_id, 'tenant.members.read')
  ) then
    raise exception 'Not allowed';
  end if;

  return query
  select
    tm.user_id,
    u.email::text,
    tm.member_type,
    p.given_name,
    p.family_name,
    p.avatar_url,
    tm.active
  from public.tenant_members tm
  join auth.users u on u.id = tm.user_id
  left join public.profiles p on p.user_id = tm.user_id
  where tm.tenant_id = p_tenant_id
  order by
    case when tm.active then 0 else 1 end,
    coalesce(
      nullif(trim(concat_ws(' ', p.given_name, p.family_name)), ''),
      u.email
    );
end;
$$;

revoke execute on function public.list_tenant_members(uuid) from anon;
grant execute on function public.list_tenant_members(uuid) to authenticated;

create or replace function public.set_tenant_member_type(
  p_tenant_id uuid,
  p_user_id uuid,
  p_member_type text
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_current text;
  v_active_owners int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_member_type not in ('owner', 'member') then
    raise exception 'Invalid member_type';
  end if;

  if not (public.is_super_admin() or public.is_tenant_owner(p_tenant_id)) then
    raise exception 'Not allowed';
  end if;

  select tm.member_type into v_current
  from public.tenant_members tm
  where tm.tenant_id = p_tenant_id and tm.user_id = p_user_id;

  if not found then
    raise exception 'Member not found';
  end if;

  if v_current = 'owner' and p_member_type = 'member' then
    select count(*)::int into v_active_owners
    from public.tenant_members tm
    where tm.tenant_id = p_tenant_id
      and tm.member_type = 'owner'
      and tm.active = true
      and tm.user_id <> p_user_id;

    if v_active_owners < 1 then
      raise exception 'Cannot demote the last active owner';
    end if;
  end if;

  update public.tenant_members
  set member_type = p_member_type, updated_at = now()
  where tenant_id = p_tenant_id and user_id = p_user_id;
end;
$$;

revoke execute on function public.set_tenant_member_type(uuid, uuid, text) from anon;
grant execute on function public.set_tenant_member_type(uuid, uuid, text) to authenticated;

create or replace function public.set_tenant_member_active(
  p_tenant_id uuid,
  p_user_id uuid,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_current text;
  v_active_owners int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not (public.is_super_admin() or public.is_tenant_owner(p_tenant_id)) then
    raise exception 'Not allowed';
  end if;

  if p_user_id = auth.uid() and p_active = false then
    raise exception 'Cannot deactivate yourself';
  end if;

  select tm.member_type into v_current
  from public.tenant_members tm
  where tm.tenant_id = p_tenant_id and tm.user_id = p_user_id;

  if not found then
    raise exception 'Member not found';
  end if;

  if v_current = 'owner' and p_active = false then
    select count(*)::int into v_active_owners
    from public.tenant_members tm
    where tm.tenant_id = p_tenant_id
      and tm.member_type = 'owner'
      and tm.active = true
      and tm.user_id <> p_user_id;

    if v_active_owners < 1 then
      raise exception 'Cannot deactivate the last active owner';
    end if;
  end if;

  update public.tenant_members
  set active = p_active, updated_at = now()
  where tenant_id = p_tenant_id and user_id = p_user_id;
end;
$$;

revoke execute on function public.set_tenant_member_active(uuid, uuid, boolean) from anon;
grant execute on function public.set_tenant_member_active(uuid, uuid, boolean) to authenticated;

create or replace function public.update_tenant_member_profile(
  p_tenant_id uuid,
  p_user_id uuid,
  p_given_name text,
  p_family_name text,
  p_avatar_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not (public.is_super_admin() or public.is_tenant_owner(p_tenant_id)) then
    raise exception 'Not allowed';
  end if;

  if not exists (
    select 1 from public.tenant_members tm
    where tm.tenant_id = p_tenant_id and tm.user_id = p_user_id
  ) then
    raise exception 'Member not found';
  end if;

  insert into public.profiles as p (user_id, given_name, family_name, avatar_url, updated_at)
  values (
    p_user_id,
    nullif(trim(p_given_name), ''),
    nullif(trim(p_family_name), ''),
    p_avatar_url,
    now()
  )
  on conflict (user_id) do update
  set
    given_name = excluded.given_name,
    family_name = excluded.family_name,
    avatar_url = coalesce(excluded.avatar_url, p.avatar_url),
    updated_at = now();
end;
$$;

revoke execute on function public.update_tenant_member_profile(uuid, uuid, text, text, text) from anon;
grant execute on function public.update_tenant_member_profile(uuid, uuid, text, text, text) to authenticated;
