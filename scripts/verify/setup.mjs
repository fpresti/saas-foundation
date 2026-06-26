#!/usr/bin/env node
import { createTestClient, loadTestEnv, signIn, ok, fail } from './_lib.mjs';

async function main() {
  const env = loadTestEnv();
  const client = createTestClient(env);
  await signIn(client, env.TEST_OWNER_EMAIL, env.TEST_OWNER_PASSWORD);
  ok(`owner session ${env.TEST_OWNER_EMAIL}`);
  await client.auth.signOut();
  await signIn(client, env.TEST_INVITEE_EMAIL, env.TEST_INVITEE_PASSWORD);
  ok(`invitee session ${env.TEST_INVITEE_EMAIL}`);
  await client.auth.signOut();
  console.log('verify:setup passed');
}

main().catch((e) => {
  fail(e.message || String(e));
});
