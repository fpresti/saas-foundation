#!/usr/bin/env node
import {
  createTestClient,
  loadTestEnv,
  signIn,
  uniqueTaxId,
  ok,
  fail,
} from './_lib.mjs';

async function main() {
  const env = loadTestEnv();
  const client = createTestClient(env);

  try {
    await signIn(client, env.TEST_OWNER_EMAIL, env.TEST_OWNER_PASSWORD);
  } catch (e) {
    fail(`signIn owner: ${e.message}`);
  }

  const taxId = uniqueTaxId('ONBOARD');
  const tenantName = `Verify Tenant ${Date.now()}`;
  const slug = `verify-${Date.now()}`;

  const { data: created, error: createErr } = await client.rpc('create_tenant_with_owner', {
    p_tenant_name: tenantName,
    p_tax_id: taxId,
    p_slug: slug,
  });
  if (createErr) fail(`create_tenant_with_owner: ${createErr.message}`);
  const tenantId = created?.[0]?.tenant_id;
  if (!tenantId) fail('no tenant_id returned');

  const { data: ctx, error: ctxErr } = await client.rpc('get_access_context', {
    p_tenant_id: tenantId,
  });
  if (ctxErr) fail(`get_access_context: ${ctxErr.message}`);
  const row = ctx?.[0];
  if (!row?.tenant_id) fail('access context missing tenant_id');
  if (row.tenant_id !== tenantId) fail('tenant_id mismatch in access context');

  const { data: members, error: memErr } = await client
    .from('tenant_members')
    .select('member_type')
    .eq('tenant_id', tenantId);
  if (memErr) fail(`tenant_members: ${memErr.message}`);
  if (!members?.some((m) => m.member_type === 'owner')) fail('owner membership missing');

  ok(`tenant onboarding ${tenantId}`);
  console.log('verify:tenant-onboarding passed');
}

main().catch((e) => fail(e.message || String(e)));
