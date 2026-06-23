import { describe, test, expect } from 'vitest';
import { makeFoodState, speciesMassesG, massesToComposition } from './state';
import { runPipeline } from './pipeline';
import { ferment, rossoGamma } from './ferment';

describe('FoodState mass-balance helpers', () => {
  test('composition ↔ grams round-trips', () => {
    const s = makeFoodState({ water: 80, glucose: 20 }, 100);
    const g = speciesMassesG(s);
    expect(g.water).toBeCloseTo(80, 6);
    expect(g.glucose).toBeCloseTo(20, 6);
    const back = massesToComposition(g, 100);
    expect(back.glucose).toBeCloseTo(20, 6);
  });
});

describe('rossoGamma cardinal temperature model', () => {
  test('1 at optimum, 0 at the cardinal limits (Wolfram-verified)', () => {
    expect(rossoGamma(22, 4, 22, 38)).toBeCloseTo(1, 6);
    expect(rossoGamma(4, 4, 22, 38)).toBe(0);
    expect(rossoGamma(38, 4, 22, 38)).toBe(0);
    expect(rossoGamma(2, 4, 22, 38)).toBe(0); // below min
    expect(rossoGamma(15, 4, 22, 38)).toBeCloseTo(0.814, 2);
  });
});

describe('ferment operator', () => {
  const start = () => makeFoodState({ water: 80, glucose: 20 }, 100, 22);

  test('converts sugar to ethanol + CO₂ by Gay-Lussac, with mass balance', () => {
    const { final, logs } = runPipeline(start(), [ferment({ culture: 'ale_yeast', durationS: 100 * 3600 })]);
    const converted = final.markers.fermentedSugarG;
    const ethanolG = (final.composition.ethanol! / 100) * final.massG;
    const co2 = final.markers.co2LostG;
    expect(ethanolG / converted).toBeCloseTo(0.5114, 3);   // ethanol yield
    expect(co2 / converted).toBeCloseTo(0.4886, 3);          // CO₂ yield
    expect(100 - final.massG).toBeCloseTo(co2, 6);           // mass lost = CO₂ escaped
    expect(logs[0].operator).toBe('ferment');
  });

  test('a long ferment approaches the attenuation limit (≈95 % of sugar)', () => {
    const { final } = runPipeline(start(), [ferment({ culture: 'ale_yeast', durationS: 1000 * 3600 })]);
    expect(final.markers.fermentedSugarG).toBeCloseTo(19, 1); // 95 % of 20 g
  });

  test('warmer (toward the optimum) ferments faster than cold', () => {
    const warm = runPipeline(start(), [ferment({ culture: 'ale_yeast', durationS: 6 * 3600, tempC: 22 })]);
    const cold = runPipeline(start(), [ferment({ culture: 'ale_yeast', durationS: 6 * 3600, tempC: 6 })]);
    expect(warm.final.markers.fermentedSugarG).toBeGreaterThan(cold.final.markers.fermentedSugarG);
  });

  test('composability: splitting a ferment into two steps ≈ one long step', () => {
    const split = runPipeline(start(), [
      ferment({ culture: 'ale_yeast', durationS: 5 * 3600, tempC: 22 }),
      ferment({ culture: 'ale_yeast', durationS: 5 * 3600, tempC: 22 }),
    ]);
    const single = runPipeline(start(), [ferment({ culture: 'ale_yeast', durationS: 10 * 3600, tempC: 22 })]);
    expect(split.final.markers.fermentedSugarG).toBeCloseTo(single.final.markers.fermentedSugarG, 1);
    // the trajectory carries every intermediate state
    expect(split.trajectory).toHaveLength(3);
    expect(split.final.timeS).toBe(10 * 3600);
  });

  test('lager yeast is slower than ale at the same warm temperature', () => {
    const ale = runPipeline(start(), [ferment({ culture: 'ale_yeast', durationS: 4 * 3600, tempC: 20 })]);
    const lager = runPipeline(start(), [ferment({ culture: 'lager_yeast', durationS: 4 * 3600, tempC: 20 })]);
    expect(ale.final.markers.fermentedSugarG).toBeGreaterThan(lager.final.markers.fermentedSugarG);
  });
});
