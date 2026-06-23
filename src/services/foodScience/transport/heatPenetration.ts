/**
 * Heat penetration — gradient-aware cooking. Given a food's shape and size, its
 * composition (→ thermal diffusivity via Choi–Okos) and the cooking method
 * (→ surface heat-transfer coefficient h), this marches the transient-conduction
 * solution to give the CENTER and SURFACE temperatures over time — or inverts for
 * the time to bring the core to a target (doneness, pasteurization).
 *
 * This is the rigorous sibling of the lumped-capacitance doneness model: it holds
 * for thick / high-Biot items (a roast, a loaf, a custard) where the inside lags
 * the outside, which is exactly the regime the lumped model warns it overestimates.
 *
 * Biot number Bi = h·L/k decides the physics: Bi ≪ 1 the food is nearly uniform
 * (surface-limited), Bi ≫ 1 a steep internal gradient (conduction-limited). L is
 * the characteristic half-size: half-thickness (slab), radius (cylinder/sphere).
 *
 * First-principles. The h regimes are representative published values (orders of
 * magnitude in Incropera Table 1.1 / food-engineering texts), so absolute times
 * are estimates while the geometry/size/composition SCALING is exact. Radiation,
 * surface evaporation (frying crust, roast bark) and property change with cooking
 * are not modeled.
 */
import type { Composition } from '../../../types';
import { computeThermalProperties, type ThermalProperties } from './thermalProperties';
import { solveTransient, fourierForCenterTheta, positionShape, firstEigenvalue, type Geometry } from './transient';

/** Cooking method → representative surface heat-transfer coefficient h [W·m⁻²·K⁻¹]. */
export type CookingMethod =
  | 'still_air_oven' | 'fan_oven' | 'sous_vide' | 'poaching_boiling' | 'steaming' | 'deep_frying';

const METHOD_H: Record<CookingMethod, number> = {
  still_air_oven: 12,     // natural convection (+ some radiation, lumped roughly)
  fan_oven: 45,           // forced convection
  sous_vide: 150,         // gently circulated water bath
  poaching_boiling: 1200, // vigorous liquid
  steaming: 3000,         // condensing steam — surface ≈ medium
  deep_frying: 450,       // hot oil (evaporative crust not modeled)
};

export type HeatPenetrationFlag =
  | { kind: 'short_time_one_term' }   // Fo < 0.2: one-term less accurate early on
  | { kind: 'target_unreachable' }    // core can't reach the target in this medium
  | { kind: 'low_composition_coverage'; coverage: number };

export interface HeatPenetrationInput {
  geometry: Geometry;
  /** Characteristic half-size L [m]: half-thickness (slab) or radius (cyl/sphere). */
  characteristicLengthM: number;
  composition: Composition;
  initialTempC: number;
  mediumTempC: number;
  /** Cooking method (sets h) — or pass surfaceCoeffWm2K explicitly. */
  method?: CookingMethod;
  surfaceCoeffWm2K?: number;
  /** Evaluate properties at this temperature; defaults to the mean of initial and target. */
  propertyTempC?: number;
  /** If given, report center/surface temperature after this long [s]. */
  timeS?: number;
  /** If given, report the time to bring the CENTER to this temperature [°C]. */
  targetCoreTempC?: number;
}

export interface HeatPenetrationResult {
  thermal: ThermalProperties;
  h: number;
  Bi: number;
  /** Center & surface temperature at `timeS` (when provided). */
  atTime?: { timeS: number; coreTempC: number; surfaceTempC: number; Fo: number };
  /** Time for the center to reach `targetCoreTempC` (when provided). */
  timeToCoreTargetS?: number | null;
  flags: HeatPenetrationFlag[];
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export function computeHeatPenetration(input: HeatPenetrationInput): HeatPenetrationResult | null {
  const { geometry, characteristicLengthM: L, composition, initialTempC: Ti, mediumTempC: Tinf } = input;
  if (L <= 0) return null;

  const evalT = clamp(
    input.propertyTempC ?? (Ti + (input.targetCoreTempC ?? Tinf)) / 2,
    2, 95,
  );
  const thermal = computeThermalProperties(composition, evalT);
  if (!thermal) return null;

  const h = input.surfaceCoeffWm2K ?? METHOD_H[input.method ?? 'fan_oven'];
  const Bi = (h * L) / thermal.k;
  const flags: HeatPenetrationFlag[] = [];
  if (thermal.coverage < 0.6) flags.push({ kind: 'low_composition_coverage', coverage: thermal.coverage });

  const result: HeatPenetrationResult = { thermal, h, Bi, flags };

  if (input.timeS !== undefined) {
    const Fo = (thermal.alpha * input.timeS) / (L * L);
    const sol = solveTransient(geometry, Bi, Fo);
    const coreTempC = Tinf + sol.thetaCenter * (Ti - Tinf);
    const surfaceTempC = Tinf + sol.thetaSurface * (Ti - Tinf);
    result.atTime = { timeS: input.timeS, coreTempC, surfaceTempC, Fo };
    if (!sol.oneTermValid) flags.push({ kind: 'short_time_one_term' });
  }

  if (input.targetCoreTempC !== undefined) {
    // θ_target relative to the drive (medium − initial). Unreachable if the target
    // is past the medium temperature in the heating/cooling direction.
    const drive = Ti - Tinf;
    const thetaTarget = drive !== 0 ? (input.targetCoreTempC - Tinf) / drive : 1;
    if (thetaTarget <= 0) {
      result.timeToCoreTargetS = null;
      flags.push({ kind: 'target_unreachable' });
    } else {
      const Fo = fourierForCenterTheta(geometry, Bi, thetaTarget);
      if (Fo === null) {
        result.timeToCoreTargetS = null;
      } else {
        result.timeToCoreTargetS = (Fo * L * L) / thermal.alpha;
        if (Fo < 0.2) flags.push({ kind: 'short_time_one_term' });
      }
    }
  }

  return result;
}

/** Temperature at an arbitrary depth fraction ξ∈[0,1] (0 center, 1 surface) at time t. */
export function temperatureAtDepth(
  input: HeatPenetrationInput & { timeS: number; depthFraction: number },
): number | null {
  const base = computeHeatPenetration(input);
  if (!base?.atTime) return null;
  const Fo = base.atTime.Fo;
  const lambda1 = firstEigenvalue(input.geometry, base.Bi);
  const sol = solveTransient(input.geometry, base.Bi, Fo);
  const theta = sol.thetaCenter * positionShape(input.geometry, lambda1, clamp(input.depthFraction, 0, 1));
  return input.mediumTempC + theta * (input.initialTempC - input.mediumTempC);
}
