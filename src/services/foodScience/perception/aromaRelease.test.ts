import { describe, test, expect } from 'vitest';
import { computeAromaRelease } from './aromaRelease';

describe('computeAromaRelease', () => {
  test('a fat-free matrix releases every polarity class freely', () => {
    const r = computeAromaRelease({ water: 100 });
    expect(r.oilPhaseFraction).toBe(0);
    expect(r.flags.map(f => f.kind)).toContain('no_fat');
    for (const c of r.classes) {
      expect(c.releaseFactor).toBeCloseTo(1, 6);
      expect(c.band).toBe('free');
    }
  });

  test('fat traps lipophilic aroma far more than polar aroma', () => {
    const r = computeAromaRelease({ water: 60, fat: 40 });
    const polar = r.classes.find(c => c.polarity === 'polar')!;
    const nonpolar = r.classes.find(c => c.polarity === 'nonpolar')!;
    // Both suppressed, but the nonpolar (terpene) far more so.
    expect(nonpolar.releaseFactor).toBeLessThan(polar.releaseFactor);
    expect(nonpolar.band).toBe('muted');
    expect(nonpolar.releaseFactor).toBeLessThan(0.01);
  });

  test('more fat suppresses release monotonically', () => {
    const lean = computeAromaRelease({ water: 90, fat: 10 });
    const rich = computeAromaRelease({ water: 50, fat: 50 });
    const leanMed = lean.classes.find(c => c.polarity === 'medium')!.releaseFactor;
    const richMed = rich.classes.find(c => c.polarity === 'medium')!.releaseFactor;
    expect(richMed).toBeLessThan(leanMed);
  });

  test('a high-fat matrix flags a fat reservoir', () => {
    const r = computeAromaRelease({ water: 30, fat: 70 });
    expect(r.flags.map(f => f.kind)).toContain('fat_reservoir');
  });

  test('release equals the partition formula 1/(1+phi*(Kow-1))', () => {
    const r = computeAromaRelease({ water: 50, fat: 50 });
    const phi = r.oilPhaseFraction;
    for (const c of r.classes) {
      const expected = 1 / (1 + phi * (Math.pow(10, c.logP) - 1));
      expect(c.releaseFactor).toBeCloseTo(expected, 9);
    }
  });

  test('an empty matrix is flagged, not crashed', () => {
    const r = computeAromaRelease({});
    expect(r.flags.map(f => f.kind)).toContain('no_matrix');
    expect(r.oilPhaseFraction).toBe(0);
  });
});
