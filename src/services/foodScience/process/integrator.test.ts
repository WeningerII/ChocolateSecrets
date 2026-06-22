import { describe, test, expect } from 'vitest';
import {
  zValueRate,
  arrheniusRate,
  accumulateThermalExtent,
  GAS_CONSTANT_J_PER_MOL_K,
} from './integrator';
import type { ProcessProfile } from './types';

describe('process integrator', () => {
  describe('zValueRate', () => {
    const rate = zValueRate(180, 25);
    test('is 1.0 at the reference temperature', () => {
      expect(rate(180)).toBeCloseTo(1, 10);
    });
    test('is 10x one z above and 0.1x one z below the reference', () => {
      expect(rate(205)).toBeCloseTo(10, 6);
      expect(rate(155)).toBeCloseTo(0.1, 6);
    });
    test('is monotonically increasing in temperature', () => {
      expect(rate(170)).toBeLessThan(rate(180));
      expect(rate(190)).toBeGreaterThan(rate(180));
    });
  });

  describe('arrheniusRate', () => {
    const rate = arrheniusRate(180, 110_000);
    test('is 1.0 at the reference temperature', () => {
      expect(rate(180)).toBeCloseTo(1, 10);
    });
    test('falls below 1 when cooler and rises above 1 when hotter', () => {
      expect(rate(160)).toBeLessThan(1);
      expect(rate(200)).toBeGreaterThan(1);
    });
  });

  describe('accumulateThermalExtent', () => {
    test('a leg held at the reference temperature contributes its own duration', () => {
      const profile: ProcessProfile = {
        segments: [{ tempC: 180, durationS: 1200 }],
        totalDurationS: 1200,
      };
      expect(accumulateThermalExtent(profile, zValueRate(180, 25))).toBeCloseTo(1200, 6);
    });

    test('a hotter leg contributes more equivalent time than its wall-clock duration', () => {
      const profile: ProcessProfile = {
        segments: [{ tempC: 205, durationS: 600 }], // one z hotter => 10x
        totalDurationS: 600,
      };
      expect(accumulateThermalExtent(profile, zValueRate(180, 25))).toBeCloseTo(6000, 3);
    });

    test('sums across legs and ignores non-positive durations', () => {
      const profile: ProcessProfile = {
        segments: [
          { tempC: 180, durationS: 600 }, // 1x   => 600
          { tempC: 155, durationS: 600 }, // 0.1x => 60
          { tempC: 999, durationS: 0 },   // ignored
        ],
        totalDurationS: 1200,
      };
      expect(accumulateThermalExtent(profile, zValueRate(180, 25))).toBeCloseTo(660, 3);
    });

    test('an empty profile yields zero extent', () => {
      const empty: ProcessProfile = { segments: [], totalDurationS: 0 };
      expect(accumulateThermalExtent(empty, zValueRate(180, 25))).toBe(0);
    });
  });

  test('exposes the standard gas constant', () => {
    expect(GAS_CONSTANT_J_PER_MOL_K).toBeCloseTo(8.314, 3);
  });
});
