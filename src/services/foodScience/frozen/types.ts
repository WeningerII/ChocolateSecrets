import type { FrozenRecipeSubtype, FrozenSubtype } from '../../../types';

/**
 * Scoopability label, derived from the hardening-vs-PAC heuristic. Operational
 * meaning calibrated against Italian gelato shop literature:
 *   brick    — won't scoop without breaking the ice cream
 *   firm     — scoopable with a heated dipper, requires force
 *   standard — clean curl from a cold dipper, normal mouthfeel
 *   soft     — scoops too easily, melts on the spoon
 *   too_soft — slumps in the cabinet, drains during plating
 */
export type ScoopabilityLevel = 'brick' | 'firm' | 'standard' | 'soft' | 'too_soft';

export interface FrozenBand {
  totalSolidsPctRange: [number, number];
  fatPctRange: [number, number];
  msnfPctRange: [number, number];
  totalSugarsPctRange: [number, number];
  pacRange: [number, number];
  podRange: [number, number];
  servingTempCRange: [number, number];
}

export interface FrozenComposition {
  totalSolidsPct: number;
  fatPct: number;
  msnfPct: number;
  totalSugarsPct: number;
  lactosePct: number;
  pac: number;
  pod: number;
  /** Lactose as a percentage of the unfrozen water (serum) — sandiness predictor. */
  lactoseInWaterPct: number;
}

export interface FrozenDerived {
  composition: FrozenComposition;
  hardeningFactor: number;
  scoopability: ScoopabilityLevel;
  recipeSubtype: FrozenRecipeSubtype;
  recipeSubtypeProvenance: 'declared' | 'inferred_name' | 'inferred_composition' | 'fallback';
  /** Per-ingredient subtype. Indexed by ingredient id. */
  ingredientSubtypes: Record<string, FrozenSubtype | null>;
  /** The band table row that applies to this recipe. */
  band: FrozenBand;
  /** Initial freezing point of the serum, °C (≤ 0). null when no aqueous data. */
  initialFreezingPointC: number | null;
  /** Equilibrium % of water frozen at the subtype's serving temperature (ideal colligative). */
  frozenWaterPctAtServing: number | null;
  /** Scoopability derived from ice-phase volume (physics), parallel to `scoopability`. */
  frozenWaterScoopability: ScoopabilityLevel | null;
  /** Glass-transition temp of the freeze-concentrated serum, °C (estimate). null when no aqueous data. */
  tgPrimeC: number | null;
  /** Serving temp − Tg′ (°C). Larger = more mobility = faster recrystallization in storage. */
  recrystallizationMarginC: number | null;
}

export type FrozenWarning =
  | { kind: 'total_solids_low'; ts: number; minTs: number; subtype: FrozenRecipeSubtype }
  | { kind: 'total_solids_high'; ts: number; maxTs: number; subtype: FrozenRecipeSubtype }
  | { kind: 'fat_out_of_band'; fat: number; range: [number, number]; subtype: FrozenRecipeSubtype }
  | { kind: 'msnf_out_of_band'; msnf: number; range: [number, number]; subtype: FrozenRecipeSubtype }
  | { kind: 'pac_low'; pac: number; minPac: number; subtype: FrozenRecipeSubtype }
  | { kind: 'pac_high'; pac: number; maxPac: number; subtype: FrozenRecipeSubtype }
  | { kind: 'pod_out_of_band'; pod: number; range: [number, number]; subtype: FrozenRecipeSubtype }
  | { kind: 'sandiness_risk'; lactoseInWaterPct: number }
  | { kind: 'sorbet_dairy_present'; msnf: number }
  | { kind: 'gelato_no_milk_powder' }
  | { kind: 'scoopability_brick'; hardening: number; pac: number }
  | { kind: 'scoopability_too_soft'; hardening: number; pac: number };

export interface FrozenEvaluation {
  derived: FrozenDerived;
  warnings: FrozenWarning[];
}
