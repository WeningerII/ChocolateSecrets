/**
 * Thermal properties from composition — the Choi & Okos (1986) component model.
 *
 * Cooking, chilling and freezing are all governed by how fast heat moves through
 * the food, and that is set by three properties: thermal conductivity k, density
 * ρ and specific heat cₚ — combined into the thermal diffusivity α = k/(ρ·cₚ),
 * the single number that drives every transient-conduction calculation.
 *
 * Choi & Okos give each property of each major component (water, protein, fat,
 * carbohydrate, ash) as a polynomial in temperature, then mix them:
 *   cₚ = Σ xᵢ·cₚᵢ            (mass-fraction weighted)
 *   1/ρ = Σ xᵢ/ρᵢ           (additive specific volume)
 *   k  = Σ εᵢ·kᵢ            (parallel model; εᵢ = volume fraction)
 *   α  = k / (ρ·cₚ)
 *
 * First-principles given the composition: the coefficients are published lab
 * fits, not invented, and the mixing rules are thermodynamic. Validated against
 * textbook values (lean meat α≈1.36e-7, potato 1.40e-7, butter 1.09e-7 m²/s).
 *
 * Valid above freezing (the water branch used here is the >0 °C fit). The
 * untracked starch in flour is a known composition gap; properties are computed
 * over the components we do resolve and normalized, so a flour-heavy mix leans on
 * its known fractions. T defaults to 20 °C.
 *
 * Source: Choi, Y. & Okos, M.R. (1986), "Effects of temperature and composition
 * on thermal properties of foods"; ASHRAE Handbook—Refrigerals, food properties.
 */
import type { Composition } from '../../../types';

type Component = 'water' | 'protein' | 'fat' | 'carb' | 'ash' | 'ethanol';

/** Quadratic (a + bT + cT²) coefficients, T in °C. */
type Quad = readonly [number, number, number];
const quad = (q: Quad, T: number): number => q[0] + q[1] * T + q[2] * T * T;

/** Specific heat cₚ [J·kg⁻¹·K⁻¹]. (Ethanol ~constant.) */
const CP: Record<Component, Quad> = {
  water:   [4176.2, -0.090864, 0.0054731],
  protein: [2008.2, 1.2089, -0.0013129],
  fat:     [1984.2, 1.4733, -0.0048008],
  carb:    [1548.8, 1.9625, -0.0059399],
  ash:     [1092.6, 1.8896, -0.0036817],
  ethanol: [2440, 0, 0],
};

/** Thermal conductivity k [W·m⁻¹·K⁻¹]. */
const K: Record<Component, Quad> = {
  water:   [0.57109, 0.0017625, -6.7036e-6],
  protein: [0.17881, 0.0011958, -2.7178e-6],
  fat:     [0.18071, -0.00027604, -1.7749e-7],
  carb:    [0.20141, 0.0013874, -4.3312e-6],
  ash:     [0.32962, 0.0014011, -2.9069e-6],
  ethanol: [0.171, 0, 0],
};

/** Density ρ [kg·m⁻³]. */
const RHO: Record<Component, Quad> = {
  water:   [997.18, 0.0031439, -0.0037574],
  protein: [1329.9, -0.51814, 0],
  fat:     [925.59, -0.41757, 0],
  carb:    [1599.1, -0.31046, 0],
  ash:     [2423.8, -0.28063, 0],
  ethanol: [789, 0, 0],
};

export interface ThermalProperties {
  /** Thermal conductivity [W·m⁻¹·K⁻¹]. */
  k: number;
  /** Density [kg·m⁻³]. */
  rho: number;
  /** Specific heat [J·kg⁻¹·K⁻¹]. */
  cp: number;
  /** Thermal diffusivity [m²·s⁻¹] = k/(ρ·cₚ). */
  alpha: number;
  /** Mass fraction of the composition that resolved to known components (0..1). */
  coverage: number;
}

/** Map our composition species onto the five Choi–Okos components (g per 100 g). */
function componentMasses(c: Composition): Record<Component, number> {
  const carb =
    (c.sucrose ?? 0) + (c.glucose ?? 0) + (c.fructose ?? 0) +
    (c.lactose ?? 0) + (c.maltose ?? 0) + (c.sorbitol ?? 0) + (c.glycerol ?? 0);
  return {
    water: c.water ?? 0,
    protein: c.protein ?? 0,
    fat: c.fat ?? 0,
    carb,
    ash: c.ash ?? 0,
    ethanol: c.ethanol ?? 0,
  };
}

/**
 * Thermal conductivity, density, specific heat and diffusivity of a food from its
 * composition at temperature `tempC` (default 20 °C). Returns null if the
 * composition carries no mass to model.
 */
export function computeThermalProperties(composition: Composition, tempC = 20): ThermalProperties | null {
  const masses = componentMasses(composition);
  const totalMass = (Object.values(masses) as number[]).reduce((s, m) => s + m, 0);
  if (totalMass <= 0) return null;

  // Mass fractions over the components we resolved.
  const components = Object.keys(masses) as Component[];
  let cp = 0;
  let invRho = 0;
  const volContrib: Partial<Record<Component, number>> = {};
  let volTotal = 0;

  for (const comp of components) {
    const x = masses[comp] / totalMass;
    if (x <= 0) continue;
    cp += x * quad(CP[comp], tempC);
    const rhoI = quad(RHO[comp], tempC);
    invRho += x / rhoI;
    const v = x / rhoI;
    volContrib[comp] = v;
    volTotal += v;
  }

  const rho = 1 / invRho;
  let k = 0;
  for (const comp of components) {
    const v = volContrib[comp];
    if (v) k += (v / volTotal) * quad(K[comp], tempC);
  }

  const alpha = k / (rho * cp);
  // coverage vs the full 100 g (descriptors excluded): how much mass we modeled.
  const coverage = Math.min(1, totalMass / 100);
  return { k, rho, cp, alpha, coverage };
}
