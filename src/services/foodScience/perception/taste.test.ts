import { describe, test, expect } from 'vitest';
import { computeTasteProfile } from './taste';

describe('computeTasteProfile', () => {
  test('a ~10% sucrose solution reads moderate sweetness (~50)', () => {
    const r = computeTasteProfile({ sucrose: 10 }, null);
    expect(r.sweet).toBeCloseTo(50, 0);
    expect(r.salty).toBe(0);
    expect(r.sour).toBe(0);
  });

  test('fructose tastes sweeter than glucose at equal mass', () => {
    expect(computeTasteProfile({ fructose: 10 }, null).sweet)
      .toBeGreaterThan(computeTasteProfile({ glucose: 10 }, null).sweet);
  });

  test('sweetness saturates — doubling sugar less than doubles intensity', () => {
    const a = computeTasteProfile({ sucrose: 10 }, null).sweet;
    const b = computeTasteProfile({ sucrose: 20 }, null).sweet;
    expect(b).toBeGreaterThan(a);
    expect(b).toBeLessThan(2 * a);
  });

  test('sodium drives saltiness', () => {
    const r = computeTasteProfile({ sodium: 0.4 }, null); // ≈ 1 % NaCl
    expect(r.salty).toBeGreaterThan(40);
    expect(r.salty).toBeLessThan(60);
  });

  test('low pH drives sourness; neutral pH does not', () => {
    expect(computeTasteProfile({}, 3).sour).toBeGreaterThan(50);
    expect(computeTasteProfile({}, 6).sour).toBe(0);
    expect(computeTasteProfile({}, 3).flags).toContainEqual({ kind: 'sourness_from_ph_proxy' });
  });

  test('sweet and sour mutually suppress (mixture interaction)', () => {
    expect(computeTasteProfile({ sucrose: 10 }, 3).sweet)
      .toBeLessThan(computeTasteProfile({ sucrose: 10 }, null).sweet);
    expect(computeTasteProfile({ sucrose: 10 }, 3).sour)
      .toBeLessThan(computeTasteProfile({}, 3).sour);
  });

  test('bitter and umami are null until the inventory carries their agonists', () => {
    const r = computeTasteProfile({ sucrose: 10 }, null);
    expect(r.bitter).toBeNull();
    expect(r.umami).toBeNull();
    expect(r.flags).toContainEqual({ kind: 'no_bitter_inventory' });
    expect(r.flags).toContainEqual({ kind: 'no_umami_inventory' });
  });

  test('intensities are clamped to 0..100', () => {
    const r = computeTasteProfile({ sucrose: 100, sodium: 50 }, 1);
    for (const v of [r.sweet, r.salty, r.sour]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});
