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

  test('ice_fraction_at_serving_distance: high when φ(servingT) hits target, neutral when unset', () => {
    // massBy → Tf0 ≈ -2.29 °C, φ(-11) ≈ 0.79
    const ctx: any = {
      ...dummyCtx,
      aw: { aw: 0.85, massBy: { water: 620, sucrose: 180, glucose: 27, lactose: 30 } },
    };
    const onTarget = evaluateObjectives(ctx, { servingTempC: -11, frozenWaterTarget: 0.79 });
    expect(onTarget.ice_fraction_at_serving_distance).toBeGreaterThan(0.9);

    // No massBy / no targets → neutral 1.0 (objective inactive)
    expect(evaluateObjectives(dummyCtx, {}).ice_fraction_at_serving_distance).toBe(1.0);
  });

  test('recrystallization_margin: smaller serving-to-Tg′ gap scores higher', () => {
    const ctx: any = { ...dummyCtx, aw: { aw: 0.85, massBy: { water: 620, sucrose: 200 } } }; // Tg′ = -32
    const cold = evaluateObjectives(ctx, { servingTempC: -30 }); // margin 2 °C → near the glass
    const warm = evaluateObjectives(ctx, { servingTempC: -8 });  // margin 24 °C → far above
    expect(cold.recrystallization_margin).toBeGreaterThan(warm.recrystallization_margin);
  });

  test('new texture objectives collapse to 0.05 on hard-constraint violation', () => {
    const res = evaluateObjectives({ ...dummyCtx, hardConstraintViolated: true }, {});
    expect(res.ice_fraction_at_serving_distance).toBe(0.05);
    expect(res.recrystallization_margin).toBe(0.05);
    expect(res.palatability_balance).toBe(0.05);
  });

  test('palatability_balance: tracks the balance score, neutral when no taste data', () => {
    // A well-balanced profile scores higher than a poorly-balanced one.
    const good = evaluateObjectives({ ...dummyCtx, palatability: { balance: 80 } }, {});
    const poor = evaluateObjectives({ ...dummyCtx, palatability: { balance: 20 } }, {});
    expect(good.palatability_balance).toBeCloseTo(0.8);
    expect(poor.palatability_balance).toBeCloseTo(0.2);
    expect(good.palatability_balance).toBeGreaterThan(poor.palatability_balance);

    // No taste data → neutral 1.0 (never penalizes what we can't taste).
    expect(evaluateObjectives({ ...dummyCtx, palatability: null }, {}).palatability_balance).toBe(1.0);
  });

  test('detectHardConstraintViolation trips on various conditions', () => {
    expect(detectHardConstraintViolation({ aw: 0.90 } as any, { key: 'firm-set' } as any, null, { awMaxThreshold: 0.85 })).toBe(true); // 0.90 > 0.85 + 0.02
    expect(detectHardConstraintViolation({ aw: 0.86 } as any, { key: 'firm-set' } as any, null, { awMaxThreshold: 0.85 })).toBe(false); // allowed 0.02 tolerance
    
    expect(detectHardConstraintViolation({ aw: null } as any, { key: 'oil-in-water' } as any, null, { forbiddenFatRegimes: ['oil-in-water'] })).toBe(true);
    
    expect(detectHardConstraintViolation({ aw: null } as any, { key: 'firm-set' } as any, { derived: { curdle: { level: 'high' } } } as any, { maxCurdleRisk: 'medium' })).toBe(true);
  });
});
