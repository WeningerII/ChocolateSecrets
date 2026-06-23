/**
 * Thermal doneness — does the food's CORE actually get hot enough, and for long
 * enough, over the bake/cook timeline?
 *
 * Convention: a step's `temperatureTarget` is the COOKING MEDIUM temperature
 * (oven air, water bath, fryer oil), not the food's internal temperature. The
 * core responds to that medium by lumped-capacitance (Newtonian) heating:
 *
 *   T_core(t) = T_env − (T_env − T_core0) · exp(−t / τ),   τ = ρ·cp·Lc / h
 *
 * marched leg-by-leg across the profile. cp comes from composition via Siebel's
 * correlation; ρ and h default to documented values; Lc = V/A is the geometry
 * (supplied by the caller). For moist mixes the medium the core "sees" is capped
 * at the evaporative plateau (~100 °C) — a wet crumb cannot exceed boiling until
 * it dries — so peak core temperatures stay physical.
 *
 * Bands are taken from UNIVERSAL thermal transitions (starch gelatinization,
 * protein coagulation, full-set doneness), not product-specific targets, so this
 * is a `calibrated` physics readout, not a per-recipe "is it baked right" oracle.
 *
 * Known simplifications: lumped capacitance assumes a near-uniform internal
 * temperature (Biot number < 0.1) — for thick items the true core lags more, so
 * we FLAG high-Biot cases as optimistic. Surface drying / crust formation and
 * latent-heat detail are not modeled.
 *
 * Sources: Siebel (1892) specific heat; lumped-capacitance & Biot number —
 * Incropera, Fundamentals of Heat and Mass Transfer; food thermal transitions —
 * Fellows, Food Processing Technology.
 */
import type { Composition } from '../../../types';
import type { ProcessProfile } from './types';

// --- defaults & physical anchors (documented modeling choices) ---
/** Default density of a batter/dough/custard, kg·m⁻³. */
export const DEFAULT_DENSITY_KG_PER_M3 = 1050;
/** Default convective coefficient for a still domestic oven, W·m⁻²·K⁻¹. */
export const DEFAULT_H_W_PER_M2K = 20;
/** Evaporative plateau a moist core cannot exceed until it dries, °C. */
export const BOILING_PLATEAU_C = 100;
/** Default characteristic length Lc when recipe geometry is unknown (~2 cm portion). */
export const DEFAULT_CHAR_LENGTH_M = 0.01;
/** Above this water fraction the evaporative plateau applies. */
const MOIST_WATER_FRACTION = 0.2;
/** Thermal transition temperatures, °C. */
export const GELATINIZATION_C = 66;
export const COAGULATION_C = 70;
export const DONENESS_C = 96;

export type DonenessBand = 'none' | 'raw' | 'underdone' | 'set' | 'done';

export type DonenessFlag =
  | { kind: 'no_thermal_process' }
  | { kind: 'lumped_capacitance_invalid'; biot: number }
  | { kind: 'evaporative_plateau_applied' };

export interface DonenessInput {
  profile: ProcessProfile;
  composition: Composition;
  /** Characteristic length Lc = V/A in METERS (e.g. half-thickness of a slab). */
  charLengthM: number;
  /** Starting core temperature, °C (default 20). */
  initialTempC?: number;
  /** Convective coefficient, W·m⁻²·K⁻¹ (default still oven). */
  hWperM2K?: number;
  /** Density, kg·m⁻³ (default batter/dough). */
  densityKgPerM3?: number;
}

export interface DonenessResult {
  /** Highest core temperature reached over the timeline, °C. */
  peakCoreTempC: number;
  /** Core temperature at the end of the timeline, °C. */
  finalCoreTempC: number;
  band: DonenessBand;
  /** Thermal time constant τ = ρ·cp·Lc/h, seconds. */
  timeConstantS: number;
  /** Biot number h·Lc/k; lumped-capacitance is valid below ~0.1. */
  biotNumber: number;
  reachedThresholds: { gelatinization: boolean; coagulation: boolean; doneness: boolean };
  flags: DonenessFlag[];
}

/** Siebel (1892) specific heat above freezing: cp = 837 + 3349·Xw (J·kg⁻¹·K⁻¹). */
export function estimateSpecificHeat(composition: Composition): number {
  const waterFraction = (composition.water ?? 0) / 100;
  return 837 + 3349 * waterFraction;
}

/** Rough thermal conductivity for the Biot check: k ≈ 0.25 + 0.35·Xw (W·m⁻¹·K⁻¹). */
function estimateConductivity(waterFraction: number): number {
  return 0.25 + 0.35 * waterFraction;
}

function classifyBand(peakCoreTempC: number, hasThermalProcess: boolean): DonenessBand {
  if (!hasThermalProcess) return 'none';
  if (peakCoreTempC < 60) return 'raw';
  if (peakCoreTempC < 85) return 'underdone';
  if (peakCoreTempC < 95) return 'set';
  return 'done';
}

/** March the core temperature through the process profile and assess doneness. */
export function computeDoneness(input: DonenessInput): DonenessResult {
  const {
    profile, composition, charLengthM,
    initialTempC = 20,
    hWperM2K = DEFAULT_H_W_PER_M2K,
    densityKgPerM3 = DEFAULT_DENSITY_KG_PER_M3,
  } = input;

  const flags: DonenessFlag[] = [];
  const hasThermalProcess = profile.segments.length > 0;
  if (!hasThermalProcess) flags.push({ kind: 'no_thermal_process' });

  const waterFraction = (composition.water ?? 0) / 100;
  const cp = estimateSpecificHeat(composition);
  const k = estimateConductivity(waterFraction);
  const lc = Math.max(charLengthM, 0);
  const timeConstantS = hWperM2K > 0 ? (densityKgPerM3 * cp * lc) / hWperM2K : 0;
  const biotNumber = k > 0 ? (hWperM2K * lc) / k : 0;
  if (biotNumber > 0.1) flags.push({ kind: 'lumped_capacitance_invalid', biot: biotNumber });

  const moist = waterFraction > MOIST_WATER_FRACTION;
  const plateauC = moist ? BOILING_PLATEAU_C : Infinity;
  let plateauApplied = false;

  let core = initialTempC;
  let peak = core;
  for (const seg of profile.segments) {
    const envC = Math.min(seg.tempC, plateauC);
    if (moist && seg.tempC > BOILING_PLATEAU_C) plateauApplied = true;
    // τ=0 (infinitesimal item) ⇒ instant equilibration with the medium.
    core = timeConstantS > 0
      ? envC - (envC - core) * Math.exp(-seg.durationS / timeConstantS)
      : envC;
    if (core > peak) peak = core;
  }
  if (plateauApplied) flags.push({ kind: 'evaporative_plateau_applied' });

  return {
    peakCoreTempC: peak,
    finalCoreTempC: core,
    band: classifyBand(peak, hasThermalProcess),
    timeConstantS,
    biotNumber,
    reachedThresholds: {
      gelatinization: peak >= GELATINIZATION_C,
      coagulation: peak >= COAGULATION_C,
      doneness: peak >= DONENESS_C,
    },
    flags,
  };
}
