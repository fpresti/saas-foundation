#!/usr/bin/env node
/**
 * T01 verify: local supabase/migrations match expected remote versions.
 * Remote source of truth: Supabase MCP list_migrations or schema_migrations.
 */
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '../../supabase/migrations');

/** Keep in sync with remote supabase_migrations.schema_migrations */
const EXPECTED_REMOTE = [
  { version: '20250222120000', name: 'create_get_access_context' },
  { version: '20250314120000', name: 'get_access_context_tenant_members' },
  { version: '20250315000000', name: 'seed_members_permissions' },
  { version: '20250626120000', name: 'security_hardening' },
  { version: '20250626121000', name: 'fix_accept_invitation' },
];

function localMigrations() {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => {
      const match = /^(\d{14})_(.+)\.sql$/.exec(f);
      if (!match) throw new Error(`Invalid migration filename: ${f}`);
      return { version: match[1], name: match[2], file: f };
    })
    .sort((a, b) => a.version.localeCompare(b.version));
}

function main() {
  const local = localMigrations();
  const errors = [];

  for (const exp of EXPECTED_REMOTE) {
    const found = local.find((m) => m.version === exp.version);
    if (!found) {
      errors.push(`Missing local migration: ${exp.version}_${exp.name}.sql`);
      continue;
    }
    if (found.name !== exp.name) {
      errors.push(
        `Name mismatch for ${exp.version}: local "${found.name}" vs remote "${exp.name}"`
      );
    }
  }

  const expectedVersions = new Set(EXPECTED_REMOTE.map((m) => m.version));
  for (const m of local) {
    if (!expectedVersions.has(m.version)) {
      errors.push(`Unexpected local migration not on remote: ${m.file}`);
    }
  }

  if (errors.length) {
    console.error('db-sync FAILED:\n' + errors.map((e) => `  - ${e}`).join('\n'));
    process.exit(1);
  }

  console.log('db-sync OK: local migrations match remote (' + local.length + ' files)');
  for (const m of local) {
    console.log(`  ${m.version} ${m.name}`);
  }
}

main();
