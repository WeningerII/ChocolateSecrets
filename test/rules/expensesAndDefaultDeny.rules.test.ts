/**
 * ============================================================================
 * FIRESTORE RULES TESTS — expenses collections + default-deny catch-all
 * ============================================================================
 * Covers:
 *   - recurringExpectations  (read authed / create+update authed & valid / delete admin)
 *   - expenseCategories      (read authed / write admin & valid)
 *   - shopping_list          (read authed / create+update authed & valid / delete authed)
 *   - DEFAULT-DENY catch-all (match /{path=**} { allow read, write: if false })
 *
 * These talk to the Firestore emulator (requires Java 17+ and firebase-tools).
 * They are excluded from the default `npm test` run and use their own config
 * (vitest.config.rules.ts), so run them through the emulator:
 *
 *   firebase emulators:exec --only firestore "npm run test:rules"
 *
 * This file uses its OWN isolated projectId so it can coexist with the other
 * rules test files running against the same emulator.
 *
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
    // Unique projectId so this file is isolated from sibling rules test files
    // executing against the same emulator instance.
    projectId: 'cs-rules-expenses',
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

// Helper: seed a user with a role (bypasses rules so isAdmin()/ownership checks
// can resolve the users/{uid} doc during the assertions below).
async function seedRole(uid: string, role: 'admin' | 'user') {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), { role, email: `${uid}@test.com` });
  });
}

// ---------------------------------------------------------------------------
// recurringExpectations
//   read:          isAuthenticated()
//   create/update: isAuthenticated() && isValidRecurringExpectation()
//   delete:        isAdmin()
// isValidRecurringExpectation requires: vendorId(str), rrule(str),
//   nextExpectedDate, expectedAmount(num), tolerance, isActive(bool);
//   only allowed fields.
// ---------------------------------------------------------------------------
describe('recurringExpectations rules', () => {
  function validExpectation(overrides: Record<string, unknown> = {}) {
    return {
      vendorId: 'vendor1',
      rrule: 'FREQ=MONTHLY;INTERVAL=1',
      nextExpectedDate: serverTimestamp(),
      expectedAmount: 250,
      tolerance: 10,
      isActive: true,
      ...overrides,
    };
  }

  async function seedExpectation(id: string, overrides: Record<string, unknown> = {}) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'recurringExpectations', id), validExpectation(overrides));
    });
  }

  test('authenticated user can read a recurring expectation', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'recurringExpectations', 're1')));
  });

  test('unauthenticated user cannot read a recurring expectation', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'recurringExpectations', 're1')));
  });

  test('authenticated user can create a valid recurring expectation', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'recurringExpectations', 're1'), validExpectation()));
  });

  test('create rejected when a required field is missing (no rrule)', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    const { rrule, ...noRrule } = validExpectation();
    void rrule;
    await assertFails(setDoc(doc(ctx.firestore(), 'recurringExpectations', 're1'), noRrule));
  });

  test('create rejected when expectedAmount has the wrong type', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'recurringExpectations', 're1'), validExpectation({ expectedAmount: 'lots' })));
  });

  test('create rejected when an unknown field is present', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'recurringExpectations', 're1'), validExpectation({ bogusField: 'nope' })));
  });

  test('admin can delete a recurring expectation', async () => {
    await seedRole('admin-user', 'admin');
    await seedExpectation('re1');
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertSucceeds(deleteDoc(doc(ctx.firestore(), 'recurringExpectations', 're1')));
  });

  test('non-admin user cannot delete a recurring expectation', async () => {
    await seedRole('staff-user', 'user');
    await seedExpectation('re1');
    const ctx = testEnv.authenticatedContext('staff-user');
    await assertFails(deleteDoc(doc(ctx.firestore(), 'recurringExpectations', 're1')));
  });
});

// ---------------------------------------------------------------------------
// expenseCategories
//   read:  isAuthenticated()
//   write: isAdmin() && isValidExpenseCategory()
// isValidExpenseCategory requires: name(str<=100), parent in {operating,
//   non_operating, cogs}, glAccountCode(str exactly 4 chars), isActive(bool);
//   only allowed fields.
// ---------------------------------------------------------------------------
describe('expenseCategories rules — admin-only writes', () => {
  function validCategory(overrides: Record<string, unknown> = {}) {
    return {
      name: 'Rent',
      parent: 'operating',
      glAccountCode: '6000',
      isActive: true,
      ...overrides,
    };
  }

  test('authenticated user can read expense categories', async () => {
    await seedRole('staff-user', 'user');
    const ctx = testEnv.authenticatedContext('staff-user');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'expenseCategories', 'cat1')));
  });

  test('unauthenticated user cannot read expense categories', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'expenseCategories', 'cat1')));
  });

  test('non-admin user cannot write an expense category (even a valid one)', async () => {
    await seedRole('staff-user', 'user');
    const ctx = testEnv.authenticatedContext('staff-user');
    await assertFails(setDoc(doc(ctx.firestore(), 'expenseCategories', 'cat1'), validCategory()));
  });

  test('admin can write a valid expense category', async () => {
    await seedRole('admin-user', 'admin');
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'expenseCategories', 'cat1'), validCategory()));
  });

  test('admin cannot write an expense category with an invalid glAccountCode length', async () => {
    await seedRole('admin-user', 'admin');
    const ctx = testEnv.authenticatedContext('admin-user');
    // glAccountCode must be exactly 4 chars; '60000' (5 chars) violates the validator.
    await assertFails(setDoc(doc(ctx.firestore(), 'expenseCategories', 'cat1'), validCategory({ glAccountCode: '60000' })));
  });

  test('admin cannot write an expense category with an invalid parent', async () => {
    await seedRole('admin-user', 'admin');
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertFails(setDoc(doc(ctx.firestore(), 'expenseCategories', 'cat1'), validCategory({ parent: 'not_a_parent' })));
  });
});

// ---------------------------------------------------------------------------
// shopping_list
//   read:          isAuthenticated()
//   create/update: isAuthenticated() && isValidShoppingListItem()
//   delete:        isAuthenticated()
// isValidShoppingListItem requires: name(str<=200), status in {pending,
//   purchased, ordered, received, cancelled}; quantity optional number;
//   only allowed fields.
// ---------------------------------------------------------------------------
describe('shopping_list rules', () => {
  function validItem(overrides: Record<string, unknown> = {}) {
    return {
      name: 'Cocoa Butter',
      status: 'pending',
      quantity: 5,
      unit: 'kg',
      ...overrides,
    };
  }

  async function seedItem(id: string, overrides: Record<string, unknown> = {}) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'shopping_list', id), validItem(overrides));
    });
  }

  test('authenticated user can read a shopping list item', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'shopping_list', 'sl1')));
  });

  test('unauthenticated user cannot read a shopping list item', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'shopping_list', 'sl1')));
  });

  test('authenticated user can create a valid shopping list item', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'shopping_list', 'sl1'), validItem()));
  });

  test('create rejected when status is not an allowed value', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'shopping_list', 'sl1'), validItem({ status: 'bought_maybe' })));
  });

  test('create rejected when a required field is missing (no name)', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    const { name, ...noName } = validItem();
    void name;
    await assertFails(setDoc(doc(ctx.firestore(), 'shopping_list', 'sl1'), noName));
  });

  test('create rejected when an unknown field is present', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'shopping_list', 'sl1'), validItem({ bogusField: 'nope' })));
  });

  test('authenticated user can delete a shopping list item', async () => {
    await seedItem('sl1');
    const ctx = testEnv.authenticatedContext('alice');
    await assertSucceeds(deleteDoc(doc(ctx.firestore(), 'shopping_list', 'sl1')));
  });

  test('unauthenticated user cannot delete a shopping list item', async () => {
    await seedItem('sl1');
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(deleteDoc(doc(ctx.firestore(), 'shopping_list', 'sl1')));
  });
});

// ---------------------------------------------------------------------------
// DEFAULT-DENY CATCH-ALL
//   match /{path=**} { allow read, write: if false; }
// An unlisted collection matches ONLY this rule, so even an authenticated user
// is denied both read and write. This proves the deny-by-default posture.
// ---------------------------------------------------------------------------
describe('default-deny catch-all', () => {
  test('authenticated user is denied reading an unlisted collection', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(getDoc(doc(ctx.firestore(), 'randomUnlistedCollection', 'doc1')));
  });

  test('authenticated user is denied writing an unlisted collection', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(ctx.firestore(), 'randomUnlistedCollection', 'doc1'), { anything: 'goes' }));
  });

  test('admin user is also denied writing an unlisted collection', async () => {
    await seedRole('admin-user', 'admin');
    const ctx = testEnv.authenticatedContext('admin-user');
    await assertFails(setDoc(doc(ctx.firestore(), 'randomUnlistedCollection', 'doc1'), { anything: 'goes' }));
  });
});
