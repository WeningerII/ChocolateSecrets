/**
 * Emulsion type and stability — oil and water don't mix; an emulsifier holds one
 * as droplets dispersed in the other. Which phase is continuous (oil-in-water vs
 * water-in-oil) and how stable the emulsion is follow from the phase-volume
 * fraction and the emulsifier's HLB (hydrophilic–lipophilic balance):
 *
 *   φ_oil = oil volume / (oil + water volume)
 *   Bancroft: the phase the emulsifier prefers becomes continuous — hydrophilic
 *     (HLB ≳ 7) → water-continuous → o/w; lipophilic (HLB ≲ 7) → w/o.
 *   Above φ ≈ 0.74 (close packing of spheres) the dispersed phase cannot pack:
 *     inversion / breaking risk.
 *
 * Phase volume is first-principles; the HLB/packing thresholds are calibrated.
 * Universal to any fat+water system (sauces, ganache, dressings, creams, batters).
 *
 * Sources: Bancroft rule; Griffin HLB system; random/close-packing limits.
 */
import type { Composition } from '../../../types';

const FAT_DENSITY = 0.92;   // g·mL⁻¹
const WATER_DENSITY = 1.0;  // g·mL⁻¹
/** Dispersed-phase fraction at which packing forces inversion/breaking. */
const CLOSE_PACKING_PHI = 0.74;
/** Random close packing — above this the emulsion turns metastable. */
const RANDOM_PACKING_PHI = 0.64;
/** HLB at/above which the emulsifier favors a water-continuous (o/w) emulsion. */
const HLB_OW_THRESHOLD = 7;

export type EmulsionType = 'oil_in_water' | 'water_in_oil' | 'none';
export type EmulsionStability = 'none' | 'unstable' | 'metastable' | 'stable';

export type EmulsionFlag =
  | { kind: 'no_emulsifier' }
  | { kind: 'near_inversion' };

export interface EmulsionInput {
  composition: Composition;
  /** Emulsifier HLB (Griffin 0–20), if one is present. */
  emulsifierHLB?: number;
}

export interface EmulsionResult {
  type: EmulsionType;
  /** Oil volume fraction of the oil+water system. */
  oilPhaseFraction: number;
  /** Volume fraction of the DISPERSED phase (the packing-limited one). */
  dispersedFraction: number;
  stability: EmulsionStability;
  flags: EmulsionFlag[];
}

export function computeEmulsion(input: EmulsionInput): EmulsionResult {
  const fat = input.composition.fat ?? 0;
  const water = input.composition.water ?? 0;
  const oilVol = fat / FAT_DENSITY;
  const waterVol = water / WATER_DENSITY;
  const total = oilVol + waterVol;

  if (fat <= 0 || water <= 0 || total <= 0) {
    return { type: 'none', oilPhaseFraction: total > 0 ? oilVol / total : 0, dispersedFraction: 0, stability: 'none', flags: [] };
  }

  const oilFrac = oilVol / total;
  const hasEmulsifier = input.emulsifierHLB !== undefined;
  const continuousIsWater = hasEmulsifier ? input.emulsifierHLB! >= HLB_OW_THRESHOLD : oilFrac < 0.5;
  const type: EmulsionType = continuousIsWater ? 'oil_in_water' : 'water_in_oil';
  const dispersedFraction = continuousIsWater ? oilFrac : 1 - oilFrac;

  const flags: EmulsionFlag[] = [];
  let stability: EmulsionStability;
  if (!hasEmulsifier) {
    flags.push({ kind: 'no_emulsifier' });
    stability = 'unstable';
  } else if (dispersedFraction > CLOSE_PACKING_PHI) {
    flags.push({ kind: 'near_inversion' });
    stability = 'unstable';
  } else if (dispersedFraction > RANDOM_PACKING_PHI) {
    flags.push({ kind: 'near_inversion' });
    stability = 'metastable';
  } else {
    stability = 'stable';
  }

  return { type, oilPhaseFraction: oilFrac, dispersedFraction, stability, flags };
}
