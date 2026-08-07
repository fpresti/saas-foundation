#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ok, fail } from './_lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const membersPerms = readFileSync(
  join(root, 'src/app/features/members/members.permissions.ts'),
  'utf8'
);
const routes = readFileSync(join(root, 'src/app/app.routes.ts'), 'utf8');
const nav = readFileSync(
  join(root, 'src/app/features/app-shell/services/navigation.service.ts'),
  'utf8'
);

const legacy = [
  'tenant.members.manage',
  'tenant.roles.assign',
  'tenant.permissions.read',
  'tenant.roles.read',
];
for (const code of legacy) {
  if (membersPerms.includes(code) || routes.includes(code) || nav.includes(code)) {
    fail(`legacy permission code still present: ${code}`);
  }
}

for (const code of ['members.read', 'members.invite', 'roles.assign']) {
  if (!membersPerms.includes(code)) {
    fail(`members.permissions must use ${code}`);
  }
}

if (!routes.includes("permission: 'members.read'")) {
  fail('members route must gate with members.read');
}
if (!routes.includes("permission: 'settings.read'")) {
  fail('settings route must gate with settings.read');
}
if (routes.includes('tenantOwnerGuard')) {
  fail('Members/Settings must not use tenantOwnerGuard (permission-based access)');
}
if (nav.includes('requiresOwner: true')) {
  fail('nav Settings/Members must not require owner (permission-based)');
}

ok('permission codes and route/nav gates aligned');
console.log('verify:members-permissions passed');
