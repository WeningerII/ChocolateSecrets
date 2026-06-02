import { describe, test, expect } from 'vitest';
import { evaluateObjectives, detectHardConstraintViolation } from './objectives';

describe('objectives', () => {
  const dummyCtx: any = {
    aw: { aw: 0.85 },
    shelfLife: { weeks: 13 }, // 13 / 26 = 0.5
    fatRegime: { key: 'firm-set' },
    confectionery: { derived: { curdle: { level: 'none' } } },
    costPerGram: 0.02,
    warningCount: 0,
    compositionCompleteness: 1.0,
    hardConstraintViolated: false
  };

  test('evaluateObjectives with hard constraint violated returns 0.05', () => {
    const res = evaluateObjectives({ ...dummyCtx, hardConstraintViolated: true }, {});
    expect(res.aw_distance_to_target).toBe(0.05);
    expect(res.shelf_life_weeks).toBe(0.05);
  });

  test('aw_distance_to_target = 1.0 when aw == awTarget', () => {
    const res = evaluateObjectives(dummyCtx, { awTarget: 0.85 });
    expect(res.aw_distance_to_target).toBe(1.0);
  });

  test('shelf_life_weeks scales linearly to 1.0 at 26 weeks', () => {
    const res = evaluateObjectives(dummyCtx, {});
    expect(res.shelf_life_weeks).toBeCloseTo(0.5);
  });

  test('cost_per_gram logic', () => {
    const resMax = evaluateObjectives({ ...dummyCtx, costPerGram: 0.05 }, { costPerGramMaxUsd: 0.05 });
    expect(resMax.cost_per_gram).toBe(0);

    const resZero = evaluateObjectives({ ...dummyCtx, costPerGram: 0 }, { costPerGramMaxUsd: 0.05 });
    expect(resZero.cost_per_gram).toBe(1);
  });

  test('curdle_safety_margin mapping', () => {
    const resHigh = evaluateObjectives({ ...dummyCtx, confectionery: { derived: { curdle: { level: 'high' } } } }, {});
    expect(resHigh.curdle_safety_margin).toBe(0);

    const resNone = evaluateObjectives(dummyCtx, {});
    expect(resNone.curdle_safety_margin).toBe(1);

    const resMed = evaluateObjectives({ ...dummyCtx, confectionery: { derived: { curdle: { level: 'medium' } } } }, {});
    expect(resMed.curdle_safety_margin).toBeCloseTo(0.33, 2);
  });

  test('fat_regime_distance mapping', () => {
    const resFirm = evaluateObjectives(dummyCtx, {});
    expect(resFirm.fat_regime_distance).toBe(1.0);

    const resOil = evaluateObjectives({ ...dummyCtx, fatRegime: { key: 'oil-in-water' } }, {});
    expect(resOil.fat_regime_distance).toBe(0.0);
  });

  test('detectHardConstraintViolation trips on various conditions', () => {
    expect(detectHardConstraintViolation({ aw: 0.90 } as any, { key: 'firm-set' } as any, null, { awMaxThreshold: 0.85 })).toBe(true); // 0.90 > 0.85 + 0.02
    expect(detectHardConstraintViolation({ aw: 0.86 } as any, { key: 'firm-set' } as any, null, { awMaxThreshold: 0.85 })).toBe(false); // allowed 0.02 tolerance
    
    expect(detectHardConstraintViolation({ aw: null } as any, { key: 'oil-in-water' } as any, null, { forbiddenFatRegimes: ['oil-in-water'] })).toBe(true);
    
    expect(detectHardConstraintViolation({ aw: null } as any, { key: 'firm-set' } as any, { derived: { curdle: { level: 'high' } } } as any, { maxCurdleRisk: 'medium' })).toBe(true);
  });
});
