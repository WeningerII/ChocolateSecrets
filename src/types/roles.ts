// =====================================================================
// Roles (Milestone C — Role Architecture)
// =====================================================================

/**
 * Universal roles — what an ingredient does in a recipe, independent of category.
 * The formulation engine reads this. Closed enum: new roles require a code change.
 */
export const UNIVERSAL_ROLES = [
  'sweetener',     // sucrose, honey, glucose syrup, sorbitol, invert sugar
  'fat',           // butter, oil, cocoa butter, lard
  'liquid',        // cream, milk, water added, juice, stock
  'flour_starch',  // wheat flour, rye flour, cornstarch, tapioca
  'leavener',      // yeast, baking soda, baking powder, sourdough starter
  'acidulant',     // vinegar, citrus juice, lemon zest, citric acid
  'hydrocolloid',  // gelatin, pectin, agar, carrageenan, xanthan, lbg
  'protein',       // egg, milk powder, whey, casein, meat, seafood
  'alcohol',       // wine, spirit, liqueur, beer
  'flavor',        // extracts, oils, infusions, spices, herbs, vanilla
  'inclusion',     // nuts, dried fruit, chocolate chips, seeds (textural additions)
  'salt',          // table salt, sea salt, kosher salt, mineral seasonings
  'water',         // explicit water added (not the water inside another ingredient)
  'other',         // doesn't fit cleanly — color, dust, garnish, packaging, etc.
] as const;

export type UniversalRole = typeof UNIVERSAL_ROLES[number];

/**
 * Category-specific subtypes. Each module declares its own. Listed here for type-safety
 * across the codebase, but only the corresponding module reads its subtype values.
 *
 * Confectionery, frozen, bread, brined, plated subtypes — populated as those modules ship.
 */
export type ConfectionerySubtype =
  | 'chocolate' | 'cream' | 'butter' | 'sugar_add' | 'puree' | 'powder'
  | 'milk_powder' | 'glucose_syrup' | 'flavor_oil' | 'infusion'
  | 'stabilizer' | 'gelatin' | 'cocoa_butter' | 'praline_paste'
  | 'fondant' | 'inclusion';

export type FrozenSubtype =
  | 'base_dairy' | 'base_water' | 'sugar_blend' | 'fat_addition'
  | 'stabilizer_blend' | 'flavor_paste' | 'inclusion' | 'alcohol_low_dose';

export type BreadSubtype =
  | 'bread_flour' | 'whole_wheat_flour' | 'rye_flour' | 'specialty_flour'
  | 'starter' | 'preferment' | 'commercial_yeast'
  | 'enrichment_fat' | 'enrichment_dairy' | 'enrichment_egg' | 'enrichment_sweetener'
  | 'inclusion' | 'salt';

export type CategorySubtype =
  | ConfectionerySubtype
  | FrozenSubtype
  | BreadSubtype;

/**
 * Role tag attached to a recipe ingredient.
 *
 * `universal` is what cross-category tooling reads (the optimizer, warnings, the rollup).
 * `subtype` is read only by the matching category module.
 * `provenance` records how the role was determined.
 */
export interface RoleTag {
  universal: UniversalRole;
  subtype?: CategorySubtype;
  provenance: 'inferred_high' | 'inferred_low' | 'user_confirmed' | 'user_edited' | 'verbatim';
  confidence?: number;          // 0..1, only meaningful for inferred_*
}
