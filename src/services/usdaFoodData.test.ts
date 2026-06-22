import { describe, test, expect } from 'vitest';
import { lookupUsdaSnapshot, USDA_FDC_SNAPSHOT, dehydrate } from './usdaFoodData';

describe('USDA_FDC_SNAPSHOT', () => {
  test('every entry has match keywords', () => {
    for (const entry of USDA_FDC_SNAPSHOT) {
      expect(entry.matchKeywords.length).toBeGreaterThan(0);
    }
  });

  test('every entry has at least one composition value', () => {
    for (const entry of USDA_FDC_SNAPSHOT) {
      const sum = Object.values(entry.composition).reduce((a, b) => a + (b ?? 0), 0);
      expect(sum).toBeGreaterThan(0);
    }
  });
});

describe('lookupUsdaSnapshot', () => {
  test('matches "Heavy Cream"', () => {
    const result = lookupUsdaSnapshot('Heavy Cream');
    expect(result?.description).toMatch(/heavy/i);
  });

  test('matches "raspberry puree"', () => {
    const result = lookupUsdaSnapshot('raspberry puree');
    expect(result?.description).toMatch(/raspberr/i);
  });

  test('matches "all-purpose flour"', () => {
    const result = lookupUsdaSnapshot('all-purpose flour');
    expect(result?.description).toMatch(/all-purpose/i);
  });

  test('returns null for nonsense input', () => {
    const result = lookupUsdaSnapshot('zzzzz qqqqq xxxxx');
    expect(result).toBeNull();
  });

  test('returns null for empty input', () => {
    expect(lookupUsdaSnapshot('')).toBeNull();
    expect(lookupUsdaSnapshot('   ')).toBeNull();
  });
});

describe('dehydrate', () => {
  // Whole cow milk per 100 g (FAO/SR Legacy). The snapshot already carries the
  // matching FDC powder ("Milk, dry, whole"), so this doubles as ground truth.
  const WHOLE_COW_MILK = { water: 88.0, fat: 3.3, protein: 3.2, lactose: 4.8, ash: 0.7 };

  test('reproduces the FDC whole-milk-powder composition from liquid cow milk', () => {
    const powder = dehydrate(WHOLE_COW_MILK);
    // FDC 170851 "Milk, dry, whole": fat 26.7, lactose 38.4, protein 26.3, ash 6.1
    expect(Math.abs((powder.fat ?? 0) - 26.7)).toBeLessThanOrEqual(0.6);
    expect(Math.abs((powder.lactose ?? 0) - 38.4)).toBeLessThanOrEqual(0.6);
    expect(Math.abs((powder.protein ?? 0) - 26.3)).toBeLessThanOrEqual(0.6);
    expect(Math.abs((powder.ash ?? 0) - 6.1)).toBeLessThanOrEqual(0.6);
  });

  test('concentrates to the target residual moisture and conserves ~100%', () => {
    const powder = dehydrate(WHOLE_COW_MILK, 3);
    expect(powder.water).toBe(3);
    const total = Object.values(powder).reduce((a, b) => a + (b ?? 0), 0);
    expect(Math.abs(total - 100)).toBeLessThanOrEqual(0.5);
  });

  test('preserves the ratios among solids', () => {
    const powder = dehydrate(WHOLE_COW_MILK);
    const liquidRatio = WHOLE_COW_MILK.fat / WHOLE_COW_MILK.protein;
    const powderRatio = (powder.fat ?? 0) / (powder.protein ?? 0);
    expect(Math.abs(liquidRatio - powderRatio)).toBeLessThan(0.05);
  });

  test('returns the input unchanged when there are no solids', () => {
    expect(dehydrate({ water: 100 })).toEqual({ water: 100 });
  });
});

describe('non-bovine milk snapshot entries', () => {
  test('resolves liquid camel milk to a mostly-water composition', () => {
    const r = lookupUsdaSnapshot('camel milk');
    expect(r?.description).toMatch(/camel/i);
    expect(r?.composition.water ?? 0).toBeGreaterThan(80);
  });

  test('resolves camel milk POWDER to the concentrated entry (not the liquid or cow)', () => {
    const r = lookupUsdaSnapshot('camel milk powder');
    expect(r?.description).toMatch(/camel/i);
    expect(r?.description).toMatch(/powder/i);
    expect(r?.composition.water ?? 100).toBeLessThan(10);
    expect(r?.composition.fat ?? 0).toBeGreaterThan(20);
  });

  test('resolves goat, sheep, water buffalo, and reindeer', () => {
    expect(lookupUsdaSnapshot('goat milk')?.description).toMatch(/goat/i);
    expect(lookupUsdaSnapshot('sheep milk powder')?.description).toMatch(/sheep/i);
    expect(lookupUsdaSnapshot('water buffalo milk')?.description).toMatch(/buffalo/i);
    expect(lookupUsdaSnapshot('reindeer milk powder')?.description).toMatch(/reindeer/i);
  });
});
