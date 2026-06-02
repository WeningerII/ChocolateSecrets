/**
 * ============================================================================
 * FIRESTORE RULES TESTS — NON-SANDBOX-EXECUTABLE
 * ============================================================================
 * These tests require the Firebase emulator, which requires Java.
 * They CANNOT run in the AI Studio sandbox.
 *
 * TO RUN:
 *   1. Install Java 11+ (`java -version` must work)
 *   2. `npx firebase emulators:start --only firestore` in one terminal
 *   3. `npx vitest run test/rules/firestore.rules.test.ts` in another
 *
 * RUN BEFORE: every production deploy.
 * RUN AFTER: any change to firestore.rules.
 * ============================================================================
 */

import { initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, beforeEach, describe, test } from 'vitest';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'chocolate-secrets-rules-test',
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

// Helper: seed a user with a role
async function seedRole(uid: string, role: 'admin' | 'user') {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), { role, email: `${uid}@test.com` });
  });
}

describe('ingredients rules', () => {
  test('authenticated user can read ingredients', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'ingredients', 'ing1')));
  });

  test('unauthenticated user cannot read ingredients', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'ingredients', 'ing1')));
  });

  test('user can create ingredient with valid fields', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'ingredients', 'ing1'), {
      name: 'Test',
      unit: 'g',
      stock: 0,
      category: 'Dairy & Alternatives',
      costPerUnit: 0,
      lowStockThreshold: 5,
    }));
  });

  test('user can write ingredient with composition map', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'ingredients', 'i_comp'), {
      name: 'Heavy Cream', unit: 'g', stock: 0,
      lowStockThreshold: 0, category: 'Dairy & Alternatives',
      composition: { water: 58, fat: 36, lactose: 2.9 },
      bufferRef: 'cream',
    }));
  });

  test('user can write ingredient with alcoholSpec', async () => {
    await seedRole('bob', 'user');
    const ctx = testEnv.authenticatedContext('bob');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'ingredients', 'i_alc'), {
      name: 'House Bourbon', unit: 'ml', stock: 0,
      lowStockThreshold: 0, category: 'Beverages',
      alcoholSpec: { abv: 45, type: 'spirit' },
    }));
  });

  test('user can write ingredient with usdaFdcId number', async () => {
    await seedRole('carol', 'user');
    const ctx = testEnv.authenticatedContext('carol');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'ingredients', 'i_fdc'), {
      name: 'Heavy Cream', unit: 'g', stock: 0,
      lowStockThreshold: 0, category: 'Dairy & Alternatives',
      usdaFdcId: 171890,
    }));
  });

  test('write with unknown field rejected', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'ingredients', 'ing1'), {
      name: 'Test',
      unit: 'g',
      stock: 0,
      lowStockThreshold: 5,
      category: 'Dairy & Alternatives',
      costPerUnit: 0,
      unknownField: 'bad',
    }));
  });
});

describe('restaurants rules — admin-only writes', () => {
  test('admin can write restaurant settings', async () => {
    await seedRole('admin-user', 'admin');
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'restaurants', 'default'), {
      name: 'Test Restaurant',
      zipCode: '75201',
      standingAllergenDisclaimer: [],
    }));
  });

  test('user cannot write restaurant settings', async () => {
    await seedRole('staff-user', 'user');
    const ctx = testEnv.authenticatedContext('staff-user');
    await assertFails(setDoc(doc(ctx.firestore(), 'restaurants', 'default'), {
      name: 'Hacked',
      zipCode: '00000',
      standingAllergenDisclaimer: [],
    }));
  });

  test('user can READ restaurant settings', async () => {
    await seedRole('staff-user', 'user');
    const ctx = testEnv.authenticatedContext('staff-user');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'restaurants', 'default')));
  });
});

describe('inventoryTransactions rules', () => {
  test('user can create inventory transaction with valid fields', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'inventoryTransactions', 'tx1'), {
      ingredientId: 'ing1',
      type: 'receive',
      amount: 10,
      costPerUnit: 5,
      date: serverTimestamp(),
      userId: 'alice',
      userName: 'Alice',
    }));
  });

  test('transaction with invalid type rejected', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'inventoryTransactions', 'tx1'), {
      ingredientId: 'ing1',
      type: 'invalid_type_xyz',
      amount: 10,
      costPerUnit: 5,
      date: serverTimestamp(),
      userId: 'alice',
    }));
  });
  
  test('transaction updates and deletes are rejected (immutable)', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    // First setup the document using disabled rules so it actually exists
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), 'inventoryTransactions', 'tx1'), {
        ingredientId: 'ing1',
        type: 'receive',
        amount: 10,
        date: serverTimestamp(),
      });
    });
    
    // Now verify the actual rule blocks update and delete
    await assertFails(updateDoc(doc(ctx.firestore(), 'inventoryTransactions', 'tx1'), { amount: 20 }));
    await assertFails(deleteDoc(doc(ctx.firestore(), 'inventoryTransactions', 'tx1')));
  });
});

describe('production runs rules — status and allowed fields', () => {
  test('production run with valid fields accepted', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'productionRuns', 'pr1'), {
      name: 'Test Run',
      status: 'draft',
      items: [],
      plannedDate: 'test',
    }));
  });

  test('production run with invalid field rejected', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'productionRuns', 'pr1'), {
      name: 'Test Run',
      status: 'draft',
      items: [],
      date: 'test', // 'date' is not in allowed fields for productionRuns in current rules
    }));
  });
});

describe('users collection rules', () => {
  test('user can read their own role doc', async () => {
    await seedRole('alice', 'user');
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'users', 'alice')));
  });

  test('user cannot write their own role', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'users', 'alice'), { role: 'admin' }));
  });

  test('admin can write other users role docs', async () => {
    await seedRole('admin-user', 'admin');
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'users', 'bob'), { role: 'user', email: 'b@t.com' }));
  });
});
