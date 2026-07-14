/**
 * ============================================================================
 * FIRESTORE RULES TESTS — SECURITY-CRITICAL, CLOUD-FUNCTION-ONLY COLLECTIONS
 * ============================================================================
 * These collections are written EXCLUSIVELY by trusted Cloud Functions (admin
 * SDK, which bypasses these rules). The whole point of the rules below is to
 * stop a malicious/compromised CLIENT from writing them directly and thereby
 * bypassing a server-enforced invariant:
 *
 *   - payments        — the money ledger. Clients must never mint a payment;
 *                        only the recordPayment CF may. (create/update: if false)
 *   - userQuotas      — the Gemini rate-limit counter. If a client could reset
 *                        or inflate its own quota it would defeat rate limiting.
 *                        (write: if false, read own only)
 *   - translationCache— server-populated cache. (write: if false)
 *   - archivedLots    — lot archive written by the archive CF. (create/update: false)
 *   - alerts          — server-generated notifications. Clients may ONLY toggle
 *                        dismissedAt/updatedAt on their OWN alert; never create,
 *                        never edit other fields, never touch another user's.
 *
 * This file has its OWN isolated test environment (unique projectId
 * 'cs-rules-security') so it can run alongside the other rules test files in
 * the same emulator. It is run via `npm run test:rules` under
 * `firebase emulators:exec --only firestore`.
 *
 * RUN AFTER: any change to firestore.rules (especially the CF-only match blocks).
 * ============================================================================
 */

import { initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, beforeEach, describe, test } from 'vitest';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    // Unique projectId keeps this suite's data isolated from sibling rules
    // test files sharing the single emulator instance.
    projectId: 'cs-rules-security',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

// Helper: seed a user with a role so isAdmin()/ownership checks resolve.
async function seedRole(uid: string, role: 'admin' | 'user') {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), { role, email: `${uid}@test.com` });
  });
}

// Helper: seed an arbitrary pre-existing document bypassing rules, so that
// update/delete/read tests act on a doc that actually exists.
async function seedDoc(collection: string, id: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), collection, id), data);
  });
}

// ============================================================================
// payments — the money ledger. Only recordPayment CF (admin SDK) writes.
//   read:            if isAuthenticated()
//   create, update:  if false
//   delete:          if isAdmin()
// ============================================================================
describe('payments — CF-only ledger (create/update locked, delete admin)', () => {
  // A fully SCHEMA-VALID payment, to prove the denial is the `if false` gate
  // and NOT a validation failure.
  function validPayment(overrides: Record<string, unknown> = {}) {
    return {
      paymentDate: serverTimestamp(),
      amount: 100,
      method: 'ach',
      billAllocations: [{ billId: 'b1', amount: 100 }],
      ...overrides,
    };
  }

  test('authenticated user can READ payments', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'payments', 'p1')));
  });

  test('unauthenticated user cannot READ payments', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'payments', 'p1')));
  });

  test('client CREATE of a payment is DENIED even when the doc is valid', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'payments', 'p1'), validPayment()));
  });

  test('client CREATE of a payment is DENIED even for an admin (CF-only)', async () => {
    await seedRole('admin-user', 'admin');
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertFails(setDoc(doc(ctx.firestore(), 'payments', 'p1'), validPayment()));
  });

  test('client UPDATE of a payment is DENIED', async () => {
    await seedDoc('payments', 'p1', { paymentDate: serverTimestamp(), amount: 100, method: 'ach', billAllocations: [] });
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(updateDoc(doc(ctx.firestore(), 'payments', 'p1'), { amount: 999 }));
  });

  test('client UPDATE of a payment is DENIED even for an admin (CF-only)', async () => {
    await seedRole('admin-user', 'admin');
    await seedDoc('payments', 'p1', { paymentDate: serverTimestamp(), amount: 100, method: 'ach', billAllocations: [] });
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertFails(updateDoc(doc(ctx.firestore(), 'payments', 'p1'), { amount: 999 }));
  });

  test('admin can DELETE a payment', async () => {
    await seedRole('admin-user', 'admin');
    await seedDoc('payments', 'p1', { paymentDate: serverTimestamp(), amount: 100, method: 'ach', billAllocations: [] });
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertSucceeds(deleteDoc(doc(ctx.firestore(), 'payments', 'p1')));
  });

  test('non-admin user cannot DELETE a payment', async () => {
    await seedRole('alice', 'user');
    await seedDoc('payments', 'p1', { paymentDate: serverTimestamp(), amount: 100, method: 'ach', billAllocations: [] });
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(deleteDoc(doc(ctx.firestore(), 'payments', 'p1')));
  });
});

// ============================================================================
// userQuotas — Gemini rate-limit counter. Own-read only; NO client writes.
//   read:   if isAuthenticated() && request.auth.uid == uid
//   write:  if false
// Tampering here would defeat the server-side Gemini rate limit, so this block
// is exercised thoroughly.
// ============================================================================
describe('userQuotas — own-read only, writes CF-only', () => {
  test('user can READ their OWN quota (uid == auth.uid)', async () => {
    await seedDoc('userQuotas', 'alice', { count: 3, windowStart: serverTimestamp() });
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'userQuotas', 'alice')));
  });

  test("user cannot READ ANOTHER uid's quota", async () => {
    await seedDoc('userQuotas', 'bob', { count: 3, windowStart: serverTimestamp() });
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(getDoc(doc(ctx.firestore(), 'userQuotas', 'bob')));
  });

  test('unauthenticated user cannot READ any quota', async () => {
    await seedDoc('userQuotas', 'alice', { count: 3, windowStart: serverTimestamp() });
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'userQuotas', 'alice')));
  });

  test('client CREATE of own quota is DENIED (would seed a bypass counter)', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'userQuotas', 'alice'), { count: 0, windowStart: serverTimestamp() }));
  });

  test('client UPDATE of own quota is DENIED (would reset the rate limit)', async () => {
    await seedDoc('userQuotas', 'alice', { count: 100, windowStart: serverTimestamp() });
    const ctx = testEnv.authenticatedContext('alice');
    // Attempt to reset the counter to dodge the limit — must be blocked.
    await assertFails(updateDoc(doc(ctx.firestore(), 'userQuotas', 'alice'), { count: 0 }));
  });

  test('even an admin cannot client-write a quota (writes are CF-only)', async () => {
    await seedRole('admin-user', 'admin');
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertFails(setDoc(doc(ctx.firestore(), 'userQuotas', 'admin-user'), { count: 0, windowStart: serverTimestamp() }));
  });
});

// ============================================================================
// translationCache — server-populated cache. Read authed; writes CF-only.
//   read:   if isAuthenticated()
//   write:  if false
// ============================================================================
describe('translationCache — read authed, writes CF-only', () => {
  test('authenticated user can READ a cache entry', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'translationCache', 'hash1')));
  });

  test('unauthenticated user cannot READ a cache entry', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'translationCache', 'hash1')));
  });

  test('client CREATE of a cache entry is DENIED', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'translationCache', 'hash1'), { source: 'hola', target: 'hello' }));
  });

  test('client UPDATE of a cache entry is DENIED', async () => {
    await seedDoc('translationCache', 'hash1', { source: 'hola', target: 'hello' });
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(updateDoc(doc(ctx.firestore(), 'translationCache', 'hash1'), { target: 'poisoned' }));
  });
});

// ============================================================================
// archivedLots — lot archive written by CF. Read authed; create/update CF-only;
//                delete admin.
//   read:            if isAuthenticated()
//   create, update:  if false
//   delete:          if isAdmin()
// ============================================================================
describe('archivedLots — read authed, create/update CF-only, delete admin', () => {
  function archivedLot(overrides: Record<string, unknown> = {}) {
    return { ingredientId: 'ing1', quantity: 0, lotNumber: 'L-100', archivedAt: serverTimestamp(), ...overrides };
  }

  test('authenticated user can READ an archived lot', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'archivedLots', 'al1')));
  });

  test('unauthenticated user cannot READ an archived lot', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'archivedLots', 'al1')));
  });

  test('client CREATE of an archived lot is DENIED', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'archivedLots', 'al1'), archivedLot()));
  });

  test('client UPDATE of an archived lot is DENIED', async () => {
    await seedDoc('archivedLots', 'al1', archivedLot());
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(updateDoc(doc(ctx.firestore(), 'archivedLots', 'al1'), { quantity: 999 }));
  });

  test('admin can DELETE an archived lot', async () => {
    await seedRole('admin-user', 'admin');
    await seedDoc('archivedLots', 'al1', archivedLot());
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertSucceeds(deleteDoc(doc(ctx.firestore(), 'archivedLots', 'al1')));
  });

  test('non-admin user cannot DELETE an archived lot', async () => {
    await seedRole('alice', 'user');
    await seedDoc('archivedLots', 'al1', archivedLot());
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(deleteDoc(doc(ctx.firestore(), 'archivedLots', 'al1')));
  });
});

// ============================================================================
// alerts — server-generated, per-user notifications. This is the most nuanced
// block, so it gets the most coverage.
//   read:    if isAuthenticated() && resource.data.userId == request.auth.uid
//   create:  if false                          (CF-only)
//   update:  owner AND diff().affectedKeys().hasOnly(['dismissedAt','updatedAt'])
//   delete:  if isAdmin()
// Alerts are seeded via withSecurityRulesDisabled because the read/update rules
// reference resource.data.userId — the doc must already exist for the rule to
// evaluate (and to be owned by the acting user).
// ============================================================================
describe('alerts — owner-scoped read, CF-only create, dismiss-only update', () => {
  function alertDoc(userId: string, overrides: Record<string, unknown> = {}) {
    return {
      userId,
      type: 'low_stock',
      severity: 'warning',
      title: 'Low stock: Cocoa Butter',
      message: 'Below par level',
      createdAt: serverTimestamp(),
      ...overrides,
    };
  }

  // ---- read ---------------------------------------------------------------
  test('owner can READ their OWN alert', async () => {
    await seedDoc('alerts', 'a1', alertDoc('alice'));
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'alerts', 'a1')));
  });

  test("user cannot READ ANOTHER user's alert", async () => {
    await seedDoc('alerts', 'a1', alertDoc('bob'));
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(getDoc(doc(ctx.firestore(), 'alerts', 'a1')));
  });

  test('unauthenticated user cannot READ any alert', async () => {
    await seedDoc('alerts', 'a1', alertDoc('alice'));
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'alerts', 'a1')));
  });

  // ---- create -------------------------------------------------------------
  test('client CREATE of an alert is DENIED even when owned by the caller (CF-only)', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'alerts', 'a_new'), alertDoc('alice')));
  });

  test('client CREATE of an alert is DENIED even for an admin (CF-only)', async () => {
    await seedRole('admin-user', 'admin');
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertFails(setDoc(doc(ctx.firestore(), 'alerts', 'a_new'), alertDoc('admin-user')));
  });

  // ---- update: allowed (dismiss) ------------------------------------------
  test('owner UPDATE changing ONLY dismissedAt (+updatedAt) is ALLOWED', async () => {
    await seedDoc('alerts', 'a1', alertDoc('alice'));
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'alerts', 'a1'), {
      dismissedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
  });

  test('owner UPDATE changing ONLY dismissedAt (without updatedAt) is ALLOWED (subset of the allowed keys)', async () => {
    await seedDoc('alerts', 'a1', alertDoc('alice'));
    const ctx = testEnv.authenticatedContext('alice');
    // affectedKeys == ['dismissedAt'] which is still hasOnly(['dismissedAt','updatedAt']).
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'alerts', 'a1'), {
      dismissedAt: serverTimestamp(),
    }));
  });

  // ---- update: denied -----------------------------------------------------
  test('owner UPDATE changing a non-allowed field (title) is DENIED', async () => {
    await seedDoc('alerts', 'a1', alertDoc('alice'));
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(updateDoc(doc(ctx.firestore(), 'alerts', 'a1'), { title: 'Tampered title' }));
  });

  test('owner UPDATE changing severity is DENIED', async () => {
    await seedDoc('alerts', 'a1', alertDoc('alice'));
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(updateDoc(doc(ctx.firestore(), 'alerts', 'a1'), { severity: 'critical' }));
  });

  test('owner UPDATE touching dismissedAt AND a forbidden field (title) is DENIED', async () => {
    await seedDoc('alerts', 'a1', alertDoc('alice'));
    const ctx = testEnv.authenticatedContext('alice');
    // affectedKeys == ['dismissedAt','title'] — not a subset of the allowed set.
    await assertFails(updateDoc(doc(ctx.firestore(), 'alerts', 'a1'), {
      dismissedAt: serverTimestamp(),
      title: 'Sneaky edit',
    }));
  });

  test("non-owner cannot UPDATE (dismiss) another user's alert", async () => {
    await seedDoc('alerts', 'a1', alertDoc('bob'));
    const ctx = testEnv.authenticatedContext('alice');
    // Ownership fails even though the affectedKeys constraint would pass.
    await assertFails(updateDoc(doc(ctx.firestore(), 'alerts', 'a1'), {
      dismissedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
  });

  // ---- delete -------------------------------------------------------------
  test('admin can DELETE an alert', async () => {
    await seedRole('admin-user', 'admin');
    await seedDoc('alerts', 'a1', alertDoc('alice'));
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertSucceeds(deleteDoc(doc(ctx.firestore(), 'alerts', 'a1')));
  });

  test('owner (non-admin) cannot DELETE their own alert', async () => {
    await seedRole('alice', 'user');
    await seedDoc('alerts', 'a1', alertDoc('alice'));
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(deleteDoc(doc(ctx.firestore(), 'alerts', 'a1')));
  });
});
