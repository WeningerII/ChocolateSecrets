import { describe, test, expect } from 'vitest';
import {
  computeLipidOxidation,
  OXIDATION_REF_TEMP_C,
  OXIDATION_REF_DURATION_S,
  OXIDATION_AW_MINIMUM,
  DEFAULT_UNSATURATED_FRACTION,
} from './oxidation';
import { profileFromSegments } from './profile';
import type { Composition } from '../../../types';

const refStorage = profileFromSegments([{ tempC: OXIDATION_REF_TEMP_C, durationS: OXIDATION_REF_DURATION_S }]);
const FATTY: Composition = { fat: 20, unsaturatedFat: 10 }; // the reference oxidizable level

describe('computeLipidOxidation', () => {
  test('reference exposure of reference fat at the a_w minimum scores ~1 (moderate)', () => {
    const r = computeLipidOxidation(FATTY, OXIDATION_AW_MINIMUM, refStorage);
    expect(r.index).toBeCloseTo(1, 1);
    expect(r.band).toBe('moderate');
    expect(r.awFactor).toBeCloseTo(1, 6);
    expect(r.flags).toHaveLength(0);
  });

  test('no storage process => no oxidation, flagged', () => {
    const r = computeLipidOxidation(FATTY, OXIDATION_AW_MINIMUM, { segments: [], totalDurationS: 0 });
    expect(r.index).toBe(0);
    expect(r.band).toBe('none');
    expect(r.flags).toContainEqual({ kind: 'no_storage_process' });
  });

  test('a fat-free mix cannot go rancid', () => {
    const r = computeLipidOxidation({ sucrose: 80, water: 20 }, OXIDATION_AW_MINIMUM, refStorage);
    expect(r.index).toBe(0);
    expect(r.band).toBe('none');
    expect(r.flags).toContainEqual({ kind: 'no_oxidizable_fat' });
  });

  test('falls back to fat × default fraction when the unsaturated split is unknown, and flags it', () => {
    const r = computeLipidOxidation({ fat: 50 }, OXIDATION_AW_MINIMUM, refStorage);
    expect(r.oxidizableFatPct).toBeCloseTo(50 * DEFAULT_UNSATURATED_FRACTION, 6);
    expect(r.flags).toContainEqual({ kind: 'unsaturated_fat_estimated' });
  });

  test('oxidation accelerates with warmer storage', () => {
    const cool = computeLipidOxidation(FATTY, OXIDATION_AW_MINIMUM, profileFromSegments([{ tempC: 4, durationS: OXIDATION_REF_DURATION_S }]));
    const warm = computeLipidOxidation(FATTY, OXIDATION_AW_MINIMUM, profileFromSegments([{ tempC: 30, durationS: OXIDATION_REF_DURATION_S }]));
    expect(warm.index).toBeGreaterThan(cool.index);
  });

  test('oxidation is slowest at the monolayer a_w, faster both drier and wetter', () => {
    const dry = computeLipidOxidation(FATTY, 0.05, refStorage);
    const min = computeLipidOxidation(FATTY, OXIDATION_AW_MINIMUM, refStorage);
    const wet = computeLipidOxidation(FATTY, 0.9, refStorage);
    expect(min.index).toBeLessThan(dry.index);
    expect(min.index).toBeLessThan(wet.index);
  });

  test('more unsaturated fat raises the rancidity potential', () => {
    const lean = computeLipidOxidation({ fat: 5, unsaturatedFat: 2 }, OXIDATION_AW_MINIMUM, refStorage);
    const rich = computeLipidOxidation({ fat: 40, unsaturatedFat: 35 }, OXIDATION_AW_MINIMUM, refStorage);
    expect(rich.index).toBeGreaterThan(lean.index);
  });
});
