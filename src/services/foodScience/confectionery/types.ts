import type { ConfectionerySubtype, UniversalRole } from '../../../types';

export type CurdleRiskLevel = 'none' | 'low' | 'medium' | 'high';

export interface CurdleAssessment {
  level: CurdleRiskLevel;
  reasons: Array<
    | { kind: 'ph_low'; pH: number }
    | { kind: 'cream_acid_ratio'; creamMass: number; acidMass: number }
    | { kind: 'no_cream_present' }
    | { kind: 'no_acid_present' }
  >;
  /** When non-null, the temperature ceiling we recommend during the cream-fold step (°C). */
  recommendedFoldTempCeilingC: number | null;
}

export type ChocolateClass = 'dark' | 'milk' | 'white';

export interface PolymorphWindow {
  chocolateClass: ChocolateClass;
  cocoaPercentage: number;
  /** Form-V (stable beta) temper window in °C. */
  tempWindowC: [number, number];
  /** Working point — middle of the window, recommended hold temp. */
  workingPointC: number;
}

export interface EthanolAssessment {
  abv: number | null;
  retentionApplied: number;        // 0.90 hardcoded constant for now
  postRetentionMassPct: number;    // ethanol % of final recipe mass after retention
  /** Wybauw long-shelf range guidance: 4–6% ethanol-by-mass desirable for stable confections. */
  inLongShelfBand: boolean;
}

export interface ConfectioneryDerived {
  /** Subtypes inferred per resolved ingredient, indexed by ingredientId. */
  subtypes: Record<string, ConfectionerySubtype | null>;
  curdle: CurdleAssessment;
  polymorph: PolymorphWindow | null;
  ethanol: EthanolAssessment;
}

export type ConfectioneryWarning =
  | { kind: 'curdle_risk_medium'; pH: number; foldTempCeiling: number }
  | { kind: 'curdle_risk_high'; pH: number; foldTempCeiling: number }
  | { kind: 'fat_regime_inversion'; fatPct: number }
  | { kind: 'fat_regime_oil_in_water'; fatPct: number }
  | { kind: 'no_chocolate_in_confectionery' }
  | { kind: 'multiple_chocolate_classes'; classes: ChocolateClass[] }
  | { kind: 'ethanol_above_tolerance'; abv: number }
  | { kind: 'ethanol_long_shelf_low'; abv: number }
  | { kind: 'sorbet_detected_in_confectionery' }
  | { kind: 'inclusion_oversized_for_truffle'; subtypes: ConfectionerySubtype[] };

export interface ConfectioneryEvaluation {
  derived: ConfectioneryDerived;
  warnings: ConfectioneryWarning[];
}

/**
 * Universal role → confectionery subtype mapping helper. Read-only reference table.
 * The actual inference (subtypes.ts) layers name heuristics on top.
 */
export const CONFECTIONERY_ROLE_SUBTYPE_MAP: Partial<Record<UniversalRole, ConfectionerySubtype>> = {
  liquid: 'cream',          // overridden by name heuristic to 'puree' for fruit purees
  fat: 'butter',            // overridden by chocolateSpec to 'chocolate'
  sweetener: 'sugar_add',   // overridden by name heuristic to 'glucose_syrup', 'fondant'
  hydrocolloid: 'stabilizer',
  protein: 'milk_powder',
  flavor: 'flavor_oil',
  inclusion: 'inclusion',
};
