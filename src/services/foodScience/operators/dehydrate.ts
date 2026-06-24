/**
 * dehydrate — convective drying. A dehydrator, a low oven, air-drying: warm dry
 * air blows over the food and water evaporates. This is reduce's physics-driven
 * sibling — instead of being told how much water to remove, the amount is
 * COMPUTED from the drying rate over the run time.
 *
 * While the surface is wet (the constant-rate period) it sits at the wet-bulb
 * temperature and every watt of convective heat goes into evaporation, not
 * warming the food:
 *
 *   flux N      = h·(T_air − T_wb) / ΔH_vap      [kg·m⁻²·s⁻¹]
 *   removed     = N · area · time
 *   surface T   = T_wb                            (evaporative cooling)
 *
 * Water leaves by mass balance, every solute concentrates (a_w falls, sugar
 * climbs), and the state's temperature is set to the wet bulb — why a roast's
 * surface lags until it dries out and browns.
 *
 * First-principles (heat–mass analogy, Wolfram-validated). Constant-rate period
 * only: once the surface dries, internal moisture diffusion governs and the food
 * warms toward the air — not modeled here (the falling-rate period).
 */
import type { Operator } from './pipeline';
import { speciesMassesG, massesToComposition } from './state';
import { computeDryingRate } from '../transport';

export type DehydrateFlag =
  | { kind: 'saturated_air' }  // RH ≈ 100 %: no evaporation
  | { kind: 'water_limited' }; // dried out within the run (constant-rate ended)

export interface DehydrateParams {
  airTempC: number;
  /** Relative humidity 0..1. */
  relativeHumidity: number;
  /** Surface coefficient h [W·m⁻²·K⁻¹] — from computeSurfaceCoefficient or a method. */
  surfaceCoeffWm2K: number;
  /** Evaporating surface area [m²]. */
  surfaceAreaM2: number;
  durationS: number;
  pressurePa?: number;
}

export function dehydrate(params: DehydrateParams): Operator {
  return (state) => {
    const dry = computeDryingRate({
      airTempC: params.airTempC,
      relativeHumidity: params.relativeHumidity,
      surfaceCoeffWm2K: params.surfaceCoeffWm2K,
      pressurePa: params.pressurePa,
    });

    const masses = speciesMassesG(state);
    const waterG = masses.water ?? 0;

    const flags: DehydrateFlag[] = [];
    let removeG = 0;
    let wetBulbC = state.tempC;
    let fluxKgM2h = 0;
    if (dry) {
      wetBulbC = dry.surfaceTempC;
      fluxKgM2h = dry.fluxKgM2h;
      removeG = dry.fluxKgM2s * params.surfaceAreaM2 * params.durationS * 1000; // kg → g
      if (dry.flags.some((f) => f.kind === 'saturated_air')) flags.push({ kind: 'saturated_air' });
    }
    if (removeG > waterG) {
      removeG = waterG;
      flags.push({ kind: 'water_limited' });
    }

    masses.water = waterG - removeG;
    const newMass = Math.max(0, state.massG - removeG);
    const composition = massesToComposition(masses, newMass);

    const markers = { ...state.markers };
    markers.waterRemovedG = (markers.waterRemovedG ?? 0) + removeG;
    markers.dryingWetBulbC = wetBulbC;
    markers.dryingFluxKgM2h = fluxKgM2h;
    markers.concentrationFactor = state.massG > 0 ? state.massG / Math.max(1e-9, newMass) : 1;

    return {
      // Surface holds at the wet bulb during the constant-rate period.
      state: { ...state, composition, massG: newMass, tempC: wetBulbC, timeS: state.timeS + params.durationS, markers },
      log: {
        operator: 'dehydrate',
        detail: {
          airTempC: Math.round(params.airTempC),
          wetBulbC: Math.round(wetBulbC),
          fluxKgM2h: Math.round(fluxKgM2h * 1000) / 1000,
          waterRemovedG: Math.round(removeG * 10) / 10,
          ...(flags.length ? { flag: flags[0].kind } : {}),
        },
      },
    };
  };
}
