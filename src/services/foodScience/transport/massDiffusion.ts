/**
 * Mass diffusion — brining, curing, marinating, osmotic dehydration, fat bloom.
 * Same transient solver as heat penetration, because Fick's second law is the
 * heat equation with a mass diffusivity D in place of α. Given the food's shape
 * and size and the diffusant's D, this gives how saturated the CENTER is after a
 * given time — or the time to drive the center to a target uptake.
 *
 * A well-stirred bath (brine, cure, syrup) holds the surface at the bath
 * concentration the instant immersion starts: the mass Biot is effectively
 * infinite (a Dirichlet surface), the default here. A still or viscous medium can
 * be given a finite Biot.
 *
 * Center saturation = 1 − θ_center, the fraction of the equilibrium uptake reached
 * at the slowest point. First-principles in the geometry/size/time scaling; the
 * diffusivities are representative published values (food matrices vary with
 * temperature, structure and concentration), so absolute times are estimates.
 *
 * Sources: Crank, "The Mathematics of Diffusion"; food-engineering diffusivity
 * compilations (NaCl in muscle ~2–6e-10 m²·s⁻¹; sucrose osmotic ~1e-10; fat in
 * chocolate ~1e-13 — the months-long bloom timescale).
 */
import { solveTransient, fourierForCenterTheta, type Geometry } from './transient';

/** Common diffusant/matrix pairs → representative D [m²·s⁻¹]. */
export type Diffusant =
  | 'salt_in_meat' | 'salt_in_vegetable' | 'sugar_osmotic' | 'water_drying' | 'fat_bloom';

const DIFFUSIVITY: Record<Diffusant, number> = {
  salt_in_meat: 4e-10,
  salt_in_vegetable: 6e-10,
  sugar_osmotic: 1e-10,
  water_drying: 1e-10,
  fat_bloom: 3e-13,
};

/** Effectively-infinite mass Biot for a well-stirred bath (Dirichlet surface). */
const STIRRED_BATH_BI = 1e4;

export type MassDiffusionFlag =
  | { kind: 'short_time_one_term' }   // Fo < 0.2: one-term less accurate early on
  | { kind: 'already_saturated' };    // target uptake already met

export interface MassDiffusionInput {
  geometry: Geometry;
  /** Characteristic half-size L [m]: half-thickness (slab) or radius (cyl/sphere). */
  characteristicLengthM: number;
  /** Diffusant preset — or pass diffusivityM2S explicitly. */
  diffusant?: Diffusant;
  diffusivityM2S?: number;
  /** Mass Biot; omit for a well-stirred bath (Dirichlet surface). */
  biotMass?: number;
  /** If given, report center saturation (0..1) after this long [s]. */
  timeS?: number;
  /** If given, report the time to bring the center to this saturation (0..1). */
  targetCenterSaturation?: number;
}

export interface MassDiffusionResult {
  diffusivityM2S: number;
  Bi: number;
  /** Fraction of equilibrium uptake at the center after `timeS` (when provided). */
  centerSaturationAtTime?: { timeS: number; saturation: number; Fo: number };
  /** Time for the center to reach `targetCenterSaturation` [s] (when provided). */
  timeToTargetS?: number | null;
  flags: MassDiffusionFlag[];
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function computeMassPenetration(input: MassDiffusionInput): MassDiffusionResult | null {
  const { geometry, characteristicLengthM: L } = input;
  if (L <= 0) return null;

  const D = input.diffusivityM2S ?? (input.diffusant ? DIFFUSIVITY[input.diffusant] : undefined);
  if (D === undefined || D <= 0) return null;

  const Bi = input.biotMass ?? STIRRED_BATH_BI;
  const flags: MassDiffusionFlag[] = [];
  const result: MassDiffusionResult = { diffusivityM2S: D, Bi, flags };

  if (input.timeS !== undefined) {
    const Fo = (D * input.timeS) / (L * L);
    const sol = solveTransient(geometry, Bi, Fo);
    result.centerSaturationAtTime = { timeS: input.timeS, saturation: clamp01(1 - sol.thetaCenter), Fo };
    if (!sol.oneTermValid) flags.push({ kind: 'short_time_one_term' });
  }

  if (input.targetCenterSaturation !== undefined) {
    const thetaTarget = 1 - clamp01(input.targetCenterSaturation);
    const Fo = fourierForCenterTheta(geometry, Bi, thetaTarget);
    if (Fo === null || Fo <= 0) {
      result.timeToTargetS = Fo === 0 ? 0 : null;
      if (Fo === 0) flags.push({ kind: 'already_saturated' });
    } else {
      result.timeToTargetS = (Fo * L * L) / D;
      if (Fo < 0.2) flags.push({ kind: 'short_time_one_term' });
    }
  }

  return result;
}
