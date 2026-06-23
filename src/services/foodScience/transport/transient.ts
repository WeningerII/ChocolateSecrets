/**
 * Transient diffusion — the one-term (Heisler) solution of the diffusion equation
 *   ∂φ/∂t = D·∇²φ
 * for the three canonical food geometries (slab, cylinder, sphere) with a
 * convective surface boundary. This ONE kernel powers both physics that matter in
 * a kitchen, because heat conduction and mass diffusion are the same equation:
 *   - heat: φ = temperature,    D = thermal diffusivity α,  Bi = h·L/k
 *   - mass: φ = concentration,  D = mass diffusivity,        Bi = h_m·L/D
 *
 * Dimensionless excess at the center, for Fourier number Fo = D·t/L² ≳ 0.2:
 *   θ_c = (φ_c − φ∞)/(φᵢ − φ∞) ≈ C₁·exp(−λ₁²·Fo)
 * where λ₁ (first eigenvalue) and C₁ depend on the Biot number through the
 * geometry's transcendental equation:
 *   slab:     λ·tan λ = Bi
 *   cylinder: λ·J₁(λ)/J₀(λ) = Bi
 *   sphere:   1 − λ·cot λ = Bi
 * and the position profile φ(ξ)/φ_c is cos(λξ) / J₀(λξ) / sinc(λξ) respectively
 * (ξ = distance/L, surface at ξ=1).
 *
 * First-principles. λ₁ is solved numerically (bisection on the bracketed
 * transcendental — no chart lookup); C₁ and the profile follow in closed form.
 * Bessel J₀/J₁ use the Abramowitz & Stegun 9.4 polynomial fits (cylinder λ₁<2.405
 * always, so the |x|≤3 branch covers every evaluation). Verified against Incropera
 * Table 5.1 to 6 figures for Bi = 1 and 5, all three geometries.
 *
 * Sources: Incropera & DeWitt, "Fundamentals of Heat and Mass Transfer", §5.5
 * (one-term approximation, Heisler); Abramowitz & Stegun §9.4 (Bessel fits).
 */
export type Geometry = 'slab' | 'cylinder' | 'sphere';

/** Bessel J₀, |x| ≤ 3 — Abramowitz & Stegun 9.4.1 (|err| < 5e-8). */
export function besselJ0(x: number): number {
  const t = (x / 3) ** 2;
  return 1 - 2.2499997 * t + 1.2656208 * t ** 2 - 0.3163866 * t ** 3
    + 0.0444479 * t ** 4 - 0.0039444 * t ** 5 + 0.0002100 * t ** 6;
}

/** Bessel J₁, |x| ≤ 3 — Abramowitz & Stegun 9.4.4 (|err| < 1.3e-8). */
export function besselJ1(x: number): number {
  const t = (x / 3) ** 2;
  return x * (0.5 - 0.56249985 * t + 0.21093573 * t ** 2 - 0.03954289 * t ** 3
    + 0.00443319 * t ** 4 - 0.00031761 * t ** 5 + 0.00001109 * t ** 6);
}

/** First eigenvalue's upper bracket (the Bi→∞ limit) per geometry. */
const LAMBDA_INF: Record<Geometry, number> = {
  slab: Math.PI / 2,
  cylinder: 2.404825557695773, // first zero of J₀
  sphere: Math.PI,
};

/** Bracketed transcendental, written singularity-free so bisection is robust. */
function eigenResidual(geometry: Geometry, lambda: number, Bi: number): number {
  switch (geometry) {
    case 'slab':     return lambda * Math.sin(lambda) - Bi * Math.cos(lambda);
    case 'cylinder': return lambda * besselJ1(lambda) - Bi * besselJ0(lambda);
    case 'sphere':   return (1 - Bi) * Math.sin(lambda) - lambda * Math.cos(lambda);
  }
}

/** First eigenvalue λ₁ by bisection in (0, λ∞). */
export function firstEigenvalue(geometry: Geometry, Bi: number): number {
  if (Bi <= 0) return 0;
  const hi0 = LAMBDA_INF[geometry];
  let lo = 1e-7;
  let hi = hi0 * (1 - 1e-9);   // stay just inside the bracket (residual → +∞ at the edge)
  let flo = eigenResidual(geometry, lo, Bi);
  for (let i = 0; i < 100; i++) {
    const mid = 0.5 * (lo + hi);
    const fm = eigenResidual(geometry, mid, Bi);
    if (flo * fm <= 0) { hi = mid; } else { lo = mid; flo = fm; }
  }
  return 0.5 * (lo + hi);
}

/** Leading coefficient C₁ for the one-term series. */
export function coefficientC1(geometry: Geometry, lambda: number): number {
  switch (geometry) {
    case 'slab':
      return 4 * Math.sin(lambda) / (2 * lambda + Math.sin(2 * lambda));
    case 'cylinder': {
      const j0 = besselJ0(lambda), j1 = besselJ1(lambda);
      return (2 / lambda) * j1 / (j0 * j0 + j1 * j1);
    }
    case 'sphere':
      return 4 * (Math.sin(lambda) - lambda * Math.cos(lambda)) / (2 * lambda - Math.sin(2 * lambda));
  }
}

/** Spatial shape φ(ξ)/φ_center, ξ = position/L in [0,1] (surface at 1). */
export function positionShape(geometry: Geometry, lambda: number, xi: number): number {
  if (xi <= 0) return 1;
  switch (geometry) {
    case 'slab':     return Math.cos(lambda * xi);
    case 'cylinder': return besselJ0(lambda * xi);
    case 'sphere':   return Math.sin(lambda * xi) / (lambda * xi);
  }
}

export interface TransientSolution {
  lambda1: number;
  C1: number;
  Bi: number;
  Fo: number;
  /** Dimensionless excess θ at the center (1 = unchanged, 0 = fully equilibrated). */
  thetaCenter: number;
  /** θ at the surface (ξ = 1). */
  thetaSurface: number;
  /** True when Fo ≥ 0.2, the validity range of the one-term approximation. */
  oneTermValid: boolean;
}

/**
 * Solve the dimensionless transient field at Biot `Bi` and Fourier `Fo`.
 * θ = (φ − φ∞)/(φᵢ − φ∞); center value drives time-to-target, surface the gradient.
 */
export function solveTransient(geometry: Geometry, Bi: number, Fo: number): TransientSolution {
  const lambda1 = firstEigenvalue(geometry, Bi);
  const C1 = coefficientC1(geometry, lambda1);
  const thetaCenter = C1 * Math.exp(-lambda1 * lambda1 * Fo);
  const thetaSurface = thetaCenter * positionShape(geometry, lambda1, 1);
  return { lambda1, C1, Bi, Fo, thetaCenter, thetaSurface, oneTermValid: Fo >= 0.2 };
}

/**
 * Invert for the Fourier number that drives the CENTER to a target θ.
 * Returns null when the target is already met at t=0 (θ_target ≥ C₁).
 */
export function fourierForCenterTheta(geometry: Geometry, Bi: number, thetaTarget: number): number | null {
  if (thetaTarget <= 0) return null;
  const lambda1 = firstEigenvalue(geometry, Bi);
  const C1 = coefficientC1(geometry, lambda1);
  if (thetaTarget >= C1) return 0;     // already there (within the one-term picture)
  return -Math.log(thetaTarget / C1) / (lambda1 * lambda1);
}
