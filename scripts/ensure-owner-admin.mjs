#!/usr/bin/env node
// Ensures the project owner's users/{uid} doc has role: "admin" BEFORE the
// security rules deploy. ADR-0007 removed the email-based admin backdoor from
// firestore.rules, making the users doc the single source of admin truth — so
// deploying those rules without this doc in place would lock the owner out of
// admin features. This runs in the deploy-firestore workflow with the
// service-account credential (Admin SDK bypasses rules) and is idempotent:
// if the role is already "admin" it changes nothing.
//
// Consistent with ADR-0007: this WRITES the role doc (the legitimate admin
// source); it does not reintroduce any rules-level bypass.
//
// Env: OWNER_EMAIL (required), FIRESTORE_DATABASE_ID (required),
//      GOOGLE_APPLICATION_CREDENTIALS (prod) or emulator hosts (tests).

import { createRequire } from 'node:module';
// firebase-admin lives in functions/node_modules (installed by the root
// postinstall); resolve it from there so root package.json stays lean.
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const OWNER_EMAIL = process.env.OWNER_EMAIL;
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID;
const PROJECT_ID =
  process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'absolute-pulsar-301421';

if (!OWNER_EMAIL || !DATABASE_ID) {
  console.error('✗ OWNER_EMAIL and FIRESTORE_DATABASE_ID must be set.');
  process.exit(1);
}

const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const app = usingEmulator
  ? initializeApp({ projectId: PROJECT_ID })
  : initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });

try {
  const user = await getAuth(app).getUserByEmail(OWNER_EMAIL);
  const db = getFirestore(app, DATABASE_ID);
  const ref = db.collection('users').doc(user.uid);
  const snap = await ref.get();
  const currentRole = snap.exists ? snap.get('role') : undefined;

  if (currentRole === 'admin') {
    console.log(`✓ ${OWNER_EMAIL} (uid ${user.uid}) already has role "admin" — nothing to do.`);
  } else {
    await ref.set({ role: 'admin' }, { merge: true });
    console.log(
      `✓ Set role "admin" on users/${user.uid} for ${OWNER_EMAIL} (was: ${currentRole ?? 'no doc/field'}).`,
    );
  }
  process.exit(0);
} catch (err) {
  if (err && err.code === 'auth/user-not-found') {
    console.error(
      `✗ No Firebase Auth user exists for ${OWNER_EMAIL}. Sign in to the app once with that account, then re-run this workflow.`,
    );
  } else {
    console.error('✗ ensure-owner-admin failed:', err?.message || err);
  }
  // Fail loudly: deploying the ADR-0007 rules without a confirmed admin doc
  // would lock the owner out. The workflow stops here rather than proceeding.
  process.exit(1);
}
