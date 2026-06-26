/**
 * brine / cure / marinate — solute uptake from a bath. A food sits in a salt
 * brine, a sugar syrup, or a cure, and the solute diffuses inward: corned beef,
 * candied citrus, gravlax, a turkey brine. This turns the mass-diffusion kernel
 * (Fick's second law) into a composition-changing step.
 *
 * Two things set how much is absorbed:
 *   - HOW FAR the diffusion has gone — the transient solution's center
 *     saturation (0..1) for the food's shape/size, the diffusant's D, and the
 *     soak time. A well-stirred bath holds the surface at the bath strength
 *     (Dirichlet), the default.
 *   - HOW MUCH it's heading toward — equilibrium, where the food's solute-in-
 *     water ratio matches the bath's: m_eq = r_bath · W,  r_bath = c/(100−c).
 * Absorbed = E · (m_eq − m_now), then folded into the composition by mass
 * balance (salt as NaCl → ash + its sodium descriptor; sugar as sucrose).
 *
 * First-principles in the diffusion scaling; the diffusivities and the
 * equilibrium-ratio model are representative (calibrated). Water co-transport
 * (osmotic outflow) is neglected — a first model, like Plank neglecting
 * sensible heat. Source: Crank, "The Mathematics of Diffusion".
 */
import type { Operator } from './pipeline';
import { speciesMassesG, massesToComposition } from './state';
import { computeMassPenetration, type Geometry, type Diffusant } from '../transport';

/** g NaCl per g Na, and its inverse — to split table salt into the tracked species. */
const NACL_PER_NA = 58.44 / 22.99; // 2.542
const NA_PER_NACL = 22.99 / 58.44; // 0.3934

export type BrineSolute = 'salt' | 'sugar';

export type BrineFlag =
  | { kind: 'short_time_one_term' }
  | { kind: 'no_diffusion' }  // geometry/diffusivity unusable
  | { kind: 'no_water' };     // food has no aqueous phase — absorption impossible

export interface BrineParams {
  /** What the bath delivers: salt (→ ash + sodium) or sugar (→ sucrose). */
  solute: BrineSolute;
  /** Solute mass-% of the bath (10 = 10 % brine; 60 = a heavy sugar syrup). */
  bathConcentrationPct: number;
  geometry: Geometry;
  /** Characteristic half-size L [m]: half-thickness (slab) or radius (cyl/sphere). */
  characteristicLengthM: number;
  durationS: number;
  tempC?: number;
  /** Override the diffusant preset (else salt→salt_in_meat, sugar→sugar_osmotic). */
  diffusant?: Diffusant;
  diffusivityM2S?: number;
  /** Mass Biot; omit for a well-stirred bath (Dirichlet surface). */
  biotMass?: number;
}

export function brine(params: BrineParams): Operator {
  return (state) => {
    const T = params.tempC ?? state.tempC;
    const diffusant: Diffusant =
      params.diffusant ?? (params.solute === 'salt' ? 'salt_in_meat' : 'sugar_osmotic');

    const pen = computeMassPenetration({
      geometry: params.geometry,
      characteristicLengthM: params.characteristicLengthM,
      diffusant,
      diffusivityM2S: params.diffusivityM2S,
      biotMass: params.biotMass,
      timeS: params.durationS,
    });
    const E = pen?.centerSaturationAtTime?.saturation ?? 0;

    const masses = speciesMassesG(state);
    const W = masses.water ?? 0;
    const c = Math.max(0, Math.min(99.9, params.bathConcentrationPct));
    const rBath = c / (100 - c);          // g solute per g water at equilibrium
    const mEq = rBath * W;                 // equilibrium solute grams in the food's water

    const markers = { ...state.markers };
    const flags: BrineFlag[] = [];

    if (W === 0) {
      // No aqueous phase — the diffusant has nowhere to go.
      flags.push({ kind: 'no_water' });
      markers.brineCenterSaturation = 0;
      return {
        state: { ...state, tempC: T, timeS: state.timeS + params.durationS, markers },
        log: {
          operator: 'brine',
          detail: { solute: params.solute, bathPct: Math.round(c), centerSaturation: 0, absorbedG: 0, flag: 'no_water' },
        },
      };
    }

    let added = 0;
    if (params.solute === 'salt') {
      const naClNow = (masses.sodium ?? 0) * NACL_PER_NA;
      added = Math.max(0, E * (mEq - naClNow));            // g NaCl absorbed
      masses.ash = (masses.ash ?? 0) + added;             // NaCl is a mineral (ash)
      masses.sodium = (masses.sodium ?? 0) + added * NA_PER_NACL; // its sodium descriptor
      markers.saltAbsorbedG = (markers.saltAbsorbedG ?? 0) + added;
    } else {
      const sucNow = masses.sucrose ?? 0;
      added = Math.max(0, E * (mEq - sucNow));             // g sucrose absorbed
      masses.sucrose = sucNow + added;
      markers.sugarAbsorbedG = (markers.sugarAbsorbedG ?? 0) + added;
    }
    markers.brineCenterSaturation = E;

    const newMass = state.massG + added;
    const composition = massesToComposition(masses, newMass);

    if (!pen) flags.push({ kind: 'no_diffusion' });
    else if (pen.flags.some((f) => f.kind === 'short_time_one_term')) flags.push({ kind: 'short_time_one_term' });

    return {
      state: { ...state, composition, massG: newMass, tempC: T, timeS: state.timeS + params.durationS, markers },
      log: {
        operator: 'brine',
        detail: {
          solute: params.solute,
          bathPct: Math.round(c),
          centerSaturation: Math.round(E * 100) / 100,
          absorbedG: Math.round(added * 10) / 10,
          ...(flags.length ? { flag: flags[0].kind } : {}),
        },
      },
    };
  };
}
