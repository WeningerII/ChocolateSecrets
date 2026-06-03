import { Recipe, Ingredient, CrossContactRisk } from '../types';
import { deriveAllergens, identifyCrossContactRisks, AllergenFlag } from '../services/culinaryTools';
import { getRecipeRawIngredients } from './recipeMath';

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

  // Enumerate ingredient names through the canonical BOM expansion so sub-recipe
  // ingredients are included (their allergens matter for cross-contact too),
  // while preserving the inline-name fallback for rows whose ingredient isn't in
  // the catalog — allergen detection must not silently drop those.
  const ingredientNames = (recipe: Recipe): string[] => {
    const names = new Set<string>();
    const expanded = getRecipeRawIngredients(recipe, 1, allRecipes, ingredients);
    expanded.forEach((_, id) => {
      const name = ingredients.find(i => i.id === id)?.name;
      if (name) names.add(name);
    });
    for (const comp of recipe.components || []) {
      for (const ing of comp.ingredients || []) {
        const known = ing.ingredientId && ingredients.some(i => i.id === ing.ingredientId);
        if (known) continue;
        const inline = (ing as any).name;
        if (inline) names.add(inline);
      }
    }
    return [...names];
  };

  const currentAllergens: AllergenFlag[] = deriveAllergens(ingredientNames(targetRecipe));

  const otherRecipeAllergens: AllergenFlag[][] = allRecipes
    .filter(r => r.id !== targetRecipe.id && r.stationTag?.primary === station)
    .map(r => deriveAllergens(ingredientNames(r)));

  return identifyCrossContactRisks(currentAllergens, otherRecipeAllergens, station);
}
