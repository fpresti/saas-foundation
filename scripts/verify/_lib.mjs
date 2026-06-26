import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ENV_PATH = join(ROOT, '.env.test.local');
const ENV_EXAMPLE = join(ROOT, '.env.test.local.example');

export function loadTestEnv() {
  const fromFile = existsSync(ENV_PATH) ? parseEnvFile(readFileSync(ENV_PATH, 'utf8')) : {};
  const env = {
    SUPABASE_URL: fromFile.SUPABASE_URL ?? process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: fromFile.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY,
    TEST_OWNER_EMAIL: fromFile.TEST_OWNER_EMAIL ?? process.env.TEST_OWNER_EMAIL,
    TEST_OWNER_PASSWORD: fromFile.TEST_OWNER_PASSWORD ?? process.env.TEST_OWNER_PASSWORD,
    TEST_INVITEE_EMAIL: fromFile.TEST_INVITEE_EMAIL ?? process.env.TEST_INVITEE_EMAIL,
    TEST_INVITEE_PASSWORD: fromFile.TEST_INVITEE_PASSWORD ?? process.env.TEST_INVITEE_PASSWORD,
  };
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'TEST_OWNER_EMAIL',
    'TEST_OWNER_PASSWORD',
    'TEST_INVITEE_EMAIL',
    'TEST_INVITEE_PASSWORD',
  ];
  for (const k of required) {
    if (!env[k]) {
      throw new Error(
        `Missing ${k}. Copy .env.test.local.example or run: npm run verify:seed-users`
      );
    }
  }
  return env;
}

function parseEnvFile(raw) {
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

export function writeTestEnv(env) {
  const lines = [
    '# Auto-generated / local only — do not commit',
    `SUPABASE_URL=${env.SUPABASE_URL}`,
    `SUPABASE_ANON_KEY=${env.SUPABASE_ANON_KEY}`,
    `TEST_OWNER_EMAIL=${env.TEST_OWNER_EMAIL}`,
    `TEST_OWNER_PASSWORD=${env.TEST_OWNER_PASSWORD}`,
    `TEST_INVITEE_EMAIL=${env.TEST_INVITEE_EMAIL}`,
    `TEST_INVITEE_PASSWORD=${env.TEST_INVITEE_PASSWORD}`,
    '',
  ];
  writeFileSync(ENV_PATH, lines.join('\n'), 'utf8');
}

export function defaultTestEnv() {
  return {
    SUPABASE_URL: 'https://ynwlidadbattxknclxyd.supabase.co',
    SUPABASE_ANON_KEY:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlud2xpZGFkYmF0dHhrbmNseHlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NzgzNjQsImV4cCI6MjA4NjU1NDM2NH0.QULRS1Q4NW40RiJ7oe-JBaeCDT_Ypzn59DP6sj7iAUI',
    TEST_OWNER_EMAIL: 'dev-owner@saas-foundation.local',
    TEST_OWNER_PASSWORD: 'DevTestOwner1!',
    TEST_INVITEE_EMAIL: 'dev-invitee@saas-foundation.local',
    TEST_INVITEE_PASSWORD: 'DevTestInvitee1!',
  };
}

export function createTestClient(env = loadTestEnv()) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}

export async function signIn(client, email, password) {
  await client.auth.signOut();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return data.session;
}

export async function signUp(client, email, password) {
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw new Error(`signUp ${email}: ${error.message}`);
  return data;
}

export function uniqueTaxId(prefix = 'TEST') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

export function ok(msg) {
  console.log(`OK: ${msg}`);
}

export { ENV_EXAMPLE, ENV_PATH, ROOT };
