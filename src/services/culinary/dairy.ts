// =============================================================================
// Dairy fat matrix — catalog of cream/milk/butter variants with fat % and
// whipping behavior. Used by IngredientInfo to reveal the science a recipe
// card doesn't state (whipping behavior, cultured status, origin, etc.).
// =============================================================================

export type DairyCategory =
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
