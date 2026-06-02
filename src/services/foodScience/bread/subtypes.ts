import type { Ingredient, BreadSubtype, UniversalRole } from '../../../types';

const N = (i: Ingredient) => (i.name ?? '').toLowerCase();

/**
 * Per-ingredient subtype inside bread context. Returns null when no confident
 * mapping exists.
 */
export function inferBreadIngredientSubtype(
  ingredient: Ingredient,
  universal: UniversalRole | undefined
): BreadSubtype | null {
  const n = N(ingredient);

  // Flour subtypes
  if (universal === 'flour_starch' && /flour|harina|farinha/.test(n)) {
    if (/whole wheat|wholewheat|whole-grain|atta/.test(n)) return 'whole_wheat_flour';
    if (/\brye\b|centeno/.test(n)) return 'rye_flour';
    if (/bread flour/.test(n)) return 'bread_flour';
    return 'specialty_flour';
  }

  // Leaveners — different bread subtypes
  if (universal === 'leavener') {
    if (/sourdough starter|levain|natural leaven|madre/.test(n)) return 'starter';
    if (/poolish|biga|preferment|sponge/.test(n)) return 'preferment';
    if (/yeast|levadura/.test(n)) return 'commercial_yeast';
  }

  // Salt
  if (universal === 'salt') return 'salt';

  // Enrichments
  if (universal === 'fat') return 'enrichment_fat';
  if (universal === 'liquid' && /\bmilk|cream|buttermilk\b/.test(n)) return 'enrichment_dairy';
  if (universal === 'protein' && /\b(egg|huevo|yolk|white|albumen)\b/.test(n)) return 'enrichment_egg';
  if (universal === 'sweetener') return 'enrichment_sweetener';

  // Inclusions (seeds, nuts, dried fruit, herbs added to dough)
  if (universal === 'inclusion') return 'inclusion';

  return null;
}
