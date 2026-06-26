import { describe, test, expect } from 'vitest';
import { computeGelation } from './gelation';

describe('computeGelation', () => {
  test('gelatin above its minimum gels, thermoreversible, melts near body temp', () => {
    const r = computeGelation('gelatin', 2);
    expect(r.gels).toBe(true);
    expect(r.thermoreversible).toBe(true);
    expect(r.meltTempC).toBe(30);
  });

  test('below the minimum dose it does not gel, flagged', () => {
    const r = computeGelation('agar', 0.2);
    expect(r.gels).toBe(false);
    expect(r.flags).toContainEqual({ kind: 'below_min_concentration', minPct: 0.5 });
  });

  test('HM pectin needs high sugar — without it, no gel; with it, gels', () => {
    const noSugar = computeGelation('pectin_hm', 1, { sugarBrix: 30 });
    expect(noSugar.gels).toBe(false);
    expect(noSugar.flags).toContainEqual({ kind: 'cofactor_required', cofactor: 'high_sugar' });
    expect(computeGelation('pectin_hm', 1, { sugarBrix: 65 }).gels).toBe(true);
  });

  test('an unknown co-factor context is flagged but does not block', () => {
    const r = computeGelation('sodium_alginate', 1); // needs calcium, not supplied
    expect(r.flags).toContainEqual({ kind: 'cofactor_unknown', cofactor: 'calcium' });
    expect(r.gels).toBe(true);
  });

  test('strength rises with dose above the minimum', () => {
    expect(computeGelation('gelatin', 2).strength).toBeGreaterThan(computeGelation('gelatin', 0.6).strength);
  });

  test('methylcellulose is the inverse gel — sets on heating', () => {
    expect(computeGelation('methylcellulose', 2).character).toBe('thermo_inverse');
  });

  // Regression (hardening sweep): locust_bean_gum and xanthan were missing from
  // both the GellingAgent union and GEL_PROFILES table.
  test('locust bean gum gels above its 0.3 % minimum (cold-set, thermoirreversible)', () => {
    const r = computeGelation('locust_bean_gum', 0.5);
    expect(r.gels).toBe(true);
    expect(r.thermoreversible).toBe(false);
    expect(r.setTempC).toBeNull(); // sets without temperature trigger
  });

  test('xanthan gels above its 0.05 % minimum (thermoreversible)', () => {
    const r = computeGelation('xanthan', 0.1);
    expect(r.gels).toBe(true);
    expect(r.thermoreversible).toBe(true);
  });

  test('locust bean gum below 0.3 % does not gel', () => {
    expect(computeGelation('locust_bean_gum', 0.2).gels).toBe(false);
  });
});
