#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ok, fail } from './_lib.mjs';

const file = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../src/app/features/members/members.permissions.ts'
);
const src = readFileSync(file, 'utf8');

if (src.includes('tenant.members.manage')) {
  fail('members.permissions still uses tenant.members.manage');
}
if (!src.includes('tenant.roles.assign')) {
  fail('members.permissions must use tenant.roles.assign');
}
ok('permission codes aligned');
console.log('verify:members-permissions passed');
