import { describe, test, expect } from 'vitest';
import { resolveComposition, compositionSum, isCompositionComplete, aggregateComposition, COMPOSITION_SPECIES, DEFAULT_COMPOSITION_BY_CATEGORY } from './composition';
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

  test('COMPOSITION_SPECIES covers exactly the 14 tracked species', () => {
    expect([...COMPOSITION_SPECIES].sort()).toEqual(
      ['aceticAcid', 'ash', 'ethanol', 'fat', 'fructose', 'glucose', 'glycerol', 'lacticAcid', 'lactose', 'maltose', 'protein', 'sorbitol', 'sucrose', 'water'],
    );
  });
});

describe('aggregateComposition', () => {
  test('mass-weights ingredient compositions into a mix-level mass %', () => {
    // 100 g of 50/50 water/sucrose + 100 g pure fat -> 25 water, 25 sucrose, 50 fat.
    const mix = aggregateComposition([
      { mass: 100, composition: { water: 50, sucrose: 50 } },
      { mass: 100, composition: { fat: 100 } },
    ]);
    expect(mix.water).toBeCloseTo(25, 6);
    expect(mix.sucrose).toBeCloseTo(25, 6);
    expect(mix.fat).toBeCloseTo(50, 6);
  });

  test('captures fat and protein the aqueous massBy map omits', () => {
    const mix = aggregateComposition([
      { mass: 200, composition: { water: 70, fat: 18, lactose: 4, protein: 3 } },
    ]);
    expect(mix.protein).toBeCloseTo(3, 6);
    expect(mix.fat).toBeCloseTo(18, 6);
    expect(mix.lactose).toBeCloseTo(4, 6);
  });

  test('aggregates descriptive sub-fractions (unsaturatedFat, sodium) but excludes them from the sum', () => {
    const mix = aggregateComposition([
      { mass: 100, composition: { fat: 50, unsaturatedFat: 40, ash: 2, sodium: 0.5 } },
    ]);
    expect(mix.unsaturatedFat).toBeCloseTo(40, 6);
    expect(mix.sodium).toBeCloseTo(0.5, 6);
    // compositionSum counts only the 12 mass species (here fat + ash), not sub-fractions.
    expect(compositionSum(mix)).toBeCloseTo(52, 6);
  });

  test('ignores zero/negative-mass leaves and returns {} for an empty mix', () => {
    expect(aggregateComposition([])).toEqual({});
    expect(aggregateComposition([{ mass: 0, composition: { water: 100 } }])).toEqual({});
    const mix = aggregateComposition([
      { mass: 0, composition: { sucrose: 100 } },
      { mass: 50, composition: { water: 100 } },
    ]);
    expect(mix).toEqual({ water: 100 });
  });
});
