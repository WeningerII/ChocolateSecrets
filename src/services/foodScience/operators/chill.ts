/**
 * chill — cool the food to a temperature. Cooling is where structure sets:
 * fat crystallizes, gels firm, and — the effect modeled here — a saturated sugar
 * syrup turns grainy, because sucrose solubility falls as it cools and the syrup
 * becomes supersaturated. So a fudge or caramel cooled too far (or undisturbed)
 * graining is a cooling phenomenon, and chill computes that graining risk at the
 * new, lower temperature (reusing the crystallization kernel).
 *
 * Threads the state's temperature and clock; the composition is unchanged (a
 * physical, not chemical, step).
 */
import type { Operator } from './pipeline';
import { computeSucroseCrystallization } from '../universal';

export interface ChillParams {
  tempC: number;
  durationS?: number;
}

export function chill(params: ChillParams): Operator {
  return (state) => {
    const cryst = computeSucroseCrystallization(state.composition, params.tempC);
    const markers = { ...state.markers };
    markers.grainingSupersaturation = cryst.supersaturationRatio;

    return {
      state: { ...state, tempC: params.tempC, timeS: state.timeS + (params.durationS ?? 0), markers },
      log: {
        operator: 'chill',
        detail: {
          tempC: Math.round(params.tempC),
          grainingRisk: cryst.risk,
          supersaturation: Math.round(cryst.supersaturationRatio * 100) / 100,
        },
      },
    };
  };
}
