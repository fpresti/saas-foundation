#!/usr/bin/env node
import { createTestClient, loadTestEnv, signIn, ok, fail } from './_lib.mjs';

const EXPECTED = ['tenant_manager', 'collaborator', 'viewer'];

async function main() {
  const env = loadTestEnv();
  const client = createTestClient(env);
  await signIn(client, env.TEST_OWNER_EMAIL, env.TEST_OWNER_PASSWORD);
  const { data: ctx } = await client.rpc('get_access_context');
  const tenantId = ctx?.[0]?.tenant_id;
  if (!tenantId) fail('owner has no tenant');

  const { data: roles, error } = await client
    .from('roles')
    .select('id, code')
    .eq('tenant_id', tenantId);
  if (error) fail(error.message);
  const codes = new Set((roles ?? []).map((r) => r.code));
  for (const code of EXPECTED) {
    if (!codes.has(code)) fail(`missing system role ${code} (have: ${[...codes].join(',')})`);
  }
  ok(`roles query returned system roles: ${EXPECTED.join(', ')}`);
  console.log('verify:roles-read passed');
}

main().catch((e) => fail(e.message || String(e)));
