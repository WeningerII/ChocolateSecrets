import { useMemo } from 'react';
import type { Recipe, Ingredient } from '../types';
import {
  calculateNorrishAw,
  calculateMixedPH,
  predictShelfLife,
  classifyAwBand,
  classifyFatRegime,
  aggregateComposition,
  type ResolvedIngredient,
  type AwResult,
  type PHResult,
  type ShelfLifePrediction,
  type AwBand,
  type FatRegime,
} from '../services/foodScience/universal';

import { evaluateConfectionery, type ConfectioneryEvaluation, type ConfectioneryWarning } from '../services/foodScience/confectionery';
import { evaluateFrozen, type FrozenEvaluation } from '../services/foodScience/frozen';
import { evaluateBread, type BreadEvaluation } from '../services/foodScience/bread';
import { buildProcessProfile, computeMaillardBrowning, type MaillardResult } from '../services/foodScience/process';
import { resolveRecipeLeaves, type UnmassableLeaf } from '../utils/resolveRecipeLeaves';

export interface PhysicsWarning {
  kind:
    | 'composition_incomplete'
    | 'no_buffer_data'
    | 'no_water'
    | 'extreme_saturation'
    | 'declared_diverges'
    | 'bread_no_flour'
    | 'missing_density';
  ingredientCount?: number;
  ingredientNames?: string[];
  pH?: number;
  aqueousSugarPct?: number;
  declaredDays?: number;
  predictedWeeks?: number;
}

export interface RecipePhysics {
  aw: AwResult;
  pH: PHResult | null;
  shelfLife: ShelfLifePrediction;
  awBand: AwBand;
  fatRegime: FatRegime;
  warnings: PhysicsWarning[];
  computedAmounts: Map<string, number>;        // recipeIngredient.id → grams at scale
  totalMass: number;                            // grams at scale
  scale: number;
  resolvedIngredients: ResolvedIngredient[];   // for downstream rendering
  confectionery: ConfectioneryEvaluation | null;
  frozen: FrozenEvaluation | null;
  bread: BreadEvaluation | null;
  /** Maillard browning over the bake T·time profile; null when no thermal step. */
  browning: MaillardResult | null;
}

function deriveWarnings(
  aw: AwResult,
  pH: PHResult | null,
  shelfLife: ShelfLifePrediction,
  fallbackCount: number,
  recipeCategories: string[],
  resolvedIngredientsLength: number,
  breadEval: BreadEvaluation | null,
  unmassableLeaves: UnmassableLeaf[],
  declaredShelfLifeDays?: number
): PhysicsWarning[] {
  const warnings: PhysicsWarning[] = [];
  if (fallbackCount >= 3) warnings.push({ kind: 'composition_incomplete', ingredientCount: fallbackCount });
  // Volume-measured ingredients with no density were dropped from the gram basis,
  // so Aw/shelf-life silently omit them. Flag them (deduped by ingredient); discrete
  // "each"/"piece" leaves are excluded by design and intentionally not warned about.
  const missingDensity = unmassableLeaves.filter(l => l.reason === 'missing_density');
  if (missingDensity.length > 0) {
    const ingredientNames = [...new Set(missingDensity.map(l => l.name))];
    warnings.push({ kind: 'missing_density', ingredientCount: ingredientNames.length, ingredientNames });
  }
  if (aw.flags.find(f => f.kind === 'no_water')) warnings.push({ kind: 'no_water' });
  const sat = aw.flags.find(f => f.kind === 'extreme_saturation');
  if (sat && sat.kind === 'extreme_saturation') warnings.push({ kind: 'extreme_saturation', aqueousSugarPct: sat.aqueousSugarPct });
  if (declaredShelfLifeDays !== undefined && shelfLife.flags.find(f => f.kind === 'declared_diverges')) {
    warnings.push({ kind: 'declared_diverges', declaredDays: declaredShelfLifeDays, predictedWeeks: shelfLife.weeks });
  }
  if (recipeCategories.includes('bread') && resolvedIngredientsLength > 0 && breadEval === null) {
    warnings.push({ kind: 'bread_no_flour' });
  }
  return warnings;
}

export function useRecipePhysics(
  recipe: Recipe | undefined,
  ingredients: Ingredient[],
  allRecipes: Recipe[],
  scale = 1
): RecipePhysics | null {
  return useMemo(() => {
    if (!recipe) return null;

    const ingredientMap = new Map(ingredients.map(i => [i.id, i]));

    const { resolved: resolvedIngredients, fallbackCount, unmassableLeaves } = resolveRecipeLeaves(
      recipe,
      ingredients,
      allRecipes,
      scale,
    );
    if (resolvedIngredients.length === 0) {
      // Empty or fully-unresolvable recipe — return null so consumers render an
      // "incomplete recipe" state rather than a misleading zero-physics result.
      return null;
    }

    const aw = calculateNorrishAw(resolvedIngredients);
    const pH = calculateMixedPH(resolvedIngredients);
    const shelfLife = predictShelfLife(aw, resolvedIngredients, {
      declaredShelfLifeDays: recipe.haccp?.shelfLifeDays,
    });
    const awBand = classifyAwBand(aw.aw ?? 0);
    const fatRegime = classifyFatRegime(aw.fatPct);

    const isConfectionery = (recipe.categories ?? []).includes('confectionery');
    let confectionery: ConfectioneryEvaluation | null = null;
    if (isConfectionery) {
      confectionery = evaluateConfectionery({
        aw, pH, fatRegime,
        resolved: resolvedIngredients,
        ingredientCatalog: ingredientMap,
      });
    }

    const isFrozen = (recipe.categories ?? []).includes('frozen');
    let frozen: FrozenEvaluation | null = null;
    if (isFrozen) {
      frozen = evaluateFrozen({
        recipe, aw,
        resolved: resolvedIngredients,
        ingredientCatalog: ingredientMap,
      });
    }

    const isBread = (recipe.categories ?? []).includes('bread');
    let bread: BreadEvaluation | null = null;
    if (isBread) {
      bread = evaluateBread({
        recipe,
        resolved: resolvedIngredients,
        ingredientCatalog: ingredientMap,
      });
    }

    // Maillard browning: integrate reducing-sugar + protein reactivity over the
    // recipe's bake T·time profile (assembled from every component's steps).
    // Browning extent is order-independent, so flattening components is exact.
    // Null when there is no thermal step to integrate (unbaked / frozen items).
    const processProfile = buildProcessProfile(
      (recipe.components ?? []).flatMap(c => c.steps ?? []),
    );
    const browning: MaillardResult | null =
      processProfile.segments.length > 0 && aw.aw !== null
        ? computeMaillardBrowning(aggregateComposition(resolvedIngredients), aw.aw, processProfile)
        : null;

    const warnings = deriveWarnings(aw, pH, shelfLife, fallbackCount, recipe.categories ?? [], resolvedIngredients.length, bread, unmassableLeaves, recipe.haccp?.shelfLifeDays);

    // Production-accurate per-ingredient amounts and total mass derive directly
    // from the resolved leaf vector (buffers, hardware yield, sub-recipe expansion
    // and unit->grams conversion already applied), grouped by ingredient id.
    const computedAmounts = new Map<string, number>();
    let totalMass = 0;
    for (const r of resolvedIngredients) {
      computedAmounts.set(r.ingredientId, (computedAmounts.get(r.ingredientId) ?? 0) + r.mass);
      totalMass += r.mass;
    }

    return {
      aw, pH, shelfLife, awBand, fatRegime, warnings,
      computedAmounts,
      totalMass,
      scale,
      resolvedIngredients,
      confectionery,
      frozen,
      bread,
      browning,
    };
  }, [recipe, ingredients, allRecipes, scale]);
}
