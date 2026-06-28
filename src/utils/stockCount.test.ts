import { describe, test, expect } from 'vitest';
import { computeCountedQty, EMPTY_STOCK_COUNT } from './stockCount';

describe('computeCountedQty', () => {
  test('containers × pack + loose (3 cases of 24 + 5 loose = 77)', () => {
    expect(computeCountedQty({ containerCount: 3, unitsPerContainer: 24, looseUnits: 5 })).toBe(77);
  });

  test('full containers only', () => {
    expect(computeCountedQty({ containerCount: 2, unitsPerContainer: 12, looseUnits: 0 })).toBe(24);
  });

  test('loose only (no containers)', () => {
    expect(computeCountedQty({ containerCount: 0, unitsPerContainer: 0, looseUnits: 7 })).toBe(7);
  });

  test('the empty count is zero', () => {
    expect(computeCountedQty(EMPTY_STOCK_COUNT)).toBe(0);
  });

  test('fractional pack sizes are supported (1.5 kg per bag)', () => {
    expect(computeCountedQty({ containerCount: 4, unitsPerContainer: 1.5, looseUnits: 0.25 })).toBeCloseTo(6.25, 6);
  });

  test('NaN / missing fields are treated as zero', () => {
    expect(computeCountedQty({ containerCount: NaN, unitsPerContainer: 24, looseUnits: 5 } as any)).toBe(5);
    expect(computeCountedQty({ containerCount: 3, unitsPerContainer: 24 } as any)).toBe(72);
  });
});
