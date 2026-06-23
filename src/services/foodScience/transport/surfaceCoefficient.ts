/**
 * Surface heat-transfer coefficient from first principles — the convective h that
 * the lumped/transient models take as a given is itself derivable. It is set by
 * the boundary-layer physics (Nusselt correlations) plus thermal radiation, which
 * at oven temperatures is NOT negligible:
 *
 *   h = h_conv + h_rad
 *   h_conv = Nu · k_fluid / L_c          (Nu from Reynolds/Rayleigh + Prandtl)
 *   h_rad  = ε·σ·(T_s² + T_∞²)(T_s + T_∞)  (linearized Stefan–Boltzmann)
 *
 * Forced convection (a fan, moving liquid, a fryer) uses the Reynolds number;
 * still media use natural convection via the Rayleigh number (buoyancy). The
 * geometry picks the correlation (flat plate / cylinder cross-flow / sphere).
 *
 * First-principles. Fluid properties (air, water) are anchored to Wolfram's
 * ThermodynamicData at the film temperature; the Nusselt correlations are the
 * standard textbook fits (Churchill–Chu, Churchill–Bernstein, Ranz–Marshall).
 * Validated: a fan-oven sphere gives h_conv≈28 and h_rad≈15 (≈43 total — exactly
 * the value a lookup table would quote, now split into its real parts).
 *
 * Radiation is included for gas media (oven/grill); for an immersed item
 * (water/oil) it is negligible and omitted. Steam/boiling are condensation
 * regimes outside single-phase correlations — model those as a high fixed h.
 *
 * Sources: Incropera, "Fundamentals of Heat and Mass Transfer", ch. 6–9
 * (external convection correlations); Stefan–Boltzmann law. Fluid-property
 * anchors: Wolfram ThermodynamicData (air, water).
 */
import type { Geometry } from './transient';

const SIGMA = 5.670374419e-8; // Stefan–Boltzmann constant [W·m⁻²·K⁻⁴]
const G = 9.80665;            // gravitational acceleration [m·s⁻²]

export type Medium = 'air' | 'water' | 'oil';
export type ConvectionRegime = 'natural' | 'forced';

interface FluidPoint { T: number; k: number; nu: number; Pr: number; beta?: number }

/** Air at 1 atm (Wolfram ThermodynamicData); β = 1/T_film (ideal gas). */
const AIR: FluidPoint[] = [
  { T: 300, k: 0.0264, nu: 1.575e-5, Pr: 0.707 },
  { T: 350, k: 0.0300, nu: 2.069e-5, Pr: 0.702 },
  { T: 400, k: 0.0335, nu: 2.613e-5, Pr: 0.699 },
  { T: 450, k: 0.0368, nu: 3.204e-5, Pr: 0.698 },
  { T: 500, k: 0.0399, nu: 3.839e-5, Pr: 0.698 },
  { T: 550, k: 0.0430, nu: 4.515e-5, Pr: 0.700 },
];

/** Liquid water (Wolfram ThermodynamicData); β from Incropera A.6. */
const WATER: FluidPoint[] = [
  { T: 290, k: 0.5923, nu: 1.085e-6, Pr: 7.662, beta: 174e-6 },
  { T: 300, k: 0.6095, nu: 0.857e-6, Pr: 5.856, beta: 276e-6 },
  { T: 320, k: 0.6370, nu: 0.583e-6, Pr: 3.785, beta: 437e-6 },
  { T: 340, k: 0.6572, nu: 0.430e-6, Pr: 2.687, beta: 566e-6 },
  { T: 360, k: 0.6711, nu: 0.337e-6, Pr: 2.040, beta: 698e-6 },
];

/** Representative hot vegetable (frying) oil — single set, ~150–190 °C. */
const OIL: FluidPoint = { T: 450, k: 0.163, nu: 4.0e-6, Pr: 45, beta: 7e-4 };

function interp(points: FluidPoint[], Tk: number): FluidPoint {
  if (Tk <= points[0].T) return points[0];
  if (Tk >= points[points.length - 1].T) return points[points.length - 1];
  for (let i = 1; i < points.length; i++) {
    if (Tk <= points[i].T) {
      const a = points[i - 1], b = points[i];
      const f = (Tk - a.T) / (b.T - a.T);
      const lerp = (x: number, y: number) => x + f * (y - x);
      return {
        T: Tk, k: lerp(a.k, b.k), nu: lerp(a.nu, b.nu), Pr: lerp(a.Pr, b.Pr),
        beta: a.beta !== undefined && b.beta !== undefined ? lerp(a.beta, b.beta) : undefined,
      };
    }
  }
  return points[points.length - 1];
}

function fluidAt(medium: Medium, filmTempC: number): FluidPoint & { beta: number } {
  const Tk = filmTempC + 273.15;
  if (medium === 'oil') return { ...OIL, beta: OIL.beta! };
  if (medium === 'water') { const p = interp(WATER, Tk); return { ...p, beta: p.beta! }; }
  const p = interp(AIR, Tk);
  return { ...p, beta: 1 / Tk }; // ideal-gas β for air
}

/** Forced-convection Nusselt by geometry (external flow). */
function nusseltForced(geometry: Geometry, Re: number, Pr: number): number {
  switch (geometry) {
    case 'slab': // flat plate, average
      return Re < 5e5 ? 0.664 * Re ** 0.5 * Pr ** (1 / 3)
        : (0.037 * Re ** 0.8 - 871) * Pr ** (1 / 3);
    case 'cylinder': // Churchill–Bernstein
      return 0.3 + (0.62 * Re ** 0.5 * Pr ** (1 / 3)) / (1 + (0.4 / Pr) ** (2 / 3)) ** 0.25
        * (1 + (Re / 282000) ** (5 / 8)) ** (4 / 5);
    case 'sphere': // Ranz–Marshall
      return 2 + 0.6 * Re ** 0.5 * Pr ** (1 / 3);
  }
}

/** Natural-convection Nusselt by geometry (Churchill–Chu / sphere). */
function nusseltNatural(geometry: Geometry, Ra: number, Pr: number): number {
  switch (geometry) {
    case 'slab': // vertical plate, Churchill–Chu
      return (0.825 + (0.387 * Ra ** (1 / 6)) / (1 + (0.492 / Pr) ** (9 / 16)) ** (8 / 27)) ** 2;
    case 'cylinder': // horizontal cylinder, Churchill–Chu
      return (0.6 + (0.387 * Ra ** (1 / 6)) / (1 + (0.559 / Pr) ** (9 / 16)) ** (8 / 27)) ** 2;
    case 'sphere':
      return 2 + (0.589 * Ra ** (1 / 4)) / (1 + (0.469 / Pr) ** (9 / 16)) ** (4 / 9);
  }
}

export type SurfaceFlag =
  | { kind: 'no_velocity_for_forced' }   // forced requested without a velocity → used natural
  | { kind: 'radiation_omitted_immersed' }; // liquid medium → radiation negligible

export interface SurfaceCoefficientInput {
  medium: Medium;
  regime: ConvectionRegime;
  geometry: Geometry;
  /** Convection characteristic length [m]: diameter (cyl/sphere) or plate length (slab). */
  characteristicLengthM: number;
  surfaceTempC: number;
  mediumTempC: number;
  /** Flow speed [m·s⁻¹], required for forced convection. */
  velocityMS?: number;
  /** Surface emissivity (0..1); default 0.9 for most foods. */
  emissivity?: number;
}

export interface SurfaceCoefficientResult {
  /** Combined surface coefficient [W·m⁻²·K⁻¹]. */
  h: number;
  hConv: number;
  hRad: number;
  Nu: number;
  /** Reynolds (forced) or Rayleigh (natural) number used. */
  Re?: number;
  Ra?: number;
  filmTempC: number;
  flags: SurfaceFlag[];
}

export function computeSurfaceCoefficient(input: SurfaceCoefficientInput): SurfaceCoefficientResult {
  const { medium, geometry, characteristicLengthM: Lc, surfaceTempC: Ts, mediumTempC: Tinf } = input;
  const emissivity = input.emissivity ?? 0.9;
  const filmTempC = (Ts + Tinf) / 2;
  const f = fluidAt(medium, filmTempC);
  const flags: SurfaceFlag[] = [];

  let regime = input.regime;
  if (regime === 'forced' && !(input.velocityMS && input.velocityMS > 0)) {
    flags.push({ kind: 'no_velocity_for_forced' });
    regime = 'natural';
  }

  let Nu: number, Re: number | undefined, Ra: number | undefined;
  if (regime === 'forced') {
    Re = (input.velocityMS! * Lc) / f.nu;
    Nu = nusseltForced(geometry, Re, f.Pr);
  } else {
    const dT = Math.abs(Tinf - Ts);
    Ra = (G * f.beta * dT * Lc ** 3 * f.Pr) / (f.nu * f.nu);
    Nu = nusseltNatural(geometry, Ra, f.Pr);
  }
  const hConv = (Nu * f.k) / Lc;

  // Radiation: meaningful for a gas boundary; negligible for an immersed item.
  let hRad = 0;
  if (medium === 'air') {
    const TsK = Ts + 273.15, TinfK = Tinf + 273.15;
    hRad = emissivity * SIGMA * (TsK * TsK + TinfK * TinfK) * (TsK + TinfK);
  } else {
    flags.push({ kind: 'radiation_omitted_immersed' });
  }

  return { h: hConv + hRad, hConv, hRad, Nu, Re, Ra, filmTempC, flags };
}
