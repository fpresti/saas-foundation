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

  await signIn(client, env.TEST_OWNER_EMAIL, env.TEST_OWNER_PASSWORD);

  const taxId = uniqueTaxId('INV');
  const { data: created, error: createErr } = await client.rpc('create_tenant_with_owner', {
    p_tenant_name: `Invite Test ${Date.now()}`,
    p_tax_id: taxId,
    p_slug: `inv-${Date.now()}`,
  });
  if (createErr) fail(`create tenant: ${createErr.message}`);
  const tenantId = created?.[0]?.tenant_id;
  if (!tenantId) fail('no tenant for owner');

  const { data: inv, error: invErr } = await client.rpc('create_invitation', {
    p_tenant_id: tenantId,
    p_email: env.TEST_INVITEE_EMAIL,
    p_member_type: 'member',
    p_expires_in_hours: 72,
  });
  if (invErr) fail(`create_invitation: ${invErr.message}`);
  const token = inv?.[0]?.token;
  if (!token) fail('no invitation token');

  await client.auth.signOut();
  await signIn(client, env.TEST_INVITEE_EMAIL, env.TEST_INVITEE_PASSWORD);

  const { data: accepted, error: accErr } = await client.rpc('accept_invitation', {
    p_token: token,
  });
  if (accErr) fail(`accept_invitation: ${accErr.message}`);
  if (!accepted?.[0]?.tenant_id) fail('accept returned no tenant_id');

  const { data: userData } = await client.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) fail('no auth user after accept');

  const { data: members } = await client
    .from('tenant_members')
    .select('member_type')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId);
  if (!members?.length) fail('invitee not in tenant_members');

  ok(`invitation accepted for tenant ${tenantId}`);
  console.log('verify:invitations passed');
}

main().catch((e) => fail(e.message || String(e)));
