/**
 * ferment — fermentation as a composable operator. A culture consumes fermentable
 * sugar and produces a spectrum of products (ethanol, CO₂, lactic/acetic acid)
 * over time, at a temperature-dependent rate. Every product that is a tracked
 * composition species (ethanol, lactic/acetic acid) flows straight into the
 * downstream readouts — ethanol into a_w/colligative, the acids into the sour
 * taste — and CO₂ escapes as the leavening/carbonation.
 *
 * Kinetics: fermentable sugar is consumed first-order toward the culture's
 * attenuation limit at rate μ_eff = μ_max · γ(T), with γ the Rosso cardinal
 * temperature model (1 at the optimum, 0 at the cardinal min/max). Product
 * stoichiometry is first-principles (Gay-Lussac for yeast; homo-/hetero-
 * fermentative pathways for LAB), verified in Wolfram. Rate constants and
 * cardinal temperatures are representative published values (calibrated). An
 * inert-floor marker makes the attenuation limit composable across steps.
 *
 * Sources: Gay-Lussac & lactic-fermentation stoichiometry; Rosso et al. CTMI;
 * representative S. cerevisiae / S. pastorianus / LAB growth parameters.
 */
import type { Composition } from '../../../types';
import type { Operator } from './pipeline';
import { speciesMassesG, massesToComposition } from './state';

export type Culture =
  | 'ale_yeast' | 'lager_yeast' | 'wine_yeast'   // ethanol fermentation
  | 'yogurt_lactic'                               // homofermentative LAB
  | 'sourdough'                                   // heterofermentative LAB + yeast
  | 'acetobacter';                                // acetic acid bacteria (vinegar)

/** Product species a culture yields (g per g sugar consumed). 'co2' escapes. */
type ProductSpecies = 'ethanol' | 'glycerol' | 'lacticAcid' | 'aceticAcid' | 'co2';

interface CultureProfile {
  muMaxPerH: number;
  tempMinC: number;
  tempOptC: number;
  tempMaxC: number;
  maxConversion: number;
  products: Partial<Record<ProductSpecies, number>>;
  /** LAB carry lactase and ferment lactose; yeast do not. */
  fermentsLactose?: boolean;
  /** Override the default fermentable-sugar substrate list (e.g. ethanol for acetobacter). */
  substrates?: (keyof Composition)[];
}

// Stoichiometry verified in Wolfram. Yeast CEILING: glucose → 2 EtOH + 2 CO₂
// (0.511/0.489 Gay-Lussac max). But the REALIZED ethanol yield is lower — yeast
// diverts ~5–8 % of sugar carbon to glycerol and biomass — so using the 0.511
// theoretical max as the realized yield over-predicts strength (a 22 °Bx must came
// out at an impossible ~15.6 % ABV). Calibrated to ~0.475 EtOH + ~0.035 glycerol
// (a tracked, colligatively-active byproduct) + ~0.49 CO₂ (≈0.55–0.59 ABV/°Bx).
// Homofermentative LAB: glucose → 2 lactate (1.0). Heterofermentative (sourdough):
// glucose → lactate + ethanol + CO₂ (0.50 / 0.256 / 0.244).
// Attenuation note: yeast ferment to near-dryness (0.95–0.98). Lactic acid
// bacteria SELF-INHIBIT as the pH falls (~pH 4.2–4.5), stalling long before the
// sugar runs out — yogurt converts only ~⅕ of milk lactose (→ ~0.8–1 % lactic
// acid), so yogurt_lactic's attenuation limit is ~0.20, not a yeast-like 0.9.
const CULTURES: Record<Culture, CultureProfile> = {
  ale_yeast:     { muMaxPerH: 0.35, tempMinC: 4,  tempOptC: 22, tempMaxC: 38, maxConversion: 0.95, products: { ethanol: 0.475, glycerol: 0.035, co2: 0.490 } },
  lager_yeast:   { muMaxPerH: 0.20, tempMinC: 2,  tempOptC: 12, tempMaxC: 30, maxConversion: 0.95, products: { ethanol: 0.475, glycerol: 0.035, co2: 0.490 } },
  wine_yeast:    { muMaxPerH: 0.30, tempMinC: 8,  tempOptC: 25, tempMaxC: 35, maxConversion: 0.98, products: { ethanol: 0.475, glycerol: 0.035, co2: 0.490 } },
  yogurt_lactic: { muMaxPerH: 0.50, tempMinC: 15, tempOptC: 42, tempMaxC: 52, maxConversion: 0.20, products: { lacticAcid: 1.0 }, fermentsLactose: true },
  sourdough:     { muMaxPerH: 0.30, tempMinC: 8,  tempOptC: 28, tempMaxC: 40, maxConversion: 0.40, products: { lacticAcid: 0.5, ethanol: 0.256, co2: 0.244 } },
  // Acetobacter oxidises ethanol to acetic acid (vinegar). Uses ethanol, not sugar.
  // ethanol + O₂ → acetic acid + H₂O; simplified stoichiometry (CO₂ as O₂ proxy in
  // the closed-system model): 0.667 g acetic acid + 0.333 g CO₂ per g ethanol.
  acetobacter:   { muMaxPerH: 0.07, tempMinC: 10, tempOptC: 30, tempMaxC: 40, maxConversion: 0.90, products: { aceticAcid: 0.667, co2: 0.333 }, substrates: ['ethanol'] },
};

/** Sugars cultures ferment (lactose excluded — needs lactase). */
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
    const hours = params.durationS / 3600;

    const masses = speciesMassesG(state);
    const fermentable: (keyof Composition)[] =
      prof.substrates ?? (prof.fermentsLactose ? [...FERMENTABLE, 'lactose' as const] : FERMENTABLE);
    const fermentableG = fermentable.reduce((s, sp) => s + (masses[sp] ?? 0), 0);

    // Osmotic inhibition: high dissolved-sugar concentration slows or halts fermentation.
    // Linear ramp from full activity at BRIX_ONSET to zero at BRIX_MAX.
    const BRIX_ONSET = 30;
    const BRIX_MAX = 60;
    const sugarG = (masses.sucrose ?? 0) + (masses.glucose ?? 0) + (masses.fructose ?? 0) + (masses.maltose ?? 0);
    const totalSolidsG = Object.values(masses as Record<string, number>).reduce((s, v) => s + (v ?? 0), 0);
    const brix = totalSolidsG > 0 ? (sugarG / totalSolidsG) * 100 : 0;
    const osmoticGamma = brix >= BRIX_MAX ? 0 : brix <= BRIX_ONSET ? 1 : 1 - (brix - BRIX_ONSET) / (BRIX_MAX - BRIX_ONSET);

    const muEff = prof.muMaxPerH * gamma * osmoticGamma;

    // Attenuation as a fixed inert floor, persisted so splitting a ferment into
    // several steps converges to the same total conversion (composability).
    const inertFloorG = state.markers.fermentInertFloorG ?? (1 - prof.maxConversion) * fermentableG;
    const consumableG = Math.max(0, fermentableG - inertFloorG);
    const convertedG = consumableG * (1 - Math.exp(-muEff * hours));
    const reduceFrac = fermentableG > 0 ? convertedG / fermentableG : 0;

    for (const sp of fermentable) if (masses[sp]) masses[sp]! *= 1 - reduceFrac;

    // Lay down products; CO₂ leaves as gas (mass loss), the rest stay in solution.
    let co2G = 0;
    for (const [product, yieldGperG] of Object.entries(prof.products) as [ProductSpecies, number][]) {
      const producedG = yieldGperG * convertedG;
      if (product === 'co2') co2G += producedG;
      else masses[product] = (masses[product] ?? 0) + producedG;
    }
    const newMass = Math.max(0, state.massG - co2G);

    const markers = { ...state.markers };
    markers.fermentInertFloorG = inertFloorG;
    markers.co2LostG = (markers.co2LostG ?? 0) + co2G;
    markers.fermentedSugarG = (markers.fermentedSugarG ?? 0) + convertedG;

    const composition = massesToComposition(masses, newMass);

    return {
      state: { composition, massG: newMass, tempC: T, timeS: state.timeS + params.durationS, markers },
      log: {
        operator: 'ferment',
        detail: {
          culture: params.culture, tempC: Math.round(T), hours: Math.round(hours * 10) / 10,
          gamma: Math.round(gamma * 100) / 100,
          sugarConvertedG: Math.round(convertedG * 10) / 10,
          ethanolPct: Math.round((composition.ethanol ?? 0) * 100) / 100,
          lacticAcidPct: Math.round((composition.lacticAcid ?? 0) * 100) / 100,
          co2LostG: Math.round(co2G * 10) / 10,
        },
      },
    };
  };
}
