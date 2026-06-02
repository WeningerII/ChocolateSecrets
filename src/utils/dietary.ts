import type { Composition, DietaryFlag, Ingredient } from '../types';

// Threshold for "low lactose" labeling on an individual ingredient.
// 0.5% by mass aligns with the practical floor where hard aged cheeses
// (parmesan, aged cheddar) sit and below which lactose intolerance
// symptoms are clinically rare.
const LOW_LACTOSE_INGREDIENT_THRESHOLD_PCT = 0.5;

// FDA-aligned threshold for product-level "lactose-free" claims.
// Most lactose-intolerant individuals tolerate ≤1g lactose per serving
// without symptoms. NIH NIDDK consensus value.
const LOW_LACTOSE_PER_SERVING_THRESHOLD_G = 1.0;

/**
 * Derive the dietary classification for a single ingredient from its
 * composition. Pure function; no I/O. Call at ingredient save time.
 */
export function deriveIngredientDietaryFlags(composition: Composition | undefined): DietaryFlag[] {
  const lactose = composition?.lactose;
  if (lactose === undefined || lactose === 0) return ['lactose_free'];
  if (lactose <= LOW_LACTOSE_INGREDIENT_THRESHOLD_PCT) return ['low_lactose'];
  return ['lactose_present'];
}

/**
 * Derive the dietary classification for a recipe from its component
 * ingredients and serving size. A recipe is lactose_free only if every
 * dairy ingredient is lactose_free. Otherwise, classification depends
 * on whether total lactose per serving falls under the FDA threshold.
 *
 * @param ingredientLactosePctByMass  per-ingredient lactose composition values
 * @param ingredientMassesG           per-ingredient mass in grams
 * @param totalServings               how many servings the recipe yields (>= 1)
 */
export function deriveRecipeDietaryFlags(
  ingredientLactosePctByMass: number[],
  ingredientMassesG: number[],
  totalServings: number
): DietaryFlag[] {
  if (ingredientLactosePctByMass.length !== ingredientMassesG.length) {
    throw new Error('deriveRecipeDietaryFlags: array length mismatch');
  }
  if (totalServings < 1) return ['lactose_present']; // defensive; bad input → safest label

  // Total lactose grams across all ingredients
  let totalLactoseG = 0;
  let anyLactosePresent = false;
  for (let i = 0; i < ingredientLactosePctByMass.length; i++) {
    const lactoseG = (ingredientLactosePctByMass[i] / 100) * ingredientMassesG[i];
    totalLactoseG += lactoseG;
    if (ingredientLactosePctByMass[i] > 0) anyLactosePresent = true;
  }

  if (!anyLactosePresent) return ['lactose_free'];

  const lactoseGPerServing = totalLactoseG / totalServings;
  if (lactoseGPerServing <= LOW_LACTOSE_PER_SERVING_THRESHOLD_G) return ['low_lactose'];
  return ['lactose_present'];
}
