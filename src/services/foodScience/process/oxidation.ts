/**
 * Lipid (autoxidation) rancidity potential over storage.
 *
 * Unsaturated fats oxidize over storage time·temperature, driving rancid
 * off-flavors — the dominant shelf-life limit for nut, dairy-fat and high-fat
 * confections once water activity is under control. Rate rises with temperature
 * (Arrhenius) and with the UNSATURATED fat fraction (the C=C bonds that oxidize;
 * saturated fat is nearly inert), and follows the classic Labuza water-activity
 * curve: a minimum near the BET monolayer (a_w ≈ 0.3) with faster oxidation both
 * drier (no protective monolayer) and wetter (mobilized catalysts). We model:
 *
 *   index = arrheniusExtent(T(t)) / refExtent
 *           · oxidizableFatFactor / refFatFactor
 *           · awFactor
 *
 * a DIMENSIONLESS rancidity POTENTIAL normalized so a reference exposure
 * (REF_DURATION at REF_TEMP_C, REF_UNSAT_PCT oxidizable fat, a_w at the minimum)
 * ≈ 1.0. It is a relative potential, not a measured peroxide value — `calibrated`.
 *
 * When `unsaturatedFat` is unknown it falls back to fat × DEFAULT_UNSAT_FRACTION
 * (flagged), so the model still runs before the split is populated.
 *
 * Sources: autoxidation Arrhenius Ea ≈ 40–100 kJ·mol⁻¹ (Labuza 1971); a_w
 * minimum near the monolayer ~0.2–0.3 (Labuza food-stability map).
 */
import type { Composition } from '../../../types';
import type { ProcessProfile } from './types';
import { accumulateThermalExtent, arrheniusRate } from './integrator';

// --- calibration anchors (documented modeling choices) ---
/** Reference storage temperature the index is normalized to (°C). */
export const OXIDATION_REF_TEMP_C = 20;
/** Reference storage duration at the reference temperature (seconds; 180 days). */
export const OXIDATION_REF_DURATION_S = 180 * 86_400;
/** Autoxidation activation energy (J·mol⁻¹). */
export const OXIDATION_EA_J_PER_MOL = 80_000;
/** Water activity at which oxidation rate is slowest (BET monolayer region). */
export const OXIDATION_AW_MINIMUM = 0.3;
/** Curvature of the (simplified) U-shaped a_w response. */
const OXIDATION_AW_CURVATURE = 3;
/** Assumed unsaturated fraction of fat when the split is not supplied. */
export const DEFAULT_UNSATURATED_FRACTION = 0.6;
/** Oxidizable-fat mass (% of mix) at which substrate supply half-saturates. */
const OXIDIZABLE_FAT_HALF_SAT = 10;
/** Reference oxidizable-fat level the substrate factor is normalized against. */
const REF_OXIDIZABLE_FAT_PCT = 10;

export type OxidationBand = 'none' | 'low' | 'moderate' | 'high' | 'severe';

export type OxidationFlag =
  | { kind: 'no_storage_process' }
  | { kind: 'no_oxidizable_fat' }
  | { kind: 'unsaturated_fat_estimated' };

export interface OxidationResult {
  /** Dimensionless rancidity potential; ~1.0 ≈ the reference exposure. */
  index: number;
  band: OxidationBand;
  /** Oxidizable (unsaturated) fat used, mass % of mix. */
  oxidizableFatPct: number;
  /** [0,1] substrate availability (un-normalized). */
  fatFactor: number;
  /** Water-activity multiplier (≥1; 1 at the minimum). */
  awFactor: number;
  flags: OxidationFlag[];
}

function saturating(x: number, halfSat: number): number {
  return x > 0 ? x / (x + halfSat) : 0;
}

/** Simplified Labuza U-shape: 1 at the a_w minimum, rising both drier and wetter. */
function awSuitability(aw: number): number {
  const d = aw - OXIDATION_AW_MINIMUM;
  return 1 + OXIDATION_AW_CURVATURE * d * d;
}

const REF_FAT_FACTOR = saturating(REF_OXIDIZABLE_FAT_PCT, OXIDIZABLE_FAT_HALF_SAT);

function classifyBand(index: number, hasSubstrate: boolean): OxidationBand {
  if (!hasSubstrate || index <= 0) return 'none';
  if (index < 0.5) return 'low';
  if (index < 1.5) return 'moderate';
  if (index < 3.0) return 'high';
  return 'severe';
}

/**
 * Compute lipid-oxidation rancidity potential. `aw` is the mix water activity;
 * `storageProfile` is the storage timeline (time at storage temperature).
 */
export function computeLipidOxidation(
  composition: Composition,
  aw: number,
  storageProfile: ProcessProfile,
): OxidationResult {
  const flags: OxidationFlag[] = [];

  const extent = accumulateThermalExtent(storageProfile, arrheniusRate(OXIDATION_REF_TEMP_C, OXIDATION_EA_J_PER_MOL));
  const hasStorage = extent > 0;
  if (!hasStorage) flags.push({ kind: 'no_storage_process' });
  const thermal = extent / OXIDATION_REF_DURATION_S;

  let oxidizableFatPct = composition.unsaturatedFat ?? 0;
  if (composition.unsaturatedFat === undefined && (composition.fat ?? 0) > 0) {
    oxidizableFatPct = (composition.fat ?? 0) * DEFAULT_UNSATURATED_FRACTION;
    flags.push({ kind: 'unsaturated_fat_estimated' });
  }
  if (oxidizableFatPct <= 0) flags.push({ kind: 'no_oxidizable_fat' });

  const fatFactor = saturating(oxidizableFatPct, OXIDIZABLE_FAT_HALF_SAT);
  const awFactor = awSuitability(aw);

  const index = thermal * (fatFactor / REF_FAT_FACTOR) * awFactor;
  const hasSubstrate = hasStorage && oxidizableFatPct > 0;

  return {
    index,
    band: classifyBand(index, hasSubstrate),
    oxidizableFatPct,
    fatFactor,
    awFactor,
    flags,
  };
}
