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

  // Build the id→ingredient lookup once; computeCrossContactRisks enumerates
  // names for the target AND every sibling recipe on the station, so a linear
  // scan per leaf/row would be O(recipes × leaves × catalog).
  const byId = new Map(ingredients.map(i => [i.id, i]));

  // Enumerate ingredient names through the canonical BOM expansion so sub-recipe
  // ingredients are included (their allergens matter for cross-contact too),
  // while preserving the inline-name fallback for rows whose ingredient isn't in
  // the catalog — allergen detection must not silently drop those.
  const ingredientNames = (recipe: Recipe): string[] => {
    const names = new Set<string>();
    const expanded = getRecipeRawIngredients(recipe, 1, allRecipes, ingredients);
    expanded.forEach((_, id) => {
      const name = byId.get(id)?.name;
      if (name) names.add(name);
    });
    for (const comp of recipe.components || []) {
      for (const ing of comp.ingredients || []) {
        if (ing.ingredientId && byId.has(ing.ingredientId)) continue;
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

/**
 * Normalize a recipe's stored cross-contact risks to a stable, order-independent
 * string so two values can be compared. Legacy `string[]` entries normalize to a
 * distinct `legacy:` form, so a recompute always supersedes them with the
 * structured shape rather than being treated as already up to date.
 */
function normalizeRisks(risks: (CrossContactRisk | string)[] | undefined): string {
  if (!risks || risks.length === 0) return '';
  return risks
    .map(r => (typeof r === 'string' ? `legacy:${r}` : `${r.allergen}|${r.station ?? ''}`))
    .sort()
    .join('\n');
}

/** True when two cross-contact risk lists are equivalent, ignoring order. */
export function crossContactRisksEqual(
  a: (CrossContactRisk | string)[] | undefined,
  b: (CrossContactRisk | string)[] | undefined
): boolean {
  return normalizeRisks(a) === normalizeRisks(b);
}

/**
 * Plan a global cross-contact recompute. Saving a single recipe only refreshes
 * that recipe's own `crossContactRisks`; sibling recipes sharing its station keep
 * stale values until they too are saved. This recomputes every recipe against the
 * full catalog and returns only those whose stored value changed, so the caller
 * can persist a minimal set of writes.
 *
 * Pure and Firestore-free so it stays unit-testable; persistence lives in
 * `recomputeAllCrossContactRisks` (crossContactRecompute.ts).
 */
export function planCrossContactRecompute(
  allRecipes: Recipe[],
  ingredients: Ingredient[]
): { recipeId: string; crossContactRisks: CrossContactRisk[] }[] {
  const changes: { recipeId: string; crossContactRisks: CrossContactRisk[] }[] = [];
  for (const recipe of allRecipes) {
    if (!recipe.id) continue;
    const next = computeCrossContactRisks(recipe, allRecipes, ingredients);
    if (!crossContactRisksEqual(recipe.crossContactRisks, next)) {
      changes.push({ recipeId: recipe.id, crossContactRisks: next });
    }
  }
  return changes;
}
