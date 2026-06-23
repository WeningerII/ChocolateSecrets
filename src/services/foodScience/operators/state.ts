/**
 * FoodState — the value an operator transforms. The engine's whole premise is
 * that a recipe is a PROGRAM: a sequence of unit operations, each a pure
 * state → state transform, threaded through an evolving food state. Until now the
 * kernels read a single equilibrium snapshot; this lets composition, mass and
 * temperature actually evolve step by step (ferment → rest → bake → chill), with
 * every downstream readout (a_w, taste, colligative) seeing the result.
 *
 * State is carried as composition (mass %) plus total mass, so operators can do
 * honest mass balance: convert to grams, transform, convert back. `markers` hold
 * derived, non-composition facts an operator accumulates (CO₂ lost, fermentation
 * extent, …) for later operators and the UI to read.
 */
import type { Composition } from '../../../types';
import { COMPOSITION_SPECIES, COMPOSITION_DESCRIPTORS } from '../universal';

export interface FoodState {
  /** Mass-fraction composition (%). */
  composition: Composition;
  /** Total mass (g) — changes when an operator adds/removes mass (CO₂, water). */
  massG: number;
  /** Current temperature (°C). */
  tempC: number;
  /** Elapsed process time (s). */
  timeS: number;
  /** Accumulated non-composition facts (extent, CO₂ lost, …). */
  markers: Record<string, number>;
}

const ALL_SPECIES = [...COMPOSITION_SPECIES, ...COMPOSITION_DESCRIPTORS];

/** Absolute grams of every species in the state. */
export function speciesMassesG(state: FoodState): Partial<Record<keyof Composition, number>> {
  const out: Partial<Record<keyof Composition, number>> = {};
  for (const sp of ALL_SPECIES) {
    const pct = state.composition[sp];
    if (pct) out[sp] = (pct / 100) * state.massG;
  }
  return out;
}

/** Rebuild a mass-% composition from absolute species grams and a total mass. */
export function massesToComposition(
  massesG: Partial<Record<keyof Composition, number>>,
  totalG: number,
): Composition {
  const out: Composition = {};
  if (totalG <= 0) return out;
  for (const sp of ALL_SPECIES) {
    const g = massesG[sp];
    if (g && g > 0) out[sp] = (g / totalG) * 100;
  }
  return out;
}

/** Build an initial state from a recipe's mix composition and mass. */
export function makeFoodState(composition: Composition, massG: number, tempC = 20): FoodState {
  return { composition, massG, tempC, timeS: 0, markers: {} };
}
