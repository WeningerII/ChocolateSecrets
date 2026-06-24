/**
 * temper — bring chocolate into its Form-V (stable β) crystal window. Tempering
 * is the temperature choreography that seeds the right cocoa-butter polymorph so
 * the chocolate sets glossy, snaps, and resists bloom. The working window depends
 * on cocoa %, and this step holds the chocolate at a chosen temperature and
 * reports whether that temperature lands inside the Form-V window.
 *
 * Sets the state temperature to the hold temperature (defaults to the window's
 * working point) and records the window and whether it's in temper. Composition
 * is unchanged (tempering is a crystallization, not a composition change). Reuses
 * the polymorph window kernel.
 *
 * Cocoa % is a parameter: the composition lumps "fat", so it can't be read from
 * the state. Calibrated (temper tables: Hartel; Beckett).
 */
import type { Operator } from './pipeline';
import { polymorphWindowForCocoa } from '../confectionery';

export interface TemperParams {
  /** Cocoa solids + butter percentage of the chocolate. */
  cocoaPercentage: number;
  /** Hold temperature (°C); defaults to the window's working point. */
  tempC?: number;
}

export function temper(params: TemperParams): Operator {
  return (state) => {
    const win = polymorphWindowForCocoa(params.cocoaPercentage);
    const [lo, hi] = win.tempWindowC;
    const holdC = params.tempC ?? win.workingPointC;
    const inWindow = holdC >= lo && holdC <= hi;

    const markers = { ...state.markers };
    markers.temperWorkingPointC = win.workingPointC;
    markers.temperWindowLowC = lo;
    markers.temperWindowHighC = hi;
    markers.temperInWindow = inWindow ? 1 : 0;

    return {
      // Temperature is set to the hold; composition unchanged (a crystallization).
      state: { ...state, tempC: holdC, markers },
      log: {
        operator: 'temper',
        detail: {
          chocolateClass: win.chocolateClass,
          cocoaPct: Math.round(win.cocoaPercentage),
          holdTempC: Math.round(holdC * 10) / 10,
          workingPointC: win.workingPointC,
          inWindow: inWindow ? 1 : 0,
          ...(inWindow ? {} : { flag: 'out_of_temper' }),
        },
      },
    };
  };
}
