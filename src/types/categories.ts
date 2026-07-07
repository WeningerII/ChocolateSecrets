// =====================================================================
// Recipe categories (Milestone D — Confectionery Module)
// =====================================================================

/**
 * A recipe's category tags select which physics modules apply on top of universal.
 * Multiple categories can stack (e.g., a frozen confection that gets both rule sets).
 * Adding a new category requires shipping its module — see /services/foodScience/.
 */
export const RECIPE_CATEGORIES = [
  'confectionery',  // ganaches, truffles, bonbons, caramels, nougat, fudge, marshmallow, fondant, fillings
  'frozen',         // ice cream, gelato, sorbet, sherbet, semifreddo, granita, frozen yogurt — Milestone F
  'bread',          // doughs, viennoiserie, breads, pizza — Milestone G
  'plated',         // plated desserts, hot/cold composed plates — later
  'brined',         // cures, brines, charcuterie — later
  'sauce',          // sauces, emulsions, reductions — later
  'savory',         // catch-all for non-categorical savory — later
] as const;

export type RecipeCategory = typeof RECIPE_CATEGORIES[number];

// =====================================================================
// Frozen recipe subtype (Milestone F — Frozen Module)
// =====================================================================

/**
 * What the recipe IS as a finished product. Distinct from the per-ingredient
 * `RoleTag.subtype: FrozenSubtype`, which describes what an ingredient DOES
 * inside the recipe.
 */
export const FROZEN_RECIPE_SUBTYPES = [
  'gelato',
  'ice_cream',
  'sorbet',
  'sherbet',
  'semifreddo',
  'frozen_yogurt',
  'granita',
] as const;

export type FrozenRecipeSubtype = typeof FROZEN_RECIPE_SUBTYPES[number];

// =====================================================================
// Bread recipe subtype (Milestone G — Bread Module)
// =====================================================================

/**
 * What the recipe IS as a finished product. Distinct from the per-ingredient
 * `RoleTag.subtype: BreadSubtype` which describes what an ingredient DOES.
 */
export const BREAD_RECIPE_SUBTYPES = [
  'standard_bread',     // generic country / boule / batard at 65–75% hydration
  'ciabatta',           // very wet, 75–85% hydration
  'baguette',           // 65–72% hydration, instant yeast
  'bagel',              // very stiff, 50–58% hydration
  'pizza_dough',        // 60–65% hydration, longer ferment, possibly poolish
  'brioche',            // enriched: butter + eggs, 50–55% hydration
  'whole_wheat',        // 100% whole wheat or majority whole wheat
  'sourdough',          // levain-leavened, 70–80% hydration typical
  'pan_loaf',           // sandwich tin loaf, 60–68% hydration, often slightly enriched
] as const;

export type BreadRecipeSubtype = typeof BREAD_RECIPE_SUBTYPES[number];

/**
 * Mixing method drives the friction factor used in DDT calculation.
 *   hand          — friction factor 0
 *   stand_mixer   — friction factor 8–15 (default 10)
 *   spiral_mixer  — friction factor 20–30 (default 25)
 *   no_knead      — friction factor 0 (autolyse + folds only)
 */
export const MIXING_METHODS = ['hand', 'stand_mixer', 'spiral_mixer', 'no_knead'] as const;
export type MixingMethod = typeof MIXING_METHODS[number];

export const DEFAULT_FRICTION_FACTOR_BY_METHOD: Record<MixingMethod, number> = {
  hand:         0,
  stand_mixer:  10,
  spiral_mixer: 25,
  no_knead:     0,
};
