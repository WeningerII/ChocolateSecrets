/**
 * The kinetic integrator: accumulate a temperature-driven reaction's extent
 * along a process timeline. Every process model plugs a rate law into the same
 * engine, so Maillard, doneness, oxidation and moisture share one substrate.
 *
 * Sources: cook-value / z-value formulation — Ball & Olson, thermal processing;
 * Arrhenius normalization — standard chemical kinetics.
 */
import type { ProcessProfile, RelativeRateModel } from './types';

/** Universal gas constant R, J·mol⁻¹·K⁻¹. */
export const GAS_CONSTANT_J_PER_MOL_K = 8.314;

/**
 * z-value rate model: rate rises 10× for every `zC` degrees above the reference
 * — rate(T) = 10^((T − refTempC) / zC). The classic cook-value form, preferred
 * when the temperature sensitivity z is better characterized than absolute
 * Arrhenius constants. Equivalent to an Arrhenius model with
 * Ea = 2.303 · R · Tref² / z (Tref in kelvin).
 */
export function zValueRate(refTempC: number, zC: number): RelativeRateModel {
  return (tempC: number) => Math.pow(10, (tempC - refTempC) / zC);
}

/**
 * Arrhenius rate model normalized to 1.0 at refTempC:
 *   rate(T) = exp( −Ea/R · (1/T − 1/Tref) )   with T, Tref in kelvin.
 * Use when activation energy (Ea, J·mol⁻¹) is the cited quantity.
 */
export function arrheniusRate(refTempC: number, eaJperMol: number): RelativeRateModel {
  const Tref = refTempC + 273.15;
  return (tempC: number) => {
    const T = tempC + 273.15;
    return Math.exp(-(eaJperMol / GAS_CONSTANT_J_PER_MOL_K) * (1 / T - 1 / Tref));
  };
}

/**
 * Accumulate reaction extent along a profile as a cook-value: the equivalent
 * time (seconds) at the rate model's reference temperature.
 *   extent = Σ rate(T_i) · Δt_i
 * A leg held at exactly the reference temperature for t seconds contributes t;
 * hotter legs contribute more, cooler legs less. Non-positive-duration legs are
 * ignored.
 */
export function accumulateThermalExtent(
  profile: ProcessProfile,
  rate: RelativeRateModel,
): number {
  let extent = 0;
  for (const seg of profile.segments) {
    if (seg.durationS <= 0) continue;
    extent += rate(seg.tempC) * seg.durationS;
  }
  return extent;
}
