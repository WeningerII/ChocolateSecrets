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
