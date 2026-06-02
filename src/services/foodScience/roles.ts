import type {
  Ingredient,
  UniversalRole,
  RoleTag,
} from '../../types';

interface InferenceRule {
  /** Returns confidence 0..1 if rule matches, 0 if not. */
  test: (ingredient: Ingredient) => number;
  role: UniversalRole;
}

export type ResolvableIngredient = Pick<Ingredient, 'name' | 'category'> & Partial<Pick<Ingredient, 'chocolateSpec' | 'alcoholSpec'>>;

const NAME = (i: ResolvableIngredient) => (i.name ?? '').toLowerCase().trim();
const CAT = (i: ResolvableIngredient) => i.category;
const has = (re: RegExp, conf = 0.85) => (i: ResolvableIngredient) => re.test(NAME(i)) ? conf : 0;
const hasNot = (re: RegExp) => (i: ResolvableIngredient) => !re.test(NAME(i));
const all = (...preds: Array<(i: ResolvableIngredient) => boolean>) =>
  (i: ResolvableIngredient) => preds.every(p => p(i));

/**
 * Inference rules in priority order. First rule whose `test` returns > 0 wins.
 * The returned confidence becomes the role's confidence.
 *
 * Maintenance note: when adding new rules, run roles.test.ts and check that the
 * negative cases (peanut butter ≠ butter, sour cream ≠ cream, ice cream ≠ cream)
 * still pass.
 */
const RULES: { test: (ingredient: ResolvableIngredient) => number; role: UniversalRole }[] = [
  // Spec-driven roles (highest confidence)
  { role: 'fat',     test: i => i.chocolateSpec ? 0 : 0 },        // see explicit handling below
  { role: 'alcohol', test: i => i.alcoholSpec?.abv !== undefined ? 0.95 : 0 },

  // Salt
  { role: 'salt', test: has(/\b(salt|sodium chloride|fleur de sel|kosher|sel)\b/) },

  // Water (explicit)
  { role: 'water', test: i => /^(water|distilled water|filtered water|agua)$/.test(NAME(i)) ? 0.95 : 0 },

  // Hydrocolloids — must come before "fat" because "gelatin" might be miscategorized
  { role: 'hydrocolloid', test: has(/\b(gelatin|gelatine|pectin|agar|carrageenan|locust bean|lbg|xanthan|gellan|guar|methylcellulose|cmc|alginate)\b/) },

  // Leaveners
  { role: 'leavener', test: has(/\b(yeast|baking soda|baking powder|bicarbonate|sourdough starter|levain|poolish|biga)\b/) },

  // Flour / starch
  { role: 'flour_starch', test: has(/\b(flour|starch|cornstarch|tapioca|arrowroot|semolina|farina|harina|farinha)\b/) },

  // Acidulants
  { role: 'acidulant', test: has(/\b(vinegar|lemon juice|lime juice|lemon zest|lime zest|citric acid|tartaric acid|cream of tartar|verjus|tamarind)\b/) },

  // Sweeteners
  { role: 'sweetener', test: i => {
    const n = NAME(i);
    if (/\b(honey|miel)\b/.test(n)) return 0.95;
    if (/\b(maple syrup|agave|molasses|treacle|jaggery|piloncillo)\b/.test(n)) return 0.90;
    if (/\b(sugar|sucrose|invert|trimoline|glucose syrup|corn syrup|sorbitol|maltitol|erythritol|isomalt|allulose|stevia|monk fruit|jarabe de glucosa|azucar)\b/.test(n)) return 0.90;
    if (/\b(dextrose|fructose|maltose|lactose powder)\b/.test(n)) return 0.85;
    return 0;
  } },

  // Fat — careful with negatives
  { role: 'fat', test: i => {
    const n = NAME(i);
    if (/peanut butter|nut butter|almond butter|cashew butter|tahini/.test(n)) return 0; // these are inclusions / pastes, see below
    if (/\b(essential|peppermint|lemon|orange|flavor)\s+oil\b/.test(n)) return 0; // flavor oils
    if (/cocoa butter/.test(n)) return 0.95;
    if (/\bbutter\b/.test(n)) return 0.92;
    if (/\b(oil|olive oil|vegetable oil|grapeseed|canola|sunflower|coconut oil|ghee|lard|tallow|schmaltz|duck fat|bacon fat|aceite)\b/.test(n)) return 0.90;
    if (/\b(shortening|margarine|suet|drippings)\b/.test(n)) return 0.85;
    return 0;
  } },

  // Cream / liquid — careful with negatives
  { role: 'liquid', test: i => {
    const n = NAME(i);
    if (/sour cream|ice cream|whipped cream|creamer|cream cheese/.test(n)) return 0;
    if (/\b(cream|crema|nata)\b/.test(n)) return 0.92;
    if (/\b(milk|leche|leite)\b/.test(n) && !/milk powder|powdered milk|nonfat dry|nfdm/.test(n)) return 0.90;
    if (/\b(buttermilk|kefir|yogurt|yoghurt|yogur)\b/.test(n)) return 0.85;
    if (/\b(stock|broth|consomme|fumet|caldo)\b/.test(n)) return 0.85;
    if (/\bjuice\b/.test(n) && !/lemon juice|lime juice/.test(n)) return 0.80;
    return 0;
  } },

  // Protein
  { role: 'protein', test: i => {
    const n = NAME(i);
    if (/\b(wine|vinegar)\b/.test(n)) return 0;
    if (/\b(egg|huevo)\b/.test(n)) return 0.92;
    if (/\b(yolk|white|albumen|yema|clara)\b/.test(n)) return 0.90;
    if (/milk powder|powdered milk|nonfat dry|nfdm|whey|casein|caseinato/.test(n)) return 0.92;
    if (CAT(i) === 'Meat & Seafood') return 0.85;
    if (/\b(tofu|seitan|tempeh)\b/.test(n)) return 0.85;
    return 0;
  } },

  // Alcohol (name-based, when no spec)
  { role: 'alcohol', test: has(/\b(wine|whiskey|whisky|bourbon|rum|vodka|gin|tequila|brandy|cognac|liqueur|kirsch|grand marnier|amaretto|kahlua|chartreuse|absinthe|champagne|prosecco|sherry|port|sake|beer|ale|stout|cerveza)\b/) },

  // Inclusion (textural additions)
  { role: 'inclusion', test: i => {
    const n = NAME(i);
    if (/peanut butter|almond butter|nut butter|cashew butter|tahini|praline paste|gianduja paste|nougat paste/.test(n)) return 0.85;
    if (/\b(nibs|chocolate chips|chips|crispearls|pearls|crumb|streusel|dragees)\b/.test(n)) return 0.88;
    if (CAT(i) === 'Nuts & Seeds') return 0.80;
    if (/\b(raisin|sultana|currant|cranberry|date|fig|apricot|prune)\b/.test(n) && /dried/.test(n)) return 0.85;
    return 0;
  } },

  // Flavor — broad fallback for spices/extracts/oils/infusions
  { role: 'flavor', test: i => {
    const n = NAME(i);
    if (/\b(extract|essence|oil|essential oil)\b/.test(n)) return 0.80;
    if (/\b(vanilla|cinnamon|nutmeg|clove|cardamom|saffron|star anise|chili|chile|chilli|peppercorn|allspice|coriander|cumin|fennel|anise|ginger|turmeric)\b/.test(n)) return 0.80;
    if (/\b(rosemary|thyme|sage|oregano|basil|tarragon|mint|dill|chive|parsley|cilantro|bay leaf|laurel)\b/.test(n)) return 0.80;
    if (/\b(coffee|espresso|tea|matcha|hojicha|chai)\b/.test(n)) return 0.80;
    if (CAT(i) === 'Spices & Extracts') return 0.75;
    return 0;
  } },
];

const CATEGORY_FALLBACK: Partial<Record<string, UniversalRole>> = {
  'Sugars & Sweeteners': 'sweetener',
  'Fats & Oils': 'fat',
  'Dairy & Alternatives': 'liquid',
  'Flours & Starches': 'flour_starch',
  'Spices & Extracts': 'flavor',
  'Leaveners': 'leavener',
  'Emulsifiers & Stabilizers': 'hydrocolloid',
  'Meat & Seafood': 'protein',
  'Nuts & Seeds': 'inclusion',
  'Fruits & Purees': 'flavor',     // fruit purees commonly used as flavor + acidulant; subtype refines
  'Beverages': 'liquid',
  'Chocolates & Cocoas': 'fat',    // dark chocolate is fat-dominant; subtype refines
};

export function inferRole(ingredient: ResolvableIngredient): { role: UniversalRole | null; confidence: number } {
  // Special handling: chocolate spec → 'fat' role with high confidence
  // (subtype 'chocolate' will be set by the confectionery module in Milestone D)
  if (ingredient.chocolateSpec) {
    return { role: 'fat', confidence: 0.92 };
  }

  // Run rules in order
  let best: { role: UniversalRole; confidence: number } | null = null;
  for (const rule of RULES) {
    const conf = rule.test(ingredient);
    if (conf > 0 && (!best || conf > best.confidence)) {
      best = { role: rule.role, confidence: conf };
    }
  }

  if (best && best.confidence >= 0.75) return best;

  // Category fallback (lower confidence)
  const cat = ingredient.category;
  if (cat && CATEGORY_FALLBACK[cat]) {
    return { role: CATEGORY_FALLBACK[cat]!, confidence: 0.60 };
  }

  return { role: null, confidence: 0 };
}

/**
 * Build a RoleTag from inference. Returns null if confidence is below the threshold
 * for assigning a role at all.
 */
export function inferRoleTag(ingredient: ResolvableIngredient, threshold = 0.75): RoleTag | null {
  const { role, confidence } = inferRole(ingredient);
  if (!role) return null;
  if (confidence < threshold) return null;
  return {
    universal: role,
    provenance: confidence >= 0.85 ? 'inferred_high' : 'inferred_low',
    confidence,
  };
}

/**
 * Return all ingredients in `catalog` that match the given universal role with
 * sufficient confidence. Used by the optimizer (Milestone E) for swap-set computation.
 */
export function getRoleSwapSet(
  role: UniversalRole,
  catalog: Ingredient[],
  threshold = 0.75
): Ingredient[] {
  return catalog.filter(ing => {
    const { role: inferred, confidence } = inferRole(ing);
    return inferred === role && confidence >= threshold;
  });
}

export const ROLE_PRESENTATION: Record<UniversalRole, { labelKey: string; iconHint?: string }> = {
  sweetener:    { labelKey: 'recipes:role.sweetener',    iconHint: 'candy' },
  fat:          { labelKey: 'recipes:role.fat',          iconHint: 'droplet' },
  liquid:       { labelKey: 'recipes:role.liquid',       iconHint: 'glass-water' },
  flour_starch: { labelKey: 'recipes:role.flour_starch', iconHint: 'wheat' },
  leavener:     { labelKey: 'recipes:role.leavener',     iconHint: 'sparkles' },
  acidulant:    { labelKey: 'recipes:role.acidulant',    iconHint: 'citrus' },
  hydrocolloid: { labelKey: 'recipes:role.hydrocolloid', iconHint: 'snowflake' },
  protein:      { labelKey: 'recipes:role.protein',      iconHint: 'egg' },
  alcohol:      { labelKey: 'recipes:role.alcohol',      iconHint: 'wine' },
  flavor:       { labelKey: 'recipes:role.flavor',       iconHint: 'flower' },
  inclusion:    { labelKey: 'recipes:role.inclusion',    iconHint: 'nut' },
  salt:         { labelKey: 'recipes:role.salt',         iconHint: 'asterisk' },
  water:        { labelKey: 'recipes:role.water',        iconHint: 'droplets' },
  other:        { labelKey: 'recipes:role.other',        iconHint: 'circle' },
};
