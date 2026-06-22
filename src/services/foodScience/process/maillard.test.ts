import { describe, test, expect } from 'vitest';
import {
  computeMaillardBrowning,
  MAILLARD_REF_TEMP_C,
  MAILLARD_REF_DURATION_S,
  MAILLARD_AW_OPTIMUM,
} from './maillard';
import { profileFromSegments } from './profile';
import type { Composition } from '../../../types';
import type { ProcessProfile } from './types';

// A reference enriched batter: reducing sugar ~5%, protein ~8% (the model's anchor).
const REF_BATTER: Composition = { water: 30, sucrose: 20, glucose: 5, protein: 8, fat: 20 };
const refProfile: ProcessProfile = profileFromSegments([
  { tempC: MAILLARD_REF_TEMP_C, durationS: MAILLARD_REF_DURATION_S },
]);

describe('computeMaillardBrowning', () => {
  test('the reference bake of the reference batter at the optimum aw scores ~golden', () => {
    const r = computeMaillardBrowning(REF_BATTER, MAILLARD_AW_OPTIMUM, refProfile);
    expect(r.index).toBeCloseTo(1, 1);
    expect(r.band).toBe('golden');
    expect(r.flags).toHaveLength(0);
    expect(r.colorSaturation).toBeGreaterThan(0);
    expect(r.colorSaturation).toBeLessThan(1);
  });

  test('no thermal process => no browning, flagged', () => {
    const r = computeMaillardBrowning(REF_BATTER, MAILLARD_AW_OPTIMUM, { segments: [], totalDurationS: 0 });
    expect(r.index).toBe(0);
    expect(r.colorSaturation).toBe(0);
    expect(r.band).toBe('none');
    expect(r.cookValueS).toBe(0);
    expect(r.flags).toContainEqual({ kind: 'no_thermal_process' });
  });

  test('sucrose is NOT a reducing sugar: a sucrose+protein mix does not brown', () => {
    const r = computeMaillardBrowning({ water: 20, sucrose: 50, protein: 8 }, MAILLARD_AW_OPTIMUM, refProfile);
    expect(r.reactantFactor).toBe(0);
    expect(r.index).toBe(0);
    expect(r.band).toBe('none');
    expect(r.flags).toContainEqual({ kind: 'no_reducing_sugar' });
  });

  test('no protein => no browning, flagged', () => {
    const r = computeMaillardBrowning({ water: 20, glucose: 10 }, MAILLARD_AW_OPTIMUM, refProfile);
    expect(r.index).toBe(0);
    expect(r.flags).toContainEqual({ kind: 'no_protein' });
  });

  test('browning increases with bake temperature', () => {
    const cool = computeMaillardBrowning(REF_BATTER, MAILLARD_AW_OPTIMUM, profileFromSegments([{ tempC: 150, durationS: 1200 }]));
    const hot = computeMaillardBrowning(REF_BATTER, MAILLARD_AW_OPTIMUM, profileFromSegments([{ tempC: 210, durationS: 1200 }]));
    expect(hot.index).toBeGreaterThan(cool.index);
  });

  test('browning increases with bake time', () => {
    const shortBake = computeMaillardBrowning(REF_BATTER, MAILLARD_AW_OPTIMUM, profileFromSegments([{ tempC: 180, durationS: 600 }]));
    const longBake = computeMaillardBrowning(REF_BATTER, MAILLARD_AW_OPTIMUM, profileFromSegments([{ tempC: 180, durationS: 2400 }]));
    expect(longBake.index).toBeGreaterThan(shortBake.index);
  });

  test('browning is fastest near the aw optimum (drops off when too dry or too wet)', () => {
    const dry = computeMaillardBrowning(REF_BATTER, 0.2, refProfile);
    const optimum = computeMaillardBrowning(REF_BATTER, MAILLARD_AW_OPTIMUM, refProfile);
    const wet = computeMaillardBrowning(REF_BATTER, 0.98, refProfile);
    expect(optimum.index).toBeGreaterThan(dry.index);
    expect(optimum.index).toBeGreaterThan(wet.index);
  });

  test('a hot, long bake of a sugar-rich enriched batter scorches (dark)', () => {
    const r = computeMaillardBrowning(
      { water: 15, glucose: 12, fructose: 6, protein: 10, fat: 20 },
      MAILLARD_AW_OPTIMUM,
      profileFromSegments([{ tempC: 220, durationS: 1800 }]),
    );
    expect(r.band).toBe('dark');
    expect(r.colorSaturation).toBeGreaterThan(0.95);
  });
});
