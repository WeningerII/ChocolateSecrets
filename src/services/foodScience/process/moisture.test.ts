import { describe, test, expect } from 'vitest';
import { computeMoistureMigration, MOISTURE_BARRIER_TIME_CONSTANT_S } from './moisture';
import { profileFromSegments } from './profile';

// ~10 barrier time constants ⇒ effectively fully equilibrated.
const longStorage = profileFromSegments([{ tempC: 20, durationS: 10 * MOISTURE_BARRIER_TIME_CONSTANT_S }]);

describe('computeMoistureMigration', () => {
  test('a single phase has no gradient, flagged', () => {
    const r = computeMoistureMigration([0.6], longStorage);
    expect(r.band).toBe('none');
    expect(r.index).toBe(0);
    expect(r.flags).toContainEqual({ kind: 'single_phase' });
  });

  test('two phases with equal a_w have no driving gap', () => {
    const r = computeMoistureMigration([0.6, 0.6], longStorage);
    expect(r.drivingAwGap).toBe(0);
    expect(r.band).toBe('none');
  });

  test('a large a_w gap over long storage is high risk', () => {
    const r = computeMoistureMigration([0.85, 0.45], longStorage);
    expect(r.drivingAwGap).toBeCloseTo(0.4, 6);
    expect(r.equilibratedFraction).toBeGreaterThan(0.99);
    expect(r.band).toBe('high');
  });

  test('no storage time => nothing migrates, flagged', () => {
    const r = computeMoistureMigration([0.85, 0.45], { segments: [], totalDurationS: 0 });
    expect(r.index).toBe(0);
    expect(r.band).toBe('none');
    expect(r.flags).toContainEqual({ kind: 'no_storage_process' });
  });

  test('migration grows with the a_w gap and with storage time', () => {
    const small = computeMoistureMigration([0.65, 0.6], longStorage);
    const big = computeMoistureMigration([0.9, 0.4], longStorage);
    expect(big.index).toBeGreaterThan(small.index);

    const brief = computeMoistureMigration([0.9, 0.4], profileFromSegments([{ tempC: 20, durationS: MOISTURE_BARRIER_TIME_CONSTANT_S / 10 }]));
    expect(big.index).toBeGreaterThan(brief.index);
  });

  test('ignores non-finite phase a_w values', () => {
    const r = computeMoistureMigration([0.8, NaN, 0.5], longStorage);
    expect(r.drivingAwGap).toBeCloseTo(0.3, 6);
  });
});
