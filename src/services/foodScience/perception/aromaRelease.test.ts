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

  // Regression (hardening sweep): the 'muted' band previously spanned a 650×
  // range (releaseFactor ~0.003 % to ~19 %) with no sub-classification. In a
  // near-pure fat matrix (e.g. ganache, cocoa butter), the nonpolar terpenes are
  // effectively fully trapped (releaseFactor < 1 %), yet they were quietly labeled
  // 'muted' — indistinguishable from a moderately fat matrix.
  test('near-total fat trapping (fat=99, water=1) fires near_total_trapping for nonpolar class', () => {
    const r = computeAromaRelease({ fat: 99, water: 1 });
    const trappingFlags = r.flags.filter(f => f.kind === 'near_total_trapping');
    expect(trappingFlags.length).toBeGreaterThan(0);
    // Specifically the nonpolar class (limonene) must be near-totally trapped
    expect(trappingFlags.some(f => f.kind === 'near_total_trapping' && (f as any).polarity === 'nonpolar')).toBe(true);
  });

  // At moderate fat the polar class (Kow≈5.4) is NOT near-totally trapped, even
  // though the nonpolar terpene (Kow≈37000) always is in any fat-containing matrix.
  test('moderate fat (fat=40, water=60) does NOT fire near_total_trapping for polar class', () => {
    const r = computeAromaRelease({ fat: 40, water: 60 });
    const trappingFlags = r.flags.filter(f => f.kind === 'near_total_trapping');
    expect(trappingFlags.some(f => (f as any).polarity === 'polar')).toBe(false);
  });
});
