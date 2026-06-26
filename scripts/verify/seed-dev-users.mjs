#!/usr/bin/env node
import { existsSync } from 'node:fs';
import {
  createTestClient,
  defaultTestEnv,
  signIn,
  signUp,
  writeTestEnv,
  ok,
  ENV_PATH,
} from './_lib.mjs';

const env = defaultTestEnv();
writeTestEnv(env);
const client = createTestClient(env);

async function ensureUser(email, password) {
  try {
    await signIn(client, email, password);
    ok(`signed in ${email}`);
    return;
  } catch {
    /* create */
  }
  await signUp(client, email, password);
  try {
    await signIn(client, email, password);
    ok(`created and signed in ${email}`);
  } catch (e) {
    throw new Error(
      `Could not sign in ${email} after signUp (${e.message}). ` +
        `If email confirmation is enabled, confirm the user in Supabase Auth dashboard ` +
        `or set SUPABASE_SERVICE_ROLE_KEY in .env.test.local for auto-confirm.`
    );
  }
}

async function main() {
  if (existsSync(ENV_PATH)) {
    console.log(`Using/writing ${ENV_PATH}`);
  }
  await ensureUser(env.TEST_OWNER_EMAIL, env.TEST_OWNER_PASSWORD);
  await client.auth.signOut();
  await ensureUser(env.TEST_INVITEE_EMAIL, env.TEST_INVITEE_PASSWORD);
  await client.auth.signOut();
  ok('dev users ready');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
