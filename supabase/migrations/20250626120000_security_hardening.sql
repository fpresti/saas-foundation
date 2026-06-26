-- T15: Security hardening pre-MVP

drop table if exists public.test;

alter table public.super_admins enable row level security;

drop policy if exists super_admins_select_self on public.super_admins;
create policy super_admins_select_self on public.super_admins
  for select
  to authenticated
  using (user_id = auth.uid() and public.is_super_admin());

revoke execute on function public.create_invitation(uuid, text, text, integer) from anon;
revoke execute on function public.assign_tenant_user_role(uuid, uuid, uuid) from anon;
revoke execute on function public.create_tenant_with_owner(text, text, text, text) from anon;
revoke execute on function public.accept_invitation(text) from anon;
