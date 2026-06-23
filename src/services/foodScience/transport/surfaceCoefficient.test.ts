import { describe, test, expect } from 'vitest';
import { computeSurfaceCoefficient } from './surfaceCoefficient';

describe('computeSurfaceCoefficient', () => {
  // Fan oven: sphere d=5cm, air at 3 m/s, surface 100 °C, oven 180 °C.
  // Wolfram reference: h_conv ≈ 28.5, h_rad ≈ 14.5 W/m²K.
  test('forced convection in a fan oven (sphere) + radiation', () => {
    const r = computeSurfaceCoefficient({
      medium: 'air', regime: 'forced', geometry: 'sphere',
      characteristicLengthM: 0.05, velocityMS: 3, surfaceTempC: 100, mediumTempC: 180,
    });
    expect(r.Re!).toBeGreaterThan(5000);
    expect(r.hConv).toBeGreaterThan(26);
    expect(r.hConv).toBeLessThan(31);
    expect(r.hRad).toBeCloseTo(14.5, 0);
    expect(r.h).toBeCloseTo(r.hConv + r.hRad, 6);
  });

  // Still oven, same sphere/temps. Wolfram reference: h_conv ≈ 8.1 W/m²K.
  test('natural convection in a still oven (sphere)', () => {
    const r = computeSurfaceCoefficient({
      medium: 'air', regime: 'natural', geometry: 'sphere',
      characteristicLengthM: 0.05, surfaceTempC: 100, mediumTempC: 180,
    });
    expect(r.Ra!).toBeGreaterThan(1e5);
    expect(r.hConv).toBeCloseTo(8.1, 0);
    // Radiation is comparable to natural convection at oven temperatures.
    expect(r.hRad).toBeGreaterThan(r.hConv * 0.5);
  });

  test('linearized radiation matches εσ(Ts²+T∞²)(Ts+T∞)', () => {
    const r = computeSurfaceCoefficient({
      medium: 'air', regime: 'natural', geometry: 'slab',
      characteristicLengthM: 0.1, surfaceTempC: 100, mediumTempC: 180, emissivity: 0.9,
    });
    expect(r.hRad).toBeCloseTo(14.53, 1);
  });

  test('an immersed (liquid) item omits radiation', () => {
    const r = computeSurfaceCoefficient({
      medium: 'water', regime: 'forced', geometry: 'sphere',
      characteristicLengthM: 0.05, velocityMS: 0.2, surfaceTempC: 40, mediumTempC: 80,
    });
    expect(r.hRad).toBe(0);
    expect(r.flags.map(f => f.kind)).toContain('radiation_omitted_immersed');
    expect(r.hConv).toBeGreaterThan(100); // water convects far better than air
  });

  test('forced without a velocity falls back to natural and flags it', () => {
    const r = computeSurfaceCoefficient({
      medium: 'air', regime: 'forced', geometry: 'sphere',
      characteristicLengthM: 0.05, surfaceTempC: 100, mediumTempC: 180,
    });
    expect(r.flags.map(f => f.kind)).toContain('no_velocity_for_forced');
    expect(r.Ra).toBeDefined(); // natural path was used
  });

  test('higher airspeed raises the convective coefficient', () => {
    const base = { medium: 'air' as const, regime: 'forced' as const, geometry: 'sphere' as const,
      characteristicLengthM: 0.05, surfaceTempC: 100, mediumTempC: 180 };
    const slow = computeSurfaceCoefficient({ ...base, velocityMS: 1 });
    const fast = computeSurfaceCoefficient({ ...base, velocityMS: 8 });
    expect(fast.hConv).toBeGreaterThan(slow.hConv);
  });
});
