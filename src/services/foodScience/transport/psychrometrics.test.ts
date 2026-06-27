import { describe, test, expect } from 'vitest';
import { saturationVaporPressure, latentHeatVaporization, computePsychrometrics } from './psychrometrics';
import { computeDryingRate } from './dryingRate';

describe('psychrometrics', () => {
  test('Magnus saturation pressure matches known values', () => {
    expect(saturationVaporPressure(20)).toBeCloseTo(2333, -1);   // ~2.33 kPa
    expect(saturationVaporPressure(60)).toBeCloseTo(20023, -2);  // Wolfram ~19.9–20.0 kPa
  });

  test('latent heat of vaporization (Regnault linear)', () => {
    expect(latentHeatVaporization(0)).toBeCloseTo(2.501e6, -3);
    expect(latentHeatVaporization(50)).toBeCloseTo(2.383e6, -3);
  });

  test('wet bulb of 70 °C / 30 % RH ≈ 47.6 °C (Wolfram-verified)', () => {
    const p = computePsychrometrics({ airTempC: 70, relativeHumidity: 0.30 });
    expect(p.wetBulbC).toBeCloseTo(47.6, 0);
    expect(p.dewPointC!).toBeGreaterThan(0);
    expect(p.dewPointC!).toBeLessThan(70);
  });

  test('humidity ratio of 25 °C / 50 % RH ≈ 0.0099 kg/kg', () => {
    const p = computePsychrometrics({ airTempC: 25, relativeHumidity: 0.50 });
    expect(p.humidityRatio).toBeCloseTo(0.0099, 3);
  });

  test('saturated air has no wet-bulb depression', () => {
    const p = computePsychrometrics({ airTempC: 40, relativeHumidity: 1 });
    expect(p.wetBulbC).toBeCloseTo(40, 1);
  });

  test('drier air gives a lower wet bulb (more evaporative cooling)', () => {
    const humid = computePsychrometrics({ airTempC: 60, relativeHumidity: 0.8 });
    const dry = computePsychrometrics({ airTempC: 60, relativeHumidity: 0.2 });
    expect(dry.wetBulbC).toBeLessThan(humid.wetBulbC);
  });

  // Regression (hardening sweep): at RH=0 the dew point is undefined, so the old
  // lower-bracket fallback `dewPointC ?? airTempC` tripped the saturated-air
  // short-circuit and reported wetBulb = airTemp — treating the DRIEST air as if
  // it were saturated. Bone-dry air must give the DEEPEST wet-bulb depression.
  test('bone-dry air (RH=0) reaches its physical wet-bulb minimum, not the dry bulb', () => {
    const p70 = computePsychrometrics({ airTempC: 70, relativeHumidity: 0 });
    expect(p70.wetBulbC).toBeCloseTo(24.4, 0);   // ~24.4 °C, not 70
    expect(p70.dewPointC).toBeNull();            // undefined for bone-dry air
    const p60 = computePsychrometrics({ airTempC: 60, relativeHumidity: 0 });
    expect(p60.wetBulbC).toBeCloseTo(21.57, 1);  // ~21.57 °C, not 60
    // Continuity across the RH→0 limit: RH=0 is no warmer than a hair above it.
    const justAbove = computePsychrometrics({ airTempC: 60, relativeHumidity: 1e-4 });
    expect(Math.abs(p60.wetBulbC - justAbove.wetBulbC)).toBeLessThan(0.1);
  });
});

describe('computeDryingRate', () => {
  test('dehydrator at 70 °C / 30 % RH, h=25 → ~0.85 kg·m⁻²·h⁻¹, surface ≈ 47.6 °C', () => {
    const r = computeDryingRate({ airTempC: 70, relativeHumidity: 0.30, surfaceCoeffWm2K: 25 })!;
    expect(r.surfaceTempC).toBeCloseTo(47.6, 0);
    expect(r.evaporativeCoolingC).toBeCloseTo(22.4, 0);
    expect(r.fluxKgM2h).toBeCloseTo(0.85, 1);
  });

  test('drier air dries faster', () => {
    const dry = computeDryingRate({ airTempC: 60, relativeHumidity: 0.2, surfaceCoeffWm2K: 20 })!;
    const humid = computeDryingRate({ airTempC: 60, relativeHumidity: 0.8, surfaceCoeffWm2K: 20 })!;
    expect(dry.fluxKgM2h).toBeGreaterThan(humid.fluxKgM2h);
  });

  test('saturated air does not dry', () => {
    const r = computeDryingRate({ airTempC: 50, relativeHumidity: 1, surfaceCoeffWm2K: 20 })!;
    expect(r.fluxKgM2h).toBeCloseTo(0, 5);
    expect(r.flags.map(f => f.kind)).toContain('saturated_air');
  });

  // Regression (hardening sweep): bone-dry air dries FASTEST. The RH=0 wet-bulb
  // bug pinned the surface to the air temp, returned zero flux, and wrongly raised
  // the 'saturated_air' flag (documented as RH≈100%) for the opposite regime.
  test('bone-dry air (RH=0) dries fastest and is NOT flagged saturated', () => {
    const r = computeDryingRate({ airTempC: 70, relativeHumidity: 0, surfaceCoeffWm2K: 25 })!;
    expect(r.surfaceTempC).toBeCloseTo(24.4, 0);   // wet-bulb, not 70
    expect(r.fluxKgM2h).toBeCloseTo(1.68, 1);      // ~1.68, not 0
    expect(r.flags.map(f => f.kind)).not.toContain('saturated_air');
    // Strictly faster than the same air at 30 % RH.
    const humid = computeDryingRate({ airTempC: 70, relativeHumidity: 0.30, surfaceCoeffWm2K: 25 })!;
    expect(r.fluxKgM2h).toBeGreaterThan(humid.fluxKgM2h);
  });
});
