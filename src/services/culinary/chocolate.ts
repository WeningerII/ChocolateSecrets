import type { TemperingCurve, ChocolateSpec } from '../../types';

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
