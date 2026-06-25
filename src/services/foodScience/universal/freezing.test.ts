import { describe, test, expect } from 'vitest';
import { computeFreezing } from './freezing';

describe('computeFreezing (ideal colligative freezing curve)', () => {
  test('50 g water + 50 g sucrose: Tf0 and ice fraction match the closed form (Wolfram-cross-checked)', () => {
    // N_eff = 50/342.30 = 0.146070 mol; molality = 2.9214 mol/kg
    // Tf0 = -1.86 * 2.9214 = -5.434 °C
    // φ(T) = 1 - Tf0/T  →  φ(-15) = 0.6378,  φ(-10) = 0.4566
    // Cross-check (Wolfram): -1.86*(50/342.30)/(50/1000) → -5.4338
    const f = computeFreezing({ water: 50, sucrose: 50 });
    expect(f.initialFreezingPointC!).toBeCloseTo(-5.434, 2);
    expect(f.frozenFractionAt(-15)).toBeCloseTo(0.6378, 3);
    expect(f.frozenFractionAt(-10)).toBeCloseTo(0.4566, 3);
  });

  test('no ice at or above the initial freezing point', () => {
    const f = computeFreezing({ water: 50, sucrose: 50 }); // Tf0 = -5.43
    expect(f.frozenFractionAt(-5)).toBe(0);
    expect(f.frozenFractionAt(0)).toBe(0);
    expect(f.frozenFractionAt(2)).toBe(0);
  });

  test('monotonic: colder → more water frozen, capped at 1', () => {
    const f = computeFreezing({ water: 100, sucrose: 20, glucose: 5 });
    const a = f.frozenFractionAt(-8);
    const b = f.frozenFractionAt(-15);
    const c = f.frozenFractionAt(-25);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    expect(c).toBeLessThanOrEqual(1);
  });

  test('tempForFrozenFraction is the inverse of frozenFractionAt', () => {
    const f = computeFreezing({ water: 50, sucrose: 50 });
    const T = f.tempForFrozenFraction(0.6378)!;
    expect(T).toBeCloseTo(-15, 1);
    expect(f.frozenFractionAt(T)).toBeCloseTo(0.6378, 3);
  });

  test('pure water: freezes fully below 0 °C, flagged as solute-free', () => {
    const f = computeFreezing({ water: 100 });
    expect(f.initialFreezingPointC).toBe(0);
    expect(f.frozenFractionAt(-10)).toBe(1);
    expect(f.flags.some((x) => x.kind === 'no_freezing_solutes')).toBe(true);
  });

  test('no water: null curve + flag', () => {
    const f = computeFreezing({ sucrose: 50 });
    expect(f.initialFreezingPointC).toBeNull();
    expect(f.frozenFractionAt(-15)).toBe(0);
    expect(f.flags.some((x) => x.kind === 'no_water')).toBe(true);
  });

  test('NaCl (sodium) depresses the freezing point further via electrolyte dissociation (i = 2)', () => {
    const noSalt = computeFreezing({ water: 100, sucrose: 20 });
    const salted = computeFreezing({ water: 100, sucrose: 20 }, { sodiumMass: 0.393 }); // ~1 g NaCl
    expect(salted.initialFreezingPointC!).toBeLessThan(noSalt.initialFreezingPointC!);
    // 20 g sucrose (0.0584 mol) + 0.393 g Na → 2 × 0.393/22.99 osmotic mol
    expect(salted.osmoticMoles).toBeCloseTo(20 / 342.30 + (2 * 0.393) / 22.99, 4);
  });

  test('zero / omitted sodium leaves the curve identical (backward compatible)', () => {
    const a = computeFreezing({ water: 100, sucrose: 20 });
    const b = computeFreezing({ water: 100, sucrose: 20 }, { sodiumMass: 0 });
    expect(b.initialFreezingPointC).toBe(a.initialFreezingPointC);
    expect(b.osmoticMoles).toBe(a.osmoticMoles);
  });

  test('lower-MW sugar depresses the freezing point more per gram (colligative)', () => {
    const sucrose = computeFreezing({ water: 100, sucrose: 20 });
    const dextrose = computeFreezing({ water: 100, glucose: 20 }); // ~half the MW → ~2× moles
    expect(dextrose.initialFreezingPointC!).toBeLessThan(sucrose.initialFreezingPointC!);
  });

  // Regression (realistic-scenario hardening): the ideal frozen-fraction curve
  // over-predicts at low temperature because the unfrozen serum concentrates past
  // the dilute limit. serumSoluteMassFractionAt exposes that so callers can flag it.
  describe('serum concentration / ideal-validity', () => {
    const mix = () => computeFreezing({ water: 60, sucrose: 19, lactose: 6, glucose: 4 });

    test('the serum concentrates as more water freezes (colder → more concentrated)', () => {
      const r = mix();
      const warm = r.serumSoluteMassFractionAt(-5);
      const cold = r.serumSoluteMassFractionAt(-18);
      expect(cold).toBeGreaterThan(warm);
      expect(cold).toBeGreaterThan(0.66); // past the ideal-dilute limit at freezer temp
    });

    test('a dilute solution stays within the ideal regime', () => {
      const r = computeFreezing({ water: 95, sucrose: 5 });
      expect(r.serumSoluteMassFractionAt(-2)).toBeLessThan(0.66);
    });

    test('soluteMass sums the dissolved colligative solutes', () => {
      expect(mix().soluteMass).toBeCloseTo(19 + 6 + 4, 6);
    });
  });
});
