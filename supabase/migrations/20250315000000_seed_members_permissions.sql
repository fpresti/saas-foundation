-- Seed global permission catalog (members, roles, settings, platform).
-- Matches remote migration 20250315000000_seed_members_permissions.
-- Idempotent for fresh databases.

insert into public.permissions (code, name, description)
values
  ('platform.permissions.read', 'Read platform permissions', null),
  ('platform.permissions.write', 'Write platform permissions', null),
  ('platform.plans.read', 'Read platform plans', null),
  ('platform.plans.write', 'Write platform plans', null),
  ('platform.tenants.read', 'Read platform tenants', null),
  ('platform.tenants.suspend', 'Suspend platform tenants', null),
  ('profile.self.read', 'Read own profile', null),
  ('profile.self.update', 'Update own profile', null),
  ('subscription.read', 'Read subscription', null),
  ('tenant.members.delete', 'Delete tenant members', null),
  ('tenant.members.invite', 'Invite tenant members', null),
  ('tenant.members.read', 'Read tenant members', null),
  ('tenant.members.update', 'Update tenant members', null),
  ('tenant.roles.assign', 'Assign tenant roles', null),
  ('tenant.roles.create', 'Create tenant roles', null),
  ('tenant.roles.delete', 'Delete tenant roles', null),
  ('tenant.roles.read', 'Read tenant roles', null),
  ('tenant.roles.update', 'Update tenant roles', null),
  ('tenant.settings.read', 'Read tenant settings', null),
  ('tenant.settings.update', 'Update tenant settings', null)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();
