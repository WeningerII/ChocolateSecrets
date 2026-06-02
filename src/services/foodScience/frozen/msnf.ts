import type { Ingredient } from '../../../types';
import type { ResolvedIngredient } from '../universal';

/** Heuristic: which resolved ingredients are dairy-derived. */
function isDairyDerived(r: ResolvedIngredient, catalog: Map<string, Ingredient>): boolean {
  if (r.bufferRef === 'cream') return true;
  const ing = catalog.get(r.ingredientId);
  if (!ing) return false;
  if (ing.category && /dairy/i.test(ing.category)) return true;
  const name = (ing.name ?? r.name ?? '').toLowerCase();
  if (/\b(milk|cream|buttermilk|kefir|yogurt|yoghurt|whey|casein|nfdm|lactose)\b/.test(name)) return true;
  if (/milk powder|powdered milk|nonfat dry/.test(name)) return true;
  return false;
}

/**
 * MSNF (milk solids non-fat) % of total recipe mass. Sum of lactose + protein
 * + ash from dairy-derived ingredients only. Egg yolk protein, gelatin protein,
 * and ash from other sources do not count.
 */
export function calculateMSNF(
  resolved: ResolvedIngredient[],
  catalog: Map<string, Ingredient>
): number {
  const totalMass = resolved.reduce((s, r) => s + r.mass, 0);
  if (totalMass === 0) return 0;

  let msnfMass = 0;
  for (const r of resolved) {
    if (!isDairyDerived(r, catalog)) continue;
    const c = r.composition;
    msnfMass += ((c.lactose ?? 0) + (c.protein ?? 0) + (c.ash ?? 0)) * r.mass / 100;
  }
  return (msnfMass / totalMass) * 100;
}

/** Lactose mass percentage of total recipe mass. */
export function calculateLactosePct(resolved: ResolvedIngredient[]): number {
  const totalMass = resolved.reduce((s, r) => s + r.mass, 0);
  if (totalMass === 0) return 0;
  let lactoseMass = 0;
  for (const r of resolved) {
    lactoseMass += (r.composition.lactose ?? 0) * r.mass / 100;
  }
  return (lactoseMass / totalMass) * 100;
}

/** Total solids = 100 - water%. The kernel's aw.waterPct gives us water% directly. */
export function calculateTotalSolidsPct(waterPct: number): number {
  return Math.max(0, 100 - waterPct);
}
