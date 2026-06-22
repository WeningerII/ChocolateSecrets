/**
 * Maillard browning potential from composition + the process timeline.
 *
 * Browning is a temperature·time reaction between REDUCING sugars (glucose,
 * fructose, lactose, maltose — sucrose is non-reducing until inverted, and
 * sorbitol/glycerol have no carbonyl) and amino groups (protein). Its rate rises
 * steeply with temperature and peaks at intermediate water activity (~0.6): too
 * dry starves molecular mobility, too wet dilutes reactants and pins the surface
 * near 100 °C by evaporative cooling. We model:
 *
 *   index = cookValue(T(t)) / refCookValue
 *           · reactantFactor / refReactantFactor
 *           · awFactor
 *
 * a DIMENSIONLESS browning POTENTIAL normalized so a reference "golden" bake
 * (REF_TEMP_C for REF_DURATION, a reference enriched batter, aw at the optimum)
 * ≈ 1.0. The reported `band` comes from a saturating perceptual map
 * colorSaturation = 1 − exp(−index), because visual color stops deepening as
 * reactants deplete (the index, a reaction extent, keeps climbing). It is a
 * relative potential, NOT a predicted color or aroma value (true color is
 * instrument-measured and aroma is panel-only — the wall), so the registry tags
 * it `calibrated`, not first-principles.
 *
 * Known simplifications (future work): uses the mix's BULK aw, whereas browning
 * happens at the drying surface where aw falls; non-enzymatic caramelization of
 * sucrose (a separate pathway at >160 °C) is not modeled here.
 *
 * Sources: Maillard kinetics z ≈ 25 °C / Ea ≈ 100–150 kJ·mol⁻¹ (van Boekel 2001;
 * Martins & van Boekel 2005); aw optimum ~0.6–0.8 (Labuza stability map).
 */
import type { Composition } from '../../../types';
import type { ProcessProfile } from './types';
import { accumulateThermalExtent, zValueRate } from './integrator';

// --- calibration anchors (documented modeling choices, not measurements) ---
/** Reference "golden" bake temperature the index is normalized to (°C). */
export const MAILLARD_REF_TEMP_C = 180;
/** Reference bake duration at the reference temperature (seconds). */
export const MAILLARD_REF_DURATION_S = 20 * 60;
/** Temperature sensitivity: browning rate ×10 per this many °C (z-value). */
export const MAILLARD_Z_C = 25;
/** Water activity at which the browning rate peaks. */
export const MAILLARD_AW_OPTIMUM = 0.65;
/** Half-width of the aw suitability window (Gaussian σ). */
const MAILLARD_AW_WIDTH = 0.22;
/** Reducing-sugar mass (% of mix) at which reactant supply half-saturates. */
const REDUCING_SUGAR_HALF_SAT = 5;
/** Protein mass (% of mix) at which amino supply half-saturates. */
const PROTEIN_HALF_SAT = 3;
/** Reference batter the reactant factor is normalized against. */
const REF_REDUCING_SUGAR_PCT = 5;
const REF_PROTEIN_PCT = 8;

export type MaillardBand = 'none' | 'pale' | 'light' | 'golden' | 'deep' | 'dark';

export type MaillardFlag =
  | { kind: 'no_thermal_process' }
  | { kind: 'no_reducing_sugar' }
  | { kind: 'no_protein' };

export interface MaillardResult {
  /** Dimensionless browning potential (reaction-extent ratio); 1.0 ≈ the
   *  reference golden bake, unbounded above — a potential, not perceived color. */
  index: number;
  /** Perceived browning in [0,1), a saturating map of `index`
   *  (1 − exp(−index)); drives `band`. */
  colorSaturation: number;
  band: MaillardBand;
  /** Equivalent seconds at MAILLARD_REF_TEMP_C contributed by the profile. */
  cookValueS: number;
  /** [0,1] reactant availability (reducing sugar × protein), un-normalized. */
  reactantFactor: number;
  /** [0,1] water-activity suitability. */
  awFactor: number;
  flags: MaillardFlag[];
}

/** Reducing-sugar mass fraction (% of mix). Sucrose and sorbitol excluded. */
function reducingSugarPct(c: Composition): number {
  return (c.glucose ?? 0) + (c.fructose ?? 0) + (c.lactose ?? 0) + (c.maltose ?? 0);
}

/** Saturating (Michaelis-like) availability in [0,1). */
function saturating(x: number, halfSat: number): number {
  return x > 0 ? x / (x + halfSat) : 0;
}

/** Bell-shaped aw suitability peaking at the optimum, in (0,1]. */
function awSuitability(aw: number): number {
  const z = (aw - MAILLARD_AW_OPTIMUM) / MAILLARD_AW_WIDTH;
  return Math.exp(-0.5 * z * z);
}

const REF_REACTANT_FACTOR =
  saturating(REF_REDUCING_SUGAR_PCT, REDUCING_SUGAR_HALF_SAT) *
  saturating(REF_PROTEIN_PCT, PROTEIN_HALF_SAT);

/** Bands on perceived color (colorSaturation), since visual browning saturates. */
function classifyBand(colorSaturation: number, hasThermalProcess: boolean): MaillardBand {
  if (!hasThermalProcess || colorSaturation <= 0) return 'none';
  if (colorSaturation < 0.04) return 'pale';
  if (colorSaturation < 0.35) return 'light';
  if (colorSaturation < 0.8) return 'golden';
  if (colorSaturation < 0.95) return 'deep';
  return 'dark';
}

/**
 * Compute Maillard browning potential. `aw` is the mix water activity (from the
 * Norrish kernel); `profile` is the bake/cook timeline (from buildProcessProfile).
 */
export function computeMaillardBrowning(
  composition: Composition,
  aw: number,
  profile: ProcessProfile,
): MaillardResult {
  const flags: MaillardFlag[] = [];

  const cookValueS = accumulateThermalExtent(profile, zValueRate(MAILLARD_REF_TEMP_C, MAILLARD_Z_C));
  const hasThermalProcess = cookValueS > 0;
  if (!hasThermalProcess) flags.push({ kind: 'no_thermal_process' });
  const thermal = cookValueS / MAILLARD_REF_DURATION_S;

  const rs = reducingSugarPct(composition);
  const protein = composition.protein ?? 0;
  if (rs <= 0) flags.push({ kind: 'no_reducing_sugar' });
  if (protein <= 0) flags.push({ kind: 'no_protein' });
  const reactantFactor = saturating(rs, REDUCING_SUGAR_HALF_SAT) * saturating(protein, PROTEIN_HALF_SAT);

  const awFactor = awSuitability(aw);

  const index = thermal * (reactantFactor / REF_REACTANT_FACTOR) * awFactor;
  const colorSaturation = 1 - Math.exp(-index);

  return {
    index,
    colorSaturation,
    band: classifyBand(colorSaturation, hasThermalProcess),
    cookValueS,
    reactantFactor,
    awFactor,
    flags,
  };
}
