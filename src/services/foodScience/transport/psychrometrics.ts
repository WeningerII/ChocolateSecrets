/**
 * Psychrometrics — the moist-air physics behind evaporation, evaporative cooling
 * and drying. When a wet food surface meets unsaturated air, water evaporates;
 * the latent heat it carries away cools the surface to the WET-BULB temperature.
 * This is why a roast's surface can brown while a dehydrator tray stays cool, and
 * it is the starting point for any drying-rate or crust calculation.
 *
 *   p_sat(T)       Magnus saturation vapor pressure
 *   p_vapor        = RH · p_sat(T_air)
 *   humidity ratio w = 0.622 · p_v / (P − p_v)
 *   dew point      Magnus inverse of p_vapor
 *   wet bulb       solves the psychrometric energy balance
 *                  p_v = p_sat(T_wb) − A·P·(T_air − T_wb)
 *
 * First-principles (an energy balance on a wet surface). Magnus is accurate to
 * <0.5 % below ~80 °C (it over-predicts a few % approaching 100 °C); the
 * psychrometer constant A is the standard ventilated-bulb value.
 *
 * Sources: Magnus/Tetens saturation formula; ASHRAE psychrometric equation;
 * latent-heat-of-vaporization linear fit (Regnault). Validated vs Wolfram
 * (p_sat 60 °C = 19.9 kPa; wet bulb 70 °C/30 % = 47.6 °C).
 */

const MAGNUS_C = 610.94; // Pa
const MAGNUS_A = 17.625;
const MAGNUS_B = 243.04; // °C
/** Ventilated (Assmann) psychrometer constant [K⁻¹]. */
const PSYCHROMETER_A = 6.6e-4;
/** Standard sea-level pressure [Pa]. */
export const ATM_PRESSURE_PA = 101325;

/** Saturation vapor pressure of water [Pa] at `tempC` (Magnus). */
export function saturationVaporPressure(tempC: number): number {
  return MAGNUS_C * Math.exp((MAGNUS_A * tempC) / (tempC + MAGNUS_B));
}

/** Latent heat of vaporization of water [J·kg⁻¹] at `tempC` (Regnault linear fit). */
export function latentHeatVaporization(tempC: number): number {
  return 2.501e6 - 2360 * tempC;
}

export interface PsychrometricState {
  /** Saturation vapor pressure at the air temperature [Pa]. */
  pSat: number;
  /** Actual water-vapor partial pressure [Pa]. */
  pVapor: number;
  /** Humidity ratio (mass water / mass dry air) [kg·kg⁻¹]. */
  humidityRatio: number;
  /** Dew point [°C] (null if the air is bone dry). */
  dewPointC: number | null;
  /** Wet-bulb temperature [°C] — the temperature a wet surface cools to. */
  wetBulbC: number;
}

export interface PsychrometricInput {
  airTempC: number;
  /** Relative humidity as a fraction 0..1. */
  relativeHumidity: number;
  pressurePa?: number;
}

export function computePsychrometrics(input: PsychrometricInput): PsychrometricState {
  const P = input.pressurePa ?? ATM_PRESSURE_PA;
  const rh = Math.max(0, Math.min(1, input.relativeHumidity));
  const airTempC = input.airTempC;

  const pSat = saturationVaporPressure(airTempC);
  const pVapor = rh * pSat;
  const humidityRatio = pVapor < P ? (0.622 * pVapor) / (P - pVapor) : Infinity;

  let dewPointC: number | null = null;
  if (pVapor > 0) {
    const g = Math.log(pVapor / MAGNUS_C);
    dewPointC = (MAGNUS_B * g) / (MAGNUS_A - g);
  }

  // Wet bulb: root of p_sat(T_wb) − A·P·(T_air − T_wb) − p_v in (dewPoint, airTemp).
  let wetBulbC: number;
  const lo0 = dewPointC ?? airTempC;
  if (lo0 >= airTempC - 1e-9) {
    wetBulbC = airTempC; // saturated air: no evaporative cooling
  } else {
    const f = (twb: number) => saturationVaporPressure(twb) - PSYCHROMETER_A * P * (airTempC - twb) - pVapor;
    let lo = lo0, hi = airTempC;
    for (let i = 0; i < 80; i++) {
      const mid = 0.5 * (lo + hi);
      if (f(lo) * f(mid) <= 0) hi = mid; else lo = mid;
    }
    wetBulbC = 0.5 * (lo + hi);
  }

  return { pSat, pVapor, humidityRatio, dewPointC, wetBulbC };
}
