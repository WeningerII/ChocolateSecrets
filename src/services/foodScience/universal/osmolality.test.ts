import { describe, test, expect } from 'vitest';
import { computeOsmolality } from './osmolality';

describe('computeOsmolality', () => {
  test('pure water has zero osmolality and pressure', () => {
    const r = computeOsmolality({ water: 100 });
    expect(r.osmolalityOsmPerKg).toBe(0);
    expect(r.osmoticPressureAtm).toBe(0);
  });

  test('50 g water + 50 g sucrose: osmolality matches the freezing/boiling molality', () => {
    const r = computeOsmolality({ water: 50, sucrose: 50 }, { tempC: 20 });
    expect(r.osmolalityOsmPerKg).toBeCloseTo(2.921, 2);   // (50/342.30)/0.05
    expect(r.osmoticPressureAtm).toBeCloseTo(70.3, 0);    // ≈ 2.921 · 0.082057 · 293.15
  });

  test('NaCl (sodium) raises osmolality via i = 2', () => {
    expect(computeOsmolality({ water: 100, sucrose: 20 }, { sodiumMass: 0.393 }).osmolalityOsmPerKg)
      .toBeGreaterThan(computeOsmolality({ water: 100, sucrose: 20 }).osmolalityOsmPerKg);
  });

  test('lower-MW sugar gives more osmoles per gram', () => {
    expect(computeOsmolality({ water: 100, glucose: 20 }).osmolalityOsmPerKg)
      .toBeGreaterThan(computeOsmolality({ water: 100, sucrose: 20 }).osmolalityOsmPerKg);
  });

  test('osmotic pressure rises with temperature; osmolality does not', () => {
    const cold = computeOsmolality({ water: 50, sucrose: 50 }, { tempC: 4 });
    const warm = computeOsmolality({ water: 50, sucrose: 50 }, { tempC: 60 });
    expect(warm.osmoticPressureAtm).toBeGreaterThan(cold.osmoticPressureAtm);
    expect(warm.osmolalityOsmPerKg).toBeCloseTo(cold.osmolalityOsmPerKg, 6);
  });

  test('no water → zero', () => {
    expect(computeOsmolality({ sucrose: 50 }).osmolalityOsmPerKg).toBe(0);
  });
});
