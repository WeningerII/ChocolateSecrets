import { describe, test, expect } from 'vitest';
import { lookupUsdaSnapshot, USDA_FDC_SNAPSHOT } from './usdaFoodData';

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
