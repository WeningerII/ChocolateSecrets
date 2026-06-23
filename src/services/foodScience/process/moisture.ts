/**
 * Moisture migration between phases (recipe components) at different water
 * activity, over storage.
 *
 * In a multi-domain product — a moist filling against a dry shell, a wet cake
 * under a crisp topping — water migrates DOWN the a_w gradient until the phases
 * equilibrate, softening the dry part and drying the moist one (the classic
 * shelf-life failure of composite confections). The driving force is the a_w
 * gap; the approach to equilibrium is first-order in time across a diffusion
 * barrier:
 *
 *   f(t)  = 1 − exp(−t / τ)            fraction of the gap equilibrated
 *   index = (a_w_max − a_w_min) · f    effective a_w transferred
 *
 * τ (the barrier time constant) depends on interface geometry and packaging,
 * which the data model does not carry, so a documented default is assumed — the
 * a_w gap and storage time still differentiate recipes. A `calibrated` relative
 * risk, not a gravimetric moisture-transfer prediction.
 *
 * Sources: moisture migration in multi-domain foods — Labuza & Hyman, Trends in
 * Food Science & Technology 9 (1998); first-order approach-to-equilibrium.
 */
import type { ProcessProfile } from './types';

/** Default diffusion-barrier time constant when geometry/packaging is unknown (~30 days). */
export const MOISTURE_BARRIER_TIME_CONSTANT_S = 30 * 86_400;

export type MoistureBand = 'none' | 'low' | 'moderate' | 'high';

export type MoistureFlag =
  | { kind: 'single_phase' }        // <2 phases with a computable a_w: no gradient
  | { kind: 'no_storage_process' };

export interface MoistureMigrationResult {
  /** a_w gap driving migration (max − min across phases). */
  drivingAwGap: number;
  /** Fraction (0..1) of the gap equilibrated over the storage time. */
  equilibratedFraction: number;
  /** index = gap · fraction (effective a_w transferred); 0..~1. */
  index: number;
  band: MoistureBand;
  flags: MoistureFlag[];
}

function classifyBand(index: number, hasGradient: boolean): MoistureBand {
  if (!hasGradient || index <= 0) return 'none';
  if (index < 0.05) return 'low';
  if (index < 0.15) return 'moderate';
  return 'high';
}

/**
 * Assess moisture migration risk from the per-phase water activities and the
 * storage timeline. `phaseAws` is one a_w per component/domain.
 */
export function computeMoistureMigration(
  phaseAws: number[],
  storageProfile: ProcessProfile,
  opts: { barrierTimeConstantS?: number } = {},
): MoistureMigrationResult {
  const flags: MoistureFlag[] = [];

  const valid = phaseAws.filter((a) => Number.isFinite(a));
  if (valid.length < 2) {
    flags.push({ kind: 'single_phase' });
    return { drivingAwGap: 0, equilibratedFraction: 0, index: 0, band: 'none', flags };
  }

  const drivingAwGap = Math.max(...valid) - Math.min(...valid);

  const t = storageProfile.totalDurationS;
  if (t <= 0) flags.push({ kind: 'no_storage_process' });
  const tau = opts.barrierTimeConstantS ?? MOISTURE_BARRIER_TIME_CONSTANT_S;
  const equilibratedFraction = t > 0 && tau > 0 ? 1 - Math.exp(-t / tau) : 0;

  const index = drivingAwGap * equilibratedFraction;
  const hasGradient = drivingAwGap > 0 && t > 0;

  return {
    drivingAwGap,
    equilibratedFraction,
    index,
    band: classifyBand(index, hasGradient),
    flags,
  };
}
