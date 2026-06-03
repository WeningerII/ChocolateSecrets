import { useMemo } from 'react';
import type { Recipe, Ingredient } from '../types';
import {
  calculateNorrishAw,
  calculateMixedPH,
  predictShelfLife,
  classifyAwBand,
  classifyFatRegime,
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
import { resolveRecipeLeaves } from '../utils/resolveRecipeLeaves';

export interface PhysicsWarning {
  kind:
    | 'composition_incomplete'
    | 'no_buffer_data'
    | 'no_water'
    | 'extreme_saturation'
    | 'declared_diverges'
    | 'bread_no_flour';
  ingredientCount?: number;
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
}

function computeAmounts(recipe: Recipe, scale: number): { amounts: Map<string, number>; totalMass: number } {
  const amounts = new Map<string, number>();
  let totalMass = 0;
  for (const component of recipe.components ?? []) {
    for (const ri of component.ingredients ?? []) {
      const key = ri.ingredientId || ri.recipeId;
      if (!key) continue;       // malformed ingredient row, skip
      const massAtScale = (ri.quantity ?? 0) * scale;
      amounts.set(key, massAtScale);
      totalMass += massAtScale;
    }
  }
  return { amounts, totalMass };
}

function deriveWarnings(
  aw: AwResult,
  pH: PHResult | null,
  shelfLife: ShelfLifePrediction,
  fallbackCount: number,
  recipeCategories: string[],
  resolvedIngredientsLength: number,
  breadEval: BreadEvaluation | null,
  declaredShelfLifeDays?: number
): PhysicsWarning[] {
  const warnings: PhysicsWarning[] = [];
  if (fallbackCount >= 3) warnings.push({ kind: 'composition_incomplete', ingredientCount: fallbackCount });
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

    const { resolved: resolvedIngredients, fallbackCount } = resolveRecipeLeaves(
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

    const warnings = deriveWarnings(aw, pH, shelfLife, fallbackCount, recipe.categories ?? [], resolvedIngredients.length, bread, recipe.haccp?.shelfLifeDays);

    const { amounts, totalMass } = computeAmounts(recipe, scale);

    return {
      aw, pH, shelfLife, awBand, fatRegime, warnings,
      computedAmounts: amounts,
      totalMass,
      scale,
      resolvedIngredients,
      confectionery,
      frozen,
      bread,
    };
  }, [recipe, ingredients, allRecipes, scale]);
}
