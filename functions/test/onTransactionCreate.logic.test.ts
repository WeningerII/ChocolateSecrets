import { vi, describe, test, expect } from 'vitest';

vi.mock('firebase-admin', () => {
  const firestoreFn: any = () => ({
    collection: () => ({ doc: () => ({}) }),
  });
  firestoreFn.FieldValue = { serverTimestamp: () => 'TIMESTAMP' };
  return {
    firestore: firestoreFn,
    default: {
      firestore: firestoreFn
    }
  };
});
vi.mock('firebase-functions/v1', () => {
  return {
    firestore: {
      document: () => ({
        onCreate: () => {}
      })
    },
    default: {
      firestore: {
        document: () => ({
          onCreate: () => {}
        })
      }
    }
  };
});

import { computeStockUpdate, computeShoppingListQuantity } from '../src/onTransactionCreate';

describe('computeStockUpdate', () => {
  test('receive increases stock and updates WAC with weighted average', () => {
    const result = computeStockUpdate('receive', 10, 10, 5.00, 7.00);
    expect(result.newStock).toBe(20);
    expect(result.newWac).toBe(6.00);
  });

  test('receive into empty stock sets WAC to transaction cost', () => {
    const result = computeStockUpdate('receive', 10, 0, 0, 5.00);
    expect(result.newStock).toBe(10);
    expect(result.newWac).toBe(5.00);
  });

  test('yield increases stock and updates WAC like receive', () => {
    const result = computeStockUpdate('yield', 100, 0, 0, 2.50);
    expect(result.newStock).toBe(100);
    expect(result.newWac).toBe(2.50);
  });

  test('consume decrements stock without changing WAC', () => {
    const result = computeStockUpdate('consume', -5, 20, 6.00, 6.00);
    expect(result.newStock).toBe(15);
    expect(result.newWac).toBe(6.00);
  });

  test('waste decrements stock without changing WAC', () => {
    const result = computeStockUpdate('waste', -3, 20, 6.00, 0);
    expect(result.newStock).toBe(17);
    expect(result.newWac).toBe(6.00);
  });

  test('audit_adjustment can be positive or negative', () => {
    const resultPos = computeStockUpdate('audit_adjustment', 2, 20, 6.00, 6.00);
    expect(resultPos.newStock).toBe(22);
    const resultNeg = computeStockUpdate('audit_adjustment', -3, 20, 6.00, 6.00);
    expect(resultNeg.newStock).toBe(17);
  });

  test('transfer is a no-op on stock', () => {
    const result = computeStockUpdate('transfer', 5, 20, 6.00, 6.00);
    expect(result.newStock).toBe(20);
    expect(result.newWac).toBe(6.00);
  });

  test('receive with zero prior stock uses transaction cost as WAC (no division by zero)', () => {
    const result = computeStockUpdate('receive', 5, 0, 0, 3.00);
    expect(result.newStock).toBe(5);
    expect(result.newWac).toBe(3.00);
    expect(Number.isFinite(result.newWac)).toBe(true);
  });
});

describe('computeShoppingListQuantity', () => {
  test('uses parLevel when parLevel > lowStockThreshold', () => {
    const result = computeShoppingListQuantity(
      { lowStockThreshold: 5, parLevel: 20, moq: 3 },
      4  // newStock
    );
    expect(result.shouldAdd).toBe(true);
    expect(result.quantity).toBe(16);
  });

  test('falls back to lowStockThreshold when parLevel is missing', () => {
    const result = computeShoppingListQuantity(
      { lowStockThreshold: 8 },  // no parLevel, no moq
      3  // newStock
    );
    expect(result.shouldAdd).toBe(true);
    expect(result.quantity).toBe(5);
  });

  test('MoQ lifts orderQty when MoQ > computed quantity', () => {
    const result = computeShoppingListQuantity(
      { lowStockThreshold: 5, parLevel: 10, moq: 20 },
      4
    );
    expect(result.shouldAdd).toBe(true);
    expect(result.quantity).toBe(20);
  });

  test('does not add when newStock is above threshold', () => {
    const result = computeShoppingListQuantity(
      { lowStockThreshold: 5, parLevel: 10 },
      7  // newStock above threshold
    );
    expect(result.shouldAdd).toBe(false);
  });

  test('adds when newStock equals threshold', () => {
    const result = computeShoppingListQuantity(
      { lowStockThreshold: 5, parLevel: 10 },
      5
    );
    // The function uses <= threshold so it should add
    expect(result.shouldAdd).toBe(true);
  });

  test('orderQty floors at 1 even when stock barely below threshold', () => {
    const result = computeShoppingListQuantity(
      { lowStockThreshold: 5, parLevel: 5 },
      5  // targetStock equals newStock
    );
    if (result.shouldAdd) {
      expect(result.quantity).toBeGreaterThanOrEqual(1);
    }
  });
});
