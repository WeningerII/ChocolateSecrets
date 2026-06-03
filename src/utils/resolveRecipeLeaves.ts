/**
 * Canonical recipe resolution operator.
 *
 * Turns a recipe into a flat, fully-expanded list of leaf ingredients with mass
 * in GRAMS and resolved composition — the single production-aware view that the
 * physics kernels (Aw / pH / shelf-life / confectionery / frozen / bread) and the
 * formulation optimizer both consume.
 *
 * It reuses recipeMath's scaling helpers (component buffers, percentage-of-weight,
 * hardware/cavity yield, discrete items, declared-yield sub-recipe expansion) so
 * its breakdown agrees with `calculateRecipeCost` / `getRecipeRawIngredients` by
 * construction, then layers on the two things those rollups don't carry:
 *   1. true unit→grams conversion (via density), so volume/weight units feed the
 *      colligative kernels on a consistent gram basis, and
 *   2. per-leaf resolved composition + carry-through metadata (bufferRef, role,
 *      chocolate/alcohol specs).
 *
 * Waste/yield factors are intentionally NOT applied here (kept dormant), matching
 * current cost behavior.
 */
import type { Recipe, Ingredient } from '../types';
import type { ResolvedIngredient } from '../services/foodScience/universal/types';
import { resolveComposition } from '../services/foodScience/universal/composition';
import { convertUnit } from './units';
import {
  normalizeRecipe,
  calculateTotalTargetYield,
  calculateTotalTargetWeight,
  calculateComponentTargetWeight,
  scaleIngredient,
} from './recipeMath';

const MAX_RECURSION_DEPTH = 6;

export interface UnmassableLeaf {
  ingredientId: string;
  name: string;
  unit: string;
}

export interface ResolveLeavesResult {
  /** Fully-expanded leaf ingredients, mass in grams, composition resolved. */
  resolved: ResolvedIngredient[];
  /** Count of leaves whose composition fell back to a category default / unknown. */
  fallbackCount: number;
  /**
   * Leaves excluded from the gram-mass basis because their unit could not be
   * converted to grams (e.g. a volume unit on an ingredient with no density, or a
   * discrete count). Surfaced so callers can warn rather than silently mismodel.
   */
  unmassableLeaves: UnmassableLeaf[];
}

interface Ctx {
  ingredients: Map<string, Ingredient>;
  recipes: Map<string, Recipe>;
  resolved: ResolvedIngredient[];
  fallback: { n: number };
  unmassable: UnmassableLeaf[];
  /** recipe ids on the current ancestry path — blocks true cycles, allows DAG reuse. */
  ancestry: Set<string>;
}

function toGrams(
  amount: number,
  rowUnit: string | undefined,
  ingredient: Ingredient,
  rowDensity: number | undefined,
): number | null {
  const unit = rowUnit || ingredient.unit || 'g';
  const density = rowDensity ?? ingredient.density;
  return convertUnit(amount, unit, 'g', density);
}

function walk(recipe: Recipe, scale: number, depth: number, ctx: Ctx): void {
  if (depth > MAX_RECURSION_DEPTH) return;
  if (recipe.id && ctx.ancestry.has(recipe.id)) return; // true cycle
  if (recipe.id) ctx.ancestry.add(recipe.id);

  const norm = normalizeRecipe(recipe);
  const totalYield = calculateTotalTargetYield(norm, 1);
  const totalWeight = calculateTotalTargetWeight(norm, 1);

  for (const comp of norm.components ?? []) {
    const compWeight = calculateComponentTargetWeight(comp, totalWeight, norm.type, 1);

    for (const ri of comp.ingredients ?? []) {
      // Production-aware scaled quantity in the row's own unit, then × outer scale.
      const scaledQty = scaleIngredient(ri, comp, totalYield, compWeight) * scale;
      if (!(scaledQty > 0)) continue;

      // Sub-recipe reference → expand by declared yield (same basis as cost/BOM).
      if (ri.type === 'recipe' && ri.recipeId) {
        const sub = ctx.recipes.get(ri.recipeId);
        if (!sub) continue;

        let subYieldAmount = 1;
        let subYieldUnit = 'g';
        if (sub.yield && sub.yield.totalYieldAmount > 0) {
          subYieldAmount = sub.yield.totalYieldAmount;
          subYieldUnit = sub.yield.totalYieldUnit || 'g';
        } else {
          subYieldAmount = calculateTotalTargetWeight(sub, 1) || 1;
        }

        let needed = scaledQty;
        if (ri.unit && ri.unit !== subYieldUnit) {
          const conv = convertUnit(scaledQty, ri.unit, subYieldUnit);
          if (conv !== null) needed = conv;
        }
        if (subYieldAmount <= 0) continue;
        walk(sub, needed / subYieldAmount, depth + 1, ctx);
        continue;
      }

      // Leaf ingredient.
      if (!ri.ingredientId) continue;
      const ing = ctx.ingredients.get(ri.ingredientId);
      if (!ing) continue;

      const grams = toGrams(scaledQty, ri.unit, ing, ri.density);
      if (grams === null || !(grams > 0)) {
        ctx.unmassable.push({ ingredientId: ing.id, name: ing.name, unit: ri.unit || ing.unit || '' });
        continue;
      }

      const { composition, source } = resolveComposition(ing);
      if (source === 'category_default' || source === 'unknown') ctx.fallback.n += 1;

      ctx.resolved.push({
        ingredientId: ing.id,
        name: ing.name,
        mass: grams,
        composition,
        compositionSource: source,
        bufferRef: ing.bufferRef,
        role: ri.role?.universal,
        chocolateCocoaPercentage: ing.chocolateSpec?.cocoaPercentage,
        chocolateClass: ing.chocolateSpec?.type as ResolvedIngredient['chocolateClass'],
        alcoholAbv: ing.alcoholSpec?.abv,
      });
    }
  }

  if (recipe.id) ctx.ancestry.delete(recipe.id);
}

export function resolveRecipeLeaves(
  recipe: Recipe,
  ingredients: Ingredient[],
  recipes: Recipe[],
  scale = 1,
): ResolveLeavesResult {
  const ctx: Ctx = {
    ingredients: new Map(ingredients.map((i) => [i.id, i])),
    recipes: new Map(recipes.map((r) => [r.id, r])),
    resolved: [],
    fallback: { n: 0 },
    unmassable: [],
    ancestry: new Set(),
  };
  walk(recipe, scale, 0, ctx);
  return {
    resolved: ctx.resolved,
    fallbackCount: ctx.fallback.n,
    unmassableLeaves: ctx.unmassable,
  };
}
