// =====================================================================
// Composition (Milestone A — Universal Physics Primitives)
// =====================================================================

export type CompositionSpecies =
  | 'water' | 'sucrose' | 'glucose' | 'fructose'
  | 'lactose' | 'maltose' | 'sorbitol' | 'glycerol'
  | 'ethanol' | 'fat' | 'protein' | 'ash';

export interface Composition {
  water?: number;     // % by mass, 0-100
  sucrose?: number;
  glucose?: number;
  fructose?: number;
  lactose?: number;
  maltose?: number;
  /** Starch / complex glucan, mass % — amylase substrate; the bulk of flour. */
  starch?: number;
  sorbitol?: number;
  glycerol?: number;
  ethanol?: number;
  /** Lactic acid, mass % — LAB fermentation product; titratable-acidity / sour driver. */
  lacticAcid?: number;
  /** Acetic acid, mass % — vinegar / heterofermentation; titratable-acidity / sour driver. */
  aceticAcid?: number;
  fat?: number;
  protein?: number;
  ash?: number;
  // --- descriptive sub-fractions: NOT part of the mass-balance sum (they break
  // down fields above), so compositionSum/isCompositionComplete ignore them. ---
  /** Unsaturated portion of `fat` (0 ≤ unsaturatedFat ≤ fat), mass %. Lipid-oxidation substrate. */
  unsaturatedFat?: number;
  /** Sodium content (a subset of `ash`), mass %. Electrolyte for freezing-point depression. */
  sodium?: number;
  // --- flavor-active trace compounds: the chemical inventory the perception layer reads ---
  /** Caffeine, mass % — bitter (T2R) agonist. */
  caffeine?: number;
  /** Theobromine, mass % — cocoa's milder bitter methylxanthine. */
  theobromine?: number;
  /** Free glutamate, mass % — umami (T1R1/T1R3) agonist. */
  glutamate?: number;
  // --- chemesthetic trace actives: the trigeminal inventory the chemesthesis kernel reads ---
  /** Capsaicinoids, mass % — TRPV1 burning pungency (chili). */
  capsaicinoids?: number;
  /** Allyl isothiocyanate, mass % — TRPA1 nasal pungency (mustard/wasabi/horseradish). */
  allylIsothiocyanate?: number;
  /** Menthol, mass % — TRPM8 cooling (mint). */
  menthol?: number;
  /** Tannins, mass % — astringency (precipitates salivary proteins). */
  tannins?: number;
  /** Dissolved CO₂, mass % — carbonation bite (ASIC3/TRPA1 + mechanical). */
  dissolvedCO2?: number;
  /** Sanshools, mass % — KCNK tingle/paresthesia (Sichuan pepper). */
  sanshool?: number;
}

export type CompositionSource =
  | 'explicit'           // user typed values into the editor
  | 'usda_fdc'           // pulled from USDA FoodData Central snapshot
  | 'chocolate_spec'     // derived from chocolateSpec.cocoaPercentage
  | 'alcohol_spec'       // derived from alcoholSpec.abv
  | 'category_default'   // category fallback
  | 'unknown';           // no data available

export interface AlcoholSpec {
  abv?: number;          // % alcohol by volume, 0-100
  type?: 'wine' | 'liqueur' | 'spirit' | 'highproof';
  brand?: string;
}
