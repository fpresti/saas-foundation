#!/usr/bin/env node
import { createTestClient, loadTestEnv, signIn, ok, fail } from './_lib.mjs';

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
  ok(`roles query returned ${roles?.length ?? 0} rows`);
  console.log('verify:roles-read passed');
}

main().catch((e) => fail(e.message || String(e)));
