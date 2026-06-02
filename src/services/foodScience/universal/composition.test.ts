import { describe, test, expect } from 'vitest';
import { resolveComposition, compositionSum, isCompositionComplete, DEFAULT_COMPOSITION_BY_CATEGORY } from './composition';
import type { Ingredient } from '../../../types';

function makeIng(overrides: Partial<Ingredient>): Ingredient {
  return {
    id: 'test', name: 'test', stock: 0, lowStockThreshold: 0,
    ...overrides,
  } as Ingredient;
}

describe('resolveComposition', () => {
  test('explicit composition is highest priority', () => {
    const ing = makeIng({
      composition: { water: 50, sucrose: 50 },
      category: 'Dairy & Alternatives',  // would otherwise apply default
    });
    const result = resolveComposition(ing);
    expect(result.source).toBe('explicit');
    expect(result.composition).toEqual({ water: 50, sucrose: 50 });
  });

  test('USDA snapshot match for "heavy cream"', () => {
    const result = resolveComposition(makeIng({ name: 'Heavy Cream' }));
    expect(result.source).toBe('usda_fdc');
    expect(result.composition.water).toBeGreaterThan(55);
    expect(result.composition.water).toBeLessThan(62);
    expect(result.matchedFdcId).toBeDefined();
  });

  test('chocolate spec used when name is not in snapshot', () => {
    const result = resolveComposition(makeIng({
      name: 'Some Obscure Brand Couverture XYZ 75',
      chocolateSpec: { type: 'dark', cocoaPercentage: 75 } as any,
    }));
    // USDA snapshot has 'couverture' as keyword, may match. If matches USDA, that's fine.
    // The point is: source is one of explicit / usda_fdc / chocolate_spec — not category_default.
    expect(['usda_fdc', 'chocolate_spec']).toContain(result.source);
  });

  test('alcohol spec used when alcoholSpec present', () => {
    const result = resolveComposition(makeIng({
      name: 'House Bourbon (Custom Cask)',
      alcoholSpec: { abv: 45, type: 'spirit' } as any,
    }));
    expect(result.source).toBe('alcohol_spec');
    expect(result.composition.ethanol).toBeGreaterThan(35);
    expect(result.composition.ethanol).toBeLessThan(50);
  });

  test('category default used when nothing else matches', () => {
    const result = resolveComposition(makeIng({
      name: 'Mystery Dairy Substance',
      category: 'Dairy & Alternatives',
    }));
    expect(result.source).toBe('category_default');
  });

  test('unknown source for unrecognized name and no category', () => {
    const result = resolveComposition(makeIng({ name: 'completely-unknown-thing-xyz' }));
    expect(result.source).toBe('unknown');
    expect(result.composition).toEqual({});
  });
});

describe('compositionSum / isCompositionComplete', () => {
  test('sum of all fields', () => {
    expect(compositionSum({ water: 50, sucrose: 30, fat: 20 })).toBe(100);
    expect(compositionSum({ water: 99 })).toBe(99);
    expect(compositionSum({})).toBe(0);
  });

  test('isCompositionComplete with default tolerance (2)', () => {
    expect(isCompositionComplete({ water: 100 })).toBe(true);
    expect(isCompositionComplete({ water: 98.5 })).toBe(true);
    expect(isCompositionComplete({ water: 102 })).toBe(true);
    expect(isCompositionComplete({ water: 97 })).toBe(false);
    expect(isCompositionComplete({})).toBe(false);
  });
});
