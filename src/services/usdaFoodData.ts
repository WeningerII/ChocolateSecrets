import type { Composition, CompositionSpecies } from '../types';

export interface UsdaFdcEntry {
  fdcId: number;
  description: string;
  dataType: 'Foundation' | 'SR Legacy' | 'Branded' | 'Survey (FNDDS)';
  composition: Composition;
  matchKeywords: string[];   // lowercase tokens for fuzzy matching
}

/**
 * Derive a milk-powder composition from its liquid composition by removing water
 * down to a target residual moisture (spray-/freeze-dried whole milk powder ≈ 3%).
 *
 * Drying removes water, not solids: every non-water component keeps its mass and is
 * concentrated by the same factor. This is exact for the macronutrient profile
 * (fat, protein, lactose, ash) the engine models — it intentionally does not model
 * heat-driven changes (Maillard browning, vitamin loss, lactose crystallinity),
 * which don't alter these mass fractions. Validated against the FDC "Milk, dry,
 * whole" entry in usdaFoodData.test.ts (dehydrating whole cow milk reproduces the
 * published powder within ~0.5 of a point per component).
 */
export function dehydrate(liquid: Composition, targetMoisturePct = 3): Composition {
  const entries = Object.entries(liquid) as [CompositionSpecies, number | undefined][];
  const solids = entries.reduce((sum, [k, v]) => (k === 'water' ? sum : sum + (v ?? 0)), 0);
  if (solids <= 0) return { ...liquid };
  const factor = (100 - targetMoisturePct) / solids;
  const out: Composition = { water: targetMoisturePct };
  for (const [k, v] of entries) {
    if (k === 'water' || v == null) continue;
    out[k] = Math.round(v * factor * 10) / 10;
  }
  return out;
}

// Liquid composition of non-bovine milks, per 100 g, from dairy-science literature
// (FAO / Park & Haenlein; see usdaFoodData.test.ts and the commit notes for the
// sourced figures). The whole-milk-powder snapshot entries below are derived from
// these via dehydrate(), so the liquid and powder forms always agree. Replace any
// entry with a supplier Certificate of Analysis when one is available — spray/
// freeze-dried solids can deviate from the literature mean.
const GOAT_MILK: Composition = { water: 87.2, fat: 3.8, protein: 3.7, lactose: 4.5, ash: 0.8 };
const SHEEP_MILK: Composition = { water: 82.9, fat: 5.9, protein: 5.5, lactose: 4.8, ash: 0.9 };
const BUFFALO_MILK: Composition = { water: 82.5, fat: 7.4, protein: 4.5, lactose: 4.8, ash: 0.8 };
const CAMEL_MILK: Composition = { water: 87.6, fat: 4.0, protein: 3.3, lactose: 4.3, ash: 0.8 };
const REINDEER_MILK: Composition = { water: 70.7, fat: 15.5, protein: 9.9, lactose: 2.5, ash: 1.4 };

/**
 * Curated snapshot of the most common kitchen ingredients across categories.
 * Values are per 100 g of the edible portion, sourced from FDC Foundation Foods
 * (where available) or SR Legacy. All values rounded to one decimal.
 *
 * Add entries by appending to this list. Match keywords drive name-based lookup;
 * they should include the most common variants the chef might type.
 *
 * To regenerate this snapshot from FDC: see scripts/sync-usda-snapshot.mjs (deferred).
 */
export const USDA_FDC_SNAPSHOT: UsdaFdcEntry[] = [
  // --- Dairy ---
  { fdcId: 171890, description: 'Cream, fluid, heavy whipping',
    dataType: 'SR Legacy',
    composition: { water: 58.0, fat: 36.0, lactose: 2.9, protein: 2.1, ash: 0.5 },
    matchKeywords: ['heavy cream', 'heavy whipping cream', 'crema espesa'] },
  { fdcId: 171889, description: 'Cream, fluid, light whipping',
    dataType: 'SR Legacy',
    composition: { water: 63.5, fat: 30.9, lactose: 3.0, protein: 2.2, ash: 0.5 },
    matchKeywords: ['whipping cream', 'light whipping cream'] },
  { fdcId: 171891, description: 'Cream, fluid, light (coffee cream or table cream)',
    dataType: 'SR Legacy',
    composition: { water: 73.8, fat: 19.3, lactose: 3.7, protein: 2.7, ash: 0.6 },
    matchKeywords: ['light cream', 'coffee cream', 'table cream'] },
  { fdcId: 171887, description: 'Cream, fluid, half and half',
    dataType: 'SR Legacy',
    composition: { water: 80.6, fat: 11.5, lactose: 4.3, protein: 3.1, ash: 0.7 },
    matchKeywords: ['half and half', 'half-and-half', 'half & half'] },
  { fdcId: 173410, description: 'Butter, salted',
    dataType: 'SR Legacy',
    composition: { water: 16.2, fat: 81.1, lactose: 0.1, protein: 0.9, ash: 2.1 },
    matchKeywords: ['butter', 'salted butter', 'mantequilla'] },
  { fdcId: 173430, description: 'Butter, without salt',
    dataType: 'SR Legacy',
    composition: { water: 17.9, fat: 81.1, lactose: 0.1, protein: 0.9, ash: 0.1 },
    matchKeywords: ['unsalted butter', 'sweet butter', 'european butter'] },
  { fdcId: 170851, description: 'Milk, dry, whole, with added vitamin D',
    dataType: 'SR Legacy',
    composition: { water: 2.5, fat: 26.7, lactose: 38.4, protein: 26.3, ash: 6.1 },
    matchKeywords: ['milk powder', 'whole milk powder', 'dry milk', 'leche en polvo'] },
  { fdcId: 170852, description: 'Milk, dry, nonfat, regular',
    dataType: 'SR Legacy',
    composition: { water: 3.2, fat: 0.8, lactose: 51.9, protein: 36.2, ash: 7.9 },
    matchKeywords: ['nonfat dry milk', 'skim milk powder', 'nfdm'] },

  // --- Non-bovine milks (curated). Liquid values from dairy-science literature;
  //     whole-milk powders derived from them via dehydrate(). Override any entry
  //     with a supplier Certificate of Analysis when one is available. ---
  { fdcId: 1100200, description: '[Curated] Goat milk, whole, fluid',
    dataType: 'Foundation',
    composition: GOAT_MILK,
    matchKeywords: ['goat milk', 'goats milk', "goat's milk", 'leche de cabra'] },
  { fdcId: 1100201, description: '[Curated] Goat milk powder, whole',
    dataType: 'Foundation',
    composition: dehydrate(GOAT_MILK),
    matchKeywords: ['goat milk powder', 'powdered goat milk', 'dried goat milk', 'leche de cabra en polvo'] },
  { fdcId: 1100202, description: '[Curated] Sheep milk, whole, fluid',
    dataType: 'Foundation',
    composition: SHEEP_MILK,
    matchKeywords: ['sheep milk', "sheep's milk", 'ewe milk', 'leche de oveja'] },
  { fdcId: 1100203, description: '[Curated] Sheep milk powder, whole',
    dataType: 'Foundation',
    composition: dehydrate(SHEEP_MILK),
    matchKeywords: ['sheep milk powder', 'ewe milk powder', 'leche de oveja en polvo'] },
  { fdcId: 1100204, description: '[Curated] Water buffalo milk, whole, fluid',
    dataType: 'Foundation',
    composition: BUFFALO_MILK,
    matchKeywords: ['buffalo milk', 'water buffalo milk', 'leche de bufala'] },
  { fdcId: 1100205, description: '[Curated] Water buffalo milk powder, whole',
    dataType: 'Foundation',
    composition: dehydrate(BUFFALO_MILK),
    matchKeywords: ['buffalo milk powder', 'water buffalo milk powder', 'leche de bufala en polvo'] },
  { fdcId: 1100206, description: '[Curated] Camel milk, whole, fluid (dromedary)',
    dataType: 'Foundation',
    composition: CAMEL_MILK,
    matchKeywords: ['camel milk', 'dromedary milk', 'leche de camello'] },
  { fdcId: 1100207, description: '[Curated] Camel milk powder, whole (dromedary)',
    dataType: 'Foundation',
    composition: dehydrate(CAMEL_MILK),
    matchKeywords: ['camel milk powder', 'dromedary milk powder', 'leche de camello en polvo'] },
  { fdcId: 1100208, description: '[Curated] Reindeer milk, whole, fluid',
    dataType: 'Foundation',
    composition: REINDEER_MILK,
    matchKeywords: ['reindeer milk', 'leche de reno'] },
  { fdcId: 1100209, description: '[Curated] Reindeer milk powder, whole',
    dataType: 'Foundation',
    composition: dehydrate(REINDEER_MILK),
    matchKeywords: ['reindeer milk powder', 'leche de reno en polvo'] },

  // --- Sugars and sweeteners ---
  { fdcId: 169655, description: 'Sugar, granulated',
    dataType: 'SR Legacy',
    composition: { water: 0.0, sucrose: 99.8, ash: 0.0 },
    matchKeywords: ['sugar', 'granulated sugar', 'sucrose', 'white sugar', 'azucar'] },
  { fdcId: 169656, description: 'Sugar, brown',
    dataType: 'SR Legacy',
    composition: { water: 1.3, sucrose: 89.0, glucose: 4.4, fructose: 4.4, ash: 0.5 },
    matchKeywords: ['brown sugar', 'azucar moreno'] },
  { fdcId: 169640, description: 'Honey',
    dataType: 'SR Legacy',
    composition: { water: 17.1, fructose: 38.5, glucose: 31.0, maltose: 7.2, sucrose: 1.0, ash: 0.2 },
    matchKeywords: ['honey', 'miel'] },
  { fdcId: 169658, description: 'Syrups, corn, light',
    dataType: 'SR Legacy',
    composition: { water: 22.4, glucose: 19.7, maltose: 14.4, ash: 0.4 },
    matchKeywords: ['glucose syrup', 'corn syrup', 'jarabe de glucosa'] },
  { fdcId: 169660, description: 'Syrups, sorghum',
    dataType: 'SR Legacy',
    composition: { water: 22.7, sucrose: 65.7, glucose: 4.6, fructose: 5.3, ash: 1.7 },
    matchKeywords: ['sorghum syrup', 'invert sugar', 'trimoline', 'invert syrup'] },
  // Sorbitol and glycerol have inconsistent FDC entries; provide canonical compositions
  { fdcId: 1100001, description: '[Curated] Sorbitol, food grade',
    dataType: 'Foundation',
    composition: { water: 0.0, sorbitol: 100.0 },
    matchKeywords: ['sorbitol', 'sorbitol powder'] },
  { fdcId: 1100002, description: '[Curated] Glycerol (glycerine), food grade',
    dataType: 'Foundation',
    composition: { water: 0.5, glycerol: 99.5 },
    matchKeywords: ['glycerol', 'glycerine', 'vegetable glycerin'] },

  // --- Fruits and purees ---
  { fdcId: 167755, description: 'Raspberries, raw',
    dataType: 'SR Legacy',
    composition: { water: 85.8, fructose: 2.4, glucose: 1.9, sucrose: 0.2, fat: 0.7, protein: 1.2, ash: 0.5 },
    matchKeywords: ['raspberry', 'raspberries', 'frambuesa', 'raspberry puree'] },
  { fdcId: 169926, description: 'Passion-fruit juice, purple, raw',
    dataType: 'SR Legacy',
    composition: { water: 85.6, sucrose: 4.0, glucose: 4.0, fructose: 3.0, fat: 0.4, protein: 0.4, ash: 0.7 },
    matchKeywords: ['passion fruit', 'passion', 'maracuya', 'passion fruit puree'] },
  { fdcId: 169910, description: 'Mangos, raw',
    dataType: 'SR Legacy',
    composition: { water: 83.5, fructose: 4.7, glucose: 2.0, sucrose: 6.9, fat: 0.4, protein: 0.8, ash: 0.4 },
    matchKeywords: ['mango', 'mango puree'] },
  { fdcId: 167762, description: 'Strawberries, raw',
    dataType: 'SR Legacy',
    composition: { water: 90.9, fructose: 2.4, glucose: 2.0, sucrose: 0.5, fat: 0.3, protein: 0.7, ash: 0.4 },
    matchKeywords: ['strawberry', 'strawberries', 'fresa', 'strawberry puree'] },
  { fdcId: 169118, description: 'Pears, raw',
    dataType: 'SR Legacy',
    composition: { water: 83.7, fructose: 6.4, glucose: 2.0, sucrose: 0.7, sorbitol: 2.2, fat: 0.1, protein: 0.4, ash: 0.3 },
    matchKeywords: ['pear', 'pears', 'pera', 'pear puree'] },
  { fdcId: 171697, description: 'Apricots, raw',
    dataType: 'SR Legacy',
    composition: { water: 86.3, fructose: 0.9, glucose: 2.4, sucrose: 5.9, fat: 0.4, protein: 1.4, ash: 0.7 },
    matchKeywords: ['apricot', 'apricots', 'damasco', 'apricot puree'] },

  // --- Chocolate (placeholder; chocolateSpec resolver preferred) ---
  { fdcId: 169593, description: 'Chocolate, dark, 70-85% cacao solids',
    dataType: 'SR Legacy',
    composition: { water: 1.4, sucrose: 24.0, fat: 42.6, protein: 7.8, ash: 2.3 },
    matchKeywords: ['dark chocolate', 'bittersweet chocolate', 'couverture'] },
  { fdcId: 169595, description: 'Chocolate, sweet (45-59% cacao solids)',
    dataType: 'SR Legacy',
    composition: { water: 1.0, sucrose: 51.5, fat: 27.0, lactose: 1.0, protein: 4.9, ash: 1.5 },
    matchKeywords: ['semisweet chocolate', 'sweet chocolate'] },
  { fdcId: 169594, description: 'Chocolate, milk',
    dataType: 'SR Legacy',
    composition: { water: 1.5, sucrose: 51.5, lactose: 7.5, fat: 29.7, protein: 7.6, ash: 1.5 },
    matchKeywords: ['milk chocolate'] },
  { fdcId: 169596, description: 'Chocolate, white',
    dataType: 'SR Legacy',
    composition: { water: 1.3, sucrose: 50.0, lactose: 11.0, fat: 32.1, protein: 5.9, ash: 1.1 },
    matchKeywords: ['white chocolate'] },
  { fdcId: 169593.1, description: 'Cocoa, dry powder, unsweetened',
    dataType: 'SR Legacy',
    composition: { water: 3.0, sucrose: 0.4, fat: 13.7, protein: 19.6, ash: 5.8 },
    matchKeywords: ['cocoa powder', 'cacao powder', 'unsweetened cocoa'] },

  // --- Stabilizers (curated, FDC entries inconsistent) ---
  { fdcId: 1100100, description: '[Curated] Kappa carrageenan, refined',
    dataType: 'Foundation',
    composition: { water: 10.0, ash: 18.0 },
    matchKeywords: ['carrageenan', 'kappa carrageenan'] },
  { fdcId: 1100101, description: '[Curated] Locust bean gum',
    dataType: 'Foundation',
    composition: { water: 13.0, protein: 5.0, ash: 1.0 },
    matchKeywords: ['locust bean gum', 'lbg', 'carob gum'] },
  { fdcId: 1100102, description: '[Curated] Pectin, low-methoxyl',
    dataType: 'Foundation',
    composition: { water: 10.0, ash: 5.0 },
    matchKeywords: ['pectin', 'lm pectin', 'low-methoxyl pectin'] },
  { fdcId: 1100103, description: '[Curated] Xanthan gum',
    dataType: 'Foundation',
    composition: { water: 10.0, protein: 1.0, ash: 9.0 },
    matchKeywords: ['xanthan', 'xanthan gum'] },
  { fdcId: 1100104, description: '[Curated] Gelatin, unflavored, dry',
    dataType: 'Foundation',
    composition: { water: 13.0, protein: 85.6, ash: 1.4 },
    matchKeywords: ['gelatin', 'gelatine'] },

  // --- Flours ---
  { fdcId: 168893, description: 'Wheat flour, white, all-purpose, enriched',
    dataType: 'SR Legacy',
    composition: { water: 11.9, sucrose: 0.3, fat: 1.0, protein: 10.3, ash: 0.5 },
    matchKeywords: ['all-purpose flour', 'ap flour', 'plain flour', 'wheat flour'] },
  { fdcId: 168891, description: 'Wheat flour, white, bread, enriched',
    dataType: 'SR Legacy',
    composition: { water: 13.4, sucrose: 0.3, fat: 1.7, protein: 12.0, ash: 0.5 },
    matchKeywords: ['bread flour', 'strong flour', 'high-protein flour'] },
  { fdcId: 168935, description: 'Wheat flour, whole-grain, soft wheat',
    dataType: 'SR Legacy',
    composition: { water: 10.7, sucrose: 0.6, fat: 1.9, protein: 13.2, ash: 1.6 },
    matchKeywords: ['whole wheat flour', 'wholewheat', 'whole grain flour'] },
  { fdcId: 168900, description: 'Rye flour, dark',
    dataType: 'SR Legacy',
    composition: { water: 11.2, sucrose: 1.2, fat: 2.7, protein: 14.0, ash: 2.5 },
    matchKeywords: ['rye flour', 'dark rye', 'pumpernickel'] },

  // --- Eggs (relevant for viennoiserie + plated) ---
  { fdcId: 171287, description: 'Egg, whole, raw, fresh',
    dataType: 'SR Legacy',
    composition: { water: 76.2, fat: 9.5, glucose: 0.4, protein: 12.6, ash: 1.1 },
    matchKeywords: ['egg', 'whole egg', 'eggs', 'huevo'] },
  { fdcId: 172182, description: 'Egg, yolk, raw, fresh',
    dataType: 'SR Legacy',
    composition: { water: 52.3, fat: 26.5, glucose: 0.6, protein: 15.9, ash: 1.7 },
    matchKeywords: ['egg yolk', 'yolk', 'yolks', 'yema'] },
  { fdcId: 172183, description: 'Egg, white, raw, fresh',
    dataType: 'SR Legacy',
    composition: { water: 87.6, glucose: 0.7, protein: 10.9, ash: 0.6 },
    matchKeywords: ['egg white', 'whites', 'albumen', 'clara'] },

  // --- Salt ---
  { fdcId: 173468, description: 'Salt, table',
    dataType: 'SR Legacy',
    composition: { water: 0.2, ash: 99.8 },
    matchKeywords: ['salt', 'table salt', 'sodium chloride', 'sea salt', 'kosher salt', 'sal'] },
];

/**
 * Look up an ingredient in the embedded snapshot by name.
 * Returns the best fuzzy match by keyword overlap, or null if no match exceeds threshold.
 */
export function lookupUsdaSnapshot(
  ingredientName: string,
  threshold = 0.5
): UsdaFdcEntry | null {
  const tokens = ingredientName.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  if (tokens.length === 0) return null;

  let best: { entry: UsdaFdcEntry; score: number } | null = null;

  for (const entry of USDA_FDC_SNAPSHOT) {
    let bestKeywordScore = 0;
    for (const kw of entry.matchKeywords) {
      const kwTokens = kw.toLowerCase().split(/\s+/);
      const matched = kwTokens.filter(kt => tokens.some(t => t === kt || t.includes(kt) || kt.includes(t)));
      const score = matched.length / Math.max(kwTokens.length, tokens.length);
      if (score > bestKeywordScore) bestKeywordScore = score;
    }
    if (bestKeywordScore > (best?.score ?? 0)) {
      best = { entry, score: bestKeywordScore };
    }
  }

  if (!best || best.score < threshold) return null;
  return best.entry;
}

