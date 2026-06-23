import { Recipe, RecipeComponent, RecipeIngredient, Ingredient, UnitConversionWarning } from '../types';
import { convertUnit } from './units';

/**
 * Fully-loaded cost per unit of yield: ingredient cost + labor + overhead.
 * Used by reports that need margin analysis. For pure COGS (recipe detail,
 * prep list), use calculateRecipeCost.
 */
export function calculateFullyLoadedCost(
  recipe: Recipe,
  ingredients: Ingredient[],
  recipes: Recipe[]
): { cost: number; costPerUnit: number; unitWarnings: UnitConversionWarning[] } {
  const { cost: ingredientCost, unitWarnings } = calculateRecipeCost(recipe, ingredients, recipes);
  
  let totalCost = ingredientCost;
  if (recipe.laborTimeMinutes && recipe.hourlyRate) {
    totalCost += (recipe.laborTimeMinutes / 60) * recipe.hourlyRate;
  }
  if (recipe.overheadPercentage) {
    totalCost += totalCost * (recipe.overheadPercentage / 100);
  }
  
  const targetYield = recipe.yield?.totalYieldAmount || 0;
  const costPerUnit = targetYield > 0 ? totalCost / targetYield : 0;
  
  return { cost: totalCost, costPerUnit, unitWarnings };
}

export function calculateTotalTargetYield(recipe: Recipe, baseQuantity: number = 1): number {
  if (recipe.hardware && (recipe.type === 'molded_praline' || recipe.type === 'bonbon' || recipe.type === 'bar')) {
    return (recipe.hardware.cavitiesPerMold || 0) * (recipe.hardware.moldCount || 0) * baseQuantity;
  }
  return baseQuantity;
}

export function calculateTotalTargetWeight(recipe: Recipe, baseQuantity: number = 1): number {
  if (recipe.hardware && (recipe.type === 'molded_praline' || recipe.type === 'bonbon' || recipe.type === 'bar')) {
    const yieldCount = calculateTotalTargetYield(recipe, baseQuantity);
    return yieldCount * (recipe.hardware.gramPerCavity || 0);
  }
  
  // For standard recipes or recipes without hardware, 
  // the total weight is the sum of all component base weights multiplied by the baseQuantity (multiplier).
  const totalBaseWeight = (recipe.components || []).reduce((sum, comp) => {
    return sum + getComponentBaseWeight(comp);
  }, 0);
  
  return totalBaseWeight * baseQuantity;
}

export function calculateComponentTargetWeight(component: RecipeComponent, totalTargetWeight: number, recipeType: string = 'standard', baseQuantity: number = 1): number {
  if (recipeType === 'molded_praline' || recipeType === 'bonbon' || recipeType === 'enrobed' || recipeType === 'bar') {
    return totalTargetWeight * ((component.percentageOfTotalWeight || 0) / 100) * (1 + ((component.bufferPercentage || 0) / 100));
  }
  // For standard recipes, we just scale the component's base weight by the baseQuantity and buffer.
  return getComponentBaseWeight(component) * baseQuantity * (1 + ((component.bufferPercentage || 0) / 100));
}

export function getComponentBaseWeight(component: RecipeComponent): number {
  return component.ingredients.reduce((sum, ing) => sum + (ing.isDiscrete ? 0 : (ing.quantity || 0)), 0);
}

export function scaleIngredient(
  ingredient: RecipeIngredient,
  component: RecipeComponent,
  totalTargetYield: number,
  componentTargetWeight: number
): number {
  if (ingredient.isDiscrete) {
    return totalTargetYield * (ingredient.quantity || 0);
  }
  
  const componentBaseWeight = getComponentBaseWeight(component);
  if (componentBaseWeight === 0) return 0;
  
  return ((ingredient.quantity || 0) / componentBaseWeight) * componentTargetWeight;
}

/** Resolve a sub-recipe's yield basis (amount + unit) for batch math. */
function resolveSubRecipeYield(subRecipe: Recipe): { amount: number; unit: string } {
  if (subRecipe.yield && subRecipe.yield.totalYieldAmount > 0) {
    return { amount: subRecipe.yield.totalYieldAmount, unit: subRecipe.yield.totalYieldUnit || 'g' };
  }
  return { amount: calculateTotalTargetWeight(subRecipe) || 1, unit: 'g' };
}

/** One leaf ingredient's contribution, in the inventory ingredient's own unit. */
interface LeafContribution {
  ingredientId: string;
  quantity: number;
  /**
   * True when a unit conversion failed. Such a leaf is KEPT (with the
   * unconverted quantity) in the raw-ingredient/shopping view but FLAGGED so the
   * cost rollup omits it — preserving the prior, divergent behavior of the two
   * callers from a single traversal.
   */
  costExcluded: boolean;
}

/**
 * Single source of truth for expanding a recipe into its leaf ingredient
 * contributions: sub-recipes flattened to leaves, hardware/cavity yield and
 * component buffers applied, units converted to each inventory ingredient's own
 * unit, cycles broken via a "computing" memo sentinel and DAG reuse memoized at
 * the per-unit (baseQuantity = 1) basis.
 *
 * Both calculateRecipeCost and getRecipeRawIngredients derive from this so the
 * cost view and the shopping/allergen view can never drift. This is the
 * ingredient-unit/cost basis; the physics path (resolveRecipeLeaves) is a
 * separate grams + composition basis because it intentionally drops discrete
 * (massless) leaves, which cost and shopping must keep.
 */
function expandRecipeContributions(
  recipe: Recipe,
  baseQuantity: number,
  allRecipes: Recipe[],
  inventoryIngredients: Ingredient[],
  warnings: UnitConversionWarning[],
  memo: Map<string, LeafContribution[] | 'computing'>,
): LeafContribution[] {
  const scaleAll = (leaves: LeafContribution[]) =>
    leaves.map(c => ({ ...c, quantity: c.quantity * baseQuantity }));

  if (recipe.id) {
    const mem = memo.get(recipe.id);
    if (mem === 'computing') return [];        // true cycle — contributes nothing
    if (mem) return scaleAll(mem);             // memoized per-unit basis
    memo.set(recipe.id, 'computing');
  }

  const base: LeafContribution[] = [];
  const totalYield = calculateTotalTargetYield(recipe, 1);
  const totalWeight = calculateTotalTargetWeight(recipe, 1);

  for (const comp of recipe.components || []) {
    const componentTargetWeight = calculateComponentTargetWeight(comp, totalWeight, recipe.type, 1);

    for (const ing of comp.ingredients) {
      const scaledQty = scaleIngredient(ing, comp, totalYield, componentTargetWeight);

      if (ing.type === 'recipe' && ing.recipeId) {
        const subRecipe = allRecipes.find(r => r.id === ing.recipeId);
        if (!subRecipe) continue;
        const { amount: subYield, unit: subUnit } = resolveSubRecipeYield(subRecipe);

        let finalQty = scaledQty;
        let convFailed = false;
        if (ing.unit && ing.unit !== subUnit) {
          const converted = convertUnit(scaledQty, ing.unit, subUnit);
          if (converted !== null) finalQty = converted;
          else { convFailed = true; warnings.push({ fromUnit: ing.unit, toUnit: subUnit, subjectType: 'sub_recipe', subjectName: subRecipe.name }); }
        }

        const batches = finalQty / subYield;
        const subContribs = expandRecipeContributions(subRecipe, batches, allRecipes, inventoryIngredients, warnings, memo);
        for (const c of subContribs) {
          base.push({ ...c, costExcluded: c.costExcluded || convFailed });
        }
      } else if (ing.ingredientId) {
        const inv = inventoryIngredients.find(i => i.id === ing.ingredientId);
        if (!inv) continue;

        let finalQty = scaledQty;
        let convFailed = false;
        if (ing.unit && inv.unit && ing.unit !== inv.unit) {
          const converted = convertUnit(scaledQty, ing.unit, inv.unit, inv.density);
          if (converted !== null) finalQty = converted;
          else { convFailed = true; warnings.push({ fromUnit: ing.unit, toUnit: inv.unit, subjectType: 'ingredient', subjectName: inv.name }); }
        }

        base.push({ ingredientId: ing.ingredientId, quantity: finalQty, costExcluded: convFailed });
      }
    }
  }

  if (recipe.id) memo.set(recipe.id, base);
  return scaleAll(base);
}

function dedupeWarnings(warnings: UnitConversionWarning[]): UnitConversionWarning[] {
  const seen = new Set<string>();
  const deduped: UnitConversionWarning[] = [];
  for (const w of warnings) {
    const key = `${w.subjectType}|${w.subjectName}|${w.fromUnit}|${w.toUnit}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(w);
  }
  return deduped;
}

export function calculateRecipeCost(
  recipe: Recipe,
  inventoryIngredients: Ingredient[],
  allRecipes: Recipe[] = [],
): { cost: number; unitWarnings: UnitConversionWarning[] } {
  const warnings: UnitConversionWarning[] = [];
  const leaves = expandRecipeContributions(recipe, 1, allRecipes, inventoryIngredients, warnings, new Map());

  let totalCost = 0;
  for (const leaf of leaves) {
    if (leaf.costExcluded) continue;
    const inv = inventoryIngredients.find(i => i.id === leaf.ingredientId);
    if (!inv) continue;
    const costToUse = inv.weightedAverageCost || inv.costPerUnit || 0;
    if (costToUse > 0) totalCost += leaf.quantity * costToUse;
  }

  return { cost: totalCost, unitWarnings: dedupeWarnings(warnings) };
}

export function getRecipeRawIngredients(
  recipe: Recipe,
  baseQuantity: number,
  allRecipes: Recipe[],
  inventoryIngredients: Ingredient[],
): Map<string, number> {
  const warnings: UnitConversionWarning[] = [];
  const leaves = expandRecipeContributions(recipe, baseQuantity, allRecipes, inventoryIngredients, warnings, new Map());

  // Shopping/allergen view keeps every leaf, including unit-conversion failures
  // (with the unconverted quantity), aggregated by ingredient id.
  const result = new Map<string, number>();
  for (const leaf of leaves) {
    result.set(leaf.ingredientId, (result.get(leaf.ingredientId) ?? 0) + leaf.quantity);
  }
  return result;
}
export function getRecipeAllergens(
  recipe: Recipe,
  allRecipes: Recipe[],
  inventoryIngredients: Ingredient[]
): string[] {
  const rawIngredients = getRecipeRawIngredients(recipe, 1, allRecipes, inventoryIngredients);
  const allergens = new Set<string>();
  
  rawIngredients.forEach((_, id) => {
    const ing = inventoryIngredients.find(i => i.id === id);
    if (ing && ing.allergens) {
      ing.allergens.forEach(a => {
        if (a.trim()) allergens.add(a.trim());
      });
    }
  });
  
  return Array.from(allergens).sort();
}
