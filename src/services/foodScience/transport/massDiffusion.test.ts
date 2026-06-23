import { describe, test, expect } from 'vitest';
import { computeMassPenetration } from './massDiffusion';

describe('computeMassPenetration', () => {
  test('center saturation rises with curing time (days, as real curing takes)', () => {
    // 2 cm-thick slab (L=0.01), salt D≈4e-10: the center needs DAYS, not hours —
    // exactly why curing a ham is a multi-day job.
    const base = { geometry: 'slab' as const, characteristicLengthM: 0.01, diffusant: 'salt_in_meat' as const };
    const day1 = computeMassPenetration({ ...base, timeS: 86400 })!;        // 1 day
    const day4 = computeMassPenetration({ ...base, timeS: 4 * 86400 })!;    // 4 days
    expect(day1.centerSaturationAtTime!.saturation).toBeGreaterThan(0.2);
    expect(day1.centerSaturationAtTime!.saturation).toBeLessThan(1);
    expect(day4.centerSaturationAtTime!.saturation).toBeGreaterThan(day1.centerSaturationAtTime!.saturation);
  });

  test('time-to-target uptake scales with L²/D', () => {
    const base = {
      geometry: 'sphere' as const, diffusant: 'salt_in_meat' as const, targetCenterSaturation: 0.5,
    };
    const small = computeMassPenetration({ ...base, characteristicLengthM: 0.01 })!;
    const big = computeMassPenetration({ ...base, characteristicLengthM: 0.02 })!;
    expect(big.timeToTargetS! / small.timeToTargetS!).toBeCloseTo(4, 1);
  });

  test('salt penetrates orders of magnitude faster than fat bloom migrates', () => {
    const geo = { geometry: 'slab' as const, characteristicLengthM: 0.01, targetCenterSaturation: 0.5 };
    const salt = computeMassPenetration({ ...geo, diffusant: 'salt_in_meat' })!;
    const bloom = computeMassPenetration({ ...geo, diffusant: 'fat_bloom' })!;
    expect(bloom.timeToTargetS! / salt.timeToTargetS!).toBeGreaterThan(100);
  });

  test('an explicit diffusivity overrides the preset', () => {
    const r = computeMassPenetration({
      geometry: 'cylinder', characteristicLengthM: 0.015, diffusivityM2S: 1e-9,
      targetCenterSaturation: 0.6,
    })!;
    expect(r.diffusivityM2S).toBe(1e-9);
    expect(r.timeToTargetS!).toBeGreaterThan(0);
  });

  test('a missing diffusivity returns null', () => {
    expect(computeMassPenetration({ geometry: 'slab', characteristicLengthM: 0.01, timeS: 100 })).toBeNull();
  });
});
