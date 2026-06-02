import type { Ingredient, ChocolateSpec, Composition, CompositionSource } from '../../../types';
import type { AlcoholSpec } from '../../../types';
import { lookupUsdaSnapshot } from '../../usdaFoodData';

/**
 * Default compositions by category. Conservative; fallback only.
 * Empty composition signals "not edible / no contribution" — the kernel ignores
 * zero-water ingredients in Aw calculations.
 *
 * Categories must match the IngredientCategory enum exactly. New categories require
 * an entry here.
 */
export const DEFAULT_COMPOSITION_BY_CATEGORY: Partial<Record<string, Composition>> = {
  'Sugars & Sweeteners':       { water: 0.1, sucrose: 99.9 },
  'Chocolates & Cocoas':       { water: 1, sucrose: 30, fat: 35 },
  'Nuts & Seeds':              { water: 4, fat: 50, protein: 20 },
  'Fruits & Purees':           { water: 86, sucrose: 5, glucose: 3, fructose: 4 },
  'Dairy & Alternatives':      { water: 70, fat: 18, lactose: 4, protein: 3 },
  'Flours & Starches':         { water: 12, protein: 10 },
  'Spices & Extracts':         { water: 8, fat: 5 },
  'Leaveners':                 { water: 1 },
  'Colors & Dusts':            {},
  'Emulsifiers & Stabilizers': { water: 10 },
  'Fats & Oils':               { water: 0.1, fat: 99 },
  'Meat & Seafood':            { water: 70, fat: 8, protein: 20 },
  'Produce':                   { water: 87 },
  'Beverages':                 { water: 95 },
  'Packaging':                 {},
  'Consumables':               {},
  'Uncategorized':             {},
};

function chocolateComposition(spec: ChocolateSpec): Composition {
  const cocoa = spec.cocoaPercentage ?? 70;
  if (spec.type === 'milk') {
    return { water: 1, sucrose: 45, lactose: 7.5, fat: 33 };
  }
  if (spec.type === 'white') {
    return { water: 1, sucrose: 50, lactose: 11, fat: 32 };
  }
  // dark, ruby, gianduja, compound — parametric
  return {
    water: 0.5,
    sucrose: Math.max(0, (100 - cocoa) - 1),
    fat: cocoa * 0.55 + 5,
  };
}

function alcoholComposition(spec: AlcoholSpec): Composition {
  const abv = spec.abv ?? 40;
  const ethanolMassFrac = (abv * 0.789) / (abv * 0.789 + (100 - abv));
  return {
    water: (1 - ethanolMassFrac) * 100,
    ethanol: ethanolMassFrac * 100,
  };
}

function isCompositionEmpty(c: Composition | undefined): boolean {
  if (!c) return true;
  return Object.values(c).every(v => v === undefined || v === 0);
}

export interface ResolveCompositionResult {
  composition: Composition;
  source: CompositionSource;
  matchedFdcId?: number;
}

/**
 * Resolve composition for an ingredient using the priority chain:
 *   1. ingredient.composition (explicit) — highest trust
 *   2. USDA FDC snapshot match by name — FDA-grade lab data
 *   3. ingredient.chocolateSpec → parametric chocolate composition
 *   4. ingredient.alcoholSpec → parametric alcohol composition
 *   5. category default lookup
 *   6. unknown (empty composition)
 */
export function resolveComposition(ingredient: Ingredient): ResolveCompositionResult {
  if (!isCompositionEmpty(ingredient.composition)) {
    return { composition: ingredient.composition!, source: 'explicit' };
  }

  const usda = lookupUsdaSnapshot(ingredient.name);
  if (usda) {
    return { composition: usda.composition, source: 'usda_fdc', matchedFdcId: usda.fdcId };
  }

  if (ingredient.chocolateSpec?.cocoaPercentage !== undefined || ingredient.chocolateSpec?.type) {
    return { composition: chocolateComposition(ingredient.chocolateSpec), source: 'chocolate_spec' };
  }

  if (ingredient.alcoholSpec?.abv !== undefined) {
    return { composition: alcoholComposition(ingredient.alcoholSpec), source: 'alcohol_spec' };
  }

  const categoryDefault = ingredient.category
    ? DEFAULT_COMPOSITION_BY_CATEGORY[ingredient.category]
    : undefined;

  if (categoryDefault && !isCompositionEmpty(categoryDefault)) {
    return { composition: categoryDefault, source: 'category_default' };
  }

  return { composition: {}, source: 'unknown' };
}

export function compositionSum(c: Composition): number {
  return (c.water ?? 0) + (c.sucrose ?? 0) + (c.glucose ?? 0)
    + (c.fructose ?? 0) + (c.lactose ?? 0) + (c.maltose ?? 0)
    + (c.sorbitol ?? 0) + (c.glycerol ?? 0) + (c.ethanol ?? 0)
    + (c.fat ?? 0) + (c.protein ?? 0) + (c.ash ?? 0);
}

export function isCompositionComplete(c: Composition, tolerance = 2): boolean {
  const sum = compositionSum(c);
  return Math.abs(sum - 100) <= tolerance;
}
