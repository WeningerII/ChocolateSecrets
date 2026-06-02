import type { Composition, CompositionSource, UniversalRole } from '../../../types';

export type AwBandKey =
  | 'very-fragile'
  | 'fragile'
  | 'stabilized'
  | 'shelf-stable'
  | 'functionally-stable';

export interface AwBand {
  key: AwBandKey;
  labelKey: string;            // i18n key, never raw text
  shelfLifeWeeksRange: [number, number];
}

export type FatRegimeKey =
  | 'firm-set'
  | 'standard'
  | 'inversion-approaching'
  | 'oil-in-water';

export interface FatRegime {
  key: FatRegimeKey;
  labelKey: string;
}

export type AwFlag =
  | { kind: 'no_water' }
  | { kind: 'composition_fallback'; ingredientId: string; source: CompositionSource }
  | { kind: 'extreme_saturation'; aqueousSugarPct: number }
  | { kind: 'lactose_upper_bound' }
  | { kind: 'ethanol_volatility_applied' };

export interface AwResult {
  aw: number | null;
  Xw: number;
  lnXw: number;
  terms: Array<{
    species: string;
    X: number;
    K: number;
    contribution: number;
    mass: number;
    moles: number;
  }>;
  massBy: Record<string, number>;
  moles: Record<string, number>;
  aqueousMass: number;
  aqueousSugarPct: number;
  waterPct: number;
  fatPct: number;
  totalMass: number;
  flags: AwFlag[];
}

export type PHFlag =
  | { kind: 'no_buffer_data' }
  | { kind: 'unrecognized_buffer_source'; ingredientId: string }
  | { kind: 'mixed_system_acidic'; pH: number };

export interface PHResult {
  pH: number;
  components: Array<{
    bufferRef: string;
    waterMass: number;
    fraction: number;
  }>;
  flags: PHFlag[];
}

export type ShelfLifeFlag =
  | { kind: 'declared_diverges'; declaredDays: number; predictedWeeks: number }
  | { kind: 'shelf_life_unbounded' }
  | { kind: 'combase_unavailable' };          // signals piecewise-fallback in use

export interface ShelfLifePrediction {
  weeks: number;
  band: AwBandKey;
  alcoholBonus: number;
  finalABV: number;
  flags: ShelfLifeFlag[];
}

/**
 * Normalized inputs for any leaf ingredient feeding the math kernel.
 * Composition is already resolved at this point. The kernel does not call back
 * into the catalog; it operates on this flat shape.
 */
export interface ResolvedIngredient {
  ingredientId: string;
  name: string;
  mass: number;                                 // grams
  composition: Composition;
  compositionSource: CompositionSource;
  bufferRef?: string;
  role?: UniversalRole;                           // tagged by caller; optional in Milestone A
  // Confectionery-relevant carry-throughs (filled by the hook from the catalog;
  // universal kernel doesn't read these — they're for downstream module use)
  chocolateCocoaPercentage?: number;
  chocolateClass?: 'dark' | 'milk' | 'white';
  alcoholAbv?: number;
}
