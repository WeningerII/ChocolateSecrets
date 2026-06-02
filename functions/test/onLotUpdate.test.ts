import { vi, describe, test, expect } from 'vitest';

// onDocumentUpdated runs at module load; stub it so importing the module is safe.
vi.mock('firebase-functions/v2/firestore', () => ({
  onDocumentUpdated: () => () => {},
}));

import { shouldArchiveLot } from '../src/onLotUpdate';

describe('shouldArchiveLot', () => {
  test('archives when quantity drops from positive to depleted', () => {
    expect(shouldArchiveLot({ quantity: 5 }, { quantity: 0 })).toBe(true);
    expect(shouldArchiveLot({ quantity: 5 }, { quantity: -2 })).toBe(true);
    expect(shouldArchiveLot({ quantity: 0.5 }, { quantity: 0 })).toBe(true);
  });

  test('does not archive when quantity stays positive', () => {
    expect(shouldArchiveLot({ quantity: 5 }, { quantity: 3 })).toBe(false);
  });

  test('does not archive without a positive->depleted transition', () => {
    expect(shouldArchiveLot({ quantity: 0 }, { quantity: 0 })).toBe(false);
    expect(shouldArchiveLot({ quantity: -1 }, { quantity: -5 })).toBe(false);
  });

  test('never throws on missing snapshots or non-numeric quantity', () => {
    expect(shouldArchiveLot(undefined, { quantity: 0 })).toBe(false);
    expect(shouldArchiveLot({ quantity: 5 }, undefined)).toBe(false);
    expect(shouldArchiveLot({ quantity: 'x' }, { quantity: 0 })).toBe(false);
    expect(shouldArchiveLot({}, {})).toBe(false);
  });
});
