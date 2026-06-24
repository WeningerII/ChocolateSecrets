import { describe, test, expect } from 'vitest';
import { makeFoodState } from './state';
import { runPipeline } from './pipeline';
import { emulsify } from './emulsify';
import { setGel } from './setGel';
import { temper } from './temper';

describe('emulsify', () => {
  test('a hydrophilic emulsifier gives a stable oil-in-water emulsion', () => {
    const { final, logs } = runPipeline(makeFoodState({ water: 70, fat: 25, protein: 5 }, 100), [
      emulsify({ emulsifierHLB: 12 }),
    ]);
    expect(logs[0].detail.type).toBe('oil_in_water');
    expect(final.markers.emulsionStability01).toBe(1); // stable
    expect(final.markers.emulsionDispersedFraction).toBeLessThan(0.64);
  });

  test('without an emulsifier the mix is unstable', () => {
    const { final, logs } = runPipeline(makeFoodState({ water: 60, fat: 40 }, 100), [emulsify()]);
    expect(logs[0].detail.flag).toBe('no_emulsifier');
    expect(final.markers.emulsionStability01).toBe(0.25); // unstable
  });

  test('a lipophilic emulsifier in a high-fat mix gives water-in-oil', () => {
    const { logs } = runPipeline(makeFoodState({ water: 25, fat: 70, protein: 5 }, 100), [
      emulsify({ emulsifierHLB: 4 }),
    ]);
    expect(logs[0].detail.type).toBe('water_in_oil');
  });

  test('a dispersed phase past close packing is flagged near inversion', () => {
    const { logs } = runPipeline(makeFoodState({ water: 15, fat: 80, protein: 5 }, 100), [
      emulsify({ emulsifierHLB: 12 }),
    ]);
    expect(logs[0].detail.flag).toBe('near_inversion');
  });
});

describe('setGel', () => {
  test('gelatin above its minimum sets an elastic, thermoreversible gel', () => {
    const { final, logs } = runPipeline(makeFoodState({ water: 95, sucrose: 5 }, 100), [
      setGel({ agent: 'gelatin', concentrationPct: 2 }),
    ]);
    expect(final.markers.gelSets).toBe(1);
    expect(final.markers.gelStrength).toBeGreaterThan(0.5);
    expect(final.markers.gelSetTempC).toBe(15);
    expect(final.markers.gelMeltTempC).toBe(30);
    expect(logs[0].detail.character).toBe('elastic');
  });

  test('below the minimum dose it does not set', () => {
    const { final, logs } = runPipeline(makeFoodState({ water: 99, sucrose: 1 }, 100), [
      setGel({ agent: 'agar', concentrationPct: 0.2 }),
    ]);
    expect(final.markers.gelSets).toBe(0);
    expect(logs[0].detail.flag).toBe('below_min_concentration');
  });

  test('HM pectin needs high sugar — sets in a jam, not in water', () => {
    const jam = runPipeline(makeFoodState({ water: 38, sucrose: 60, fructose: 2 }, 100), [
      setGel({ agent: 'pectin_hm', concentrationPct: 1 }),
    ]).final;
    expect(jam.markers.gelSets).toBe(1); // °Brix ≈ 62 ≥ 55

    const watery = runPipeline(makeFoodState({ water: 95, sucrose: 5 }, 100), [
      setGel({ agent: 'pectin_hm', concentrationPct: 1 }),
    ]);
    expect(watery.final.markers.gelSets).toBe(0);
    expect(watery.logs[0].detail.flag).toBe('cofactor_required');
  });

  test('kappa carrageenan sets when potassium is present', () => {
    const { final } = runPipeline(makeFoodState({ water: 98 }, 100), [
      setGel({ agent: 'kappa_carrageenan', concentrationPct: 1, hasPotassium: true }),
    ]);
    expect(final.markers.gelSets).toBe(1);
  });
});

describe('temper', () => {
  test('holding dark chocolate at its working point lands in the Form-V window', () => {
    const { final, logs } = runPipeline(makeFoodState({ fat: 40, sucrose: 30, ash: 30 }, 100, 45), [
      temper({ cocoaPercentage: 70 }),
    ]);
    expect(final.markers.temperInWindow).toBe(1);
    expect(logs[0].detail.chocolateClass).toBe('dark');
    expect(final.tempC).toBeGreaterThanOrEqual(31);
    expect(final.tempC).toBeLessThanOrEqual(32.5);
  });

  test('holding too cool falls out of temper', () => {
    const { final, logs } = runPipeline(makeFoodState({ fat: 40, sucrose: 30, ash: 30 }, 100, 45), [
      temper({ cocoaPercentage: 70, tempC: 25 }),
    ]);
    expect(final.markers.temperInWindow).toBe(0);
    expect(logs[0].detail.flag).toBe('out_of_temper');
    expect(final.tempC).toBe(25);
  });

  test('class follows cocoa % (milk vs dark have different windows)', () => {
    const milk = runPipeline(makeFoodState({ fat: 30, sucrose: 50, lactose: 20 }, 100, 45), [
      temper({ cocoaPercentage: 35 }),
    ]).final;
    const dark = runPipeline(makeFoodState({ fat: 40, sucrose: 30, ash: 30 }, 100, 45), [
      temper({ cocoaPercentage: 70 }),
    ]).final;
    expect(milk.markers.temperWorkingPointC).toBeLessThan(dark.markers.temperWorkingPointC); // milk tempers cooler
  });
});
