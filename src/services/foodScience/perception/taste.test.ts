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

  test('sourness uses titratable acidity when provided, overriding the pH proxy', () => {
    const r = computeTasteProfile({}, 6, { titratableAcidityEqPerL: 0.1 }); // pH 6 would read ~no sour
    expect(r.sour).toBeGreaterThan(40);
    expect(r.flags).toContainEqual({ kind: 'sourness_from_titratable_acidity' });
    expect(r.flags).not.toContainEqual({ kind: 'sourness_from_ph_proxy' });
  });

  test('organic acids in the composition drive sourness directly (the real-acid upgrade)', () => {
    // ~0.8 % lactic acid in water → titratable acidity ~0.089 eq/L → clearly sour,
    // from the acid inventory itself, not a pH proxy.
    const r = computeTasteProfile({ water: 90, lacticAcid: 0.8 }, null);
    expect(r.sour).toBeGreaterThan(40);
    expect(r.flags).toContainEqual({ kind: 'sourness_from_titratable_acidity' });
  });

  test('more lactic acid tastes more sour', () => {
    const mild = computeTasteProfile({ water: 90, lacticAcid: 0.3 }, null).sour;
    const sharp = computeTasteProfile({ water: 90, lacticAcid: 1.2 }, null).sour;
    expect(sharp).toBeGreaterThan(mild);
  });

  test('sweet and sour mutually suppress (mixture interaction)', () => {
    expect(computeTasteProfile({ sucrose: 10 }, 3).sweet)
      .toBeLessThan(computeTasteProfile({ sucrose: 10 }, null).sweet);
    expect(computeTasteProfile({ sucrose: 10 }, 3).sour)
      .toBeLessThan(computeTasteProfile({}, 3).sour);
  });

  test('bitter and umami are null only when the inventory carries no agonist', () => {
    const r = computeTasteProfile({ sucrose: 10 }, null);
    expect(r.bitter).toBeNull();
    expect(r.umami).toBeNull();
    expect(r.flags).toContainEqual({ kind: 'no_bitter_inventory' });
    expect(r.flags).toContainEqual({ kind: 'no_umami_inventory' });
  });

  test('bitter rises with caffeine/theobromine and is suppressed by sweetness', () => {
    const plain = computeTasteProfile({ caffeine: 0.1 }, null);
    expect(plain.bitter).toBeGreaterThan(50);
    expect(plain.flags).not.toContainEqual({ kind: 'no_bitter_inventory' });
    expect(computeTasteProfile({ caffeine: 0.1, sucrose: 30 }, null).bitter!).toBeLessThan(plain.bitter!);
  });

  test('theobromine is a milder bitter than caffeine at equal mass', () => {
    expect(computeTasteProfile({ theobromine: 0.2 }, null).bitter!)
      .toBeLessThan(computeTasteProfile({ caffeine: 0.2 }, null).bitter!);
  });

  test('umami comes from glutamate and is enhanced by salt', () => {
    const u = computeTasteProfile({ glutamate: 0.5 }, null);
    expect(u.umami).toBeGreaterThan(40);
    expect(u.flags).not.toContainEqual({ kind: 'no_umami_inventory' });
    expect(computeTasteProfile({ glutamate: 0.5, sodium: 0.4 }, null).umami!).toBeGreaterThan(u.umami!);
  });

  test('intensities are clamped to 0..100', () => {
    const r = computeTasteProfile({ sucrose: 100, sodium: 50 }, 1);
    for (const v of [r.sweet, r.salty, r.sour]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});
