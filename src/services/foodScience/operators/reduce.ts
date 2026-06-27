/**
 * reduce — evaporative concentration. Simmering a sauce, boiling a syrup, cooking
 * down a jam: water leaves, every solute concentrates, and the knock-on effects
 * ripple through the chemistry — water activity falls (preservation), sugar climbs
 * toward saturation (graining), the boiling point rises, flavors intensify.
 *
 * Modeled as a mass-balance transform: remove water to a target (a fraction of the
 * current water, or "reduce to X of the mass"), bounded by the water actually
 * present. Everything non-water is conserved, so its mass fraction rises by the
 * concentration factor. The amount removed is taken as an input (how cooks think —
 * "reduce by half") rather than simulated; the drying-rate kernel can supply the
 * time it takes when a surface area is known.
 */
import type { Operator } from './pipeline';
import { speciesMassesG, massesToComposition } from './state';

export interface ReduceParams {
  /** Reduce total mass to this fraction of current (0.5 = "reduce by half"). */
  toMassFraction?: number;
  /** Or remove this fraction of the current water (0..1). */
  removeWaterFraction?: number;
  /** Temperature this happens at (e.g. simmer); defaults to the current state. */
  tempC?: number;
}

export type ReduceFlag = { kind: 'water_limited' }; // asked to remove more water than present

export function reduce(params: ReduceParams): Operator {
  return (state) => {
    const masses = speciesMassesG(state);
    const waterG = masses.water ?? 0;
    const T = params.tempC ?? state.tempC;

    let targetRemoveG: number;
    if (params.toMassFraction !== undefined) {
      targetRemoveG = state.massG * (1 - Math.max(0, Math.min(1, params.toMassFraction)));
    } else if (params.removeWaterFraction !== undefined) {
      targetRemoveG = waterG * Math.max(0, Math.min(1, params.removeWaterFraction));
    } else {
      targetRemoveG = 0;
    }

    const flags: ReduceFlag[] = [];
    let removeG = targetRemoveG;
    if (removeG > waterG) { removeG = waterG; flags.push({ kind: 'water_limited' }); }

    const waterFractionRemoved = waterG > 0 ? removeG / waterG : 0;
    masses.water = waterG - removeG;

    // Ethanol co-evaporates with water (bp 78 °C): when simmering wine or beer,
    // ethanol is always present in the vapour phase. Retention ≈ 0.55 means
    // ~45 % of the ethanol in each "fraction" of water evaporated escapes too.
    const ethanolG = masses.ethanol ?? 0;
    const ETHANOL_RETENTION = 0.55;
    const ethanolLostG = ethanolG * (1 - ETHANOL_RETENTION) * waterFractionRemoved;
    masses.ethanol = Math.max(0, ethanolG - ethanolLostG);

    const totalRemovedG = removeG + ethanolLostG;
    const newMass = Math.max(0, state.massG - totalRemovedG);
    const composition = massesToComposition(masses, newMass);

    const markers = { ...state.markers };
    markers.waterRemovedG = (markers.waterRemovedG ?? 0) + removeG;
    markers.ethanolLostG = (markers.ethanolLostG ?? 0) + ethanolLostG;
    markers.concentrationFactor = state.massG > 0 ? state.massG / Math.max(1e-9, newMass) : 1;

    return {
      state: { composition, massG: newMass, tempC: T, timeS: state.timeS, markers },
      log: {
        operator: 'reduce',
        detail: {
          tempC: Math.round(T),
          waterRemovedG: Math.round(removeG * 10) / 10,
          concentrationFactor: Math.round(markers.concentrationFactor * 100) / 100,
          ...(flags.length ? { flag: flags[0].kind } : {}),
        },
      },
    };
  };
}
