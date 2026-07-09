import type { ChocolateSpec } from '../../types';
import type { DairySpec } from './dairy';
import { parseDairySpec } from './dairy';
import { parseChocolateSpec } from './chocolate';

// =============================================================================
// Unified ingredient spec lookup — discriminated union that future verticals
// extend with chocolate, tea, coffee, etc. IngredientInfo uses this to render.
// =============================================================================

export type IngredientSpec =
  | { kind: 'dairy'; data: DairySpec }
  | { kind: 'chocolate'; data: ChocolateSpec }
  | { kind: 'unknown' };

/**
 * Check all known ingredient catalogs and return the first match.
 * Returns null if the ingredient name matches no known catalog.
 */
export function getIngredientSpec(name: string): IngredientSpec | null {
  const dairy = parseDairySpec(name);
  if (dairy) return { kind: 'dairy', data: dairy };

  const chocolate = parseChocolateSpec(name);
  if (chocolate.type) return { kind: 'chocolate', data: chocolate };

  return null;
}
