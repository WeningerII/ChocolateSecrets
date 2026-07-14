/**
 * ============================================================================
 * FIRESTORE RULES TESTS
 * ============================================================================
 * These talk to the Firestore emulator (requires Java 17+ and firebase-tools).
 * They are excluded from the default `npm test` run and use their own config
 * (vitest.config.rules.ts), so run them through the emulator:
 *
 *   firebase emulators:exec --only firestore "npm run test:rules"
 *
 * CI runs exactly this in the `rules-tests` job.
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

  test('admin can update other users role docs', async () => {
    await seedRole('admin-user', 'admin');
    await seedRole('bob', 'user');
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'users', 'bob'), { role: 'admin' }));
  });

});

describe('isAdmin() derives only from the users/{uid} role doc (ADR-0007)', () => {
  // Regression tests for the removed owner-email backdoor: a verified token
  // bearing the former bootstrap email must NOT confer admin — only a
  // users/{uid} doc with role == 'admin' does.
  const ownerToken = { email: 'weningerii@gmail.com', email_verified: true };

  test('verified owner email without an admin role doc is denied admin-only writes', async () => {
    const ctx = testEnv.authenticatedContext('owner-uid', ownerToken);
    await assertFails(setDoc(doc(ctx.firestore(), 'restaurants', 'default'), {
      name: 'Backdoor attempt',
      zipCode: '00000',
      standingAllergenDisclaimer: [],
    }));
  });

  test('verified owner email without an admin role doc is denied admin-only deletes', async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), 'recipes', 'r1'), { name: 'Truffle' });
    });
    const ctx = testEnv.authenticatedContext('owner-uid', ownerToken);
    await assertFails(deleteDoc(doc(ctx.firestore(), 'recipes', 'r1')));
  });

  test('verified owner email with role user (not admin) is still denied', async () => {
    await seedRole('owner-uid', 'user');
    const ctx = testEnv.authenticatedContext('owner-uid', ownerToken);
    await assertFails(setDoc(doc(ctx.firestore(), 'restaurants', 'default'), {
      name: 'Backdoor attempt',
      zipCode: '00000',
      standingAllergenDisclaimer: [],
    }));
  });

  test('admin role doc still grants admin regardless of email claims', async () => {
    await seedRole('owner-uid', 'admin');
    const ctx = testEnv.authenticatedContext('owner-uid', ownerToken);
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'restaurants', 'default'), {
      name: 'Legit Restaurant',
      zipCode: '75201',
      standingAllergenDisclaimer: [],
    }));
  });
});

describe('sourcing_notes ownership rules', () => {
  function validNote(overrides: Record<string, unknown> = {}) {
    return {
      ingredientId: 'ing1',
      name: 'Valrhona 64%',
      keptBy: 'alice',
      notes: 'good price',
      ...overrides,
    };
  }

  async function seedNote(id: string, overrides: Record<string, unknown> = {}) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'sourcing_notes', id), validNote(overrides));
    });
  }

  test('user can create a note kept by themselves', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'sourcing_notes', 'n1'), validNote()));
  });

  test('owner can update their own note', async () => {
    await seedNote('n1');
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'sourcing_notes', 'n1'), { notes: 'updated' }));
  });

  test('non-owner cannot update someone else\'s note (even claiming their own uid)', async () => {
    await seedNote('n1');
    const ctx = testEnv.authenticatedContext('mallory');
    await assertFails(updateDoc(doc(ctx.firestore(), 'sourcing_notes', 'n1'), { keptBy: 'mallory', notes: 'hijacked' }));
  });

  test('owner cannot transfer ownership by changing keptBy', async () => {
    await seedNote('n1');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(updateDoc(doc(ctx.firestore(), 'sourcing_notes', 'n1'), { keptBy: 'bob' }));
  });

  test('owner can delete their own note', async () => {
    await seedNote('n1');
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(deleteDoc(doc(ctx.firestore(), 'sourcing_notes', 'n1')));
  });

  test('non-owner cannot delete someone else\'s note', async () => {
    await seedNote('n1');
    const ctx = testEnv.authenticatedContext('mallory');
    await assertFails(deleteDoc(doc(ctx.firestore(), 'sourcing_notes', 'n1')));
  });
});

describe('bills payment-field lockdown', () => {
  function validBill(overrides: Record<string, unknown> = {}) {
    return {
      billDate: serverTimestamp(),
      totalAmount: 100,
      status: 'extracted',
      vendorResolution: { status: 'unresolved', candidateVendorIds: [], rawExtractedVendorName: 'Acme' },
      fieldMeta: {},
      lineItems: [],
      ...overrides,
    };
  }

  async function seedBill(id: string, overrides: Record<string, unknown> = {}) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'bills', id), validBill(overrides));
    });
  }

  test('user can create a valid extracted bill', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'bills', 'b1'), validBill()));
  });

  test('user cannot create a bill already marked paid', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'bills', 'b1'), validBill({ status: 'paid' })));
  });

  test('user cannot create a bill with a nonzero paidAmount', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'bills', 'b1'), validBill({ paidAmount: 50 })));
  });

  test('user cannot set paidAmount on update', async () => {
    await seedBill('b1');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(updateDoc(doc(ctx.firestore(), 'bills', 'b1'), { paidAmount: 50 }));
  });

  test('user cannot mark a bill paid on update', async () => {
    await seedBill('b1');
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(updateDoc(doc(ctx.firestore(), 'bills', 'b1'), { status: 'paid' }));
  });

  test('user can transition a bill to reviewed', async () => {
    await seedBill('b1');
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'bills', 'b1'), { status: 'reviewed' }));
  });

  test('user can edit a bill field without touching payment fields', async () => {
    await seedBill('b1', { paidAmount: 0 });
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'bills', 'b1'), { notes: 'follow up' }));
  });
});
