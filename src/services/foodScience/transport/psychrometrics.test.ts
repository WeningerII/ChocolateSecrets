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
});
