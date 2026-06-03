/**
 * Per-ingredient contribution rollups over the canonical resolved leaf vector.
 *
 * Because every recipe number is now a rollup over one resolved vector, "what
 * drives this?" is just a second pass over the same leaves: each ingredient's
 * share of total cost and of total water. Sub-recipes are expanded, so a cost
 * driver buried inside a sub-recipe is attributed to the raw ingredient — the
 * thing a chef can actually act on.
 */
import type { Recipe, Ingredient } from '../types';
import type { ResolvedIngredient } from '../services/foodScience/universal/types';
import { resolveRecipeLeaves } from './resolveRecipeLeaves';
import { convertUnit } from './units';

export interface IngredientContribution {
  ingredientId: string;
  name: string;
  massG: number;
  costUsd: number | null;     // null when the ingredient has no usable cost
  costShare: number | null;   // 0..1 of total recipe cost
  waterG: number;
  waterShare: number | null;  // 0..1 of total recipe water
}

export interface ContributionReport {
  ingredients: IngredientContribution[]; // grouped by ingredient, sorted by cost desc
  totalCostUsd: number;
  totalWaterG: number;
  totalMassG: number;
}

/**
 * Roll up contributions from an already-resolved leaf vector. Kept separate so
 * callers that already hold the resolved leaves (e.g. the recipe view, which
 * resolves once via useRecipePhysics) don't pay for a second operator pass.
 */
export function contributionsFromLeaves(
  resolved: ResolvedIngredient[],
  ingredients: Ingredient[],
): ContributionReport {
  const byId = new Map(ingredients.map((i) => [i.id, i]));

  const agg = new Map<string, { name: string; massG: number; costUsd: number | null; waterG: number }>();
  for (const leaf of resolved) {
    const ing = byId.get(leaf.ingredientId);
    const waterG = leaf.mass * ((leaf.composition.water ?? 0) / 100);

    // Cost: convert grams into the ingredient's cost unit, then × its unit cost.
    // Use the same `weightedAverageCost || costPerUnit` precedence as
    // calculateRecipeCost so the cost-driver total can't diverge from the recipe's
    // headline COGS (a defined weightedAverageCost of 0 must fall back to costPerUnit).
    let cost: number | null = null;
    if (ing) {
      const unitCost = ing.weightedAverageCost || ing.costPerUnit;
      if (typeof unitCost === 'number' && unitCost > 0) {
        const inUnit = convertUnit(leaf.mass, 'g', ing.unit ?? 'g', ing.density);
        if (inUnit !== null) cost = inUnit * unitCost;
      }
    }

    const cur = agg.get(leaf.ingredientId);
    if (cur) {
      cur.massG += leaf.mass;
      cur.waterG += waterG;
      if (cost !== null) cur.costUsd = (cur.costUsd ?? 0) + cost;
    } else {
      agg.set(leaf.ingredientId, { name: ing?.name ?? leaf.name, massG: leaf.mass, costUsd: cost, waterG });
    }
  }

  let totalCostUsd = 0;
  let totalWaterG = 0;
  let totalMassG = 0;
  for (const v of agg.values()) {
    if (v.costUsd !== null) totalCostUsd += v.costUsd;
    totalWaterG += v.waterG;
    totalMassG += v.massG;
  }

  const list: IngredientContribution[] = Array.from(agg.entries()).map(([id, v]) => ({
    ingredientId: id,
    name: v.name,
    massG: v.massG,
    costUsd: v.costUsd,
    costShare: v.costUsd !== null && totalCostUsd > 0 ? v.costUsd / totalCostUsd : null,
    waterG: v.waterG,
    waterShare: totalWaterG > 0 ? v.waterG / totalWaterG : null,
  }));

  // Cost drivers first; ingredients without a cost sink to the bottom.
  list.sort((a, b) => (b.costUsd ?? -1) - (a.costUsd ?? -1));

  return { ingredients: list, totalCostUsd, totalWaterG, totalMassG };
}

export function recipeContributions(
  recipe: Recipe,
  ingredients: Ingredient[],
  recipes: Recipe[],
  scale = 1,
): ContributionReport {
  const { resolved } = resolveRecipeLeaves(recipe, ingredients, recipes, scale);
  return contributionsFromLeaves(resolved, ingredients);
}
