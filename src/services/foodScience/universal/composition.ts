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

/**
 * Every composition species the model tracks, in canonical order. Single source
 * of truth for code that must iterate all species (sum, aggregation, editors).
 */
export const COMPOSITION_SPECIES: readonly (keyof Composition)[] = [
  'water', 'sucrose', 'glucose', 'fructose', 'lactose', 'maltose',
  'sorbitol', 'glycerol', 'ethanol', 'fat', 'protein', 'ash',
] as const;

export function compositionSum(c: Composition): number {
  return COMPOSITION_SPECIES.reduce((sum, sp) => sum + (c[sp] ?? 0), 0);
}

/**
 * Aggregate resolved leaf ingredients into one mix-level composition in mass %
 * (each species summed by mass, over total mass). Unlike the Norrish `massBy`
 * map — aqueous solutes only, in grams — this spans ALL species, including the
 * fat and protein the aqueous kernel ignores, which the process-layer models
 * (Maillard, …) need. Returns {} for an empty / zero-mass mix.
 */
export function aggregateComposition(
  resolved: ReadonlyArray<{ mass: number; composition: Composition }>,
): Composition {
  const grams: Partial<Record<keyof Composition, number>> = {};
  let total = 0;
  for (const r of resolved) {
    if (r.mass <= 0) continue;
    total += r.mass;
    for (const sp of COMPOSITION_SPECIES) {
      const pct = r.composition[sp];
      if (pct) grams[sp] = (grams[sp] ?? 0) + (r.mass * pct) / 100;
    }
  }
  if (total <= 0) return {};
  const out: Composition = {};
  for (const sp of COMPOSITION_SPECIES) {
    const g = grams[sp];
    if (g) out[sp] = (g / total) * 100;
  }
  return out;
}

export function isCompositionComplete(c: Composition, tolerance = 2): boolean {
  const sum = compositionSum(c);
  return Math.abs(sum - 100) <= tolerance;
}
