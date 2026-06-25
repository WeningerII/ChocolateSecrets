/**
 * heat — a thermal step that holds the food at a temperature for a time and
 * accumulates what heat actually does, over the T·time it's applied:
 *
 *   - lethality F: pasteurization/cook safety as equivalent minutes at 70 °C,
 *     F += t · 10^((T − 70)/z), z = 7.5 °C (the z-value / Pasteurization-Unit
 *     model — each 7.5 °C is a 10× faster kill). F70 ≳ 2 min ≈ a 6-log kill of
 *     Listeria. Verified against Wolfram's PasteurUnits formula.
 *   - Maillard browning: an Arrhenius extent in "equivalent minutes at 180 °C",
 *     accruing only when both a reducing sugar and protein are present (the two
 *     reactants), Ea ≈ 100 kJ/mol.
 *
 * Both accumulate across steps (so a sear then a rest, or staged cooking, sum
 * correctly), and the step advances the state's temperature and clock. Lethality
 * is first-principles (z-value); the browning rate is calibrated (representative
 * Ea; aw modulation lives in the dedicated Maillard kernel). This operator marks
 * extents — it does not consume the trace substrate browning uses.
 *
 * Sources: z-value / Pasteurization Units (Wolfram-verified); Arrhenius kinetics;
 * Maillard-browning activation energy (Labuza, food-kinetics literature).
 */
import type { Composition } from '../../../types';
import type { Operator } from './pipeline';

const TREF_LETHAL_C = 70;     // reference temperature for lethality F (°C)
const Z_LETHAL_C = 7.5;       // z-value (°C) for vegetative pathogens
// Upper validity of the z-value / Pasteurization-Unit model. It is anchored to
// moist-heat thermal-death-time data for vegetative pathogens (~55–130 °C). Past
// this, a log-linear extrapolation is meaningless — at 200 °C dry roasting it gave
// F70 ≈ 4×10¹⁸ equiv-min (silently), so above the ceiling we flag and don't accrue.
const TMAX_LETHAL_C = 130;
const EA_MAILLARD = 100_000;  // J·mol⁻¹ (representative)
const R = 8.314;              // J·mol⁻¹·K⁻¹
const TREF_BROWN_K = 453.15;  // 180 °C reference for browning equivalents

const REDUCING_SUGARS: (keyof Composition)[] = ['glucose', 'fructose', 'maltose', 'lactose'];

export interface HeatParams {
  tempC: number;
  durationS: number;
}

export function heat(params: HeatParams): Operator {
  return (state) => {
    const { tempC: T, durationS } = params;
    const minutes = durationS / 60;

    // Lethality F (equivalent minutes at 70 °C) via the z-value model — only within
    // its validity range; above TMAX_LETHAL_C the extrapolation is non-physical.
    const lethalInDomain = T <= TMAX_LETHAL_C;
    const lethalThisStep = lethalInDomain ? minutes * Math.pow(10, (T - TREF_LETHAL_C) / Z_LETHAL_C) : 0;

    // Maillard browning: Arrhenius extent in equivalent minutes at 180 °C, but
    // only where both reactants exist (a reducing sugar AND protein).
    const reducingSugar = REDUCING_SUGARS.reduce((s, sp) => s + (state.composition[sp] ?? 0), 0);
    const protein = state.composition.protein ?? 0;
    let brownThisStep = 0;
    if (reducingSugar > 0 && protein > 0) {
      const Tk = T + 273.15;
      const k = Math.exp(-(EA_MAILLARD / R) * (1 / Tk - 1 / TREF_BROWN_K)); // 1 at 180 °C
      brownThisStep = minutes * k;
    }

    const markers = { ...state.markers };
    markers.lethalityF70Min = (markers.lethalityF70Min ?? 0) + lethalThisStep;
    markers.browningEquivMin180 = (markers.browningEquivMin180 ?? 0) + brownThisStep;

    return {
      state: { ...state, tempC: T, timeS: state.timeS + durationS, markers },
      log: {
        operator: 'heat',
        detail: {
          tempC: Math.round(T), minutes: Math.round(minutes * 10) / 10,
          lethalityF70Min: Math.round(markers.lethalityF70Min * 100) / 100,
          browningEquivMin180: Math.round(markers.browningEquivMin180 * 100) / 100,
          ...(lethalInDomain ? {} : { flag: 'lethality_out_of_domain' }),
        },
      },
    };
  };
}
