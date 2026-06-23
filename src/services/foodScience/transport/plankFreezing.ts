/**
 * Plank's equation — freezing and thawing TIME. We already compute the freezing
 * POINT (colligative); this gives how long the phase change takes, the number a
 * kitchen actually plans around.
 *
 * Freezing is a moving-boundary (Stefan) problem: a front of ice advances inward,
 * and the latent heat released at the front must conduct out through the
 * already-frozen shell and across the surface film. Plank's classic result
 * assumes the phase change happens at the single initial freezing point T_f and
 * neglects sensible heat (pre-cooling and sub-cooling), giving the latent-heat
 * time:
 *
 *   t = (ρ·L_f)/(|T_∞ − T_f|) · ( P·a/h + R·a²/k )
 *
 *   L_f = (water fraction)·334 kJ/kg   latent heat removed/added
 *   a   = full thickness (slab) or diameter (cylinder/sphere)
 *   h   = surface coefficient (from computeSurfaceCoefficient)
 *   k   = conductivity of the PHASE-CHANGE shell — frozen for freezing
 *         (ice conducts ~4× better, via Choi–Okos), thawed for thawing
 *   P,R = geometry shape factors: slab ½,⅛ · cylinder ¼,1⁄16 · sphere ⅙,1⁄24
 *
 * First-principles (one heat balance at the front). It is the standard first
 * estimate, deliberately ignoring sensible heat — so true times run a bit longer,
 * and thawing is slower than the mirror-image freeze because the thawed shell
 * conducts worse than the frozen one. Verified against the textbook beef-slab
 * worked example.
 *
 * Source: Plank (1913/1941); Singh & Heldman, "Introduction to Food Engineering",
 * freezing-time estimation.
 */
import type { Composition } from '../../../types';
import { computeFreezing } from '../universal';
import { computeThermalProperties } from './thermalProperties';
import type { Geometry } from './transient';

const LATENT_HEAT_FUSION_WATER = 333600; // J·kg⁻¹

const SHAPE_FACTORS: Record<Geometry, { P: number; R: number }> = {
  slab: { P: 1 / 2, R: 1 / 8 },
  cylinder: { P: 1 / 4, R: 1 / 16 },
  sphere: { P: 1 / 6, R: 1 / 24 },
};

export type PlankMode = 'freeze' | 'thaw';

export type PlankFlag =
  | { kind: 'medium_not_freezing' }   // freeze requested but medium ≥ freezing point
  | { kind: 'medium_not_thawing' }    // thaw requested but medium ≤ freezing point
  | { kind: 'no_freezing_point' }     // no freezable water/solutes resolved
  | { kind: 'low_composition_coverage'; coverage: number };

export interface PlankInput {
  geometry: Geometry;
  /** Characteristic dimension a [m]: full thickness (slab) or diameter (cyl/sphere). */
  characteristicDimensionM: number;
  composition: Composition;
  mediumTempC: number;
  /** Surface coefficient h [W·m⁻²·K⁻¹] — e.g. from computeSurfaceCoefficient. */
  surfaceCoeffWm2K: number;
  mode?: PlankMode;                   // default 'freeze'
  /** Override the initial freezing point (else computed from composition). */
  freezingPointC?: number;
}

export interface PlankResult {
  /** Freezing/thawing time [s]; null if the direction is impossible. */
  timeS: number | null;
  freezingPointC: number;
  /** Latent heat removed/added per kg of food [J·kg⁻¹]. */
  latentHeatJkg: number;
  /** Conductivity of the phase-change shell [W·m⁻¹·K⁻¹] (frozen vs thawed). */
  k: number;
  rho: number;
  deltaT: number;
  flags: PlankFlag[];
}

export function computePlankTime(input: PlankInput): PlankResult | null {
  const { geometry, characteristicDimensionM: a, composition, mediumTempC } = input;
  const mode = input.mode ?? 'freeze';
  const h = input.surfaceCoeffWm2K;
  if (a <= 0 || h <= 0) return null;

  const flags: PlankFlag[] = [];
  const Tf = input.freezingPointC ?? computeFreezing(
    composition as Record<string, number>, { sodiumMass: composition.sodium },
  ).initialFreezingPointC;
  if (Tf === null) {
    flags.push({ kind: 'no_freezing_point' });
    return { timeS: null, freezingPointC: 0, latentHeatJkg: 0, k: 0, rho: 0, deltaT: 0, flags };
  }

  const latentHeatJkg = ((composition.water ?? 0) / 100) * LATENT_HEAT_FUSION_WATER;

  // Properties of the shell heat conducts through: frozen for freezing, thawed for thawing.
  const propTemp = (Tf + mediumTempC) / 2;
  const props = computeThermalProperties(composition, propTemp, mode === 'freeze' ? 'frozen' : 'thawed');
  if (!props) return null;
  if (props.coverage < 0.6) flags.push({ kind: 'low_composition_coverage', coverage: props.coverage });

  if (mode === 'freeze' && mediumTempC >= Tf) {
    flags.push({ kind: 'medium_not_freezing' });
    return { timeS: null, freezingPointC: Tf, latentHeatJkg, k: props.k, rho: props.rho, deltaT: 0, flags };
  }
  if (mode === 'thaw' && mediumTempC <= Tf) {
    flags.push({ kind: 'medium_not_thawing' });
    return { timeS: null, freezingPointC: Tf, latentHeatJkg, k: props.k, rho: props.rho, deltaT: 0, flags };
  }

  const deltaT = Math.abs(mediumTempC - Tf);
  const { P, R } = SHAPE_FACTORS[geometry];
  const timeS = ((props.rho * latentHeatJkg) / deltaT) * ((P * a) / h + (R * a * a) / props.k);

  return { timeS, freezingPointC: Tf, latentHeatJkg, k: props.k, rho: props.rho, deltaT, flags };
}
