import type { AllergenKey } from '../services/culinaryTools';
export type { AllergenKey };

/**
 * Structured cross-contact risk record. Stored on Recipe documents in
 * place of the legacy free-text strings produced before Phase 5.
 *
 * The renderer composes the displayed sentence from i18n keys at view
 * time using the `allergen` enum value and the optional `station`
 * identifier (matching `StationTag.primary`).
 */
export interface CrossContactRisk {
  allergen: AllergenKey;
  /**
   * Station identifier matching `StationTag.primary` when known.
   * Undefined or absent means a generic shared workspace.
   */
  station?: string;
}

// =====================================================================
// Dietary classification (Milestone — lactose status)
// Distinct from AllergenFlag. AllergenFlag covers FDA Top-9 immune-mediated
// allergens. DietaryFlag covers non-allergen dietary considerations like
// lactose intolerance, derived from quantitative composition.
// =====================================================================

export type DietaryFlag =
  | 'lactose_free'      // composition.lactose is undefined or 0
  | 'low_lactose'       // 0 < lactose ≤ 0.5% by mass
  | 'lactose_present';  // lactose > 0.5% by mass

export interface AllergenFlag extends String {
  allergen: 'milk' | 'eggs' | 'fish' | 'shellfish' | 'tree_nuts' | 'peanuts' | 'wheat' | 'soy' | 'sesame';
  certainty: 'contains' | 'may_contain' | 'cross_contact_risk';
  source: string; // e.g., "butter", "ingredient-derived", "cross-contact: shared mold"
}

export interface HACCPMetadata {
  dangerZoneExposureMinutes?: number; // total time in 41-135°F during prep
  storageTemperatureCelsius?: [number, number]; // [min, max]
  storageHumidity?: [number, number];
  coolingRequired?: boolean; // two-stage 135→70 in 2hr, 70→41 in 4hr
  shelfLifeDays?: number;
  labelingNotes?: string;
}
