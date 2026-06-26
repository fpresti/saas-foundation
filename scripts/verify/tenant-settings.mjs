#!/usr/bin/env node
import { createTestClient, loadTestEnv, signIn, ok, fail } from './_lib.mjs';

async function main() {
  const env = loadTestEnv();
  const client = createTestClient(env);
  await signIn(client, env.TEST_OWNER_EMAIL, env.TEST_OWNER_PASSWORD);
  const { data: ctx } = await client.rpc('get_access_context');
  const tenantId = ctx?.[0]?.tenant_id;
  if (!tenantId) fail('owner has no tenant');

  const { data: tenant, error } = await client
    .from('tenants')
    .select('name, slug, status')
    .eq('id', tenantId)
    .maybeSingle();
  if (error) fail(error.message);
  if (!tenant?.name) fail('tenant not readable');
  ok(`tenant settings ${tenant.name}`);
  console.log('verify:tenant-settings passed');
}

main().catch((e) => fail(e.message || String(e)));
