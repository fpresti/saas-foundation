-- #35/#36: features + plan_features + feature_permissions, catalog seeds, plan mapping.
-- Entitlement axis: Tenant → Subscription → Plan → Features → Permissions.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.features (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint features_code_key unique (code)
);

comment on table public.features is
  'Global product feature catalog. Entitlement is granted to tenants via plan_features.';

create table if not exists public.plan_features (
  plan_id uuid not null references public.plans (id) on delete cascade,
  feature_id uuid not null references public.features (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (plan_id, feature_id)
);

comment on table public.plan_features is
  'Which features each plan includes.';

create table if not exists public.feature_permissions (
  feature_id uuid not null references public.features (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (feature_id, permission_id)
);

comment on table public.feature_permissions is
  'Which permission codes a feature enables. platform.* permissions are NOT linked here.';

create index if not exists plan_features_feature_id_idx on public.plan_features (feature_id);
create index if not exists feature_permissions_permission_id_idx on public.feature_permissions (permission_id);

-- ---------------------------------------------------------------------------
-- RLS (write: super_admin only; read: authenticated)
-- ---------------------------------------------------------------------------

alter table public.features enable row level security;
alter table public.plan_features enable row level security;
alter table public.feature_permissions enable row level security;

drop policy if exists features_select on public.features;
create policy features_select on public.features
  for select to authenticated
  using (true);

drop policy if exists features_insert on public.features;
create policy features_insert on public.features
  for insert to authenticated
  with check (public.is_super_admin());

drop policy if exists features_update on public.features;
create policy features_update on public.features
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists features_delete on public.features;
create policy features_delete on public.features
  for delete to authenticated
  using (public.is_super_admin());

drop policy if exists plan_features_select on public.plan_features;
create policy plan_features_select on public.plan_features
  for select to authenticated
  using (true);

drop policy if exists plan_features_insert on public.plan_features;
create policy plan_features_insert on public.plan_features
  for insert to authenticated
  with check (public.is_super_admin());

drop policy if exists plan_features_update on public.plan_features;
create policy plan_features_update on public.plan_features
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists plan_features_delete on public.plan_features;
create policy plan_features_delete on public.plan_features
  for delete to authenticated
  using (public.is_super_admin());

drop policy if exists feature_permissions_select on public.feature_permissions;
create policy feature_permissions_select on public.feature_permissions
  for select to authenticated
  using (true);

drop policy if exists feature_permissions_insert on public.feature_permissions;
create policy feature_permissions_insert on public.feature_permissions
  for insert to authenticated
  with check (public.is_super_admin());

drop policy if exists feature_permissions_update on public.feature_permissions;
create policy feature_permissions_update on public.feature_permissions
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists feature_permissions_delete on public.feature_permissions;
create policy feature_permissions_delete on public.feature_permissions
  for delete to authenticated
  using (public.is_super_admin());

grant select on public.features, public.plan_features, public.feature_permissions to authenticated;
grant insert, update, delete on public.features, public.plan_features, public.feature_permissions to authenticated;

-- ---------------------------------------------------------------------------
-- Permission catalog extensions
-- ---------------------------------------------------------------------------

insert into public.permissions (code, name, description)
values
  ('platform.features.read', 'Read platform features', null),
  ('platform.features.write', 'Write platform features', null),
  ('tenant.permissions.read', 'Read tenant permission catalog', null)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();

-- Ensure base plans exist (idempotent; names match create_tenant_with_owner)
insert into public.plans (name, price, description)
values
  ('free', 0, 'Free plan'),
  ('premium', 19.99, 'Premium plan'),
  ('enterprise', null, 'Enterprise plan')
on conflict (name) do update
set
  description = excluded.description,
  price = coalesce(excluded.price, public.plans.price),
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Features catalog
-- ---------------------------------------------------------------------------

insert into public.features (code, name, description)
values
  ('profile', 'Profile', 'Own user profile'),
  ('members', 'Members', 'Tenant membership management'),
  ('roles', 'Roles', 'Tenant roles, assign, and permission catalog'),
  ('settings', 'Settings', 'Tenant settings'),
  ('subscription', 'Subscription', 'Read subscription / plan info')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();

-- feature → permissions (tenant/product only; never platform.*)
insert into public.feature_permissions (feature_id, permission_id)
select f.id, p.id
from (values
  ('profile', 'profile.self.read'),
  ('profile', 'profile.self.update'),
  ('members', 'tenant.members.read'),
  ('members', 'tenant.members.invite'),
  ('members', 'tenant.members.update'),
  ('members', 'tenant.members.delete'),
  ('roles', 'tenant.roles.read'),
  ('roles', 'tenant.roles.assign'),
  ('roles', 'tenant.roles.create'),
  ('roles', 'tenant.roles.update'),
  ('roles', 'tenant.roles.delete'),
  ('roles', 'tenant.permissions.read'),
  ('settings', 'tenant.settings.read'),
  ('settings', 'tenant.settings.update'),
  ('subscription', 'subscription.read')
) as m (feature_code, permission_code)
join public.features f on f.code = m.feature_code
join public.permissions p on p.code = m.permission_code
on conflict do nothing;

-- All current product features on free / premium / enterprise (phase 1).
-- Higher plans differentiate later; free tenants keep full MVP entitlement.
insert into public.plan_features (plan_id, feature_id)
select pl.id, f.id
from public.plans pl
cross join public.features f
where pl.name in ('free', 'premium', 'enterprise')
  and f.code in ('profile', 'members', 'roles', 'settings', 'subscription')
on conflict do nothing;
