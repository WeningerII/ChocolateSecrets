import { describe, test, expect } from 'vitest';
import { computePalatability } from './palatability';
import type { TasteProfile } from './taste';

const profile = (p: Partial<TasteProfile>): TasteProfile =>
  ({ sweet: 0, salty: 0, sour: 0, bitter: null, umami: null, flags: [], ...p });

describe('computePalatability', () => {
  test('a flat (flavorless) profile scores 0 and is flagged', () => {
    const r = computePalatability(profile({}));
    expect(r.balance).toBe(0);
    expect(r.flags).toContainEqual({ kind: 'flat_profile' });
  });

  test('a balanced multi-taste profile scores high', () => {
    expect(computePalatability(profile({ sweet: 55, salty: 30, sour: 18 })).balance).toBeGreaterThan(70);
  });

  test('a one-note profile scores below an equally on-point balanced one', () => {
    const oneNote = computePalatability(profile({ sweet: 55 })).balance;
    const balanced = computePalatability(profile({ sweet: 55, salty: 30, sour: 18 })).balance;
    expect(oneNote).toBeGreaterThan(0);
    expect(oneNote).toBeLessThan(balanced);
  });

  test('an unbalanced dominant bitter is penalized and flagged', () => {
    const r = computePalatability(profile({ sweet: 10, bitter: 70 }));
    expect(r.balance).toBeLessThan(30);
    expect(r.flags).toContainEqual({ kind: 'dominant_aversive', taste: 'bitter' });
  });

  test('sweetness balances bitterness (same bitter, more sweet → higher balance)', () => {
    const harsh = computePalatability(profile({ sweet: 10, bitter: 70 })).balance;
    const rounded = computePalatability(profile({ sweet: 55, bitter: 70 })).balance;
    expect(rounded).toBeGreaterThan(harsh);
  });

  test('acceptability peaks at the bliss point', () => {
    expect(computePalatability(profile({ sweet: 55 })).acceptability.sweet).toBeCloseTo(1, 5);
  });

  // Regression (hardening sweep): BLISS.umami.width = 40 was too wide. At umami=100
  // the acceptability was ~53 % — less penalty than sweet=100 (44 %). Half-acceptability
  // threshold landed at ~102, outside the valid 0-100 scale. Width must be 25 so
  // umami=100 is distinctly penalized (≈7–8 % acceptance, not 53 %).
  test('umami=100 is strongly penalized — width 25 gives acceptability well below 50 %', () => {
    const r = computePalatability(profile({ umami: 100 }));
    expect(r.acceptability.umami!).toBeLessThan(0.25); // very over-intense
  });
});
