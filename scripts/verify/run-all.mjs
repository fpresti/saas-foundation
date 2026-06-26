#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const steps = [
  'db-sync.mjs',
  'setup.mjs',
  'members-permissions.mjs',
  'tenant-onboarding.mjs',
  'invitations.mjs',
  'roles-read.mjs',
  'tenant-settings.mjs',
];

for (const step of steps) {
  console.log(`\n--- ${step} ---`);
  const r = spawnSync('node', [join(dir, step)], { stdio: 'inherit', shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
console.log('\nverify:all passed');
