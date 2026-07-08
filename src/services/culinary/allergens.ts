import type { CrossContactRisk } from '../../types';

/**
 * Allergen types: FDA Top 9 + EU-specific additions (celery, mustard, sulphites, lupin, molluscs).
 * Storing as a union type rather than enum for serialization simplicity.
 */
export type AllergenKey =
  // FDA Top 9
  | 'milk' | 'eggs' | 'fish' | 'shellfish' | 'tree_nuts' | 'peanuts' | 'wheat' | 'soy' | 'sesame'
  // EU Top 14 additions
  | 'celery' | 'mustard' | 'sulphites' | 'lupin' | 'molluscs';

export type AllergenCertainty = 'contains' | 'may_contain' | 'cross_contact_risk';

export interface AllergenFlag {
  allergen: AllergenKey;
  certainty: AllergenCertainty;
  source: string; // e.g. "derived from: unsalted butter"
}

/**
 * Human-readable labels for allergens. Keep keys in sync with AllergenKey.
 */
export const ALLERGEN_LABELS: Record<AllergenKey, string> = {
  milk: 'Milk',
  eggs: 'Eggs',
  fish: 'Fish',
  shellfish: 'Shellfish',
  tree_nuts: 'Tree nuts',
  peanuts: 'Peanuts',
  wheat: 'Wheat',
  soy: 'Soy',
  sesame: 'Sesame',
  celery: 'Celery',
  mustard: 'Mustard',
  sulphites: 'Sulphites',
  lupin: 'Lupin',
  molluscs: 'Molluscs',
};

/**
 * Pattern library mapping ingredient-name fragments to allergens.
 * Patterns run against the lowercased ingredient name.
 * Order matters: earlier patterns that match escalate certainty against later ones.
 */
const ALLERGEN_PATTERNS: Array<{
  pattern: RegExp;
  allergen: AllergenKey;
  certainty: AllergenCertainty;
}> = [
  // ---- Milk / dairy ----
  { pattern: /\b(milk|cream|butter|ghee|whey|casein|cheese|mozzarella|parmesan|yogurt|buttermilk|curd|ricotta|mascarpone|cr[eè]me fra[iî]che|cr[eè]me anglaise|cr[eè]me p[aâ]tissi[eè]re|clotted cream)\b/i, allergen: 'milk', certainty: 'contains' },
  { pattern: /\b(milk chocolate|white chocolate|condensed milk|evaporated milk|dulce de leche|caramel|toffee|nougat|gianduja|pralin[eé])\b/i, allergen: 'milk', certainty: 'contains' },
  { pattern: /\b(dark chocolate|bittersweet|semisweet|couverture)\b/i, allergen: 'milk', certainty: 'may_contain' },

  // ---- Eggs ----
  { pattern: /\b(egg|yolk|albumen|meringue|pavlova|g[eé]noise|sponge cake|cr[eè]me anglaise|cr[eè]me p[aâ]tissi[eè]re|mayonnaise|aioli|hollandaise|sabayon|zabaglione)\b/i, allergen: 'eggs', certainty: 'contains' },

  // ---- Wheat / gluten ----
  { pattern: /\b(wheat|flour|all-?purpose|bread flour|cake flour|pastry flour|semolina|spelt|farro|durum|bulgur|couscous|panini|brioche|croissant|choux|puff pastry|pie dough|biscuit|cookie|phyllo|filo|orzo|matzo|seitan)\b/i, allergen: 'wheat', certainty: 'contains' },
  { pattern: /\b(soy sauce|tamari)\b/i, allergen: 'wheat', certainty: 'may_contain' },
  { pattern: /\b(modified food starch|caramel color)\b/i, allergen: 'wheat', certainty: 'may_contain' },

  // ---- Soy ----
  { pattern: /\b(soy|soybean|soya|tofu|edamame|tempeh|miso|tamari)\b/i, allergen: 'soy', certainty: 'contains' },
  { pattern: /\blecithin\b(?!.*sunflower)/i, allergen: 'soy', certainty: 'may_contain' }, // lecithin defaults to soy unless sunflower specified

  // ---- Tree nuts ----
  { pattern: /\b(almond|amaretto|marzipan|frangipane)\b/i, allergen: 'tree_nuts', certainty: 'contains' },
  { pattern: /\b(hazelnut|filbert|nocciola|gianduja|frangelico|nutella)\b/i, allergen: 'tree_nuts', certainty: 'contains' },
  { pattern: /\b(walnut|pecan|cashew|pistachio|macadamia|brazil nut|pine nut|pignoli|chestnut)\b/i, allergen: 'tree_nuts', certainty: 'contains' },
  { pattern: /\b(praline|praliné|nougatine|nougat|torrone)\b/i, allergen: 'tree_nuts', certainty: 'contains' },

  // ---- Peanuts ----
  { pattern: /\b(peanut|groundnut|goober)\b/i, allergen: 'peanuts', certainty: 'contains' },

  // ---- Sesame (FASTER Act 2021, effective 2023) ----
  { pattern: /\b(sesame|tahini|halva|halvah|gomasio|everything bagel)\b/i, allergen: 'sesame', certainty: 'contains' },

  // ---- Fish ----
  { pattern: /\b(fish|salmon|tuna|cod|anchov|sardine|mackerel|herring|trout|sea bass|halibut|sole|fish sauce|worcestershire|caesar)\b/i, allergen: 'fish', certainty: 'contains' },

  // ---- Shellfish (crustaceans) ----
  { pattern: /\b(shrimp|prawn|crab|lobster|crayfish|langoustine)s?\b/i, allergen: 'shellfish', certainty: 'contains' },

  // ---- Molluscs (EU-specific, split out from shellfish) ----
  { pattern: /\b(oyster|clam|mussel|scallop|squid|octopus|calamari|abalone|snail|escargot)s?\b/i, allergen: 'molluscs', certainty: 'contains' },

  // ---- Celery (EU) ----
  { pattern: /\b(celery|celeriac|celery seed|celery salt)\b/i, allergen: 'celery', certainty: 'contains' },

  // ---- Mustard (EU) ----
  { pattern: /\b(mustard|dijon|wholegrain mustard|mustard seed|mustard powder)\b/i, allergen: 'mustard', certainty: 'contains' },

  // ---- Sulphites (EU) ----
  { pattern: /\b(sulphite|sulfite|sulfur dioxide|dried apricot|dried fig|wine|balsamic|balsamic vinegar)\b/i, allergen: 'sulphites', certainty: 'contains' },

  // ---- Lupin (EU) ----
  { pattern: /\b(lupin|lupine|lupini)\b/i, allergen: 'lupin', certainty: 'contains' },

  // ---- Hidden-allergen flags (opaque ingredients that deserve caution) ----
  { pattern: /\bnatural flavors?\b/i, allergen: 'milk', certainty: 'may_contain' },
  { pattern: /\bnatural flavors?\b/i, allergen: 'soy', certainty: 'may_contain' },
];

/**
 * Derive allergens from a list of ingredient names.
 * Returns a deduplicated, consolidated list with certainty escalation:
 * 'contains' > 'may_contain' > 'cross_contact_risk'.
 */
export function deriveAllergens(ingredientNames: string[]): AllergenFlag[] {
  const allergenMap = new Map<AllergenKey, AllergenFlag>();
  const certaintyRank: Record<AllergenCertainty, number> = {
    contains: 3,
    may_contain: 2,
    cross_contact_risk: 1,
  };

  for (const name of ingredientNames) {
    if (!name || !name.trim()) continue;
    for (const { pattern, allergen, certainty } of ALLERGEN_PATTERNS) {
      if (pattern.test(name)) {
        const existing = allergenMap.get(allergen);
        if (!existing || certaintyRank[certainty] > certaintyRank[existing.certainty]) {
          allergenMap.set(allergen, {
            allergen,
            certainty,
            source: `derived from: ${name}`,
          });
        }
      }
    }
  }

  return Array.from(allergenMap.values());
}

/**
 * Identifies cross-contact risks when a recipe uses shared equipment or spaces
 * with other allergen sources. Returns structured records that the renderer
 * composes into a localized sentence at view time.
 */
export function identifyCrossContactRisks(
  currentAllergens: AllergenFlag[],
  otherRecipeAllergens: AllergenFlag[][], // allergens from other recipes sharing station/equipment
  station?: string
): CrossContactRisk[] {
  const currentSet = new Set(currentAllergens.map(a => a.allergen));
  const risks: CrossContactRisk[] = [];

  // Find allergens in other recipes that aren't in current — these are cross-contact risks
  const otherAllergenSet = new Set<AllergenKey>();
  for (const list of otherRecipeAllergens) {
    for (const a of list) {
      if (a.certainty === 'contains') otherAllergenSet.add(a.allergen);
    }
  }

  for (const otherAllergen of otherAllergenSet) {
    if (!currentSet.has(otherAllergen)) {
      risks.push({ allergen: otherAllergen, ...(station ? { station } : {}) });
    }
  }

  return risks;
}
