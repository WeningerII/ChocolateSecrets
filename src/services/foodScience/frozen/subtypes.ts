import type { Ingredient, FrozenSubtype, UniversalRole } from '../../../types';

const N = (i: Ingredient) => (i.name ?? '').toLowerCase();

/**
 * Per-ingredient subtype inside frozen context. Returns null when no confident
 * mapping exists.
 */
export function inferFrozenIngredientSubtype(
  ingredient: Ingredient,
  universal: UniversalRole | undefined
): FrozenSubtype | null {
  const n = N(ingredient);

  // Stabilizer blends — explicit
  if (universal === 'hydrocolloid') return 'stabilizer_blend';

  // Inclusions and pastes
  if (universal === 'inclusion') return 'inclusion';

  // Alcohol (low-dose only — we'll flag in warnings if dose is too high)
  if (universal === 'alcohol') return 'alcohol_low_dose';

  // Sweeteners and sugar blends
  if (universal === 'sweetener') return 'sugar_blend';

  // Fat additions vs. base dairy
  if (universal === 'fat') {
    // Cocoa butter, butter added beyond the dairy base
    if (/cocoa butter|\bbutter\b|coconut oil/.test(n)) return 'fat_addition';
    return 'fat_addition';
  }

  // Dairy bases
  if (universal === 'liquid') {
    if (ingredient.bufferRef === 'cream') return 'base_dairy';
    if (/\b(milk|cream|buttermilk|yogurt|yoghurt)\b/.test(n)) return 'base_dairy';
    // Water is base_water in a frozen context
    if (/^(water|distilled water|filtered water|agua)$/.test(n)) return 'base_water';
    // Fruit puree as flavor base
    if (/\bpur(é|e)e?\b|\bcoulis\b/.test(n)) return 'flavor_paste';
    return 'base_water';
  }

  // Water explicitly
  if (universal === 'water') return 'base_water';

  // Milk powder is a protein-tagged dairy enhancer; in frozen it's a structural
  // ingredient, not a flavor — promote to base_dairy
  if (universal === 'protein') {
    if (/milk powder|nonfat dry|nfdm|whey|casein/.test(n)) return 'base_dairy';
  }

  // Flavors (vanilla extract, espresso, fruit purees with no aw declaration)
  if (universal === 'flavor') return 'flavor_paste';

  return null;
}
