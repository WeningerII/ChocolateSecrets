import { describe, test, expect } from 'vitest';
import { computeThermalProperties } from './thermalProperties';

/** Validated against the Choi–Okos model evaluated in Wolfram (see commit notes). */
describe('computeThermalProperties (Choi–Okos)', () => {
  test('lean meat (75w/20p/5f) @20°C', () => {
    const p = computeThermalProperties({ water: 75, protein: 20, fat: 5 }, 20)!;
    expect(p.k).toBeCloseTo(0.516, 2);
    expect(p.rho).toBeCloseTo(1042, 0);
    expect(p.cp).toBeCloseTo(3639, -1);
    expect(p.alpha * 1e7).toBeCloseTo(1.36, 2);
  });

  test('potato (80w/18 carb/1p/1ash) @20°C', () => {
    const p = computeThermalProperties({ water: 80, sucrose: 18, protein: 1, ash: 1 }, 20)!;
    expect(p.alpha * 1e7).toBeCloseTo(1.40, 2);
    expect(p.k).toBeCloseTo(0.553, 2);
  });

  test('butter (16w/82f) @5°C is a poor conductor', () => {
    const p = computeThermalProperties({ water: 16, fat: 82, protein: 1, ash: 1 }, 5)!;
    expect(p.k).toBeCloseTo(0.241, 2);
    expect(p.alpha * 1e7).toBeCloseTo(1.09, 2);
  });

  test('pure water ≈ 0.6 W/mK, α ≈ 1.43e-7 @20°C', () => {
    const p = computeThermalProperties({ water: 100 }, 20)!;
    expect(p.k).toBeCloseTo(0.604, 2);
    expect(p.alpha * 1e7).toBeCloseTo(1.43, 1);
  });

  test('temperature dependence: conductivity of a watery food rises with T', () => {
    const cold = computeThermalProperties({ water: 90, protein: 10 }, 5)!;
    const hot = computeThermalProperties({ water: 90, protein: 10 }, 80)!;
    expect(hot.k).toBeGreaterThan(cold.k);
  });

  test('empty composition returns null', () => {
    expect(computeThermalProperties({}, 20)).toBeNull();
  });
});
