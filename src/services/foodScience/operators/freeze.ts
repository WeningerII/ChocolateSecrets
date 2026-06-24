/**
 * freeze / thaw — take the food through the phase change. Blast-freezing a
 * tray, hardening ice cream, thawing a roast. This wraps two kernels into one
 * step:
 *   - Plank's moving-boundary equation for the freezing/thawing TIME (latent
 *     heat conducted out through the frozen shell, across the surface film), and
 *   - the colligative freezing curve for the equilibrium ICE FRACTION reached at
 *     the target temperature — the texture-causal coordinate (hardness tracks
 *     ice-phase volume at serving temperature).
 *
 * The state's temperature is set to the target and the clock advances by the
 * Plank time. Composition is unchanged: freezing is a physical phase change, not
 * a chemical one (the ice/serum split is reported as a marker, not as a
 * composition change).
 *
 * First-principles. Plank deliberately neglects sensible heat (a first estimate,
 * so real times run a little longer; thawing is slower than the mirror freeze).
 * Source: Plank (1913/1941); Singh & Heldman; ideal colligative ice fraction.
 */
import type { Operator } from './pipeline';
import { computePlankTime, type Geometry, type PlankMode } from '../transport';
import { computeFreezing } from '../universal';

export type FreezeFlag =
  | { kind: 'medium_not_freezing' }
  | { kind: 'medium_not_thawing' }
  | { kind: 'no_freezing_point' };

export interface FreezeParams {
  geometry: Geometry;
  /** Characteristic dimension a [m]: full thickness (slab) or diameter (cyl/sphere). */
  characteristicDimensionM: number;
  /** Freezer/thaw medium temperature [°C]. */
  mediumTempC: number;
  /** Surface coefficient h [W·m⁻²·K⁻¹] — e.g. from computeSurfaceCoefficient. */
  surfaceCoeffWm2K: number;
  mode?: PlankMode; // 'freeze' (default) | 'thaw'
  /** Final product temperature for the ice fraction; defaults to the medium temp. */
  targetTempC?: number;
}

export function freeze(params: FreezeParams): Operator {
  return (state) => {
    const mode = params.mode ?? 'freeze';
    const targetTempC = params.targetTempC ?? params.mediumTempC;

    const plank = computePlankTime({
      geometry: params.geometry,
      characteristicDimensionM: params.characteristicDimensionM,
      composition: state.composition,
      mediumTempC: params.mediumTempC,
      surfaceCoeffWm2K: params.surfaceCoeffWm2K,
      mode,
    });

    // Equilibrium ice fraction at the target temperature (intensive: % or g both work).
    const frz = computeFreezing(state.composition as Record<string, number>, {
      sodiumMass: state.composition.sodium,
    });
    const iceFraction = frz.frozenFractionAt(targetTempC);

    const timeS = plank?.timeS ?? null;
    const markers = { ...state.markers };
    if (timeS != null) markers.freezingTimeS = timeS;
    if (plank) markers.freezingPointC = plank.freezingPointC;
    markers.iceFractionAtTarget = iceFraction;

    const flag = plank?.flags.find(
      (f) => f.kind === 'medium_not_freezing' || f.kind === 'medium_not_thawing' || f.kind === 'no_freezing_point',
    );

    return {
      // Phase change is physical: composition unchanged; temperature reaches the target.
      state: { ...state, tempC: targetTempC, timeS: state.timeS + (timeS ?? 0), markers },
      log: {
        operator: mode === 'thaw' ? 'thaw' : 'freeze',
        detail: {
          mediumTempC: Math.round(params.mediumTempC),
          targetTempC: Math.round(targetTempC),
          freezingPointC: plank ? Math.round(plank.freezingPointC * 10) / 10 : 0,
          iceFractionAtTarget: Math.round(iceFraction * 100) / 100,
          ...(timeS != null ? { timeMin: Math.round(timeS / 60) } : {}),
          ...(flag ? { flag: flag.kind } : {}),
        },
      },
    };
  };
}
