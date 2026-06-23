/**
 * Constant-rate drying — how fast a wet surface loses water, and how cool it stays
 * doing it. While the surface is still wet (the constant-rate period) it sits at
 * the wet-bulb temperature, and every watt of convective heat arriving goes into
 * evaporation rather than warming the food:
 *
 *   surface T  = T_wb            (evaporative cooling)
 *   flux N     = h·(T_air − T_wb) / ΔH_vap        [kg·m⁻²·s⁻¹]
 *
 * This is the heat side of the heat–mass analogy: the same surface coefficient h
 * that drives cooking drives drying, and the vapor-pressure deficit shows up
 * through the wet-bulb depression. It explains evaporative cooling (a roast's
 * surface lags until it dries out and browns), dehydrator behavior, and — paired
 * with internal moisture diffusion — case hardening / crust.
 *
 * First-principles. Constant-rate period only: once the surface dries the rate
 * falls and internal moisture diffusion (computeMassPenetration) takes over.
 *
 * Source: heat–mass transfer analogy; psychrometric wet-bulb. Validated vs
 * Wolfram (70 °C/30 % RH, h=25 → ~0.85 kg·m⁻²·h⁻¹, surface ≈ 47.6 °C).
 */
import { computePsychrometrics, latentHeatVaporization, type PsychrometricState } from './psychrometrics';

export type DryingFlag =
  | { kind: 'saturated_air' };   // RH ≈ 100 %: no evaporation, no cooling

export interface DryingRateInput {
  airTempC: number;
  /** Relative humidity 0..1. */
  relativeHumidity: number;
  /** Surface coefficient h [W·m⁻²·K⁻¹] — from computeSurfaceCoefficient or a method. */
  surfaceCoeffWm2K: number;
  pressurePa?: number;
}

export interface DryingRateResult {
  /** Wet-surface temperature [°C] during the constant-rate period (the wet bulb). */
  surfaceTempC: number;
  /** Evaporative cooling, T_air − T_wb [°C]. */
  evaporativeCoolingC: number;
  /** Evaporation flux [kg·m⁻²·s⁻¹] and [kg·m⁻²·h⁻¹]. */
  fluxKgM2s: number;
  fluxKgM2h: number;
  psychrometrics: PsychrometricState;
  flags: DryingFlag[];
}

export function computeDryingRate(input: DryingRateInput): DryingRateResult | null {
  if (input.surfaceCoeffWm2K <= 0) return null;
  const psy = computePsychrometrics(input);
  const Twb = psy.wetBulbC;
  const dT = Math.max(0, input.airTempC - Twb);
  const hvap = latentHeatVaporization(Twb);

  const flags: DryingFlag[] = [];
  if (dT < 1e-6) flags.push({ kind: 'saturated_air' });

  const fluxKgM2s = (input.surfaceCoeffWm2K * dT) / hvap;
  return {
    surfaceTempC: Twb,
    evaporativeCoolingC: dT,
    fluxKgM2s,
    fluxKgM2h: fluxKgM2s * 3600,
    psychrometrics: psy,
    flags,
  };
}
