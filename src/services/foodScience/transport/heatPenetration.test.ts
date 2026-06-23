import { describe, test, expect } from 'vitest';
import { computeHeatPenetration } from './heatPenetration';
import type { Composition } from '../../../types';

const meat: Composition = { water: 75, protein: 20, fat: 5 };

describe('computeHeatPenetration', () => {
  // Scenario 1 — slab steak, 2 cm thick (L=0.01), sous-vide (h=150), 5→60 °C, 30 min.
  // Wolfram reference: core 57.957 °C, surface 59.217 °C, Bi 2.839.
  test('slab sous-vide center/surface temperature at time', () => {
    const r = computeHeatPenetration({
      geometry: 'slab', characteristicLengthM: 0.01, composition: meat,
      initialTempC: 5, mediumTempC: 60, surfaceCoeffWm2K: 150, propertyTempC: 30, timeS: 1800,
    })!;
    expect(r.Bi).toBeCloseTo(2.839, 2);
    expect(r.atTime!.coreTempC).toBeCloseTo(57.96, 1);
    expect(r.atTime!.surfaceTempC).toBeCloseTo(59.22, 1);
    expect(r.atTime!.coreTempC).toBeLessThan(r.atTime!.surfaceTempC); // core lags
  });

  // Scenario 2 — sphere meatball, 4 cm (r=0.02), fan oven (h=45), 5 °C → 180 °C oven,
  // time for the core to hit 70 °C. Wolfram reference: 629.3 s.
  test('sphere time-to-core-target in a fan oven', () => {
    const r = computeHeatPenetration({
      geometry: 'sphere', characteristicLengthM: 0.02, composition: meat,
      initialTempC: 5, mediumTempC: 180, surfaceCoeffWm2K: 45, propertyTempC: 37.5,
      targetCoreTempC: 70,
    })!;
    expect(r.timeToCoreTargetS!).toBeCloseTo(629.3, 0);
  });

  test('cook time scales with the square of size (L²/α)', () => {
    const base = {
      geometry: 'sphere' as const, composition: meat, initialTempC: 5, mediumTempC: 180,
      surfaceCoeffWm2K: 1e5 /* ~isothermal surface, Bi→∞ so geometry term is fixed */,
      propertyTempC: 40, targetCoreTempC: 70,
    };
    const small = computeHeatPenetration({ ...base, characteristicLengthM: 0.02 })!;
    const big = computeHeatPenetration({ ...base, characteristicLengthM: 0.04 })!;
    expect(big.timeToCoreTargetS! / small.timeToCoreTargetS!).toBeCloseTo(4, 1);
  });

  test('a core target past the medium temperature is unreachable', () => {
    const r = computeHeatPenetration({
      geometry: 'slab', characteristicLengthM: 0.01, composition: meat,
      initialTempC: 5, mediumTempC: 60, method: 'sous_vide', targetCoreTempC: 75,
    })!;
    expect(r.timeToCoreTargetS).toBeNull();
    expect(r.flags.map(f => f.kind)).toContain('target_unreachable');
  });

  test('a first-principles surface spec derives h from convection + radiation', () => {
    const r = computeHeatPenetration({
      geometry: 'sphere', characteristicLengthM: 0.025, composition: meat,
      initialTempC: 5, mediumTempC: 180, propertyTempC: 40, targetCoreTempC: 70,
      surface: { medium: 'air', regime: 'forced', velocityMS: 3 },
    })!;
    expect(r.surfaceCoefficient).toBeDefined();
    expect(r.surfaceCoefficient!.hConv).toBeGreaterThan(0);
    expect(r.surfaceCoefficient!.hRad).toBeGreaterThan(0); // radiation counts in an oven
    expect(r.h).toBeCloseTo(r.surfaceCoefficient!.hConv + r.surfaceCoefficient!.hRad, 5);
    expect(r.timeToCoreTargetS!).toBeGreaterThan(0);
  });

  test('named methods set h; steaming nearly pins the surface to the medium', () => {
    const r = computeHeatPenetration({
      geometry: 'slab', characteristicLengthM: 0.01, composition: meat,
      initialTempC: 5, mediumTempC: 100, method: 'steaming', propertyTempC: 50, timeS: 600,
    })!;
    expect(r.h).toBe(3000);
    expect(r.atTime!.surfaceTempC).toBeGreaterThan(95); // high Bi → surface ≈ medium
  });
});
