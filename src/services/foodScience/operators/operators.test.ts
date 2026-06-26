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

  test('converts sugar to ethanol + glycerol + CO₂ at realized (sub-Gay-Lussac) yields, with mass balance', () => {
    const { final, logs } = runPipeline(start(), [ferment({ culture: 'ale_yeast', durationS: 100 * 3600 })]);
    const converted = final.markers.fermentedSugarG;
    const ethanolG = (final.composition.ethanol! / 100) * final.massG;
    const glycerolG = (final.composition.glycerol! / 100) * final.massG;
    const co2 = final.markers.co2LostG;
    // Realized yields are below the Gay-Lussac ceiling (0.5114) — carbon diverted to
    // glycerol + biomass — so the engine doesn't over-predict alcoholic strength.
    expect(ethanolG / converted).toBeCloseTo(0.475, 3);    // realized ethanol yield
    expect(glycerolG / converted).toBeCloseTo(0.035, 3);   // glycerol byproduct (stays in solution)
    expect(co2 / converted).toBeCloseTo(0.490, 3);           // CO₂ yield
    expect(100 - final.massG).toBeCloseTo(co2, 6);           // only CO₂ leaves; ethanol + glycerol stay
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

  test('yogurt (homofermentative) makes lactic acid from lactose — no gas, mass conserved', () => {
    const s = makeFoodState({ water: 87, lactose: 5, protein: 3, glucose: 5 }, 100, 42);
    const { final } = runPipeline(s, [ferment({ culture: 'yogurt_lactic', durationS: 200 * 3600 })]);
    expect(final.composition.lacticAcid!).toBeGreaterThan(0);
    expect(final.markers.co2LostG).toBe(0);          // homofermentative → no CO₂
    expect(final.massG).toBeCloseTo(100, 6);          // mass conserved
    const lacticG = (final.composition.lacticAcid! / 100) * final.massG;
    expect(lacticG).toBeCloseTo(final.markers.fermentedSugarG, 4); // yield 1.0 g/g
  });

  // Regression (realistic-scenario hardening): LAB self-inhibit on acid, so yogurt
  // converts only ~⅕ of milk lactose → ~0.8–1 % lactic acid. A yeast-like 0.9
  // attenuation made impossibly sour ~4 % yogurt; the limit must stay realistic
  // even at long fermentation, leaving most lactose behind.
  test('milk → yogurt stays at a realistic acidity (not yeast-attenuated)', () => {
    const milk = makeFoodState({ water: 87.5, lactose: 4.8, fat: 3.5, protein: 3.4, ash: 0.8 }, 1000, 43);
    const { final } = runPipeline(milk, [ferment({ culture: 'yogurt_lactic', durationS: 200 * 3600 })]);
    expect(final.composition.lacticAcid!).toBeGreaterThan(0.6);
    expect(final.composition.lacticAcid!).toBeLessThan(1.3); // not ~4 %
    expect(final.composition.lactose!).toBeGreaterThan(3);   // most lactose remains (yogurt isn't lactose-free)
  });

  test('sourdough (heterofermentative) makes lactic acid + ethanol + CO₂', () => {
    const s = makeFoodState({ water: 60, maltose: 20, glucose: 20 }, 100, 28);
    const { final } = runPipeline(s, [ferment({ culture: 'sourdough', durationS: 200 * 3600 })]);
    expect(final.composition.lacticAcid!).toBeGreaterThan(0);
    expect(final.composition.ethanol!).toBeGreaterThan(0);
    expect(final.markers.co2LostG).toBeGreaterThan(0); // leavening
  });

  // Regression (hardening sweep): acetobacter culture was missing; ProductSpecies
  // included aceticAcid but no culture produced it. Vinegar production must work.
  test('acetobacter oxidises ethanol to acetic acid (vinegar)', () => {
    const wine = makeFoodState({ water: 87, ethanol: 12, ash: 1 }, 1000, 28);
    const { final } = runPipeline(wine, [ferment({ culture: 'acetobacter', durationS: 30 * 24 * 3600 })]);
    expect(final.composition.aceticAcid!).toBeGreaterThan(0); // vinegar acidity built up
    expect(final.composition.ethanol!).toBeLessThan(12);       // ethanol consumed
  });

  // Regression (hardening sweep): no osmotic inhibition meant a 60 Brix jam
  // fermented at full speed — physically impossible. Above BRIX_MAX=60 fermentation
  // must halt entirely.
  test('osmotic inhibition: 60 Brix sugar syrup does not ferment', () => {
    const jam = makeFoodState({ water: 40, sucrose: 60 }, 100, 25); // ~60 Brix
    const normal = makeFoodState({ water: 90, glucose: 10 }, 100, 25); // ~10 Brix
    const jamConverted  = runPipeline(jam,    [ferment({ culture: 'ale_yeast', durationS: 48 * 3600 })]).final.markers.fermentedSugarG;
    const normConverted = runPipeline(normal, [ferment({ culture: 'ale_yeast', durationS: 48 * 3600 })]).final.markers.fermentedSugarG;
    // 60 Brix is at the osmotic maximum → zero activity
    expect(jamConverted).toBe(0);
    // Dilute solution ferments freely
    expect(normConverted).toBeGreaterThan(0);
  });
});
