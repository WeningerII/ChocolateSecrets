import { describe, test, expect } from 'vitest';
import { makeFoodState } from './state';
import { runPipeline } from './pipeline';
import { enzyme } from './enzyme';

describe('enzyme operator (Michaelis-Menten)', () => {
  test('invertase converts sucrose to glucose + fructose (mass conserved)', () => {
    const s = makeFoodState({ water: 50, sucrose: 50 }, 100, 55);
    const { final } = runPipeline(s, [enzyme({ enzyme: 'invertase', durationS: 1000 * 3600 })]);
    expect(final.composition.sucrose!).toBeLessThan(50);
    expect(final.composition.glucose!).toBeGreaterThan(0);
    expect(final.composition.fructose!).toBeGreaterThan(0);
    expect(final.composition.glucose!).toBeCloseTo(final.composition.fructose!, 3); // 1:1
    expect(final.massG).toBeCloseTo(100, 6); // hydrolysis pulls in food water; mass conserved
  });

  test('amylase converts starch to maltose', () => {
    const s = makeFoodState({ water: 50, starch: 50 }, 100, 65);
    const { final } = runPipeline(s, [enzyme({ enzyme: 'amylase', durationS: 1000 * 3600 })]);
    expect(final.composition.starch ?? 0).toBeLessThan(50); // may fully saccharify (→ 0, omitted)
    expect(final.composition.maltose!).toBeGreaterThan(0);
    expect(final.massG).toBeCloseTo(100, 6);
  });

  // Regression (hardening sweep): a malt mash at 65 °C saccharifies the bulk of the
  // starch within ~30–60 min. A too-low Vmax converted only ~1 %/h — off by ~80x.
  test('amylase saccharifies most starch within an hour at the 65 °C rest', () => {
    const mash = makeFoodState({ water: 80, starch: 20 }, 1000, 65); // realistic mash dilution
    const { final } = runPipeline(mash, [enzyme({ enzyme: 'amylase', durationS: 60 * 60 })]);
    const converted = 20 - (final.composition.starch ?? 0);
    expect(converted / 20).toBeGreaterThan(0.5); // >50 % of starch gone in 1h, not ~1 %
  });

  // Regression: dry-aging at 1–4 °C develops umami via slow proteolysis. A 5 °C
  // cardinal floor zeroed it out and falsely flagged the enzyme denatured.
  test('protease stays slowly active through the cold dry-aging band (4 °C)', () => {
    const { final, logs } = runPipeline(makeFoodState({ water: 70, protein: 22, fat: 7, ash: 1 }, 1000, 4), [
      enzyme({ enzyme: 'protease', durationS: 21 * 24 * 3600, tempC: 4 }),
    ]);
    expect(final.composition.glutamate ?? 0).toBeGreaterThan(0); // umami develops, slowly
    expect(final.markers.proteolysisExtent).toBeGreaterThan(0);
    expect(logs[0].detail.flag).not.toBe('denatured');           // cold ≠ denatured
  });

  test('protease frees umami glutamate without consuming protein mass', () => {
    const s = makeFoodState({ water: 70, protein: 20 }, 100, 50);
    const { final } = runPipeline(s, [enzyme({ enzyme: 'protease', durationS: 5000 * 3600 })]);
    expect(final.composition.protein!).toBeCloseTo(20, 4);   // peptides still read as protein
    expect(final.composition.glutamate!).toBeGreaterThan(0); // umami liberated
    expect(final.composition.glutamate!).toBeLessThanOrEqual(0.12 * 20 + 1e-6); // capped at 12 %
    expect(final.markers.proteolysisExtent).toBeGreaterThan(0.9);
  });

  test('temperature: activity peaks at the optimum and denatures above the max', () => {
    const base = { water: 50, sucrose: 50 } as const;
    const opt = runPipeline(makeFoodState({ ...base }, 100, 55), [enzyme({ enzyme: 'invertase', durationS: 5 * 3600 })]);
    const cold = runPipeline(makeFoodState({ ...base }, 100, 12), [enzyme({ enzyme: 'invertase', durationS: 5 * 3600 })]);
    const hot = runPipeline(makeFoodState({ ...base }, 100, 70), [enzyme({ enzyme: 'invertase', durationS: 5 * 3600 })]); // > Tmax 65
    expect(opt.final.markers.invertaseTurnedOverG).toBeGreaterThan(cold.final.markers.invertaseTurnedOverG);
    expect(hot.final.markers.invertaseTurnedOverG).toBe(0); // denatured
    expect(hot.logs[0].detail.flag).toBe('denatured');
  });

  test('conversion increases with time (saturating)', () => {
    const s = () => makeFoodState({ water: 50, sucrose: 50 }, 100, 55);
    const short = runPipeline(s(), [enzyme({ enzyme: 'invertase', durationS: 2 * 3600 })]);
    const long = runPipeline(s(), [enzyme({ enzyme: 'invertase', durationS: 20 * 3600 })]);
    expect(long.final.markers.invertaseTurnedOverG).toBeGreaterThan(short.final.markers.invertaseTurnedOverG);
  });

  test('no aqueous phase → no reaction', () => {
    const s = makeFoodState({ sucrose: 100 }, 100, 55); // no water
    const { final, logs } = runPipeline(s, [enzyme({ enzyme: 'invertase', durationS: 10 * 3600 })]);
    expect(final.markers.invertaseTurnedOverG).toBe(0);
    expect(logs[0].detail.flag).toBe('no_aqueous_phase');
  });

  test('invertase produces fermentable invert sugar (composes into the pipeline)', () => {
    const s = makeFoodState({ water: 60, sucrose: 40 }, 100, 55);
    const { final } = runPipeline(s, [enzyme({ enzyme: 'invertase', durationS: 50 * 3600 })]);
    expect(final.composition.glucose!).toBeGreaterThan(0); // invert sugar ready for yeast
    expect(final.composition.fructose!).toBeGreaterThan(0);
  });
});
