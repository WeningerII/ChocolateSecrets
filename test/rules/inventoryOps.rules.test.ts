/**
 * ============================================================================
 * FIRESTORE RULES TESTS — inventory operations collections
 * ============================================================================
 * Covers the lots, audits, purchaseOrders, and locations collections in
 * firestore.rules. Each has the same broad shape: authenticated read; create /
 * update gated on the collection's domain validator; admin-only delete.
 *
 * Talks to the Firestore emulator (requires Java 17+ and firebase-tools).
 * Excluded from the default `npm test`; run under the emulator:
 *
 *   firebase emulators:exec --only firestore "npm run test:rules"
 *
 * Uses a UNIQUE projectId ('cs-rules-inventory') so it is isolated from the
 * sibling rules-test files sharing the same emulator instance.
 *
 * RUN AFTER: any change to firestore.rules.
 * ============================================================================
 */

import { initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, beforeEach, describe, test } from 'vitest';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'cs-rules-inventory',
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

// Helper: seed a user with a role (bypasses rules so update/delete tests have a
// real users/{uid} doc for isAdmin() to resolve against).
async function seedRole(uid: string, role: 'admin' | 'user') {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), { role, email: `${uid}@test.com` });
  });
}

// Helper: seed an arbitrary pre-existing doc (for update/delete tests).
async function seedDoc(collection: string, id: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), collection, id), data);
  });
}

// ============================================================================
// lots — read authed; create/update authed && isValidLot(); delete admin
// isValidLot: requires ['ingredientId','quantity']; quantity is number;
//   ingredientId is string(<=100); allowed fields only.
// ============================================================================
describe('lots rules', () => {
  function validLot(overrides: Record<string, unknown> = {}) {
    return {
      ingredientId: 'ing1',
      quantity: 25,
      locationId: 'loc1',
      lotNumber: 'LOT-001',
      initialQuantity: 25,
      costPerUnit: 4.5,
      poNumber: 'PO-001',
      ...overrides,
    };
  }

  test('authenticated user can read a lot', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'lots', 'lot1')));
  });

  test('unauthenticated user cannot read a lot', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'lots', 'lot1')));
  });

  test('user can create a valid lot', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'lots', 'lot1'), validLot()));
  });

  test('lot missing required quantity is denied', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'lots', 'lot1'), { ingredientId: 'ing1' }));
  });

  test('lot with non-number quantity is denied', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'lots', 'lot1'), validLot({ quantity: 'lots' })));
  });

  test('lot with an unknown field is denied', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'lots', 'lot1'), validLot({ hackerField: 'bad' })));
  });

  test('user can update a lot with valid data', async () => {
    await seedRole('alice', 'user');
    await seedDoc('lots', 'lot1', validLot());
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'lots', 'lot1'), { quantity: 10 }));
  });

  test('user cannot update a lot into an invalid state', async () => {
    await seedRole('alice', 'user');
    await seedDoc('lots', 'lot1', validLot());
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(updateDoc(doc(ctx.firestore(), 'lots', 'lot1'), { quantity: 'not-a-number' }));
  });

  test('admin can delete a lot', async () => {
    await seedRole('admin-user', 'admin');
    await seedDoc('lots', 'lot1', validLot());
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertSucceeds(deleteDoc(doc(ctx.firestore(), 'lots', 'lot1')));
  });

  test('non-admin cannot delete a lot', async () => {
    await seedRole('alice', 'user');
    await seedDoc('lots', 'lot1', validLot());
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(deleteDoc(doc(ctx.firestore(), 'lots', 'lot1')));
  });
});

// ============================================================================
// audits — read authed; create/update authed && isValidAudit(); delete admin
// isValidAudit: requires ['status','items']; status in draft|in_progress|
//   completed; items is list; allowed fields only.
// ============================================================================
describe('audits rules', () => {
  function validAudit(overrides: Record<string, unknown> = {}) {
    return {
      status: 'draft',
      items: [],
      locationId: 'loc1',
      notes: 'monthly count',
      ...overrides,
    };
  }

  test('authenticated user can read an audit', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'audits', 'a1')));
  });

  test('unauthenticated user cannot read an audit', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'audits', 'a1')));
  });

  test('user can create a valid audit', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'audits', 'a1'), validAudit()));
  });

  test('audit with invalid status is denied', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'audits', 'a1'), validAudit({ status: 'bogus_status' })));
  });

  test('audit missing required items is denied', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'audits', 'a1'), { status: 'draft' }));
  });

  test('audit with an unknown field is denied', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'audits', 'a1'), validAudit({ hackerField: 'bad' })));
  });

  test('user can update an audit with valid data', async () => {
    await seedRole('alice', 'user');
    await seedDoc('audits', 'a1', validAudit());
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'audits', 'a1'), { status: 'in_progress' }));
  });

  test('user cannot update an audit into an invalid status', async () => {
    await seedRole('alice', 'user');
    await seedDoc('audits', 'a1', validAudit());
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(updateDoc(doc(ctx.firestore(), 'audits', 'a1'), { status: 'nope' }));
  });

  test('admin can delete an audit', async () => {
    await seedRole('admin-user', 'admin');
    await seedDoc('audits', 'a1', validAudit());
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertSucceeds(deleteDoc(doc(ctx.firestore(), 'audits', 'a1')));
  });

  test('non-admin cannot delete an audit', async () => {
    await seedRole('alice', 'user');
    await seedDoc('audits', 'a1', validAudit());
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(deleteDoc(doc(ctx.firestore(), 'audits', 'a1')));
  });
});

// ============================================================================
// purchaseOrders — read authed; create/update authed && isValidPurchaseOrder();
//   delete admin
// isValidPurchaseOrder: requires ['poNumber','supplierId','status','items'];
//   poNumber/supplierId strings; status in draft|sent|partially_received|
//   fulfilled|received|cancelled; items is list; allowed fields only.
// ============================================================================
describe('purchaseOrders rules', () => {
  function validPO(overrides: Record<string, unknown> = {}) {
    return {
      poNumber: 'PO-2026-001',
      supplierId: 'sup1',
      status: 'draft',
      items: [],
      totalAmount: 100,
      notes: 'rush order',
      ...overrides,
    };
  }

  test('authenticated user can read a purchase order', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'purchaseOrders', 'po1')));
  });

  test('unauthenticated user cannot read a purchase order', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'purchaseOrders', 'po1')));
  });

  test('user can create a valid purchase order', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'purchaseOrders', 'po1'), validPO()));
  });

  test('purchase order with invalid status is denied', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'purchaseOrders', 'po1'), validPO({ status: 'bogus' })));
  });

  test('purchase order missing required supplierId is denied', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'purchaseOrders', 'po1'), {
      poNumber: 'PO-2026-001',
      status: 'draft',
      items: [],
    }));
  });

  test('purchase order with an unknown field is denied', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'purchaseOrders', 'po1'), validPO({ hackerField: 'bad' })));
  });

  test('user can update a purchase order with valid data', async () => {
    await seedRole('alice', 'user');
    await seedDoc('purchaseOrders', 'po1', validPO());
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'purchaseOrders', 'po1'), { status: 'sent' }));
  });

  test('user cannot update a purchase order into an invalid status', async () => {
    await seedRole('alice', 'user');
    await seedDoc('purchaseOrders', 'po1', validPO());
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(updateDoc(doc(ctx.firestore(), 'purchaseOrders', 'po1'), { status: 'not-real' }));
  });

  test('admin can delete a purchase order', async () => {
    await seedRole('admin-user', 'admin');
    await seedDoc('purchaseOrders', 'po1', validPO());
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertSucceeds(deleteDoc(doc(ctx.firestore(), 'purchaseOrders', 'po1')));
  });

  test('non-admin cannot delete a purchase order', async () => {
    await seedRole('alice', 'user');
    await seedDoc('purchaseOrders', 'po1', validPO());
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(deleteDoc(doc(ctx.firestore(), 'purchaseOrders', 'po1')));
  });
});

// ============================================================================
// locations — read authed; create/update authed && isValidString('name',200)
//   && hasOnlyAllowedFields(['name','updatedAt','createdAt']); delete admin
// ============================================================================
describe('locations rules', () => {
  test('authenticated user can read a location', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'locations', 'loc1')));
  });

  test('unauthenticated user cannot read a location', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'locations', 'loc1')));
  });

  test('user can create a valid location', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'locations', 'loc1'), { name: 'Walk-in Fridge' }));
  });

  test('location with an extra field is denied (hasOnlyAllowedFields)', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'locations', 'loc1'), {
      name: 'Walk-in Fridge',
      temperature: 4,
    }));
  });

  test('location with a name over 200 chars is denied', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'locations', 'loc1'), {
      name: 'a'.repeat(201),
    }));
  });

  test('location with a non-string name is denied', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'locations', 'loc1'), { name: 123 }));
  });

  test('user can update a location name', async () => {
    await seedRole('alice', 'user');
    await seedDoc('locations', 'loc1', { name: 'Old Name' });
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'locations', 'loc1'), { name: 'New Name' }));
  });

  test('admin can delete a location', async () => {
    await seedRole('admin-user', 'admin');
    await seedDoc('locations', 'loc1', { name: 'Walk-in Fridge' });
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertSucceeds(deleteDoc(doc(ctx.firestore(), 'locations', 'loc1')));
  });

  test('non-admin cannot delete a location', async () => {
    await seedRole('alice', 'user');
    await seedDoc('locations', 'loc1', { name: 'Walk-in Fridge' });
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(deleteDoc(doc(ctx.firestore(), 'locations', 'loc1')));
  });
});
