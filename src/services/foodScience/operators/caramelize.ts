/**
 * caramelize — sugar pyrolysis. Distinct from Maillard: no amino acids needed,
 * and it only switches on near sugar's melting point (~160–170 °C; sucrose melts
 * at 169.5 °C). Above the threshold it develops caramel color and flavor steeply,
 * an Arrhenius process with a high activation energy.
 *
 * Modeled as an accumulating extent in "equivalent minutes at 180 °C" (the same
 * device as the heat operator's browning), gated on a sugar being present and on
 * T ≥ ~160 °C. It marks color/flavor development rather than fabricating the
 * messy caramel product stoichiometry. Calibrated (representative Ea); the
 * temperature steepness and threshold are Wolfram-grounded.
 *
 * Source: caramelization onset vs sucrose melting (Wolfram); Arrhenius kinetics.
 */
import type { Composition } from '../../../types';
import type { Operator } from './pipeline';

const EA_CARAMEL = 150_000; // J·mol⁻¹ (steep)
const R = 8.314;
const TREF_K = 453.15;      // 180 °C reference

// Per-species caramelization onset temperatures. Fructose caramelizes near its
// melting point (~110 °C), well below the 160–170 °C onset of sucrose/glucose.
const SUGAR_ONSET: Partial<Record<keyof Composition, number>> = {
  fructose: 110,
  maltose:  150,
  glucose:  160,
  sucrose:  170,
} as const;

export interface CaramelizeParams {
  tempC: number;
  durationS: number;
}

export function caramelize(params: CaramelizeParams): Operator {
  return (state) => {
    const { tempC: T, durationS } = params;
    const minutes = durationS / 60;

    // Sum only the sugars whose per-species onset the current temperature exceeds.
    let activeSugar = 0;
    for (const [sp, onset] of Object.entries(SUGAR_ONSET) as [keyof Composition, number][]) {
      if (T >= onset) activeSugar += state.composition[sp] ?? 0;
    }

    let extentThisStep = 0;
    if (activeSugar > 0) {
      const k = Math.exp(-(EA_CARAMEL / R) * (1 / (T + 273.15) - 1 / TREF_K)); // 1 at 180 °C
      extentThisStep = minutes * k;
    }

    const markers = { ...state.markers };
    markers.caramelEquivMin180 = (markers.caramelEquivMin180 ?? 0) + extentThisStep;

    return {
      state: { ...state, tempC: T, timeS: state.timeS + durationS, markers },
      log: {
        operator: 'caramelize',
        detail: {
          tempC: Math.round(T), minutes: Math.round(minutes * 10) / 10,
          activeSugarPct: Math.round(activeSugar * 10) / 10,
          caramelEquivMin180: Math.round(markers.caramelEquivMin180 * 100) / 100,
        },
      },
    };
  };
}
