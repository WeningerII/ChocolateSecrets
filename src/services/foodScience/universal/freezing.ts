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
 * Electrolytes (NaCl etc.) are not yet modeled — the Norrish solute set is
 * non-dissociating. Adding salt means extending FREEZING_ACTIVE with a van 't
 * Hoff factor; sweet frozen desserts are fully covered without it.
 */

/** Cryoscopic constant of water, °C·kg/mol. */
export const KF_WATER = 1.86;

export type FreezingFlag =
  | { kind: 'no_water' }
  | { kind: 'no_freezing_solutes' };

export interface FreezingResult {
  /** Initial freezing point of the serum, °C (≤ 0). null when there is no water. */
  initialFreezingPointC: number | null;
  /** Freezing-active osmotic moles (van 't Hoff i = 1 for the Norrish solutes). */
  osmoticMoles: number;
  /** Grams of water in the serum. */
  waterMass: number;
  /** Fraction (0..1) of the water frozen at a given temperature (°C). */
  frozenFractionAt: (tempC: number) => number;
  /** Inverse: temperature (°C) yielding a target frozen fraction. null if unattainable. */
  tempForFrozenFraction: (frac: number) => number | null;
  flags: FreezingFlag[];
}

const FREEZING_SOLUTES = NORRISH_SPECIES.filter((s) => s !== 'water');

/**
 * Compute the freezing curve from aqueous solute masses (the `massBy` map the
 * Norrish kernel emits: species → grams, water included).
 */
export function computeFreezing(massBy: Record<string, number>): FreezingResult {
  const waterMass = massBy.water ?? 0;
  const flags: FreezingFlag[] = [];

  let osmoticMoles = 0;
  for (const sp of FREEZING_SOLUTES) {
    const m = massBy[sp] ?? 0;
    const mw = MOLECULAR_WEIGHTS[sp];
    if (m > 0 && mw) osmoticMoles += m / mw; // van 't Hoff i = 1 for sugars/polyols/ethanol
  }

  if (waterMass <= 0) {
    return {
      initialFreezingPointC: null,
      osmoticMoles,
      waterMass: 0,
      frozenFractionAt: () => 0,
      tempForFrozenFraction: () => null,
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

  return {
    initialFreezingPointC: tf0,
    osmoticMoles,
    waterMass,
    frozenFractionAt,
    tempForFrozenFraction,
    flags,
  };
}
