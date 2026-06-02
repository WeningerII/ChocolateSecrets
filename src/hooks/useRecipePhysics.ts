import { useMemo } from 'react';
import type { Recipe, Ingredient } from '../types';
import {
  calculateNorrishAw,
  calculateMixedPH,
  predictShelfLife,
  classifyAwBand,
  classifyFatRegime,
  resolveComposition,
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

const MAX_RECURSION_DEPTH = 6;

interface ResolveContext {
  ingredients: Map<string, Ingredient>;
  recipes: Map<string, Recipe>;
  memo: Map<string, ResolvedIngredient[] | 'computing'>;
  scale: number;
  fallbackCount: { value: number };
}

/**
 * Recursively resolve a recipe into a flat list of ResolvedIngredients.
 * Sub-recipes are expanded by their components × scale; cycles return empty arrays.
 */
function resolveRecipe(
  recipe: Recipe,
  ctx: ResolveContext,
  depth: number
): ResolvedIngredient[] {
  if (depth > MAX_RECURSION_DEPTH) return [];

  const cached = ctx.memo.get(recipe.id);
  if (cached === 'computing') return [];          // cycle
  if (cached) return cached;

  ctx.memo.set(recipe.id, 'computing');

  const out: ResolvedIngredient[] = [];

  for (const component of recipe.components ?? []) {
    for (const ri of component.ingredients ?? []) {
      const mass = (ri.quantity ?? 0) * ctx.scale;
      if (mass <= 0) continue;

      // Sub-recipe reference?
      if (ri.recipeId) {
        const subRecipe = ctx.recipes.get(ri.recipeId);
        if (!subRecipe) continue;

        // Determine yield-scaling factor for the sub-recipe so total mass equals `mass`.
        const subTotal = (subRecipe.components ?? []).reduce(
          (acc, c) => acc + (c.ingredients ?? []).reduce(
            (sum, sub) => sum + (sub.quantity ?? 0), 0),
          0
        );
        if (subTotal === 0) continue;
        const subScale = mass / subTotal;

        const subCtx: ResolveContext = { ...ctx, scale: subScale };
        const subResolved = resolveRecipe(subRecipe, subCtx, depth + 1);
        out.push(...subResolved);
        continue;
      }

      // Leaf ingredient
      if (!ri.ingredientId) continue;
      const ing = ctx.ingredients.get(ri.ingredientId);
      if (!ing) continue;

      const { composition, source } = resolveComposition(ing);
      if (source === 'category_default' || source === 'unknown') {
        ctx.fallbackCount.value += 1;
      }

      out.push({
        ingredientId: ing.id,
        name: ing.name,
        mass,
        composition,
        compositionSource: source,
        bufferRef: ing.bufferRef,
        role: ri.role?.universal,
        chocolateCocoaPercentage: ing.chocolateSpec?.cocoaPercentage,
        chocolateClass: ing.chocolateSpec?.type as any,
        alcoholAbv: ing.alcoholSpec?.abv,
      });
    }
  }

  ctx.memo.set(recipe.id, out);
  return out;
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
    const recipeMap = new Map(allRecipes.map(r => [r.id, r]));

    const fallbackCount = { value: 0 };
    const ctx: ResolveContext = {
      ingredients: ingredientMap,
      recipes: recipeMap,
      memo: new Map(),
      scale,
      fallbackCount,
    };

    const resolvedIngredients = resolveRecipe(recipe, ctx, 0);
    if (resolvedIngredients.length === 0) {
      // Empty recipe — return a deterministic zero-physics result rather than null
      // so consumers can still render an "incomplete recipe" state without conditionals.
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

    const warnings = deriveWarnings(aw, pH, shelfLife, fallbackCount.value, recipe.categories ?? [], resolvedIngredients.length, bread, recipe.haccp?.shelfLifeDays);

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
