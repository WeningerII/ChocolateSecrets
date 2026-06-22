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

export function calculateRecipeCost(
  recipe: Recipe, 
  inventoryIngredients: Ingredient[], 
  allRecipes: Recipe[] = [], 
  _memo: Map<string, number | 'computing'> = new Map(),
  _warnings: UnitConversionWarning[] = []
): { cost: number; unitWarnings: UnitConversionWarning[] } {
  if (recipe.id) {
    const mem = _memo.get(recipe.id);
    if (mem === 'computing') return { cost: 0, unitWarnings: _warnings };
    if (typeof mem === 'number') return { cost: mem, unitWarnings: _warnings };
    _memo.set(recipe.id, 'computing');
  }

  const totalTargetYield = calculateTotalTargetYield(recipe);
  const totalTargetWeight = calculateTotalTargetWeight(recipe);

  let totalCost = 0;

  for (const comp of recipe.components || []) {
    const componentTargetWeight = calculateComponentTargetWeight(comp, totalTargetWeight, recipe.type);
    
    for (const ing of comp.ingredients) {
      const scaledQty = scaleIngredient(ing, comp, totalTargetYield, componentTargetWeight);
      
      if (ing.type === 'recipe' && ing.recipeId) {
        const subRecipe = allRecipes.find(r => r.id === ing.recipeId);
        if (subRecipe) {
          const subResult = calculateRecipeCost(subRecipe, inventoryIngredients, allRecipes, _memo, _warnings);
          const subRecipeCost = subResult.cost;
          
          let subRecipeYieldAmount = 1;
          let subRecipeYieldUnit = 'g';
          
          if (subRecipe.yield && subRecipe.yield.totalYieldAmount > 0) {
            subRecipeYieldAmount = subRecipe.yield.totalYieldAmount;
            subRecipeYieldUnit = subRecipe.yield.totalYieldUnit || 'g';
          } else {
            subRecipeYieldAmount = calculateTotalTargetWeight(subRecipe) || 1;
          }
          
          const costPerUnit = subRecipeCost / subRecipeYieldAmount;
          
          let finalQty = scaledQty;
          if (ing.unit && ing.unit !== subRecipeYieldUnit) {
            const converted = convertUnit(scaledQty, ing.unit, subRecipeYieldUnit);
            if (converted !== null) {
              finalQty = converted;
            } else {
              _warnings.push({
                fromUnit: ing.unit,
                toUnit: subRecipeYieldUnit,
                subjectType: 'sub_recipe',
                subjectName: subRecipe.name,
              });
              continue;
            }
          }
          
          totalCost += finalQty * costPerUnit;
        }
      } else {
        const inventoryIng = inventoryIngredients.find(i => i.id === ing.ingredientId);
        
        if (inventoryIng) {
          const costToUse = inventoryIng.weightedAverageCost || inventoryIng.costPerUnit || 0;
          if (costToUse > 0) {
            let finalQty = scaledQty;
            if (ing.unit && inventoryIng.unit && ing.unit !== inventoryIng.unit) {
              const converted = convertUnit(scaledQty, ing.unit, inventoryIng.unit, inventoryIng.density);
              if (converted !== null) {
                finalQty = converted;
              } else {
                _warnings.push({
                  fromUnit: ing.unit,
                  toUnit: inventoryIng.unit,
                  subjectType: 'ingredient',
                  subjectName: inventoryIng.name,
                });
                continue;
              }
            }
            totalCost += finalQty * costToUse;
          }
        }
      }
    }
  }

  if (recipe.id) {
    _memo.set(recipe.id, totalCost);
  }

  // Structural dedupe — Set comparison is reference-based on objects, so
  // serialize each warning to a stable key.
  const seen = new Set<string>();
  const deduped: UnitConversionWarning[] = [];
  for (const w of _warnings) {
    const key = `${w.subjectType}|${w.subjectName}|${w.fromUnit}|${w.toUnit}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(w);
  }
  return { cost: totalCost, unitWarnings: deduped };
}

export function getRecipeRawIngredients(
  recipe: Recipe,
  baseQuantity: number,
  allRecipes: Recipe[],
  inventoryIngredients: Ingredient[],
  _memo: Map<string, Map<string, number> | 'computing'> = new Map()
): Map<string, number> {
  if (recipe.id) {
    const mem = _memo.get(recipe.id);
    if (mem === 'computing') return new Map<string, number>();
    if (mem && typeof mem !== 'string') {
      const result = new Map<string, number>();
      mem.forEach((qty, id) => result.set(id, qty * baseQuantity));
      return result;
    }
    _memo.set(recipe.id, 'computing');
  }

  const rawBaseMap = new Map<string, number>();
  
  const totalYield = calculateTotalTargetYield(recipe, 1);
  const totalWeight = calculateTotalTargetWeight(recipe, 1);

  for (const component of recipe.components || []) {
    const componentWeight = calculateComponentTargetWeight(component, totalWeight, recipe.type, 1);

    for (const ing of component.ingredients) {
      const scaledQty = scaleIngredient(ing, component, totalYield, componentWeight);

      if (ing.type === 'recipe' && ing.recipeId) {
        const subRecipe = allRecipes.find(r => r.id === ing.recipeId);
        if (subRecipe) {
          // Determine how many batches of the sub-recipe we need
          let subRecipeYieldAmount = 1;
          let subRecipeYieldUnit = 'g';
          
          if (subRecipe.yield && subRecipe.yield.totalYieldAmount > 0) {
            subRecipeYieldAmount = subRecipe.yield.totalYieldAmount;
            subRecipeYieldUnit = subRecipe.yield.totalYieldUnit || 'g';
          } else {
            subRecipeYieldAmount = calculateTotalTargetWeight(subRecipe) || 1;
          }

          let finalQty = scaledQty;
          if (ing.unit && ing.unit !== subRecipeYieldUnit) {
            const converted = convertUnit(scaledQty, ing.unit, subRecipeYieldUnit);
            if (converted !== null) {
              finalQty = converted;
            }
          }

          const subRecipeBatches = finalQty / subRecipeYieldAmount;
          
          const subIngredients = getRecipeRawIngredients(subRecipe, subRecipeBatches, allRecipes, inventoryIngredients, _memo);
          
          subIngredients.forEach((qty, id) => {
            const current = rawBaseMap.get(id) || 0;
            rawBaseMap.set(id, current + qty);
          });
        }
      } else if (ing.ingredientId) {
        const baseIng = inventoryIngredients.find(i => i.id === ing.ingredientId);
        if (baseIng) {
          let qtyToAdd = scaledQty;
          
          if (ing.unit && ing.unit !== baseIng.unit) {
            const converted = convertUnit(qtyToAdd, ing.unit, baseIng.unit, baseIng.density);
            if (converted !== null) {
              qtyToAdd = converted;
            }
          }

          const current = rawBaseMap.get(ing.ingredientId) || 0;
          rawBaseMap.set(ing.ingredientId, current + qtyToAdd);
        }
      }
    }
  }

  if (recipe.id) {
    _memo.set(recipe.id, rawBaseMap);
  }

  const result = new Map<string, number>();
  rawBaseMap.forEach((qty, id) => {
    result.set(id, qty * baseQuantity);
  });

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
