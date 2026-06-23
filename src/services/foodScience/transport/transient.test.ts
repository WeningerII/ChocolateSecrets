import { describe, test, expect } from 'vitest';
import {
  besselJ0, besselJ1, firstEigenvalue, coefficientC1, positionShape, solveTransient,
} from './transient';

describe('Bessel functions (A&S 9.4) vs known values', () => {
  test('J0 and J1 match tabulated values', () => {
    expect(besselJ0(1)).toBeCloseTo(0.765198, 5);
    expect(besselJ1(1)).toBeCloseTo(0.440051, 5);
    expect(besselJ0(2)).toBeCloseTo(0.223891, 5);
    expect(besselJ1(2)).toBeCloseTo(0.576725, 5);
  });
});

describe('first eigenvalue & C1 vs Incropera Table 5.1', () => {
  // {geometry: [Bi=1 λ1, C1, Bi=5 λ1, C1]}
  const cases = {
    slab:     [0.860334, 1.119132, 1.313838, 1.240249],
    cylinder: [1.255784, 1.207092, 1.989815, 1.502869],
    sphere:   [1.570796, 1.273240, 2.570432, 1.787001],
  } as const;

  for (const [geo, [l1, c1, l5, c5]] of Object.entries(cases)) {
    test(`${geo} eigenvalues/coefficients`, () => {
      const g = geo as 'slab' | 'cylinder' | 'sphere';
      expect(firstEigenvalue(g, 1)).toBeCloseTo(l1, 5);
      expect(coefficientC1(g, firstEigenvalue(g, 1))).toBeCloseTo(c1, 5);
      expect(firstEigenvalue(g, 5)).toBeCloseTo(l5, 5);
      expect(coefficientC1(g, firstEigenvalue(g, 5))).toBeCloseTo(c5, 5);
    });
  }

  test('Bi → ∞ limits: slab π/2, cylinder 2.4048, sphere π', () => {
    expect(firstEigenvalue('slab', 1e6)).toBeCloseTo(Math.PI / 2, 4);
    expect(firstEigenvalue('cylinder', 1e6)).toBeCloseTo(2.404826, 4);
    expect(firstEigenvalue('sphere', 1e6)).toBeCloseTo(Math.PI, 4);
  });

  test('Bi → 0 drives λ1 → 0 (lumped limit)', () => {
    expect(firstEigenvalue('sphere', 1e-4)).toBeLessThan(0.02);
  });
});

describe('position shape & solution', () => {
  test('center value is 1 for every geometry', () => {
    for (const g of ['slab', 'cylinder', 'sphere'] as const) {
      expect(positionShape(g, 1.5, 0)).toBe(1);
    }
  });

  test('sphere shape is the sinc, → 1 at the center', () => {
    expect(positionShape('sphere', 2, 1e-6)).toBeCloseTo(1, 6);
    expect(positionShape('sphere', 2, 1)).toBeCloseTo(Math.sin(2) / 2, 6);
  });

  test('θ_center starts at C1 (Fo=0) and decays with Fourier number', () => {
    const a = solveTransient('slab', 2, 0);
    expect(a.thetaCenter).toBeCloseTo(a.C1, 9);
    const b = solveTransient('slab', 2, 0.5);
    expect(b.thetaCenter).toBeLessThan(a.thetaCenter);
    expect(b.oneTermValid).toBe(true);
    expect(solveTransient('slab', 2, 0.1).oneTermValid).toBe(false);
  });
});
