-- Split profiles.full_name into given_name + family_name; update Members RPC.

alter table public.profiles
  add column if not exists given_name text,
  add column if not exists family_name text;

update public.profiles
set
  given_name = nullif(trim(split_part(full_name, ' ', 1)), ''),
  family_name = nullif(
    trim(regexp_replace(full_name, '^\S+\s*', '')),
    ''
  )
where full_name is not null
  and trim(full_name) <> ''
  and given_name is null
  and family_name is null;

-- Return type change requires drop + recreate.
drop function if exists public.list_tenant_members(uuid);

create function public.list_tenant_members(p_tenant_id uuid)
returns table (
  user_id uuid,
  email text,
  member_type text,
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
    p.avatar_url
  from public.tenant_members tm
  join auth.users u on u.id = tm.user_id
  left join public.profiles p on p.user_id = tm.user_id
  where tm.tenant_id = p_tenant_id
  order by coalesce(
    nullif(trim(concat_ws(' ', p.given_name, p.family_name)), ''),
    u.email
  );
end;
$$;

comment on function public.list_tenant_members(uuid) is
  'Members list for UI: membership + email + profile fields. Caller needs tenant.members.read.';

revoke execute on function public.list_tenant_members(uuid) from anon;
grant execute on function public.list_tenant_members(uuid) to authenticated;

alter table public.profiles drop column if exists full_name;
