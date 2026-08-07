#!/usr/bin/env node
/**
 * Smoke asserts for has_permission gates, catalog RLS, and change_tenant_plan.
 * Run: npm run verify:authz-gates
 */
import {
  createTestClient,
  createServiceClient,
  loadTestEnv,
  signIn,
  ok,
  fail,
} from './_lib.mjs';

async function expectPerm(client, tenantId, code, want, label) {
  const { data, error } = await client.rpc('has_permission', {
    p_tenant_id: tenantId,
    p_permission_code: code,
  });
  if (error) fail(`${label} has_permission(${code}): ${error.message}`);
  if (Boolean(data) !== want) {
    fail(`${label} has_permission(${code}): expected ${want}, got ${data}`);
  }
}

async function main() {
  const env = loadTestEnv();
  const client = createTestClient(env);

  // --- Owner: create isolated tenant ---
  await signIn(client, env.TEST_OWNER_EMAIL, env.TEST_OWNER_PASSWORD);
  const taxId = `AUTHZ-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const { data: created, error: createErr } = await client.rpc('create_tenant_with_owner', {
    p_tenant_name: `Authz Gate ${Date.now()}`,
    p_tax_id: taxId,
    p_slug: `authz-${Date.now()}`,
  });
  if (createErr) fail(`create tenant: ${createErr.message}`);
  const tenantId = created?.[0]?.tenant_id;
  if (!tenantId) fail('no tenant for owner');

  // Owner bypass for tenant-scoped codes
  await expectPerm(client, tenantId, 'members.read', true, 'owner');
  await expectPerm(client, tenantId, 'roles.assign', true, 'owner');
  await expectPerm(client, tenantId, 'settings.read', true, 'owner');
  // platform.* never via owner
  await expectPerm(client, tenantId, 'platform.features_read', false, 'owner');
  ok('owner: tenant perms allow, platform.* deny');

  // Catalog write denied for owner
  const { error: featErr } = await client.from('features').insert({
    code: `tmp_${Date.now()}`,
    name: 'tmp',
  });
  if (!featErr) fail('owner should not insert into features');
  ok('owner: features insert denied');

  // change_tenant_plan as owner
  const { data: plans, error: plansErr } = await client
    .from('plans')
    .select('id, name')
    .limit(5);
  if (plansErr) fail(plansErr.message);
  if (!plans?.length) fail('no plans');
  const targetPlan =
    plans.find((p) => p.name === 'premium') ??
    plans.find((p) => p.name !== 'free') ??
    plans[0];
  const { error: planChangeErr } = await client.rpc('change_tenant_plan', {
    p_tenant_id: tenantId,
    p_plan_id: targetPlan.id,
  });
  if (planChangeErr) fail(`owner change_tenant_plan: ${planChangeErr.message}`);
  ok(`owner: change_tenant_plan → ${targetPlan.name}`);

  // Permission codes use {feature}.{action} and feature_id
  const { data: perms, error: permErr } = await client
    .from('permissions')
    .select('code, feature_id')
    .in('code', ['members.read', 'roles.assign', 'settings.read']);
  if (permErr) fail(permErr.message);
  for (const code of ['members.read', 'roles.assign', 'settings.read']) {
    const row = (perms ?? []).find((p) => p.code === code);
    if (!row) fail(`permission ${code} missing`);
    if (!row.feature_id) fail(`permission ${code} missing feature_id`);
    if (!/^[a-z_]+\.[a-z_]+$/.test(code)) fail(`unexpected code shape: ${code}`);
  }
  ok('permissions: feature_id set for core codes');

  // Invite collaborator
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
  const { error: accErr } = await client.rpc('accept_invitation', { p_token: token });
  if (accErr) fail(`accept_invitation: ${accErr.message}`);

  // Collaborator: role ∩ plan feature
  await expectPerm(client, tenantId, 'members.read', true, 'collaborator');
  await expectPerm(client, tenantId, 'settings.read', true, 'collaborator');
  await expectPerm(client, tenantId, 'roles.assign', false, 'collaborator');
  await expectPerm(client, tenantId, 'members.invite', false, 'collaborator');
  await expectPerm(client, tenantId, 'platform.features_read', false, 'collaborator');
  ok('collaborator: matrix allow/deny');

  // change_tenant_plan denied for non-owner
  const { error: deniedPlan } = await client.rpc('change_tenant_plan', {
    p_tenant_id: tenantId,
    p_plan_id: plans[0].id,
  });
  if (!deniedPlan) fail('collaborator should not change_tenant_plan');
  ok('collaborator: change_tenant_plan denied');

  // Feature gating on an *isolated* plan (does not mutate shared free/premium).
  // Requires SUPABASE_SERVICE_ROLE_KEY.
  const admin = createServiceClient(env);
  if (!admin) {
    ok('feature-gate unlink skipped (set SUPABASE_SERVICE_ROLE_KEY to enable)');
  } else {
    const stamp = Date.now();
    const { data: tmpPlan, error: planInsErr } = await admin
      .from('plans')
      .insert({
        name: `authz-gate-${stamp}`,
        price: 0,
        description: 'verify:authz-gates isolated',
      })
      .select('id')
      .single();
    if (planInsErr) fail(`create tmp plan: ${planInsErr.message}`);

    const { data: featRows, error: featErr } = await admin
      .from('features')
      .select('id, code')
      .in('code', ['profile', 'members', 'roles', 'settings', 'subscription']);
    if (featErr) fail(featErr.message);
    const membersFeat = (featRows ?? []).find((f) => f.code === 'members');
    if (!membersFeat) fail('members feature missing');

    const { error: pfErr } = await admin.from('plan_features').insert(
      (featRows ?? []).map((f) => ({ plan_id: tmpPlan.id, feature_id: f.id }))
    );
    if (pfErr) fail(`seed plan_features: ${pfErr.message}`);

    // Switch tenant to isolated plan as owner
    await client.auth.signOut();
    await signIn(client, env.TEST_OWNER_EMAIL, env.TEST_OWNER_PASSWORD);
    const { error: switchErr } = await client.rpc('change_tenant_plan', {
      p_tenant_id: tenantId,
      p_plan_id: tmpPlan.id,
    });
    if (switchErr) fail(`switch to tmp plan: ${switchErr.message}`);

    await client.auth.signOut();
    await signIn(client, env.TEST_INVITEE_EMAIL, env.TEST_INVITEE_PASSWORD);
    await expectPerm(client, tenantId, 'members.read', true, 'collaborator-on-tmp-plan');

    const { error: delErr } = await admin
      .from('plan_features')
      .delete()
      .eq('plan_id', tmpPlan.id)
      .eq('feature_id', membersFeat.id);
    if (delErr) fail(`unlink members on tmp plan: ${delErr.message}`);

    try {
      await expectPerm(client, tenantId, 'members.read', false, 'collaborator-no-feature');
      ok('collaborator: members.read denied when feature not on plan');
    } finally {
      await admin.from('plan_features').insert({
        plan_id: tmpPlan.id,
        feature_id: membersFeat.id,
      });
      // leave tmp plan in place; harmless. Prefer free restore:
      const { data: freePlan } = await admin
        .from('plans')
        .select('id')
        .eq('name', 'free')
        .maybeSingle();
      if (freePlan?.id) {
        await signIn(client, env.TEST_OWNER_EMAIL, env.TEST_OWNER_PASSWORD);
        await client.rpc('change_tenant_plan', {
          p_tenant_id: tenantId,
          p_plan_id: freePlan.id,
        });
      }
    }

    await signIn(client, env.TEST_INVITEE_EMAIL, env.TEST_INVITEE_PASSWORD);
    await expectPerm(client, tenantId, 'members.read', true, 'collaborator-restored');
    ok('collaborator: members.read restored after plan_features re-link');
  }

  console.log('verify:authz-gates passed');
}

main().catch((e) => fail(e.message || String(e)));
