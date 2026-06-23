import { describe, test, expect } from 'vitest';
import { computePlankTime } from './plankFreezing';
import type { Composition } from '../../../types';

const beef: Composition = { water: 74, protein: 21, fat: 5 };

describe('computePlankTime', () => {
  // 5 cm beef slab frozen at −30 °C, h=30. Textbook scale ~2–3 h.
  test('beef slab freezing time is a few hours and matches the Plank assembly', () => {
    const r = computePlankTime({
      geometry: 'slab', characteristicDimensionM: 0.05, composition: beef,
      mediumTempC: -30, surfaceCoeffWm2K: 30, freezingPointC: -1.75,
    })!;
    expect(r.timeS! / 3600).toBeGreaterThan(1.5);
    expect(r.timeS! / 3600).toBeLessThan(4);
    // frozen shell conductivity from Choi–Okos ice (~1.5–2.2 W/mK)
    expect(r.k).toBeGreaterThan(1.4);
    expect(r.k).toBeLessThan(2.3);
    // reassemble Plank from the reported props to confirm the formula
    const P = 0.5, R = 0.125, a = 0.05, h = 30;
    const expected = (r.rho * r.latentHeatJkg / r.deltaT) * (P * a / h + R * a * a / r.k);
    expect(r.timeS!).toBeCloseTo(expected, 3);
  });

  test('shape factors: sphere freezes fastest, slab slowest (½ : ¼ : ⅙ surface term)', () => {
    const base = { characteristicDimensionM: 0.05, composition: beef, mediumTempC: -30, surfaceCoeffWm2K: 30, freezingPointC: -1.75 };
    const slab = computePlankTime({ ...base, geometry: 'slab' })!;
    const cyl = computePlankTime({ ...base, geometry: 'cylinder' })!;
    const sph = computePlankTime({ ...base, geometry: 'sphere' })!;
    expect(cyl.timeS!).toBeLessThan(slab.timeS!);
    expect(sph.timeS!).toBeLessThan(cyl.timeS!);
    expect(cyl.timeS! / slab.timeS!).toBeCloseTo(0.5, 1);   // half the slab time
  });

  test('thawing is slower than the mirror-image freeze (thawed shell conducts worse)', () => {
    const freeze = computePlankTime({
      geometry: 'sphere', characteristicDimensionM: 0.05, composition: beef,
      mediumTempC: -20, surfaceCoeffWm2K: 30, mode: 'freeze', freezingPointC: -1.75,
    })!;
    const thaw = computePlankTime({
      geometry: 'sphere', characteristicDimensionM: 0.05, composition: beef,
      mediumTempC: 20, surfaceCoeffWm2K: 30, mode: 'thaw', freezingPointC: -1.75,
    })!;
    // same |ΔT| (≈18) both ways, so the difference is purely conductivity:
    expect(thaw.k).toBeLessThan(freeze.k);
    expect(thaw.timeS!).toBeGreaterThan(freeze.timeS!);
  });

  test('a medium warmer than the freezing point cannot freeze', () => {
    const r = computePlankTime({
      geometry: 'slab', characteristicDimensionM: 0.05, composition: beef,
      mediumTempC: 5, surfaceCoeffWm2K: 30, freezingPointC: -1.75,
    })!;
    expect(r.timeS).toBeNull();
    expect(r.flags.map(f => f.kind)).toContain('medium_not_freezing');
  });

  test('freezing point is computed from composition when not supplied', () => {
    const salty: Composition = { water: 90, sodium: 1.2, protein: 8 };
    const r = computePlankTime({
      geometry: 'sphere', characteristicDimensionM: 0.04, composition: salty,
      mediumTempC: -25, surfaceCoeffWm2K: 40,
    })!;
    expect(r.freezingPointC).toBeLessThan(0);   // salt depresses it below 0
    expect(r.timeS!).toBeGreaterThan(0);
  });
});
