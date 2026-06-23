import { describe, test, expect } from 'vitest';
import { computeDoneness, estimateSpecificHeat, GELATINIZATION_C } from './doneness';
import { profileFromSegments } from './profile';
import type { Composition } from '../../../types';

const MOIST: Composition = { water: 40, sucrose: 20, protein: 8, fat: 20 }; // batter
const CANDY: Composition = { water: 5, sucrose: 90 };                       // low-water syrup

describe('estimateSpecificHeat (Siebel)', () => {
  test('reduces to water and to dry-solid limits', () => {
    expect(estimateSpecificHeat({ water: 100 })).toBeCloseTo(4186, 0); // pure water
    expect(estimateSpecificHeat({})).toBeCloseTo(837, 0);              // dry solids
    expect(estimateSpecificHeat({ water: 50, sucrose: 50 })).toBeCloseTo(837 + 3349 * 0.5, 3);
  });
});

describe('computeDoneness', () => {
  test('no thermal process => band none, flagged', () => {
    const r = computeDoneness({ profile: { segments: [], totalDurationS: 0 }, composition: MOIST, charLengthM: 0.005 });
    expect(r.band).toBe('none');
    expect(r.flags).toContainEqual({ kind: 'no_thermal_process' });
  });

  test('a thin moist item baked long reaches core doneness, capped by the evaporative plateau', () => {
    const r = computeDoneness({
      profile: profileFromSegments([{ tempC: 180, durationS: 1800 }]),
      composition: MOIST,
      charLengthM: 0.003,
    });
    expect(r.band).toBe('done');
    expect(r.peakCoreTempC).toBeGreaterThan(95);
    expect(r.peakCoreTempC).toBeLessThanOrEqual(100); // never exceeds boiling while wet
    expect(r.flags).toContainEqual({ kind: 'evaporative_plateau_applied' });
    expect(r.reachedThresholds.doneness).toBe(true);
  });

  test('a thick moist item baked briefly stays raw and is flagged high-Biot', () => {
    const r = computeDoneness({
      profile: profileFromSegments([{ tempC: 180, durationS: 600 }]),
      composition: MOIST,
      charLengthM: 0.05,
    });
    expect(r.band).toBe('raw');
    expect(r.peakCoreTempC).toBeLessThan(60);
    expect(r.flags.some(f => f.kind === 'lumped_capacitance_invalid')).toBe(true);
  });

  test('a low-water candy syrup exceeds 100 °C (no evaporative plateau)', () => {
    const r = computeDoneness({
      profile: profileFromSegments([{ tempC: 150, durationS: 1200 }]),
      composition: CANDY,
      charLengthM: 0.01,
    });
    expect(r.peakCoreTempC).toBeGreaterThan(100);
    expect(r.flags.some(f => f.kind === 'evaporative_plateau_applied')).toBe(false);
  });

  test('peak core temperature increases with bake time', () => {
    const base = { composition: MOIST, charLengthM: 0.01 };
    const shortBake = computeDoneness({ ...base, profile: profileFromSegments([{ tempC: 180, durationS: 600 }]) });
    const longBake = computeDoneness({ ...base, profile: profileFromSegments([{ tempC: 180, durationS: 2400 }]) });
    expect(longBake.peakCoreTempC).toBeGreaterThan(shortBake.peakCoreTempC);
  });

  test('reports the thermal transitions the core crossed', () => {
    const r = computeDoneness({
      profile: profileFromSegments([{ tempC: 180, durationS: 1800 }]),
      composition: MOIST,
      charLengthM: 0.003,
    });
    expect(r.peakCoreTempC).toBeGreaterThanOrEqual(GELATINIZATION_C);
    expect(r.reachedThresholds.gelatinization).toBe(true);
    expect(r.reachedThresholds.coagulation).toBe(true);
  });
});
