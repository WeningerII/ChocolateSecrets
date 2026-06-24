import { describe, test, expect } from 'vitest';
import { makeFoodState } from './state';
import { runPipeline } from './pipeline';
import { caramelize } from './caramelize';
import { aerate } from './aerate';
import { chill } from './chill';
import { add } from './add';

describe('caramelize', () => {
  const syrup = () => makeFoodState({ water: 10, sucrose: 90 }, 100, 20);

  test('develops caramel above the threshold; ~nothing below it', () => {
    const hot = runPipeline(syrup(), [caramelize({ tempC: 180, durationS: 600 })]).final; // 10 min @180
    expect(hot.markers.caramelEquivMin180).toBeCloseTo(10, 0);
    const cool = runPipeline(syrup(), [caramelize({ tempC: 140, durationS: 600 })]).final; // below 160
    expect(cool.markers.caramelEquivMin180).toBeLessThan(1);
  });

  test('hotter caramelizes faster, and it needs sugar', () => {
    const at200 = runPipeline(syrup(), [caramelize({ tempC: 200, durationS: 300 })]).final;
    const at180 = runPipeline(syrup(), [caramelize({ tempC: 180, durationS: 300 })]).final;
    expect(at200.markers.caramelEquivMin180).toBeGreaterThan(at180.markers.caramelEquivMin180);
    const noSugar = runPipeline(makeFoodState({ water: 50, protein: 50 }, 100), [caramelize({ tempC: 190, durationS: 600 })]).final;
    expect(noSugar.markers.caramelEquivMin180).toBe(0);
  });
});

describe('aerate (overrun)', () => {
  test('egg white whips to a high overrun; water cannot aerate', () => {
    const meringue = runPipeline(makeFoodState({ water: 88, protein: 11 }, 100), [aerate({ targetOverrunPct: 300 })]).final;
    expect(meringue.markers.overrunPct).toBeGreaterThan(150);
    const water = runPipeline(makeFoodState({ water: 100 }, 100), [aerate({ targetOverrunPct: 100 })]);
    expect(water.final.markers.overrunPct).toBe(0);
    expect(water.logs[0].detail.flag).toBe('cannot_aerate');
  });

  test('cream aerates via its fat (fat-stabilized foam)', () => {
    const cream = runPipeline(makeFoodState({ water: 60, fat: 35, protein: 2 }, 100), [aerate({ targetOverrunPct: 100 })]).final;
    expect(cream.markers.overrunPct).toBeGreaterThan(50);
    expect(cream.markers.densityFactor).toBeCloseTo(1 / (1 + cream.markers.overrunPct / 100), 6);
  });

  test('overrun is capped at the food\'s capability', () => {
    const r = runPipeline(makeFoodState({ water: 60, fat: 35 }, 100), [aerate({ targetOverrunPct: 500 })]);
    expect(r.final.markers.overrunPct).toBeLessThan(500);
    expect(r.logs[0].detail.flag).toBe('aeration_limited');
  });
});

describe('chill', () => {
  test('cooling a concentrated syrup raises supersaturation (graining risk)', () => {
    const s = makeFoodState({ water: 30, sucrose: 70 }, 100, 110);
    const cold = runPipeline(s, [chill({ tempC: 10 })]).final;
    const warm = runPipeline(s, [chill({ tempC: 50 })]).final;
    expect(cold.markers.grainingSupersaturation).toBeGreaterThan(warm.markers.grainingSupersaturation);
    expect(cold.tempC).toBe(10);
  });
});

describe('add (combine)', () => {
  test('blends compositions by mass balance', () => {
    const s = makeFoodState({ water: 100 }, 100, 20);
    const { final } = runPipeline(s, [add({ composition: { water: 60, fat: 35, protein: 3, lactose: 2 }, massG: 50 })]);
    expect(final.massG).toBe(150);
    expect(final.composition.water!).toBeCloseTo((100 + 30) / 150 * 100, 3); // 86.67 %
    expect(final.composition.fat!).toBeCloseTo(17.5 / 150 * 100, 3);          // 11.67 %
  });

  test('temperature mixes mass-weighted (tempering)', () => {
    const cold = makeFoodState({ protein: 12, water: 88 }, 100, 20); // eggs
    const { final } = runPipeline(cold, [add({ composition: { sucrose: 70, water: 30 }, massG: 50, tempC: 100 })]); // hot syrup
    expect(final.tempC).toBeCloseTo((100 * 20 + 50 * 100) / 150, 3); // 46.7 °C
  });

  test('adding nothing is a no-op', () => {
    const s = makeFoodState({ water: 100 }, 100, 20);
    const { final } = runPipeline(s, [add({ composition: { sucrose: 100 }, massG: 0 })]);
    expect(final.massG).toBe(100);
  });
});
