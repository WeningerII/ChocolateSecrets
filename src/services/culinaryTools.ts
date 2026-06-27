import { Ingredient, RecipeStep, TemperingCurve, ChocolateSpec, StationTag, EnrobingSpec } from '../types';
import type { CrossContactRisk } from '../types';

/**
 * Allergen types: FDA Top 9 + EU-specific additions (celery, mustard, sulphites, lupin, molluscs).
 * Storing as a union type rather than enum for serialization simplicity.
 */
export type AllergenKey =
  // FDA Top 9
  | 'milk' | 'eggs' | 'fish' | 'shellfish' | 'tree_nuts' | 'peanuts' | 'wheat' | 'soy' | 'sesame'
  // EU Top 14 additions
  | 'celery' | 'mustard' | 'sulphites' | 'lupin' | 'molluscs';

type AllergenCertainty = 'contains' | 'may_contain' | 'cross_contact_risk';

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
 * Look up the standard tempering curve for a chocolate type and cocoa percentage.
 * Returns null if the type is unrecognized.
 */
export function lookupTemperingCurve(
  type: 'dark' | 'milk' | 'white' | 'ruby' | 'gianduja' | 'compound',
  cocoaPercentage?: number
): TemperingCurve | null {
  switch (type) {
    case 'dark':
      if (cocoaPercentage && cocoaPercentage >= 75) {
        return {
          meltCelsius: [50, 55],
          coolCelsius: [28, 29],
          workCelsius: [32, 33],
          method: 'seeding',
          notes: `High-percentage dark (${cocoaPercentage}%) — slightly higher working temp`,
        };
      }
      return {
        meltCelsius: [50, 55],
        coolCelsius: [28, 29],
        workCelsius: [31, 32],
        method: 'seeding',
        notes: 'Standard dark couverture curve',
      };
    case 'milk':
      return {
        meltCelsius: [45, 50],
        coolCelsius: [27, 28],
        workCelsius: [29, 30],
        method: 'seeding',
        notes: 'Milk solids sensitive above 50°C',
      };
    case 'white':
      return {
        meltCelsius: [43, 45],
        coolCelsius: [26, 27],
        workCelsius: [28, 29],
        method: 'seeding',
        notes: 'White chocolate is heat-sensitive — never exceed 45°C',
      };
    case 'ruby':
      return {
        meltCelsius: [43, 45],
        coolCelsius: [26, 27],
        workCelsius: [28, 29],
        method: 'seeding',
        notes: 'Ruby behaves like white — acid-sensitive, handle gently',
      };
    case 'gianduja':
      return {
        meltCelsius: [40, 45],
        coolCelsius: [25, 26],
        workCelsius: [27, 28],
        method: 'seeding',
        notes: 'Gianduja — nut-paste enriched, lower working temp',
      };
    case 'compound':
      return {
        meltCelsius: [40, 45],
        coolCelsius: [35, 40],
        workCelsius: [38, 42],
        method: 'other',
        notes: 'Compound coating — no tempering required, just melt and use',
      };
    default:
      return null;
  }
}

// =============================================================================
// Chocolate product catalog — curated list of pro-grade products with
// per-product tempering curves, origin, and flavor notes. Product match
// overrides generic category parsing.
// =============================================================================

interface ChocolateProductEntry {
  brand: string;
  productName: string;
  patterns: RegExp[]; // case-insensitive
  type: 'dark' | 'milk' | 'white' | 'ruby' | 'gianduja';
  cocoaPercentage: number;
  tempering: TemperingCurve;
  origin?: string;
  flavorNotes?: string;
}

const CHOCOLATE_CATALOG: ChocolateProductEntry[] = [
  // ---- Valrhona ----
  {
    brand: 'Valrhona', productName: 'Guanaja',
    patterns: [/\bguanaja\b/i],
    type: 'dark', cocoaPercentage: 70,
    tempering: { meltCelsius: [45, 55], coolCelsius: [28, 29], workCelsius: [30, 31], method: 'seeding' },
    origin: 'Blended (Ghana · Dominican Republic · Venezuela)',
    flavorNotes: 'Bitter, long finish, classic dark reference',
  },
  {
    brand: 'Valrhona', productName: 'Caraïbe',
    patterns: [/\bcara[iï]be\b/i],
    type: 'dark', cocoaPercentage: 66,
    tempering: { meltCelsius: [55, 58], coolCelsius: [28, 29], workCelsius: [31, 32], method: 'seeding' },
    origin: 'Caribbean blend',
    flavorNotes: 'Balanced, toasted almond, vanilla finish',
  },
  {
    brand: 'Valrhona', productName: 'Manjari',
    patterns: [/\bmanjari\b/i],
    type: 'dark', cocoaPercentage: 64,
    tempering: { meltCelsius: [50, 55], coolCelsius: [28, 29], workCelsius: [31, 32], method: 'seeding' },
    origin: 'Madagascar',
    flavorNotes: 'Red fruit, bright acidity',
  },
  {
    brand: 'Valrhona', productName: 'Araguani',
    patterns: [/\baraguani\b/i],
    type: 'dark', cocoaPercentage: 72,
    tempering: { meltCelsius: [50, 55], coolCelsius: [28, 29], workCelsius: [32, 33], method: 'seeding' },
    origin: 'Venezuela',
    flavorNotes: 'Intense cocoa, licorice, warm spice',
  },
  {
    brand: 'Valrhona', productName: 'Alpaco',
    patterns: [/\balpaco\b/i],
    type: 'dark', cocoaPercentage: 66,
    tempering: { meltCelsius: [50, 55], coolCelsius: [28, 29], workCelsius: [31, 32], method: 'seeding' },
    origin: 'Ecuador',
    flavorNotes: 'Floral jasmine, citrus',
  },
  {
    brand: 'Valrhona', productName: 'Tainori',
    patterns: [/\btainori\b/i],
    type: 'dark', cocoaPercentage: 64,
    tempering: { meltCelsius: [50, 55], coolCelsius: [28, 29], workCelsius: [31, 32], method: 'seeding' },
    origin: 'Dominican Republic',
    flavorNotes: 'Dried stone fruit, honey',
  },
  {
    brand: 'Valrhona', productName: 'Nyangbo',
    patterns: [/\bnyangbo\b/i],
    type: 'dark', cocoaPercentage: 68,
    tempering: { meltCelsius: [50, 55], coolCelsius: [28, 29], workCelsius: [31, 32], method: 'seeding' },
    origin: 'Ghana',
    flavorNotes: 'Warm spice, dried fruit',
  },
  {
    brand: 'Valrhona', productName: 'Jivara',
    patterns: [/\bjivara\b/i],
    type: 'milk', cocoaPercentage: 40,
    tempering: { meltCelsius: [45, 50], coolCelsius: [26, 28], workCelsius: [29, 30], method: 'seeding' },
    origin: 'Ecuador',
    flavorNotes: 'Malt, caramel, light roasted note',
  },
  {
    brand: 'Valrhona', productName: 'Caramélia',
    patterns: [/\bcaram[eé]lia\b/i],
    type: 'milk', cocoaPercentage: 36,
    tempering: { meltCelsius: [45, 50], coolCelsius: [26, 27], workCelsius: [29, 30], method: 'seeding' },
    flavorNotes: 'Caramelized milk, butter, salted caramel',
  },
  {
    brand: 'Valrhona', productName: 'Dulcey',
    patterns: [/\bdulcey\b/i],
    type: 'white', cocoaPercentage: 35,
    tempering: { meltCelsius: [45, 48], coolCelsius: [26, 27], workCelsius: [28, 29], method: 'seeding' },
    flavorNotes: 'Blond — toasted biscuit, shortbread, caramelized sugar',
  },
  {
    brand: 'Valrhona', productName: 'Ivoire',
    patterns: [/\bivoire\b/i],
    type: 'white', cocoaPercentage: 35,
    tempering: { meltCelsius: [45, 48], coolCelsius: [26, 27], workCelsius: [28, 29], method: 'seeding' },
    flavorNotes: 'Pure white, vanilla, pairs well with fruit and spice',
  },
  {
    brand: 'Valrhona', productName: 'Opalys',
    patterns: [/\bopalys\b/i],
    type: 'white', cocoaPercentage: 33,
    tempering: { meltCelsius: [45, 48], coolCelsius: [26, 27], workCelsius: [28, 29], method: 'seeding' },
    flavorNotes: 'Less sweet than Ivoire, milky, creamy',
  },

  // ---- Callebaut ----
  {
    brand: 'Callebaut', productName: '811',
    patterns: [/\bcallebaut\s*811\b/i, /\b811\b(?=.*(callebaut|chocolate|dark|couverture))/i],
    type: 'dark', cocoaPercentage: 54.5,
    tempering: { meltCelsius: [40, 45], coolCelsius: [27, 27], workCelsius: [31, 32], method: 'seeding' },
    origin: 'Blended (West African)',
    flavorNotes: 'Balanced, versatile, workhorse dark couverture',
  },
  {
    brand: 'Callebaut', productName: '823',
    patterns: [/\bcallebaut\s*823\b/i, /\b823\b(?=.*(callebaut|milk))/i],
    type: 'milk', cocoaPercentage: 33.6,
    tempering: { meltCelsius: [40, 45], coolCelsius: [27, 27], workCelsius: [29, 30], method: 'seeding' },
    flavorNotes: 'Creamy, caramel, traditional milk couverture',
  },
  {
    brand: 'Callebaut', productName: 'W2',
    patterns: [/\bcallebaut\s*w2\b/i, /\bw2\b(?=.*(callebaut|white))/i],
    type: 'white', cocoaPercentage: 28,
    tempering: { meltCelsius: [40, 45], coolCelsius: [26, 26], workCelsius: [28, 29], method: 'seeding' },
    flavorNotes: 'Sweet vanilla, pronounced milk',
  },
  {
    brand: 'Callebaut', productName: 'Gold',
    patterns: [/\bcallebaut\s*gold\b/i, /\bgold\s*chocolate\b/i],
    type: 'white', cocoaPercentage: 30.4,
    tempering: { meltCelsius: [45, 50], coolCelsius: [26, 27], workCelsius: [29, 30], method: 'seeding' },
    flavorNotes: 'Caramel, biscuit, toffee — blond category',
  },
  {
    brand: 'Callebaut', productName: 'Ruby RB1',
    patterns: [/\bruby\s*rb1\b/i, /\brb1\b(?=.*(callebaut|ruby))/i],
    type: 'ruby', cocoaPercentage: 47.3,
    tempering: { meltCelsius: [40, 45], coolCelsius: [26, 27], workCelsius: [28, 29], method: 'seeding' },
    flavorNotes: 'Natural pink, fresh berry, mild acidity',
  },

  // ---- Cacao Barry ----
  {
    brand: 'Cacao Barry', productName: 'Ocoa',
    patterns: [/\bocoa\b/i],
    type: 'dark', cocoaPercentage: 70,
    tempering: { meltCelsius: [50, 55], coolCelsius: [28, 29], workCelsius: [31, 32], method: 'seeding' },
    origin: 'Dominican Republic',
    flavorNotes: 'Fruity, cocoa-forward, moderate bitterness',
  },
  {
    brand: 'Cacao Barry', productName: 'Alunga',
    patterns: [/\balunga\b/i],
    type: 'milk', cocoaPercentage: 41,
    tempering: { meltCelsius: [45, 50], coolCelsius: [26, 28], workCelsius: [29, 30], method: 'seeding' },
    flavorNotes: 'Intense cocoa for milk, roasted nut',
  },
  {
    brand: 'Cacao Barry', productName: 'Zephyr',
    patterns: [/\bzephyr\b(?!\s*caramel)/i],
    type: 'white', cocoaPercentage: 34,
    tempering: { meltCelsius: [45, 48], coolCelsius: [26, 27], workCelsius: [28, 29], method: 'seeding' },
    flavorNotes: 'Clean white, mildly sweet, neutral base',
  },
  {
    brand: 'Cacao Barry', productName: 'Zephyr Caramel',
    patterns: [/\bzephyr\s*caramel\b/i],
    type: 'white', cocoaPercentage: 35,
    tempering: { meltCelsius: [45, 48], coolCelsius: [26, 27], workCelsius: [28, 29], method: 'seeding' },
    flavorNotes: 'Butterscotch, caramelized sugar',
  },

  // ---- Guittard ----
  {
    brand: 'Guittard', productName: 'Coucher du Soleil',
    patterns: [/\bcoucher\s*du\s*soleil\b/i],
    type: 'dark', cocoaPercentage: 72,
    tempering: { meltCelsius: [50, 55], coolCelsius: [28, 29], workCelsius: [32, 33], method: 'seeding' },
    flavorNotes: 'Dark fruit, coffee, long finish',
  },
  {
    brand: 'Guittard', productName: 'Onyx',
    patterns: [/\bguittard\s*onyx\b/i, /\bonyx\b(?=.*(guittard|dark|chocolate))/i],
    type: 'dark', cocoaPercentage: 72,
    tempering: { meltCelsius: [50, 55], coolCelsius: [28, 29], workCelsius: [32, 33], method: 'seeding' },
    flavorNotes: 'Smooth, deep cocoa, touch of earth',
  },
  {
    brand: 'Guittard', productName: 'Soleil d\'Or',
    patterns: [/\bsoleil\s*d['']?or\b/i],
    type: 'milk', cocoaPercentage: 38,
    tempering: { meltCelsius: [45, 50], coolCelsius: [26, 28], workCelsius: [29, 30], method: 'seeding' },
    flavorNotes: 'Fair Trade, honeyed milk, golden caramel',
  },

  // ---- Felchlin ----
  {
    brand: 'Felchlin', productName: 'Maracaibo Clasificado',
    patterns: [/\bmaracaibo\s*clasificado\b/i, /\bclasificado\b/i],
    type: 'dark', cocoaPercentage: 65,
    tempering: { meltCelsius: [50, 55], coolCelsius: [28, 29], workCelsius: [31, 32], method: 'seeding' },
    origin: 'Venezuela (Sur del Lago)',
    flavorNotes: 'Dried fruit, warm spice, pronounced cocoa',
  },
  {
    brand: 'Felchlin', productName: 'Arriba',
    patterns: [/\bfelchlin\s*arriba\b/i, /\barriba\b(?=.*(felchlin|72))/i],
    type: 'dark', cocoaPercentage: 72,
    tempering: { meltCelsius: [50, 55], coolCelsius: [28, 29], workCelsius: [32, 33], method: 'seeding' },
    origin: 'Ecuador',
    flavorNotes: 'Floral, jasmine, bright acidity',
  },

  // ---- Amedei ----
  {
    brand: 'Amedei', productName: 'Porcelana',
    patterns: [/\bporcelana\b/i],
    type: 'dark', cocoaPercentage: 70,
    tempering: { meltCelsius: [50, 55], coolCelsius: [28, 29], workCelsius: [31, 32], method: 'seeding' },
    origin: 'Venezuela (pure Criollo, Zulia)',
    flavorNotes: 'Delicate, nutty, low bitterness, rare Criollo bean',
  },
];

/**
 * Parse a freeform ingredient name into a chocolate spec.
 * Returns a ChocolateSpec with possibly-empty fields; check `.type` to know
 * whether the text matched any chocolate pattern at all.
 *
 * Strategy: catalog match first (specific brand+product with curated tempering
 * curve), then generic fallback (type by keyword, cocoa % by regex, tempering
 * curve from lookupTemperingCurve).
 */
export function parseChocolateSpec(text: string): ChocolateSpec {
  const spec: ChocolateSpec = {};
  if (!text) return spec;

  // ---- Pass 1: exact catalog match ----
  for (const entry of CHOCOLATE_CATALOG) {
    if (entry.patterns.some(p => p.test(text))) {
      spec.type = entry.type;
      spec.cocoaPercentage = entry.cocoaPercentage;
      spec.brand = entry.brand;
      spec.productName = entry.productName;
      spec.tempering = entry.tempering;
      if (entry.origin) spec.origin = entry.origin;
      if (entry.flavorNotes) spec.flavorNotes = entry.flavorNotes;
      return spec;
    }
  }

  // ---- Pass 2: generic fallback ----
  const lower = text.toLowerCase();

  if (lower.includes('ruby')) spec.type = 'ruby';
  else if (lower.includes('gianduja') || lower.includes('praliné') || lower.includes('praline')) spec.type = 'gianduja';
  else if (lower.includes('compound')) spec.type = 'compound';
  else if (/\bwhite\s*chocolate\b/i.test(text) || /\bblond\s*chocolate\b/i.test(text)) spec.type = 'white';
  else if (/\bmilk\s*chocolate\b/i.test(text) && !/\bmilk\s*powder\b/i.test(text)) spec.type = 'milk';
  else if (/\b(dark|bittersweet|semisweet|couverture)\b/i.test(text) && /\bchocolate\b/i.test(text)) spec.type = 'dark';
  else if (/\b(\d{2,3})\s*%.*\bchocolate\b/i.test(text)) spec.type = 'dark'; // "66% chocolate" defaults to dark

  const pctMatch = text.match(/(\d{2,3})\s*%/);
  if (pctMatch) {
    const pct = parseInt(pctMatch[1], 10);
    if (pct >= 20 && pct <= 100) spec.cocoaPercentage = pct;
  }

  // Brand detection for generic references (no specific product matched)
  const brands = ['Valrhona', 'Callebaut', 'Cacao Barry', 'Felchlin', 'Guittard', 'Michel Cluizel', 'Amedei', 'Domori', 'Belcolade', 'Ghirardelli'];
  for (const brand of brands) {
    if (lower.includes(brand.toLowerCase())) {
      spec.brand = brand;
      break;
    }
  }

  // Tempering curve from generic type lookup (only if we detected a type and don't already have one from catalog)
  if (spec.type && !spec.tempering) {
    const curve = lookupTemperingCurve(spec.type, spec.cocoaPercentage);
    if (curve) spec.tempering = curve;
  }

  return spec;
}

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

/**
 * Classify a recipe into a kitchen station based on its type, technique verbs, and ingredient profile.
 */
export function classifyStation(
  recipeType: string,
  techniqueVerbs: string[],
  ingredientNames: string[]
): StationTag {
  const verbs = techniqueVerbs.map(v => v.toLowerCase());
  const ingredients = ingredientNames.map(i => i.toLowerCase());
  
  // Chocolate room: tempering, molding, enrobing, ganache work
  const chocolateIndicators = ['temper', 'mold', 'enrobe', 'dip', 'spray', 'airbrush', 'bonbon', 'truffle', 'ganache'];
  const chocolateTypeMatch = /bonbon|truffle|praline|bar|ganache|chocolate/i.test(recipeType);
  const hasChocolateVerbs = verbs.some(v => chocolateIndicators.some(ci => v.includes(ci)));
  
  if (chocolateTypeMatch || hasChocolateVerbs) {
    return {
      primary: 'chocolate_room',
      skillLevel: verbs.includes('temper') ? 'sous' : 'line',
      productionMode: 'batch',
    };
  }
  
  // Pastry: baking, laminating, piping, tart work
  const pastryIndicators = ['bake', 'laminate', 'fold into dough', 'proof', 'pipe', 'roll out', 'crimp', 'blind bake'];
  const pastryIngredientMatch = ingredients.some(i => /flour|yeast|butter block|puff|croissant|brioche|choux/i.test(i));
  if (pastryIndicators.some(p => verbs.some(v => v.includes(p))) || pastryIngredientMatch) {
    return {
      primary: 'pastry',
      skillLevel: verbs.includes('laminate') ? 'sous' : 'line',
      productionMode: 'batch',
    };
  }
  
  // Hot line: panini, sauté, sear, simmer, grill
  const hotIndicators = ['sauté', 'saute', 'sear', 'grill', 'fry', 'simmer', 'pan-fry', 'panini', 'press'];
  const hotTypeMatch = /panini|sandwich|sauté|grilled/i.test(recipeType);
  if (hotTypeMatch || hotIndicators.some(h => verbs.some(v => v.includes(h)))) {
    return {
      primary: 'hot_line',
      skillLevel: 'line',
      productionMode: 'a_la_minute',
    };
  }
  
  // Bar/beverage: blend, shake, brew, steam milk
  const barIndicators = ['brew', 'steam', 'blend drink', 'shake', 'strain', 'espresso', 'latte'];
  if (barIndicators.some(b => verbs.some(v => v.includes(b)))) {
    return {
      primary: 'bar',
      skillLevel: 'line',
      productionMode: 'a_la_minute',
    };
  }
  
  // Garde manger: cold preparation, salads, assembly
  return {
    primary: 'garde_manger',
    skillLevel: 'commis',
    productionMode: 'a_la_minute',
  };
}

/**
 * Map technique verbs to the equipment they imply.
 */
const VERB_EQUIPMENT_MAP: Record<string, string[]> = {
  // ---- Chocolate work (existing, retained) ----
  temper: ['digital laser thermometer', 'marble slab or tempering machine', 'rubber scraper', 'bain-marie or microwave'],
  mold: ['polycarbonate mold', 'scraper', 'rubber spatula', 'cooling rack'],
  enrobe: ['enrobing machine or dipping fork', 'cooling tunnel or cool shelf', 'parchment paper'],
  dip: ['dipping fork (round or oval)', 'parchment paper', 'decorating tool (paper cone)'],
  airbrush: ['airbrush compressor', 'airbrush gun', 'cocoa butter + pigments', 'face mask'],
  splatter: ['small stiff brush', 'cocoa butter + pigments'],
  transfer: ['transfer sheets', 'scraper', 'small offset spatula'],

  // ---- Piping and finishing ----
  pipe: ['piping bag', 'assortment of tips (#4 round common)', 'parchment paper'],
  glaze: ['small offset spatula', 'cooling rack over sheet pan'],
  garnish: ['plating tweezers', 'squeeze bottles', 'small offset spatula'],

  // ---- Mixing / aerating ----
  whip: ['stand mixer with whisk or hand mixer', 'chilled bowl if for cream'],
  fold: ['flexible spatula', 'wide bowl'],
  blend: ['blender or immersion blender', 'heatproof container'],
  puree: ['blender', 'fine-mesh sieve or tamis'],
  mix: ['bowl', 'whisk or wooden spoon'],
  cream: ['stand mixer with paddle', 'bowl', 'rubber spatula'],
  knead: ['stand mixer with dough hook or clean work surface', 'bench scraper'],

  // ---- Size reduction ----
  chop: ['chef knife', 'cutting board'],
  dice: ['chef knife', 'cutting board'],
  mince: ['chef knife', 'cutting board'],
  slice: ['chef knife or mandoline', 'cutting board'],
  julienne: ['chef knife or mandoline', 'cutting board'],
  brunoise: ['chef knife', 'cutting board'],
  grind: ['spice grinder or food processor', 'sieve'],
  zest: ['microplane or fine grater'],
  grate: ['box grater or microplane'],

  // ---- Separation / straining ----
  sift: ['fine-mesh sieve or tamis', 'bowl'],
  strain: ['chinois or fine-mesh strainer', 'bowl'],
  drain: ['colander', 'bowl'],
  pat: ['paper towels or clean kitchen towel'],

  // ---- Heat: dry ----
  bake: ['sheet pan or cake pan', 'parchment paper', 'oven preheated to specified temperature'],
  roast: ['roasting pan or sheet pan', 'oven preheated to specified temperature', 'probe thermometer'],
  broil: ['sheet pan', 'broiler preheated', 'long-handled tongs'],
  toast: ['sheet pan', 'oven or toaster'],

  // ---- Heat: pan / surface ----
  sear: ['heavy-bottomed pan (cast iron or carbon steel)', 'tongs', 'neutral oil with high smoke point'],
  saute: ['saute pan', 'tongs or wooden spoon', 'oil or butter'],
  brown: ['heavy pan', 'tongs'],
  fry: ['heavy-bottomed pot or deep fryer', 'candy or deep-fry thermometer', 'spider or slotted spoon', 'paper towels for draining'],
  'pan-fry': ['heavy skillet', 'tongs', 'paper towels for draining'],
  'deep-fry': ['deep fryer or heavy pot', 'deep-fry thermometer', 'spider or slotted spoon'],
  grill: ['grill or grill pan', 'tongs', 'oil-saturated cloth'],
  griddle: ['griddle or flat-top', 'offset spatula'],
  press: ['panini press or sandwich press', 'bench scraper'],

  // ---- Heat: water / wet ----
  boil: ['heavy pot', 'lid', 'slotted spoon'],
  simmer: ['heavy-bottomed pot', 'wooden spoon', 'lid'],
  poach: ['wide shallow pan', 'slotted spoon', 'instant-read thermometer'],
  braise: ['Dutch oven or heavy oven-safe pot with lid', 'tongs'],
  stew: ['heavy-bottomed pot with lid', 'wooden spoon'],
  steam: ['steamer basket or bamboo steamer', 'pot with lid', 'tongs'],
  blanch: ['large pot for boiling', 'bowl of ice water for shock', 'spider or slotted spoon'],
  reduce: ['wide shallow pan for faster evaporation', 'wooden spoon'],

  // ---- Sous vide / precision cooking ----
  'sous vide': ['immersion circulator', 'vacuum sealer or zip-top bag with water displacement', 'heatproof container'],
  vacuum: ['chamber vacuum sealer or countertop vacuum sealer', 'vacuum-rated bags'],

  // ---- Smoking / curing ----
  smoke: ['smoker or smoking box', 'wood chips or pellets', 'probe thermometer'],
  cure: ['non-reactive container', 'scale for precise salt measurement', 'refrigeration'],
  brine: ['non-reactive container large enough for submersion', 'refrigeration'],
  marinate: ['non-reactive container or zip-top bag', 'refrigeration'],

  // ---- Bread / dough ----
  laminate: ['rolling pin', 'marble or steel bench', 'ruler', 'bench scraper', 'refrigeration'],
  proof: ['proofing box or warm spot 75-78°F', 'kitchen towel or plastic wrap'],
  'bulk ferment': ['large bowl or bulk container', 'plastic wrap or lid', 'room temperature space'],
  shape: ['bench scraper', 'floured work surface'],
  score: ['lame or very sharp razor blade'],
  autolyse: ['bowl', 'plastic wrap'],
  ferment: ['fermentation vessel', 'warm spot'],

  // ---- Sugar work ----
  caramelize: ['heavy-bottomed saucepan', 'candy thermometer', 'long-handled wooden spoon or heatproof whisk', 'bowl of ice water for testing'],
  'cook sugar': ['heavy-bottomed saucepan', 'candy thermometer calibrated to target stage', 'wet pastry brush to wash down crystals'],
  brulee: ['kitchen torch or salamander', 'heatproof ramekins', 'fine sifter for sugar coat'],

  // ---- Emulsion / sauce ----
  emulsify: ['bowl', 'whisk or immersion blender', 'steady thin-stream pouring technique'],
  'temper eggs': ['bowl', 'whisk', 'ladle'],
  'temper cream': ['saucepan', 'candy thermometer', 'whisk'],

  // ---- Freezing / chilling ----
  freeze: ['freezer (-18°C/0°F or colder)', 'flat container for even freezing'],
  chill: ['refrigerator', 'covered container'],
  churn: ['ice cream machine or Pacojet', 'pre-frozen bowl (ice cream style)'],
  temper_ice: ['refrigerator or slight warmth for scoopable consistency'],
  'shock': ['large bowl with ice water', 'spider or slotted spoon'],

  // ---- Beverage: coffee ----
  brew: ['coffee brewer (espresso machine, pour-over, French press, or AeroPress)', 'scale for dose + yield', 'timer', 'grinder set to match method'],
  'pull shot': ['espresso machine', 'portafilter', 'tamper', 'scale', 'timer'],
  'pour over': ['gooseneck kettle', 'V60 or Chemex dripper', 'paper filter', 'scale', 'timer'],
  'french press': ['French press', 'kettle', 'scale', 'timer'],
  aeropress: ['AeroPress', 'paper or metal filter', 'kettle', 'scale'],

  // ---- Beverage: tea ----
  steep: ['teapot or infuser', 'kettle with temperature control', 'timer', 'scale or measuring spoon'],
  'steep tea': ['teapot or infuser', 'kettle', 'timer'],

  // ---- Beverage: cocktail / bar ----
  shake: ['cocktail shaker', 'jigger', 'strainer', 'ice'],
  stir: ['mixing glass', 'bar spoon', 'jigger', 'ice', 'strainer'],
  muddle: ['muddler', 'mixing glass'],

  // ---- Plating / service ----
  plate: ['plating tweezers', 'squeeze bottles', 'small offset spatula', 'wiped rim cloth'],
  portion: ['scale', 'scoops or ring molds for uniform portions'],
  assemble: ['clean work surface', 'small offset spatula or tongs'],

  // ---- Resting / holding ----
  rest: ['covered plate or warm holding spot'],
  'hold warm': ['warming oven at 150°F or low-temp holding unit'],
  'hold cold': ['refrigeration or ice bath'],

  // ---- Jar / preserve ----
  jar: ['sterilized jars with lids', 'canning funnel if hot-packing', 'water bath for seal if shelf-stable'],
  can: ['pressure canner or water-bath canner', 'jar lifter', 'magnetic lid lifter', 'headspace tool'],
  preserve: ['non-reactive pot', 'sterilized jars', 'candy thermometer'],
};

/**
 * Infer equipment from technique verbs in a recipe's steps.
 */
export function inferEquipment(techniqueVerbs: string[]): string[] {
  const equipment = new Set<string>();
  for (const verb of techniqueVerbs) {
    const vLower = verb.toLowerCase();
    for (const [key, tools] of Object.entries(VERB_EQUIPMENT_MAP)) {
      if (vLower.includes(key)) {
        tools.forEach(t => equipment.add(t));
      }
    }
  }
  return Array.from(equipment);
}

/**
 * Suggest equipment for a single recipe step by combining:
 * - The step's actionType (the primary verb)
 * - The step's title (often contains additional verbs like "sear and rest")
 * - The step's parameters (temperature → thermometer; duration → timer)
 *
 * Returns a deduplicated, sorted list. Existing `step.equipment` is NOT returned —
 * the caller is responsible for merging with existing entries.
 */
export function suggestEquipmentForStep(step: Pick<RecipeStep, 'actionType' | 'title' | 'parameters'>): string[] {
  const verbs: string[] = [];

  if (step.actionType) verbs.push(String(step.actionType));
  if (step.title) verbs.push(step.title);

  const fromVerbs = inferEquipment(verbs);
  const suggestions = new Set(fromVerbs);

  // Parameter-driven additions
  const params = step.parameters || {};
  if (typeof params.temperatureTarget === 'number') {
    suggestions.add('instant-read or probe thermometer');
  }
  if (typeof params.durationSeconds === 'number' && params.durationSeconds > 0) {
    suggestions.add('timer');
  }
  if (params.physicalSizeTarget) {
    // A size target implies measurement tools
    suggestions.add('ruler or calipers for size check');
  }

  return Array.from(suggestions).sort();
}

/**
 * Merge suggested equipment with existing equipment, removing case-insensitive duplicates.
 * Existing entries are preserved verbatim (in case the user edited them); new entries
 * are appended only if no case-insensitive match already exists.
 */
export function mergeEquipment(existing: string[], suggested: string[]): string[] {
  const normalizeForCompare = (s: string) => s.toLowerCase().trim();
  const existingNormalized = new Set(existing.map(normalizeForCompare));
  const result = [...existing];
  for (const item of suggested) {
    if (!existingNormalized.has(normalizeForCompare(item))) {
      result.push(item);
      existingNormalized.add(normalizeForCompare(item));
    }
  }
  return result;
}

/**
 * Infer an enrobing specification from recipe type and technique verbs.
 */
export function inferEnrobing(
  recipeType: string,
  techniqueVerbs: string[],
  ingredientNames: string[]
): EnrobingSpec | null {
  const type = recipeType.toLowerCase();
  const verbs = techniqueVerbs.map(v => v.toLowerCase());
  const ingredients = ingredientNames.map(i => i.toLowerCase());
  
  // Shell-molded bonbon: always has shell + filling + cap
  if (type.includes('bonbon') || type.includes('molded') || verbs.some(v => v.includes('mold'))) {
    const hasColors = ingredients.some(i => i.includes('cocoa butter') && (i.includes('color') || i.includes('tint'))) 
                   || verbs.some(v => v.includes('airbrush') || v.includes('splatter') || v.includes('paint'));
    return {
      method: 'shell_mold',
      coating: 'tempered shell chocolate',
      decoration: hasColors ? {
        technique: verbs.some(v => v.includes('airbrush')) ? 'airbrushed' :
                   verbs.some(v => v.includes('splatter')) ? 'splattered' :
                   verbs.some(v => v.includes('paint')) ? 'painted' : 'painted',
        tools: verbs.some(v => v.includes('airbrush')) ? ['airbrush', 'cocoa butter colors'] : ['fine paintbrush', 'cocoa butter colors'],
      } : undefined,
    };
  }
  
  // Rolled truffle: ganache + roll in coating
  if (type.includes('truffle')) {
    const isRolled = verbs.some(v => v.includes('roll'));
    const coating = ingredients.find(i => i.includes('cocoa powder') || i.includes('chopped') || i.includes('dust')) || 'cocoa powder';
    
    if (isRolled) {
      return {
        method: 'rolled',
        coating,
        decoration: {
          technique: 'none',
          tools: ['piping bag with #4 round tip', 'parchment paper', 'gloves for rolling', 'tempered pre-coat chocolate'],
        },
      };
    }
    
    // Dipped truffle (default if not explicitly rolled)
    return {
      method: 'hand_dipped',
      coating: 'tempered chocolate',
      decoration: {
        technique: verbs.some(v => v.includes('filigree')) ? 'painted' : 'none',
        tools: ['piping bag with #4 round tip', 'dipping fork', 'parchment paper', 'optional: paper cone for filigree'],
      },
    };
  }
  
  // Bar: enrobed or molded
  if (type.includes('bar')) {
    return {
      method: verbs.some(v => v.includes('enrobe')) ? 'enrobed_machine' : 'shell_mold',
      coating: 'tempered chocolate',
    };
  }
  
  
  return null;
}

/**
 * Standard yields for common confection types, in finished pieces per kg of filling/batter.
 */
const TYPE_YIELD_MAP: Record<string, { piecesPerKgFilling: number; avgWeightGrams: number }> = {
  bonbon: { piecesPerKgFilling: 140, avgWeightGrams: 11 },
  molded_praline: { piecesPerKgFilling: 140, avgWeightGrams: 11 },
  truffle: { piecesPerKgFilling: 80, avgWeightGrams: 14 },
  rolled_truffle: { piecesPerKgFilling: 90, avgWeightGrams: 11 },
  dipped_truffle: { piecesPerKgFilling: 70, avgWeightGrams: 15 },
  bar: { piecesPerKgFilling: 10, avgWeightGrams: 100 },
  mendiant: { piecesPerKgFilling: 50, avgWeightGrams: 20 },
  ganache_square: { piecesPerKgFilling: 100, avgWeightGrams: 12 },
  caramel: { piecesPerKgFilling: 100, avgWeightGrams: 10 },
  marshmallow: { piecesPerKgFilling: 40, avgWeightGrams: 25 },
};

/**
 * Estimate the yield (piece count and total weight) for a recipe given its type and total filling weight.
 */
export function estimateYield(
  recipeType: string,
  totalFillingGrams: number
): { piecesEstimated: number; avgPieceWeightGrams: number; notes: string } | null {
  const typeLower = recipeType.toLowerCase();
  let key: string | null = null;
  const keys = Object.keys(TYPE_YIELD_MAP).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (typeLower.includes(k.replace('_', ' ')) || typeLower.includes(k)) {
      key = k;
      break;
    }
  }
  if (!key) return null;
  
  const { piecesPerKgFilling, avgWeightGrams } = TYPE_YIELD_MAP[key];
  const piecesEstimated = Math.round((totalFillingGrams / 1000) * piecesPerKgFilling);
  
  return {
    piecesEstimated,
    avgPieceWeightGrams: avgWeightGrams,
    notes: `Based on standard ${key.replace('_', ' ')} yield of ~${piecesPerKgFilling} pieces per kg of filling at ${avgWeightGrams}g average finished weight`,
  };
}

// =============================================================================
// Dairy fat matrix — catalog of cream/milk/butter variants with fat % and
// whipping behavior. Used by IngredientInfo to reveal the science a recipe
// card doesn't state (whipping behavior, cultured status, origin, etc.).
// =============================================================================

type DairyCategory =
  | 'half_and_half' | 'light_cream' | 'whipping_cream' | 'heavy_cream'
  | 'double_cream' | 'clotted_cream'
  | 'butter_sweet' | 'butter_cultured' | 'butter_european'
  | 'sour_cream' | 'creme_fraiche' | 'buttermilk'
  | 'milk' | 'condensed_milk' | 'evaporated_milk';

export interface DairySpec {
  category: DairyCategory;
  fatPercentMin: number;
  fatPercentMax: number;
  whippable: boolean;
  whippingTempF?: [number, number];
  whippingTimeSeconds?: [number, number];
  cultured?: boolean;
  brand?: string;
  origin?: string;
  grassFed?: boolean;
  aop?: boolean; // AOP / PDO designation for European products
  notes?: string;
}

interface DairyCategoryData {
  category: DairyCategory;
  fatPercentMin: number;
  fatPercentMax: number;
  whippable: boolean;
  whippingTempF?: [number, number];
  whippingTimeSeconds?: [number, number];
  cultured?: boolean;
  notes?: string;
}

const DAIRY_CATEGORIES: Record<DairyCategory, DairyCategoryData> = {
  half_and_half: {
    category: 'half_and_half',
    fatPercentMin: 10.5, fatPercentMax: 18,
    whippable: false,
    notes: 'Insufficient fat for stable foam — will not whip to stiff peaks',
  },
  light_cream: {
    category: 'light_cream',
    fatPercentMin: 18, fatPercentMax: 30,
    whippable: false,
    notes: 'Marginal for whipping — tends to deflate',
  },
  whipping_cream: {
    category: 'whipping_cream',
    fatPercentMin: 30, fatPercentMax: 36,
    whippable: true,
    whippingTempF: [35, 40],
    whippingTimeSeconds: [120, 240],
  },
  heavy_cream: {
    category: 'heavy_cream',
    fatPercentMin: 36, fatPercentMax: 40,
    whippable: true,
    whippingTempF: [35, 40],
    whippingTimeSeconds: [120, 240],
  },
  double_cream: {
    category: 'double_cream',
    fatPercentMin: 48, fatPercentMax: 55,
    whippable: true,
    notes: 'UK double cream — over-whips to butter within 30s past stiff peaks',
  },
  clotted_cream: {
    category: 'clotted_cream',
    fatPercentMin: 55, fatPercentMax: 64,
    whippable: false,
    notes: 'Concentrate — not whippable, served on scones as-is',
  },
  butter_sweet: {
    category: 'butter_sweet',
    fatPercentMin: 80, fatPercentMax: 82,
    whippable: false,
    notes: 'Standard US sweet-cream butter — ~18% water',
  },
  butter_cultured: {
    category: 'butter_cultured',
    fatPercentMin: 80, fatPercentMax: 82,
    whippable: false,
    cultured: true,
    notes: 'Tangy from lactic-acid fermentation of the cream before churning',
  },
  butter_european: {
    category: 'butter_european',
    fatPercentMin: 82, fatPercentMax: 86,
    whippable: false,
    notes: 'Higher fat, lower water — preferred for lamination',
  },
  sour_cream: {
    category: 'sour_cream',
    fatPercentMin: 14, fatPercentMax: 20,
    whippable: false,
    cultured: true,
  },
  creme_fraiche: {
    category: 'creme_fraiche',
    fatPercentMin: 30, fatPercentMax: 40,
    whippable: true,
    cultured: true,
    notes: 'Will not curdle when boiled — unlike sour cream',
  },
  buttermilk: {
    category: 'buttermilk',
    fatPercentMin: 0.5, fatPercentMax: 2,
    whippable: false,
    cultured: true,
  },
  milk: {
    category: 'milk',
    fatPercentMin: 0, fatPercentMax: 3.5,
    whippable: false,
  },
  condensed_milk: {
    category: 'condensed_milk',
    fatPercentMin: 8, fatPercentMax: 9,
    whippable: false,
    notes: 'Sweetened — ~45% sugar by weight',
  },
  evaporated_milk: {
    category: 'evaporated_milk',
    fatPercentMin: 7, fatPercentMax: 8,
    whippable: false,
    notes: 'Unsweetened — ~60% water removed',
  },
};

interface DairyBrand {
  brand: string;
  keywords: string[]; // lowercase substrings that identify this brand in ingredient names
  category: DairyCategory;
  fatPercent: number;
  origin?: string;
  grassFed?: boolean;
  cultured?: boolean;
  aop?: boolean;
  notes?: string;
}

const DAIRY_BRANDS: DairyBrand[] = [
  { brand: 'Kerrygold', keywords: ['kerrygold'], category: 'butter_european', fatPercent: 82, origin: 'Ireland', grassFed: true },
  { brand: 'Plugrá', keywords: ['plugra', 'plugrá'], category: 'butter_european', fatPercent: 82, origin: 'United States', notes: 'First US European-style butter' },
  { brand: 'Président', keywords: ['président', 'president butter', 'president unsalted', 'president salted'], category: 'butter_european', fatPercent: 82, origin: 'France' },
  { brand: 'Isigny Sainte-Mère', keywords: ['isigny'], category: 'butter_european', fatPercent: 83, origin: 'Normandy, France', aop: true, cultured: true },
  { brand: "Beurre d'Échiré", keywords: ['échiré', 'echire'], category: 'butter_european', fatPercent: 84, origin: 'Charentes-Poitou, France', aop: true, cultured: true, notes: 'Wood-barrel cultured' },
  { brand: 'Le Beurre Bordier', keywords: ['bordier'], category: 'butter_european', fatPercent: 82, origin: 'Brittany, France', cultured: true, notes: 'Hand-kneaded, slow-churned' },
  { brand: 'Lescure', keywords: ['lescure'], category: 'butter_european', fatPercent: 82, origin: 'Charentes-Poitou, France', aop: true, cultured: true },
  { brand: 'Lurpak', keywords: ['lurpak'], category: 'butter_european', fatPercent: 82, origin: 'Denmark' },
  { brand: 'Anchor', keywords: ['anchor butter', 'anchor unsalted'], category: 'butter_european', fatPercent: 83, origin: 'New Zealand', grassFed: true },
  { brand: 'Vermont Creamery', keywords: ['vermont creamery'], category: 'butter_cultured', fatPercent: 86, origin: 'United States', cultured: true, notes: 'Cultured butter, 86% butterfat' },
];

/**
 * Parse a freeform ingredient name into a dairy spec, or null if not recognized.
 */
export function parseDairySpec(text: string): DairySpec | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  // Brand match first — more specific, overrides category defaults
  for (const brand of DAIRY_BRANDS) {
    if (brand.keywords.some(k => lower.includes(k))) {
      const base = DAIRY_CATEGORIES[brand.category];
      return {
        ...base,
        brand: brand.brand,
        fatPercentMin: brand.fatPercent,
        fatPercentMax: brand.fatPercent,
        origin: brand.origin,
        grassFed: brand.grassFed,
        cultured: brand.cultured ?? base.cultured,
        aop: brand.aop,
        notes: brand.notes ?? base.notes,
      };
    }
  }

  // Category matching — more specific patterns first
  const patterns: Array<[RegExp, DairyCategory]> = [
    [/clotted\s*cream/, 'clotted_cream'],
    [/double\s*cream/, 'double_cream'],
    [/cr[èe]me\s*fra[iî]che|creme\s*fraiche/, 'creme_fraiche'],
    [/sour\s*cream/, 'sour_cream'],
    [/buttermilk/, 'buttermilk'],
    [/condensed\s*milk/, 'condensed_milk'],
    [/evaporated\s*milk/, 'evaporated_milk'],
    [/heavy\s*(whipping\s*)?cream/, 'heavy_cream'],
    [/whipping\s*cream/, 'whipping_cream'],
    [/light\s*cream/, 'light_cream'],
    [/half[\s-]*and[\s-]*half|half\s*&\s*half/, 'half_and_half'],
    [/european[\s-]*(style\s*)?butter/, 'butter_european'],
    [/cultured\s*butter/, 'butter_cultured'],
    [/\bbutter\b/, 'butter_sweet'], // fallback, least specific
  ];

  for (const [pattern, category] of patterns) {
    if (pattern.test(lower)) {
      return { ...DAIRY_CATEGORIES[category] };
    }
  }

  return null;
}

// =============================================================================
// Unified ingredient spec lookup — discriminated union that future verticals
// extend with chocolate, tea, coffee, etc. IngredientInfo uses this to render.
// =============================================================================

export type IngredientSpec =
  | { kind: 'dairy'; data: DairySpec }
  | { kind: 'chocolate'; data: ChocolateSpec }
  | { kind: 'unknown' };

/**
 * Check all known ingredient catalogs and return the first match.
 * Returns null if the ingredient name matches no known catalog.
 */
export function getIngredientSpec(name: string): IngredientSpec | null {
  const dairy = parseDairySpec(name);
  if (dairy) return { kind: 'dairy', data: dairy };

  const chocolate = parseChocolateSpec(name);
  if (chocolate.type) return { kind: 'chocolate', data: chocolate };

  return null;
}

// =============================================================================
// Failure mode catalog — chocolate work troubleshooting reference.
// Surfaced on tempering/molding/enrobing/dipping/airbrushing steps via the
// FailureModeSheet component. Each entry is static reference material.
// =============================================================================

export type FailureSeverity = 'cosmetic' | 'quality' | 'safety' | 'fatal';

export interface FailureMode {
  id: string;
  category: 'chocolate_tempering' | 'chocolate_molding' | 'chocolate_general';
  title: string;
  symptom: string;
  cause: string;
  severity: FailureSeverity;
  recovery: string[];
  prevention: string[];
  relatedActionTypes?: string[];
}

/**
 * Chocolate failure modes. Sources: Greweling 2nd ed. (2012), Valrhona and
 * Callebaut technical documentation, Guittard handling guide.
 */
export const CHOCOLATE_FAILURE_MODES: FailureMode[] = [
  {
    id: 'fat_bloom',
    category: 'chocolate_tempering',
    title: 'Fat bloom',
    symptom: 'Whitish streaky or greasy film on the surface. Soft, not fully crystallized.',
    cause: 'Under-crystallized chocolate — insufficient Form V seed — or temperature cycling after tempering. Cocoa butter migrates to the surface and re-crystallizes in unstable polymorphs.',
    severity: 'quality',
    recovery: [
      'Re-melt affected chocolate to T1 (45–55°C dark, 45–50°C milk, 43–45°C white) to dissolve all crystals',
      'Re-temper from scratch following the brand curve',
      'Test on parchment: glossy in 3 min at 68°F = good temper; dull = still bad',
    ],
    prevention: [
      'Hit T2 (cool) fully before bringing up to T3 (work)',
      'Maintain T3 ±0.5°C during working — excess heat destroys Form V',
      'Store finished chocolate at 15–18°C with stable temperature (no cycling between warm and cold)',
    ],
    relatedActionTypes: ['temper', 'mold', 'enrobe', 'dip'],
  },
  {
    id: 'sugar_bloom',
    category: 'chocolate_general',
    title: 'Sugar bloom',
    symptom: 'Gritty, dull, whitish-grey dusty surface. Rough to touch.',
    cause: 'Humidity condensation dissolved surface sugar, then the sugar re-crystallized when the chocolate dried. Usually from moving chocolate between cold refrigeration and warm room — condensation forms on the cold surface.',
    severity: 'fatal',
    recovery: [
      'Cannot be repaired — the sugar texture is permanently compromised',
      'Re-melt and re-temper to salvage the chocolate for a non-finished use (ganache, hot chocolate)',
      'Do not serve or sell as finished chocolate',
    ],
    prevention: [
      'Never refrigerate finished tempered chocolate unless absolutely necessary',
      'If you must chill, wrap airtight and bring to room temp slowly before unwrapping',
      'Target 50–60% ambient relative humidity in the chocolate room',
    ],
    relatedActionTypes: ['mold', 'enrobe'],
  },
  {
    id: 'seized_water',
    category: 'chocolate_tempering',
    title: 'Seized from water contact',
    symptom: 'Chocolate suddenly thickens into a dull, gritty paste. Completely unworkable.',
    cause: 'Even 1% water causes cocoa solids and sugar to agglomerate. A single drop from a whisk, lid condensation, or steam is enough.',
    severity: 'quality',
    recovery: [
      'Option A: Add MORE water (20%+ of total weight) as hot cream or milk — forces the mass into a sauce or ganache base',
      'Option B: Save for hot chocolate — whisk gradually into hot milk',
      'Cannot be recovered back to tempering use once seized',
    ],
    prevention: [
      'Dry all tools, bowls, and spatulas completely before use',
      'Keep bain-marie water below the chocolate bowl rim (no splashing)',
      'Simmer bain-marie water, do not boil (steam causes condensation)',
      'Work with dry hands or gloves',
    ],
    relatedActionTypes: ['temper', 'mold', 'enrobe', 'dip'],
  },
  {
    id: 'thick_overcrystallized',
    category: 'chocolate_tempering',
    title: 'Thick / unworkable during tempering',
    symptom: 'Chocolate becomes viscous and paste-like, difficult to coat or enrobe smoothly. Temperature may still be in range.',
    cause: 'Over-crystallized — too much Form V has formed. Usually from adding too much seed, holding at T3 too long, or T3 drifted too low.',
    severity: 'quality',
    recovery: [
      'Warm to T1 + 2°C briefly (e.g. 50°C for dark) to melt excess crystals',
      'Verify thermometer calibration — it may have drifted',
      'Re-seed minimally (5–10%) and bring back to T3',
      'Keep in gentle motion to prevent re-over-crystallization',
    ],
    prevention: [
      'Add seed gradually — 20–25% for most dark, 5% for the Callets method',
      'Monitor viscosity with a scraper every few minutes',
      'Keep bowl on warm plate or over tempering machine (not on room-temp counter)',
    ],
    relatedActionTypes: ['temper'],
  },
  {
    id: 'dull_undercrystallized',
    category: 'chocolate_tempering',
    title: 'Dull finish after tempering',
    symptom: 'Finished chocolate looks matte, streaky, or soft. No shine, no snap.',
    cause: 'Under-crystallized — insufficient Form V seed, T2 not hit fully, or T3 held too high during working.',
    severity: 'quality',
    recovery: [
      'Re-melt entire batch to T1 — this batch cannot be rescued in place',
      'Re-temper from scratch',
    ],
    prevention: [
      'Hit T2 fully, even if it means waiting longer',
      'Confirm T3 with a calibrated thermometer every 10 minutes',
      'Test a small sample on parchment: glossy in 3 min at 68°F = good temper',
    ],
    relatedActionTypes: ['temper', 'mold', 'enrobe', 'dip'],
  },
  {
    id: 'soft_no_snap',
    category: 'chocolate_tempering',
    title: 'Chocolate doesn\'t set / too soft',
    symptom: 'Molded or enrobed chocolate stays soft after chilling. Never develops firm snap.',
    cause: 'Under-tempered, ambient temperature too warm (>22°C), or the couverture has low cocoa butter content (compound chocolate).',
    severity: 'quality',
    recovery: [
      'Move to 15–18°C space and wait 30 minutes',
      'If still soft, re-melt and re-temper',
      'Check the couverture brand — compound chocolate (coating chocolate) will never snap regardless of technique',
    ],
    prevention: [
      'Work in a cool space (18–20°C room temperature ideal)',
      'Use true couverture with 31%+ cocoa butter, not coating chocolate',
      'Confirm temper on parchment before molding',
    ],
    relatedActionTypes: ['temper', 'mold', 'enrobe', 'dip'],
  },
  {
    id: 'shell_cracks',
    category: 'chocolate_molding',
    title: 'Shell cracks or breaks during demolding',
    symptom: 'Molded chocolate cracks or fractures as you release it from the mold.',
    cause: 'Contraction mismatch — chocolate hasn\'t fully contracted — or demolding too early, or temperature shock from moving cold molds to warm room.',
    severity: 'quality',
    recovery: [
      'Salvage the broken pieces for re-melting',
      'Clean mold thoroughly before next batch',
    ],
    prevention: [
      'Wait 10–15 min chill in 15°C space for full contraction',
      'Look for whitish halo around each shell cavity — that\'s the pull-away that indicates full contraction',
      'Demold smoothly by inverting and tapping gently, not by pushing or twisting',
      'Don\'t move cold molds directly into a warm room',
    ],
    relatedActionTypes: ['mold'],
  },
  {
    id: 'sticky_mold',
    category: 'chocolate_molding',
    title: 'Chocolate sticks to the mold',
    symptom: 'Shell won\'t release cleanly — leaves residue, tears, or stays stuck.',
    cause: 'Mold wasn\'t at the right temperature when filled, chocolate hasn\'t fully contracted, or the mold has micro-scratches from poor cleaning.',
    severity: 'quality',
    recovery: [
      'Wait longer — contraction may still be in progress',
      'If fully set and still stuck, place mold in freezer 3–5 min, then try again',
      'If the shell is damaged, salvage chocolate for re-melting',
    ],
    prevention: [
      'Temper mold to 18–20°C before filling (slightly warmer than ambient)',
      'Polish mold cavities with a clean cotton pad before each use',
      'Never wash molds with detergent or abrasive sponges — use warm water only',
      'Wait for the whitish contraction halo before demolding',
    ],
    relatedActionTypes: ['mold'],
  },
  {
    id: 'shell_uneven',
    category: 'chocolate_molding',
    title: 'Shell too thick or uneven',
    symptom: 'Molded chocolate has a heavy bottom or uneven wall thickness between cavities.',
    cause: 'Chocolate was too cold when poured (thick viscosity), inversion was too slow, or mold was too cold.',
    severity: 'cosmetic',
    recovery: [
      'Usable for applications where appearance is secondary (crumble, ganache inclusion)',
      'For presentation-grade work, re-melt and start over',
    ],
    prevention: [
      'Pour at T3 mid-range, not the low end (e.g. 31°C for dark rather than 30°C)',
      'Tap mold sharply to release bubbles within 10 seconds of filling',
      'Invert mold and scrape excess within 30–60 seconds',
      'Warm mold slightly if room is cold (~18–20°C)',
    ],
    relatedActionTypes: ['mold'],
  },
  {
    id: 'overheated_separated',
    category: 'chocolate_tempering',
    title: 'Cocoa butter separated from solids',
    symptom: 'Oily layer on the surface, grainy texture below. Mass no longer homogeneous.',
    cause: 'Overheated above T1 max during initial melt. Emulsion of cocoa butter and cocoa solids broke.',
    severity: 'quality',
    recovery: [
      'Stir slowly to re-emulsify — may or may not recover depending on how badly separated',
      'If stable emulsion doesn\'t return, use only for ganache or hot chocolate (not tempering or molding)',
    ],
    prevention: [
      'Never exceed T1 max (55°C dark, 50°C milk, 45°C white)',
      'Use bain-marie with simmering water only, never boiling',
      'Stir every 60 seconds during the melt',
      'If microwaving, use 30-second pulses on medium power (never high)',
    ],
    relatedActionTypes: ['temper'],
  },
];

/**
 * Filter the failure-mode catalog by action type or category.
 */
export function lookupChocolateFailureModes(filter?: {
  actionType?: string;
  category?: FailureMode['category'];
}): FailureMode[] {
  if (!filter) return CHOCOLATE_FAILURE_MODES;
  return CHOCOLATE_FAILURE_MODES.filter(mode => {
    if (filter.category && mode.category !== filter.category) return false;
    if (filter.actionType) {
      if (!mode.relatedActionTypes) return true; // modes without specific tags show for everything
      if (!mode.relatedActionTypes.includes(filter.actionType)) return false;
    }
    return true;
  });
}

/**
 * Set of action types that surface the "Something's off?" trigger. Chocolate
 * work verbs only — other verticals may add their own trigger sets later.
 */
export const CHOCOLATE_WORK_ACTION_TYPES = new Set(['temper', 'mold', 'enrobe', 'dip', 'airbrush', 'splatter', 'transfer']);

