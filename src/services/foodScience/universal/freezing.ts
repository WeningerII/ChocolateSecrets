import { MOLECULAR_WEIGHTS, NORRISH_SPECIES } from './norrish';

/**
 * Freezing-curve / ice-fraction model for aqueous mixes (ideal colligative).
 *
 * As temperature drops below the serum's initial freezing point, water freezes
 * out as pure ice, concentrating the remaining unfrozen serum until its
 * freezing point equals the temperature. Solving that equilibrium for the ideal
 * (van 't Hoff) case collapses to a closed form:
 *
 *   Tf0  = -Kf · N_eff · 1000 / W            (initial freezing point, °C)
 *   φ(T) = 1 − Tf0 / T        for T ≤ Tf0    (fraction of water frozen)
 *
 * where N_eff is the freezing-active osmotic moles (sugars/polyols/ethanol;
 * van 't Hoff i = 1 for all of these — the Norrish solute set), W is water mass
 * (g), and Kf is the cryoscopic constant of water.
 *
 * This is the texture-causal coordinate the band heuristics only approximate:
 * eating hardness tracks the ice-phase volume at serving temperature. The sugar
 * contributions are exactly colligative (cross-validated against Wolfram), so
 * this reuses the same aqueous masses (`massBy`) the Norrish kernel produces —
 * no separate composition pass, and ethanol retention is already applied.
 *
 * Electrolytes (NaCl) are added via the optional `sodiumMass` input: sodium is
 * treated as NaCl and contributes 2 osmotic moles per mole Na (van 't Hoff
 * i = 2). Sweet frozen desserts (sodium ≈ 0) are unaffected.
 */

/** Cryoscopic constant of water, °C·kg/mol. */
export const KF_WATER = 1.86;

/** Molar mass of sodium, g/mol. */
const SODIUM_MOLAR_MASS = 22.99;
/** van 't Hoff factor for NaCl (full dissociation into Na⁺ + Cl⁻). */
const VAN_T_HOFF_NACL = 2;

export type FreezingFlag =
  | { kind: 'no_water' }
  | { kind: 'no_freezing_solutes' };

export interface FreezingResult {
  /** Initial freezing point of the serum, °C (≤ 0). null when there is no water. */
  initialFreezingPointC: number | null;
  /** Freezing-active osmotic moles (Norrish solutes at i = 1, plus any NaCl at i = 2). */
  osmoticMoles: number;
  /** Grams of water in the serum. */
  waterMass: number;
  /** Fraction (0..1) of the water frozen at a given temperature (°C). */
  frozenFractionAt: (tempC: number) => number;
  /** Inverse: temperature (°C) yielding a target frozen fraction. null if unattainable. */
  tempForFrozenFraction: (frac: number) => number | null;
  /** Dissolved-solute mass (g) — the colligative solutes that concentrate in the serum. */
  soluteMass: number;
  /**
   * Mass fraction of dissolved solute in the UNFROZEN serum at a given temperature.
   * As ice forms the serum concentrates (→ 1 as T falls); past the dilute limit
   * (~⅔) the ideal van 't Hoff curve over-predicts the frozen fraction, because the
   * real concentrated serum depresses its freezing point far more than ideal.
   */
  serumSoluteMassFractionAt: (tempC: number) => number;
  flags: FreezingFlag[];
}

const FREEZING_SOLUTES = NORRISH_SPECIES.filter((s) => s !== 'water');

/**
 * Compute the freezing curve from aqueous solute masses (the `massBy` map the
 * Norrish kernel emits: species → grams, water included).
 */
export function computeFreezing(
  massBy: Record<string, number>,
  opts: { sodiumMass?: number } = {},
): FreezingResult {
  const waterMass = massBy.water ?? 0;
  const flags: FreezingFlag[] = [];

  let osmoticMoles = 0;
  let soluteMass = 0;
  for (const sp of FREEZING_SOLUTES) {
    const m = massBy[sp] ?? 0;
    if (m <= 0) continue;
    soluteMass += m;
    const mw = MOLECULAR_WEIGHTS[sp];
    if (mw) osmoticMoles += m / mw; // van 't Hoff i = 1 for sugars/polyols/ethanol
  }
  // Electrolyte term: sodium (treated as NaCl) dissociates into two ions, so it
  // contributes 2 osmotic moles per mole Na (van 't Hoff i = 2).
  const sodiumMass = opts.sodiumMass ?? 0;
  if (sodiumMass > 0) {
    soluteMass += sodiumMass;
    osmoticMoles += (VAN_T_HOFF_NACL * sodiumMass) / SODIUM_MOLAR_MASS;
  }

  if (waterMass <= 0) {
    return {
      initialFreezingPointC: null,
      osmoticMoles,
      waterMass: 0,
      frozenFractionAt: () => 0,
      tempForFrozenFraction: () => null,
      soluteMass,
      serumSoluteMassFractionAt: () => 0,
      flags: [{ kind: 'no_water' }],
    };
  }

  if (osmoticMoles <= 0) flags.push({ kind: 'no_freezing_solutes' });

  // Tf0 = -Kf · molality;  molality = osmoticMoles / (waterMass/1000)
  const rawTf0 = (-KF_WATER * osmoticMoles) / (waterMass / 1000); // ≤ 0
  const tf0 = rawTf0 === 0 ? 0 : rawTf0; // normalize -0 → +0 (pure-water case)

  const frozenFractionAt = (tempC: number): number => {
    if (tempC >= 0) return 0;
    if (tf0 === 0) return 1; // pure water: fully frozen below 0 °C
    if (tempC >= tf0) return 0; // warmer than the initial freezing point: no ice
    const phi = 1 - tf0 / tempC; // both negative → phi ∈ (0,1)
    return Math.min(1, Math.max(0, phi));
  };

  const tempForFrozenFraction = (frac: number): number | null => {
    if (frac <= 0) return tf0; // ice begins at the initial freezing point
    if (tf0 === 0) return 0; // pure water freezes at 0 °C
    if (frac >= 1) return null; // 100% frozen is only an asymptote for solute mixes
    return tf0 / (1 - frac);
  };

  const serumSoluteMassFractionAt = (tempC: number): number => {
    const phi = frozenFractionAt(tempC);
    const serumWater = waterMass * (1 - phi);
    const denom = soluteMass + serumWater;
    return denom > 0 ? soluteMass / denom : 0;
  };

  return {
    initialFreezingPointC: tf0,
    osmoticMoles,
    waterMass,
    frozenFractionAt,
    tempForFrozenFraction,
    soluteMass,
    serumSoluteMassFractionAt,
    flags,
  };
}
