import { Recipe, Ingredient, CrossContactRisk } from '../types';
import { deriveAllergens, identifyCrossContactRisks, AllergenFlag } from '../services/culinaryTools';

/**
 * Compute cross-contact risks for a target recipe given the full recipe catalog.
 * Returns structured records (allergen + station) describing allergens present
 * on OTHER recipes that share the same station. The renderer composes the
 * displayed sentence at view time using i18n keys.
 *
 * Returns empty array if the recipe has no station tag, or if no other recipes
 * share the station.
 */
export function computeCrossContactRisks(
  targetRecipe: Recipe,
  allRecipes: Recipe[],
  ingredients: Ingredient[]
): CrossContactRisk[] {
  const station = targetRecipe.stationTag?.primary;
  if (!station) return [];

  const ingredientNames = (recipe: Recipe): string[] => {
    const names: string[] = [];
    for (const comp of recipe.components || []) {
      for (const ing of comp.ingredients || []) {
        const resolved = ingredients.find(i => i.id === ing.ingredientId);
        const name = resolved?.name || (ing as any).name;
        if (name) names.push(name);
      }
    }
    return names;
  };

  const currentAllergens: AllergenFlag[] = deriveAllergens(ingredientNames(targetRecipe));

  const otherRecipeAllergens: AllergenFlag[][] = allRecipes
    .filter(r => r.id !== targetRecipe.id && r.stationTag?.primary === station)
    .map(r => deriveAllergens(ingredientNames(r)));

  return identifyCrossContactRisks(currentAllergens, otherRecipeAllergens, station);
}
