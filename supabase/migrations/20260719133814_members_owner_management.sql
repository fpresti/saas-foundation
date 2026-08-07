-- Per-tenant membership active flag + membership helpers.

alter table public.tenant_members
  add column if not exists active boolean not null default true;

comment on column public.tenant_members.active is
  'When false, membership is deactivated for this tenant (user cannot access it).';

create or replace function public.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
      and tm.active = true
  );
$$;

create or replace function public.is_tenant_owner(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
      and tm.member_type = 'owner'
      and tm.active = true
  );
$$;
