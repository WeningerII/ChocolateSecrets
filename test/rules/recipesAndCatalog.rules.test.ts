/**
 * ============================================================================
 * FIRESTORE RULES TESTS — recipes, suppliers, vendors
 * ============================================================================
 * Covers the app's core `recipes` collection plus the `suppliers` and
 * `vendors` catalog collections. Mirrors the setup pattern of
 * test/rules/firestore.rules.test.ts but uses a UNIQUE projectId so it stays
 * isolated from sibling rules-test files sharing the same emulator.
 *
 * Run through the emulator (a later Gate phase runs the whole suite once):
 *   firebase emulators:exec --only firestore "npm run test:rules"
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
    projectId: 'cs-rules-recipes',
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

// Helper: seed a user with a role (bypasses rules so isAdmin() can resolve).
async function seedRole(uid: string, role: 'admin' | 'user') {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), { role, email: `${uid}@test.com` });
  });
}

// ===========================================================================
// recipes — read authed; create/update if authed AND (admin OR (isValidRecipe()
// AND components.size() <= 50)); delete admin-only.
// ===========================================================================
describe('recipes rules', () => {
  // Minimal doc satisfying isValidRecipe(): name is required, a non-empty
  // string <= 200 chars, and (if present) components must be a list.
  function validRecipe(overrides: Record<string, unknown> = {}) {
    return { name: 'Dark Truffle', ...overrides };
  }

  function components(n: number) {
    return Array.from({ length: n }, (_, i) => ({ ingredientId: `ing${i}`, quantity: 1 }));
  }

  async function seedRecipe(id: string, overrides: Record<string, unknown> = {}) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'recipes', id), validRecipe(overrides));
    });
  }

  test('authenticated user can read recipes', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'recipes', 'r1')));
  });

  test('unauthenticated user cannot read recipes', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'recipes', 'r1')));
  });

  test('non-admin can create a valid recipe', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'recipes', 'r1'), validRecipe()));
  });

  test('non-admin can create a recipe with exactly 50 components (boundary)', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'recipes', 'r50'), validRecipe({ components: components(50) })));
  });

  test('non-admin cannot create a recipe with 51+ components', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'recipes', 'r51'), validRecipe({ components: components(51) })));
  });

  test('admin can create a recipe with 51+ components (admin bypasses the limit)', async () => {
    await seedRole('admin-user', 'admin');
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'recipes', 'r51a'), validRecipe({ components: components(51) })));
  });

  test('non-admin can perform a valid update', async () => {
    await seedRole('alice', 'user');
    await seedRecipe('r1');
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'recipes', 'r1'), { description: 'Delicious' }));
  });

  test('admin can update a recipe regardless (past the 50-component limit)', async () => {
    await seedRole('admin-user', 'admin');
    await seedRecipe('r1');
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'recipes', 'r1'), { components: components(51) }));
  });

  test('admin can delete a recipe', async () => {
    await seedRole('admin-user', 'admin');
    await seedRecipe('r1');
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertSucceeds(deleteDoc(doc(ctx.firestore(), 'recipes', 'r1')));
  });

  test('non-admin cannot delete a recipe', async () => {
    await seedRole('alice', 'user');
    await seedRecipe('r1');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(deleteDoc(doc(ctx.firestore(), 'recipes', 'r1')));
  });
});

// ===========================================================================
// suppliers — read authed; create/update if authed AND (admin OR
// isValidSupplier()); delete admin-only.
// ===========================================================================
describe('suppliers rules', () => {
  // Minimal doc satisfying isValidSupplier(): name required/non-empty string;
  // optional contact fields typed; only allow-listed keys.
  function validSupplier(overrides: Record<string, unknown> = {}) {
    return {
      name: 'Valrhona',
      contactName: 'Jean Dupont',
      email: 'orders@valrhona.test',
      phone: '555-0100',
      ...overrides,
    };
  }

  async function seedSupplier(id: string, overrides: Record<string, unknown> = {}) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'suppliers', id), validSupplier(overrides));
    });
  }

  test('authenticated user can read suppliers', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'suppliers', 's1')));
  });

  test('unauthenticated user cannot read suppliers', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'suppliers', 's1')));
  });

  test('non-admin can create a valid supplier', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'suppliers', 's1'), validSupplier()));
  });

  test('non-admin cannot create a supplier with an unknown field (violates isValidSupplier)', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'suppliers', 's1'), validSupplier({ bogusField: true })));
  });

  test('admin can create a supplier even with an otherwise-invalid field (admin bypass)', async () => {
    await seedRole('admin-user', 'admin');
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'suppliers', 's1'), validSupplier({ bogusField: true })));
  });

  test('admin can delete a supplier', async () => {
    await seedRole('admin-user', 'admin');
    await seedSupplier('s1');
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertSucceeds(deleteDoc(doc(ctx.firestore(), 'suppliers', 's1')));
  });

  test('non-admin cannot delete a supplier', async () => {
    await seedRole('alice', 'user');
    await seedSupplier('s1');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(deleteDoc(doc(ctx.firestore(), 'suppliers', 's1')));
  });
});

// ===========================================================================
// vendors — read authed; create/update if authed AND isValidVendor() (NO admin
// bypass on write); delete admin-only.
// ===========================================================================
describe('vendors rules', () => {
  // Minimal doc satisfying isValidVendor(): name, expenseCategoryId, isActive
  // required; defaultPaymentMethod (if present) must be an allowed enum value.
  function validVendor(overrides: Record<string, unknown> = {}) {
    return {
      name: 'Office Supplies Co',
      expenseCategoryId: 'cat-operating-1',
      isActive: true,
      ...overrides,
    };
  }

  async function seedVendor(id: string, overrides: Record<string, unknown> = {}) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'vendors', id), validVendor(overrides));
    });
  }

  test('authenticated user can read vendors', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'vendors', 'v1')));
  });

  test('unauthenticated user cannot read vendors', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'vendors', 'v1')));
  });

  test('authenticated user can create a valid vendor', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'vendors', 'v1'), validVendor()));
  });

  test('vendor with an invalid defaultPaymentMethod is denied (violates isValidVendor)', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'vendors', 'v1'), validVendor({ defaultPaymentMethod: 'crypto' })));
  });

  test('admin can delete a vendor', async () => {
    await seedRole('admin-user', 'admin');
    await seedVendor('v1');
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertSucceeds(deleteDoc(doc(ctx.firestore(), 'vendors', 'v1')));
  });

  test('non-admin cannot delete a vendor', async () => {
    await seedRole('alice', 'user');
    await seedVendor('v1');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(deleteDoc(doc(ctx.firestore(), 'vendors', 'v1')));
  });
});
