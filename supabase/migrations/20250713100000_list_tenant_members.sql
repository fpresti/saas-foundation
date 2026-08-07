-- List tenant members with email (auth.users) for Members UI.
-- Requires tenant.members.read; enforced inside security definer RPC.

create or replace function public.list_tenant_members(p_tenant_id uuid)
returns table (
  user_id uuid,
  email text,
  member_type text,
  full_name text,
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
    p.full_name,
    p.avatar_url
  from public.tenant_members tm
  join auth.users u on u.id = tm.user_id
  left join public.profiles p on p.user_id = tm.user_id
  where tm.tenant_id = p_tenant_id
  order by coalesce(p.full_name, u.email);
end;
$$;

comment on function public.list_tenant_members(uuid) is
  'Members list for UI: membership + email + profile fields. Caller needs tenant.members.read.';

revoke execute on function public.list_tenant_members(uuid) from anon;
grant execute on function public.list_tenant_members(uuid) to authenticated;
