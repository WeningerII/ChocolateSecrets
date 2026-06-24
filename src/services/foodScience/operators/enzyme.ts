/**
 * enzyme — enzymatic reactions as composable operators, with Michaelis-Menten
 * kinetics. An enzyme turns a substrate over at rate v = Vmax·C/(Km+C), saturating
 * at high substrate; integrated over the step (and modulated by temperature, since
 * enzymes peak at an optimum then denature). The transforms ride tracked
 * composition species, so the results flow into the downstream readouts:
 *
 *   invertase  sucrose + H₂O → glucose + fructose   (invert syrup, fondant, honey)
 *   amylase    starch  + H₂O → maltose              (mashing, malting, crust sweetness)
 *   protease   protein → free amino acids           (tenderizing/aging; frees umami
 *              glutamate — protein MASS is unchanged, peptides still read as protein)
 *
 * Hydrolysis stoichiometry is first-principles (Wolfram-verified). Km values are
 * documented enzyme properties; Vmax is the rate at a representative food enzyme
 * loading and the cardinal temperatures are the enzyme's activity/denaturation
 * window — both calibrated. Reaction needs an aqueous phase.
 *
 * Sources: Michaelis-Menten kinetics; carbohydrase/protease hydrolysis
 * stoichiometry; Rosso CTMI for the temperature response (denaturation = γ→0).
 */
import type { Composition } from '../../../types';
import type { Operator } from './pipeline';
import { speciesMassesG, massesToComposition } from './state';
import { rossoGamma } from './ferment';

export type Enzyme = 'invertase' | 'amylase' | 'protease';

interface EnzymeProfile {
  substrate: keyof Composition;
  VmaxGperLh: number;   // turnover at saturation, representative loading (g·L⁻¹·h⁻¹)
  KmGperL: number;      // Michaelis constant (g·L⁻¹)
  tempMinC: number; tempOptC: number; tempMaxC: number;
  /** Hydrolysis: products (g per g substrate) + water consumed (g per g substrate). */
  products?: Partial<Record<keyof Composition, number>>;
  waterPerG?: number;
  /** Liberation (protease): frees this species without consuming substrate mass... */
  liberated?: keyof Composition;
  /** ...up to this fraction of the substrate, at this yield per g turned over. */
  liberatedYield?: number;
  maxLiberatedFraction?: number;
}

const ENZYMES: Record<Enzyme, EnzymeProfile> = {
  // sucrose + H₂O → glucose + fructose (Wolfram: 0.5263 each, 0.0526 water)
  invertase: {
    substrate: 'sucrose', VmaxGperLh: 6, KmGperL: 20, tempMinC: 10, tempOptC: 55, tempMaxC: 65,
    products: { glucose: 0.5263, fructose: 0.5263 }, waterPerG: 0.0526,
  },
  // starch + H₂O → maltose (Wolfram: 1.0556 maltose, 0.0556 water). Vmax set for an
  // active malt-amylase mash: saccharification at the 65 °C rest converts the bulk
  // of starch in ~30–60 min (a low Vmax modeled weak endogenous flour amylase and
  // saccharified only ~1 %/h, far slower than a real mash).
  amylase: {
    substrate: 'starch', VmaxGperLh: 600, KmGperL: 10, tempMinC: 20, tempOptC: 65, tempMaxC: 85,
    products: { maltose: 1.0556 }, waterPerG: 0.0556,
  },
  // protein → free amino acids; frees glutamate (umami), protein mass unchanged.
  // tempMin 0 °C: proteases (calpains/cathepsins) stay slowly active through the
  // cold dry-aging band (1–4 °C) — a 5 °C floor zeroed proteolysis there entirely.
  protease: {
    substrate: 'protein', VmaxGperLh: 2, KmGperL: 30, tempMinC: 0, tempOptC: 50, tempMaxC: 70,
    liberated: 'glutamate', liberatedYield: 1.0, maxLiberatedFraction: 0.12,
  },
};

export type EnzymeFlag = { kind: 'no_aqueous_phase' } | { kind: 'denatured' };

export interface EnzymeParams {
  enzyme: Enzyme;
  durationS: number;
  tempC?: number;
}

export function enzyme(params: EnzymeParams): Operator {
  return (state) => {
    const prof = ENZYMES[params.enzyme];
    const T = params.tempC ?? state.tempC;
    const gamma = rossoGamma(T, prof.tempMinC, prof.tempOptC, prof.tempMaxC);
    const hours = params.durationS / 3600;

    const masses = speciesMassesG(state);
    const waterL = (masses.water ?? 0) / 1000; // ≈ L (density ~1)
    const flags: EnzymeFlag[] = [];
    if (gamma <= 0) flags.push({ kind: 'denatured' });

    let turnedOverG = 0;
    const substrateG0 = masses[prof.substrate] ?? 0;
    if (waterL > 0 && gamma > 0 && substrateG0 > 0) {
      // Integrate the Michaelis-Menten ODE over the step.
      const isHydrolysis = !!prof.products;
      const liberCapG = prof.maxLiberatedFraction ? prof.maxLiberatedFraction * substrateG0 : Infinity;
      let C = substrateG0 / waterL; // g/L
      const steps = Math.max(20, Math.min(2000, Math.round(hours * 20)));
      const dtH = hours / steps;
      const vmaxEff = prof.VmaxGperLh * gamma;
      for (let i = 0; i < steps; i++) {
        const v = (vmaxEff * C) / (prof.KmGperL + C); // g·L⁻¹·h⁻¹
        const dG = v * waterL * dtH;
        if (isHydrolysis) {
          const take = Math.min(dG, C * waterL);
          turnedOverG += take;
          C = Math.max(0, C - take / waterL); // substrate depletes
        } else {
          // liberation: substrate not consumed (C constant); cap the freed product
          if (turnedOverG >= liberCapG) break;
          turnedOverG = Math.min(liberCapG, turnedOverG + dG);
        }
      }
    } else if (waterL <= 0) {
      flags.push({ kind: 'no_aqueous_phase' });
    }

    const markers = { ...state.markers };
    // Every reaction here conserves food mass: hydrolysis pulls in water already
    // present (substrate + water → products); liberation just reshapes protein.
    const newMass = state.massG;

    if (prof.products) {
      // Hydrolysis: consume substrate + water, lay down products.
      masses[prof.substrate] = Math.max(0, substrateG0 - turnedOverG);
      const waterUsed = (prof.waterPerG ?? 0) * turnedOverG;
      masses.water = Math.max(0, (masses.water ?? 0) - waterUsed);
      for (const [sp, yieldGperG] of Object.entries(prof.products) as [keyof Composition, number][]) {
        masses[sp] = (masses[sp] ?? 0) + yieldGperG * turnedOverG;
      }
    } else if (prof.liberated) {
      // Liberation: free the product (e.g. glutamate); substrate mass unchanged.
      masses[prof.liberated] = (masses[prof.liberated] ?? 0) + (prof.liberatedYield ?? 1) * turnedOverG;
      markers.proteolysisExtent = substrateG0 > 0 ? turnedOverG / (prof.maxLiberatedFraction! * substrateG0) : 0;
    }

    const composition = massesToComposition(masses, newMass);
    markers[`${params.enzyme}TurnedOverG`] = (markers[`${params.enzyme}TurnedOverG`] ?? 0) + turnedOverG;

    return {
      state: { composition, massG: newMass, tempC: T, timeS: state.timeS + params.durationS, markers },
      log: {
        operator: 'enzyme',
        detail: {
          enzyme: params.enzyme, tempC: Math.round(T), hours: Math.round(hours * 10) / 10,
          gamma: Math.round(gamma * 100) / 100, turnedOverG: Math.round(turnedOverG * 10) / 10,
          ...(flags.length ? { flag: flags[0].kind } : {}),
        },
      },
    };
  };
}
