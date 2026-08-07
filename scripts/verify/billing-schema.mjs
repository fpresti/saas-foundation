#!/usr/bin/env node
/**
 * Smoke asserts for billing data model (#49).
 * Run: npm run verify:billing-schema
 */
import { createTestClient, loadTestEnv, signIn, ok, fail } from './_lib.mjs';

async function main() {
  const env = loadTestEnv();
  const client = createTestClient(env);

  await signIn(client, env.TEST_OWNER_EMAIL, env.TEST_OWNER_PASSWORD);
  const { data: ctx } = await client.rpc('get_access_context');
  const tenantId = ctx?.[0]?.tenant_id;
  if (!tenantId) fail('owner has no tenant');

  const { data: sub, error: subErr } = await client
    .from('subscriptions')
    .select(
      'tenant_id, plan_id, status, billing_customer_id, provider_subscription_id, provider, canceled_at, current_period_end'
    )
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (subErr) fail(`subscriptions select: ${subErr.message}`);
  if (!sub) fail('owner subscription missing');
  ok('subscriptions billing columns selectable');

  const { error: guardErr } = await client
    .from('subscriptions')
    .update({ billing_customer_id: 'cus_should_fail' })
    .eq('tenant_id', tenantId);
  if (!guardErr) fail('owner must not update billing_customer_id');
  ok('owner blocked from writing billing_customer_id');

  const { data: invoices, error: invErr } = await client
    .from('invoices')
    .select('id, status, amount_cents, provider_invoice_id')
    .eq('tenant_id', tenantId)
    .limit(5);
  if (invErr) fail(`invoices select: ${invErr.message}`);
  ok(`invoices readable by owner (count=${invoices?.length ?? 0})`);

  const { error: invWriteErr } = await client.from('invoices').insert({
    tenant_id: tenantId,
    amount_cents: 100,
    currency: 'usd',
    status: 'open',
    provider: 'stripe',
    provider_invoice_id: `inv_test_${Date.now()}`,
  });
  if (!invWriteErr) fail('owner must not insert invoices');
  ok('owner blocked from inserting invoices');

  const { data: plans, error: plansErr } = await client
    .from('plans')
    .select('id, name, provider_price_id')
    .limit(3);
  if (plansErr) fail(`plans.provider_price_id: ${plansErr.message}`);
  if (!plans?.length) fail('no plans');
  ok('plans.provider_price_id selectable');

  // Invitee / non-owner should not read invoices (use invitee if they share a tenant — create fresh)
  const taxId = `BILL-${Date.now()}`;
  const { data: created, error: createErr } = await client.rpc('create_tenant_with_owner', {
    p_tenant_name: `Billing Schema ${Date.now()}`,
    p_tax_id: taxId,
    p_slug: `bill-${Date.now()}`,
  });
  if (createErr) fail(createErr.message);
  const newTenantId = created?.[0]?.tenant_id;
  if (!newTenantId) fail('no tenant');

  const { data: inv, error: invCreateErr } = await client.rpc('create_invitation', {
    p_tenant_id: newTenantId,
    p_email: env.TEST_INVITEE_EMAIL,
    p_member_type: 'member',
    p_expires_in_hours: 72,
  });
  if (invCreateErr) fail(invCreateErr.message);
  const token = inv?.[0]?.token;
  if (!token) fail('no token');

  await client.auth.signOut();
  await signIn(client, env.TEST_INVITEE_EMAIL, env.TEST_INVITEE_PASSWORD);
  const { error: accErr } = await client.rpc('accept_invitation', { p_token: token });
  if (accErr) fail(accErr.message);

  const { data: memberInvoices, error: memberInvErr } = await client
    .from('invoices')
    .select('id')
    .eq('tenant_id', newTenantId);
  if (memberInvErr) fail(memberInvErr.message);
  if ((memberInvoices ?? []).length > 0) {
    fail('non-owner should not see invoices (got rows)');
  }
  ok('non-owner invoices select empty (RLS)');

  console.log('verify:billing-schema passed');
}

main().catch((e) => fail(e.message || String(e)));
