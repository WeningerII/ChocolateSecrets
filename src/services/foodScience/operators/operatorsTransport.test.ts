import { describe, test, expect } from 'vitest';
import { makeFoodState } from './state';
import { runPipeline } from './pipeline';
import { brine } from './brine';
import { dehydrate } from './dehydrate';
import { freeze } from './freeze';

describe('brine / cure (solute uptake by diffusion)', () => {
  // A 1 cm-half-thickness slab of lean meat in a well-stirred bath.
  const meat = () => makeFoodState({ water: 75, protein: 20, fat: 5 }, 100, 6);

  test('a salt brine raises sodium and mass; sodium stays ≤ ash', () => {
    const day3 = 3 * 24 * 3600;
    const { final, logs } = runPipeline(meat(), [
      brine({ solute: 'salt', bathConcentrationPct: 10, geometry: 'slab', characteristicLengthM: 0.01, durationS: day3 }),
    ]);
    expect(final.composition.sodium!).toBeGreaterThan(1.5); // was 0
    expect(final.massG).toBeGreaterThan(104);               // absorbed several g of NaCl
    expect(final.composition.sodium!).toBeLessThanOrEqual(final.composition.ash! + 1e-9); // Na ⊆ ash
    expect(logs[0].detail.solute).toBe('salt');
    expect(final.markers.brineCenterSaturation).toBeGreaterThan(0.5);
  });

  test('longer soak absorbs more (monotone in time)', () => {
    const short = runPipeline(meat(), [
      brine({ solute: 'salt', bathConcentrationPct: 10, geometry: 'slab', characteristicLengthM: 0.01, durationS: 24 * 3600 }),
    ]).final;
    const long = runPipeline(meat(), [
      brine({ solute: 'salt', bathConcentrationPct: 10, geometry: 'slab', characteristicLengthM: 0.01, durationS: 4 * 24 * 3600 }),
    ]).final;
    expect(long.markers.saltAbsorbedG).toBeGreaterThan(short.markers.saltAbsorbedG);
    expect(long.markers.brineCenterSaturation).toBeGreaterThan(short.markers.brineCenterSaturation);
  });

  test('a sugar syrup candies fruit — sucrose climbs, mass grows', () => {
    const fruit = makeFoodState({ water: 88, sucrose: 12 }, 100, 20);
    const { final } = runPipeline(fruit, [
      brine({ solute: 'sugar', bathConcentrationPct: 60, geometry: 'slab', characteristicLengthM: 0.005, durationS: 4 * 24 * 3600 }),
    ]);
    expect(final.composition.sucrose!).toBeGreaterThan(30); // from 12 %
    expect(final.massG).toBeGreaterThan(150);
    expect(final.markers.sugarAbsorbedG).toBeGreaterThan(0);
  });

  // Regression (hardening sweep): BrineFlag had no 'no_water' variant. When the
  // food has zero water the absorb path was still entered and brineCenterSaturation
  // was set to a meaningful-looking diffusion number despite zero absorption.
  test('brining a waterless food flags no_water and absorbs nothing', () => {
    const dry = makeFoodState({ sucrose: 100 }, 100, 20); // zero water
    const { final, logs } = runPipeline(dry, [
      brine({ solute: 'salt', bathConcentrationPct: 10, geometry: 'slab', characteristicLengthM: 0.01, durationS: 3 * 24 * 3600 }),
    ]);
    expect(logs[0].detail.flag).toBe('no_water');
    expect(final.markers.saltAbsorbedG ?? 0).toBe(0);
    expect(final.markers.brineCenterSaturation).toBe(0);
    expect(final.massG).toBeCloseTo(100, 6); // mass unchanged
  });
});

describe('dehydrate (convective drying)', () => {
  test('warm dry air removes water, concentrates solute, and cools to the wet bulb', () => {
    const leather = makeFoodState({ water: 80, sucrose: 20 }, 100, 20);
    const { final } = runPipeline(leather, [
      dehydrate({ airTempC: 60, relativeHumidity: 0.2, surfaceCoeffWm2K: 25, surfaceAreaM2: 0.01, durationS: 3600 }),
    ]);
    expect(final.markers.waterRemovedG).toBeGreaterThan(0);
    expect(final.massG).toBeLessThan(100);
    expect(final.composition.sucrose!).toBeGreaterThan(20); // concentrated
    expect(final.markers.concentrationFactor).toBeGreaterThan(1);
    expect(final.tempC).toBeLessThan(60);                   // evaporative cooling
    expect(final.tempC).toBeGreaterThan(0);
    expect(final.tempC).toBeCloseTo(final.markers.dryingWetBulbC, 6);
  });

  test('saturated air cannot dry (no flux, no cooling)', () => {
    const { final, logs } = runPipeline(makeFoodState({ water: 80, sucrose: 20 }, 100, 20), [
      dehydrate({ airTempC: 60, relativeHumidity: 1.0, surfaceCoeffWm2K: 25, surfaceAreaM2: 0.01, durationS: 3600 }),
    ]);
    expect(final.markers.waterRemovedG).toBe(0);
    expect(logs[0].detail.flag).toBe('saturated_air');
    expect(final.tempC).toBeCloseTo(60, 0); // wet bulb ≈ air temp when saturated
  });

  test('drying past the available water is flagged water_limited', () => {
    const { final, logs } = runPipeline(makeFoodState({ water: 50, sucrose: 50 }, 10, 20), [
      dehydrate({ airTempC: 70, relativeHumidity: 0.1, surfaceCoeffWm2K: 30, surfaceAreaM2: 0.05, durationS: 7200 }),
    ]);
    expect(final.composition.water ?? 0).toBe(0);
    expect(logs[0].detail.flag).toBe('water_limited');
  });

  // Regression (hardening sweep): bone-dry air (RH=0, e.g. a desiccant dryer) dries
  // FASTEST. The RH=0 wet-bulb bug made dehydrate remove zero water and pin the
  // surface to the air temperature — the driest air behaving like saturated air.
  test('bone-dry air (RH=0) removes more water than humid air, with evaporative cooling', () => {
    const leather = () => makeFoodState({ water: 80, sucrose: 20 }, 100, 20);
    const boneDry = runPipeline(leather(), [
      dehydrate({ airTempC: 60, relativeHumidity: 0, surfaceCoeffWm2K: 25, surfaceAreaM2: 0.01, durationS: 3600 }),
    ]).final;
    const humid = runPipeline(leather(), [
      dehydrate({ airTempC: 60, relativeHumidity: 0.5, surfaceCoeffWm2K: 25, surfaceAreaM2: 0.01, durationS: 3600 }),
    ]).final;
    expect(boneDry.markers.waterRemovedG).toBeGreaterThan(0);
    expect(boneDry.markers.waterRemovedG).toBeGreaterThan(humid.markers.waterRemovedG);
    expect(boneDry.tempC).toBeLessThan(60);   // evaporative cooling to the wet bulb
    expect(boneDry.tempC).toBeGreaterThan(0);
  });
});

describe('freeze / thaw (Plank time + ice fraction)', () => {
  const iceCreamMix = () => makeFoodState({ water: 60, sucrose: 20, lactose: 6, fat: 10, protein: 4 }, 100, 4);

  test('freezing gives a sub-zero freezing point, an ice fraction, and a finite time', () => {
    const { final, logs } = runPipeline(iceCreamMix(), [
      freeze({ geometry: 'sphere', characteristicDimensionM: 0.04, mediumTempC: -30, surfaceCoeffWm2K: 20, targetTempC: -18 }),
    ]);
    expect(final.markers.freezingPointC).toBeLessThan(0);
    expect(final.markers.iceFractionAtTarget).toBeGreaterThan(0);
    expect(final.markers.iceFractionAtTarget).toBeLessThan(1);
    expect(final.markers.freezingTimeS).toBeGreaterThan(0);
    expect(final.tempC).toBe(-18); // reaches the target
    expect(logs[0].operator).toBe('freeze');
  });

  test('a colder serving temperature holds more ice', () => {
    const cold = runPipeline(iceCreamMix(), [
      freeze({ geometry: 'sphere', characteristicDimensionM: 0.04, mediumTempC: -30, surfaceCoeffWm2K: 20, targetTempC: -25 }),
    ]).final;
    const warm = runPipeline(iceCreamMix(), [
      freeze({ geometry: 'sphere', characteristicDimensionM: 0.04, mediumTempC: -30, surfaceCoeffWm2K: 20, targetTempC: -8 }),
    ]).final;
    expect(cold.markers.iceFractionAtTarget).toBeGreaterThan(warm.markers.iceFractionAtTarget);
  });

  test('a medium warmer than the freezing point cannot freeze (flagged)', () => {
    const { final, logs } = runPipeline(iceCreamMix(), [
      freeze({ geometry: 'sphere', characteristicDimensionM: 0.04, mediumTempC: 5, surfaceCoeffWm2K: 20 }),
    ]);
    expect(logs[0].detail.flag).toBe('medium_not_freezing');
    expect(final.markers.freezingTimeS).toBeUndefined(); // no valid time
  });

  test('thawing above 0 °C leaves no ice and takes time', () => {
    const { final, logs } = runPipeline(iceCreamMix(), [
      freeze({ geometry: 'slab', characteristicDimensionM: 0.05, mediumTempC: 20, surfaceCoeffWm2K: 15, mode: 'thaw', targetTempC: 5 }),
    ]);
    expect(final.markers.iceFractionAtTarget).toBe(0);
    expect(final.markers.freezingTimeS).toBeGreaterThan(0);
    expect(logs[0].operator).toBe('thaw');
    expect(typeof logs[0].detail.timeMin).toBe('number');
  });
});
