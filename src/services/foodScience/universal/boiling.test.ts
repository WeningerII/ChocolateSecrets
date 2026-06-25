import { describe, test, expect } from 'vitest';
import { computeBoilingPoint, classifyCandyStage, KB_WATER } from './boiling';

describe('computeBoilingPoint (colligative)', () => {
  test('pure water boils at 100 °C with zero elevation', () => {
    const r = computeBoilingPoint({ water: 100 });
    expect(r.boilingPointC).toBeCloseTo(100, 6);
    expect(r.elevationC).toBe(0);
  });

  test('50 g water + 50 g sucrose: ΔTb = Kb·molality (Wolfram-cross-checked)', () => {
    // m = (50/342.30)/0.05 = 2.9214 mol/kg; ΔTb = 0.512·2.9214 = 1.496 °C
    const r = computeBoilingPoint({ water: 50, sucrose: 50 });
    expect(r.elevationC).toBeCloseTo(1.496, 2);
    expect(r.boilingPointC!).toBeCloseTo(101.496, 2);
  });

  test('lower-MW sugar elevates more per gram (colligative)', () => {
    expect(computeBoilingPoint({ water: 100, glucose: 20 }).elevationC)
      .toBeGreaterThan(computeBoilingPoint({ water: 100, sucrose: 20 }).elevationC);
  });

  test('NaCl (sodium) adds extra elevation via i = 2', () => {
    expect(computeBoilingPoint({ water: 100, sucrose: 20 }, { sodiumMass: 0.393 }).elevationC)
      .toBeGreaterThan(computeBoilingPoint({ water: 100, sucrose: 20 }).elevationC);
  });

  test('no water → null boiling point', () => {
    expect(computeBoilingPoint({ sucrose: 50 }).boilingPointC).toBeNull();
  });

  test('exposes the ebullioscopic constant of water', () => {
    expect(KB_WATER).toBeCloseTo(0.512, 3);
  });

  // Regression (realistic-scenario hardening): ideal van 't Hoff elevation
  // diverges as water → 0, predicting impossible boiling points in the candy
  // regime (e.g. ~248 °C at 99 % sugar, hotter than sucrose decomposes). It must
  // FLAG that it's past the dilute limit rather than return the number silently.
  describe('dilute-limit validity flag', () => {
    test('dilute solutions are trusted (no flag)', () => {
      const r = computeBoilingPoint({ water: 90, sucrose: 10 });
      expect(r.flags).toHaveLength(0);
      expect(r.boilingPointC!).toBeGreaterThan(100);
      expect(r.boilingPointC!).toBeLessThan(101); // ~100.2 °C, physical
    });

    test('candy-concentration syrup is flagged beyond the dilute limit', () => {
      const r = computeBoilingPoint({ water: 1, sucrose: 99 });
      expect(r.flags.some(f => f.kind === 'beyond_dilute_limit')).toBe(true);
      const flag = r.flags.find(f => f.kind === 'beyond_dilute_limit')!;
      expect(flag.soluteMassFraction).toBeCloseTo(0.99, 2);
      // The raw ideal value is the known-unreliable one the flag warns about.
      expect(r.boilingPointC!).toBeGreaterThan(200); // unphysical → that's why it's flagged
    });

    test('ordinary cooking concentrations (≤ ⅔ solute) stay unflagged', () => {
      expect(computeBoilingPoint({ water: 40, sucrose: 60 }).flags).toHaveLength(0);
      expect(computeBoilingPoint({ water: 25, sucrose: 75 }).flags.length).toBeGreaterThan(0);
    });
  });
});

describe('classifyCandyStage', () => {
  test('maps syrup temperatures to confectioner stages', () => {
    expect(classifyCandyStage(108)).toBe('syrup');
    expect(classifyCandyStage(111)).toBe('thread');
    expect(classifyCandyStage(115)).toBe('soft_ball');
    expect(classifyCandyStage(119)).toBe('firm_ball');
    expect(classifyCandyStage(125)).toBe('hard_ball');
    expect(classifyCandyStage(140)).toBe('soft_crack');
    expect(classifyCandyStage(150)).toBe('hard_crack');
    expect(classifyCandyStage(170)).toBe('caramel');
  });
});
