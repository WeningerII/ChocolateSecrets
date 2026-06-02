import type { BreadRecipeSubtype, BreadSubtype } from '../../../types';

export type GlutenScore = 'weak' | 'developing' | 'strong' | 'over_developed';

export interface BreadBand {
  hydrationPctRange: [number, number];
  saltPctRange: [number, number];
  /** Yeast band assumes instant dry. Fresh yeast is 2.5x; sourdough is unbounded here. */
  instantYeastPctRange: [number, number];
  /** Optional sub-flour rye/whole wheat fraction band. */
  wholeGrainFractionRange?: [number, number];
  /** Suggested bulk fermentation duration window in minutes at 24°C, for chef reference. */
  bulkFermentMinutesRange: [number, number];
}

export interface BakersIngredientLine {
  ingredientId: string;
  name: string;
  mass: number;
  pct: number;                      // mass / total flour mass × 100
  role: 'flour' | 'water' | 'salt' | 'yeast' | 'leavener_other' | 'fat' | 'sweetener' | 'protein' | 'inclusion' | 'other';
  flourSubtype?: 'bread_flour' | 'whole_wheat_flour' | 'rye_flour' | 'specialty_flour';
}

export interface BreadComposition {
  totalFlourMass: number;
  hydrationPct: number;
  saltPct: number;
  /** Yeast normalized to instant-dry-equivalent for band comparison. */
  instantYeastEquivalentPct: number;
  /** Raw values per yeast form, in case the chef wants to inspect. */
  freshYeastPct: number;
  instantYeastPct: number;
  starterPct: number;
  fatPct: number;
  sweetenerPct: number;
  /** Fraction of total flour that is whole-grain (whole_wheat_flour | rye_flour). */
  wholeGrainFraction: number;
  /** Per-ingredient line items for tabular display. */
  lines: BakersIngredientLine[];
}

export interface DdtCalculation {
  desiredDoughTempC: number;
  roomTempC: number;
  flourTempC: number;
  frictionFactorC: number;
  /** Computed water temperature (°C) the chef should use. */
  waterTempC: number;
  /**
   * Whether the calculation includes a preferment factor. We use the simple
   * 3-factor formula (Water = DDT*3 - Room - Flour - Friction) when no preferment
   * is present, and the 4-factor formula (Water = DDT*4 - Room - Flour - Preferment - Friction)
   * when the recipe has a starter/preferment/levain.
   */
  formula: '3-factor' | '4-factor';
  prefermentTempC?: number;
}

export interface GlutenAssessment {
  /** Estimated effective protein% of the total flour blend (weighted average). */
  estimatedProteinPct: number;
  /** Score = protein% × hydration% / 100. Calibrated bands below. */
  rawScore: number;
  band: GlutenScore;
}

export interface BreadDerived {
  composition: BreadComposition;
  ddt: DdtCalculation;
  gluten: GlutenAssessment;
  recipeSubtype: BreadRecipeSubtype;
  recipeSubtypeProvenance: 'declared' | 'inferred_name' | 'inferred_composition' | 'fallback';
  /** Per-ingredient subtype. Indexed by ingredient id. */
  ingredientSubtypes: Record<string, BreadSubtype | null>;
  /** The band table row that applies to this recipe. */
  band: BreadBand;
}

export type BreadWarning =
  | { kind: 'no_flour_present' }
  | { kind: 'hydration_low'; hydration: number; minHydration: number; subtype: BreadRecipeSubtype }
  | { kind: 'hydration_high'; hydration: number; maxHydration: number; subtype: BreadRecipeSubtype }
  | { kind: 'salt_low'; salt: number; minSalt: number }
  | { kind: 'salt_high'; salt: number; maxSalt: number }
  | { kind: 'yeast_outside_band'; instantYeastEquivalentPct: number; range: [number, number]; subtype: BreadRecipeSubtype }
  | { kind: 'gluten_weak'; rawScore: number }
  | { kind: 'gluten_over_developed'; rawScore: number }
  | { kind: 'water_temp_unsafe_high'; waterTempC: number }
  | { kind: 'water_temp_unsafe_low'; waterTempC: number }
  | { kind: 'sourdough_no_starter'; subtype: BreadRecipeSubtype }
  | { kind: 'enriched_recipe_in_lean_subtype'; fatPct: number; subtype: BreadRecipeSubtype }
  | { kind: 'whole_grain_fraction_outside_band'; fraction: number; range: [number, number]; subtype: BreadRecipeSubtype };

export interface BreadEvaluation {
  derived: BreadDerived;
  warnings: BreadWarning[];
}
