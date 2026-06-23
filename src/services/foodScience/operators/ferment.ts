/**
 * ferment — the flagship operator. Yeast consumes fermentable sugar and produces
 * ethanol + CO₂ (Gay-Lussac), over time, at a rate that depends on temperature.
 * Because ethanol is already a tracked composition species and CO₂ leaves as gas,
 * the transform is honest mass balance and every downstream kernel (a_w via the
 * ethanol Norrish term, taste, colligative) automatically sees the result — and
 * the CO₂ lost is the leavening/carbonation.
 *
 * Kinetics: fermentable sugar is consumed first-order toward the culture's
 * maximum conversion, at rate μ_eff = μ_max · γ(T), where γ(T) is the Rosso
 * cardinal-temperature model (1 at the optimum, 0 at the cardinal min/max). The
 * stoichiometry (0.511 g ethanol + 0.489 g CO₂ per g sugar) is first-principles;
 * the rate constants and cardinal temperatures are representative published values
 * per culture (calibrated), and the first-order form is a deliberate
 * simplification of the real lag/exponential/stationary curve.
 *
 * Lactic/heterofermentative cultures need an organic-acid composition species
 * (and feed the pH/sour layer); those land in a follow-up.
 *
 * Sources: Gay-Lussac fermentation stoichiometry; Rosso et al. cardinal
 * temperature model (CTMI); representative S. cerevisiae / S. pastorianus growth
 * parameters. Stoichiometry verified in Wolfram.
 */
import type { Composition } from '../../../types';
import type { Operator } from './pipeline';
import { speciesMassesG, massesToComposition } from './state';

export type Culture = 'ale_yeast' | 'lager_yeast' | 'wine_yeast';

interface CultureProfile {
  /** First-order sugar-consumption rate at the optimum (h⁻¹). */
  muMaxPerH: number;
  tempMinC: number;
  tempOptC: number;
  tempMaxC: number;
  /** Fraction of fermentable sugar the culture can convert (attenuation limit). */
  maxConversion: number;
}

/** Representative published growth parameters (calibrated). */
const CULTURES: Record<Culture, CultureProfile> = {
  ale_yeast:   { muMaxPerH: 0.35, tempMinC: 4, tempOptC: 22, tempMaxC: 38, maxConversion: 0.95 },
  lager_yeast: { muMaxPerH: 0.20, tempMinC: 2, tempOptC: 12, tempMaxC: 30, maxConversion: 0.95 },
  wine_yeast:  { muMaxPerH: 0.30, tempMinC: 8, tempOptC: 25, tempMaxC: 35, maxConversion: 0.98 },
};

// Gay-Lussac: C₆H₁₂O₆ → 2 C₂H₅OH + 2 CO₂ (g per g sugar). Verified in Wolfram.
const ETHANOL_YIELD = 0.5114;
const CO2_YIELD = 0.4886;

/** Sugars yeast ferments (lactose excluded — needs lactase). */
const FERMENTABLE: (keyof Composition)[] = ['glucose', 'fructose', 'sucrose', 'maltose'];

/** Rosso cardinal-temperature model γ(T) ∈ [0,1]; 1 at T_opt, 0 outside [min,max]. */
export function rossoGamma(T: number, Tmin: number, Topt: number, Tmax: number): number {
  if (T <= Tmin || T >= Tmax) return 0;
  const num = (T - Tmax) * (T - Tmin) ** 2;
  const den = (Topt - Tmin) * ((Topt - Tmin) * (T - Topt) - (Topt - Tmax) * (Topt + Tmin - 2 * T));
  return den !== 0 ? num / den : 0;
}

export interface FermentParams {
  culture: Culture;
  durationS: number;
  /** Fermentation temperature; defaults to the current state temperature. */
  tempC?: number;
}

export function ferment(params: FermentParams): Operator {
  return (state) => {
    const prof = CULTURES[params.culture];
    const T = params.tempC ?? state.tempC;
    const gamma = rossoGamma(T, prof.tempMinC, prof.tempOptC, prof.tempMaxC);
    const muEff = prof.muMaxPerH * gamma;
    const hours = params.durationS / 3600;

    const masses = speciesMassesG(state);
    const fermentableG = FERMENTABLE.reduce((s, sp) => s + (masses[sp] ?? 0), 0);

    // The attenuation limit is an INERT floor of sugar the culture can't touch,
    // fixed when fermentation starts and persisted — so splitting one ferment into
    // several steps converges to the same total conversion (composability).
    const inertFloorG = state.markers.fermentInertFloorG ?? (1 - prof.maxConversion) * fermentableG;
    const consumableG = Math.max(0, fermentableG - inertFloorG);
    const stepFraction = 1 - Math.exp(-muEff * hours);
    const convertedG = consumableG * stepFraction;
    const reduceFrac = fermentableG > 0 ? convertedG / fermentableG : 0;

    // Consume fermentable sugars proportionally.
    for (const sp of FERMENTABLE) if (masses[sp]) masses[sp]! *= 1 - reduceFrac;

    // Produce ethanol (stays) and CO₂ (escapes → mass loss).
    masses.ethanol = (masses.ethanol ?? 0) + ETHANOL_YIELD * convertedG;
    const co2G = CO2_YIELD * convertedG;
    const newMass = Math.max(0, state.massG - co2G);

    const markers = { ...state.markers };
    markers.fermentInertFloorG = inertFloorG;
    markers.co2LostG = (markers.co2LostG ?? 0) + co2G;
    markers.fermentedSugarG = (markers.fermentedSugarG ?? 0) + convertedG;

    const composition = massesToComposition(masses, newMass);
    markers.ethanolPct = composition.ethanol ?? 0;

    return {
      state: { composition, massG: newMass, tempC: T, timeS: state.timeS + params.durationS, markers },
      log: {
        operator: 'ferment',
        detail: {
          culture: params.culture, tempC: Math.round(T), hours: Math.round(hours * 10) / 10,
          gamma: Math.round(gamma * 100) / 100,
          sugarConvertedG: Math.round(convertedG * 10) / 10,
          ethanolPct: Math.round((composition.ethanol ?? 0) * 100) / 100,
          co2LostG: Math.round(co2G * 10) / 10,
        },
      },
    };
  };
}
