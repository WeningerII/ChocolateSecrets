/**
 * Rheology — apparent viscosity, flow behavior and consistency, the texture
 * primitive that nothing else in the engine covered. Two grounded effects drive
 * the continuous-phase viscosity:
 *
 *   - dissolved solids: viscosity diverges as the solute fraction approaches a
 *     jamming/saturation limit (Mooney / Krieger–Dougherty form,
 *     η_rel = (1 − c/c_max)^(−n)) — this is why syrups thicken super-linearly;
 *   - temperature: Arrhenius thinning with heat.
 *
 * Fat raises viscosity and, in quantity, makes the system plastic (a yield
 * stress — mayonnaise, chocolate, nut butters). Shear-thinning from hydrocolloids
 * or suspended particles isn't inferable from macro-composition and is noted, not
 * guessed.
 *
 * The flow type is defensible; the absolute viscosity is a RELATIVE-to-water
 * estimate (calibrated) — good to ~an order of magnitude, not a rheometer.
 *
 * Sources: Mooney/Krieger–Dougherty concentration divergence; Arrhenius
 * temperature dependence of solution viscosity.
 */
import type { Composition } from '../../../types';

/** Solute mass fraction at which viscosity diverges (≈ sucrose saturation). */
const JAMMING_FRACTION = 0.85;
/** Divergence exponent (calibrated). */
const DIVERGENCE_N = 2.5;
/** Activation energy for solution-viscosity thinning, J·mol⁻¹. */
const VISCOSITY_EA = 25_000;
const R = 8.314;
const REF_TEMP_C = 20;
/** Fat (% of mix) at/above which the system reads as plastic (yield stress). */
const PLASTIC_FAT_THRESHOLD = 40;
/** Fat viscosity-thickening scale. */
const FAT_VISC_SCALE = 40;

export type FlowType = 'newtonian' | 'plastic_yield_stress';
export type ConsistencyBand = 'thin' | 'pourable' | 'syrupy' | 'viscous' | 'spoonable' | 'paste';

export type RheologyFlag =
  | { kind: 'shear_thinning_not_detected' }
  | { kind: 'no_liquid_phase' };

export interface RheologyResult {
  /** Apparent viscosity relative to water (× water; calibrated estimate). */
  relativeViscosity: number;
  /** Dissolved-solids concentration (≈ °Brix). */
  brix: number;
  flowType: FlowType;
  consistency: ConsistencyBand;
  flags: RheologyFlag[];
}

function classifyConsistency(relViscosity: number): ConsistencyBand {
  if (relViscosity < 10) return 'thin';
  if (relViscosity < 100) return 'pourable';
  if (relViscosity < 1_000) return 'syrupy';
  if (relViscosity < 10_000) return 'viscous';
  if (relViscosity < 100_000) return 'spoonable';
  return 'paste';
}

export function computeRheology(composition: Composition, tempC: number = REF_TEMP_C): RheologyResult {
  const flags: RheologyFlag[] = [];
  const water = composition.water ?? 0;
  const dissolved =
    (composition.sucrose ?? 0) + (composition.glucose ?? 0) + (composition.fructose ?? 0) +
    (composition.lactose ?? 0) + (composition.maltose ?? 0) + (composition.sorbitol ?? 0) +
    (composition.glycerol ?? 0);
  const fat = composition.fat ?? 0;

  const liquidBase = dissolved + water;
  const brix = liquidBase > 0 ? (dissolved / liquidBase) * 100 : 0;
  if (liquidBase <= 0 && fat <= 0) {
    flags.push({ kind: 'no_liquid_phase' });
    return { relativeViscosity: 1, brix: 0, flowType: 'newtonian', consistency: 'thin', flags };
  }

  // Continuous-phase viscosity: solute jamming divergence × Arrhenius temperature.
  // c is the solute fraction of the aqueous phase (= Brix/100), the jamming variable.
  const c = Math.min(JAMMING_FRACTION - 1e-3, brix / 100);
  const jamFactor = Math.pow(1 - c / JAMMING_FRACTION, -DIVERGENCE_N);
  const T = tempC + 273.15;
  const tempFactor = Math.exp((VISCOSITY_EA / R) * (1 / T - 1 / (REF_TEMP_C + 273.15)));
  const fatFactor = 1 + fat / FAT_VISC_SCALE;

  const relativeViscosity = jamFactor * tempFactor * fatFactor;

  const flowType: FlowType = fat >= PLASTIC_FAT_THRESHOLD ? 'plastic_yield_stress' : 'newtonian';
  // Hydrocolloid/particle shear-thinning can't be inferred from macro composition.
  flags.push({ kind: 'shear_thinning_not_detected' });

  return { relativeViscosity, brix, flowType, consistency: classifyConsistency(relativeViscosity), flags };
}
