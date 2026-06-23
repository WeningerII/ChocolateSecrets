/**
 * Osmolality and osmotic pressure — the colligative third sibling (with the
 * freezing and boiling kernels) and the physical basis of sugar/salt
 * PRESERVATION: a hypertonic matrix osmotically dehydrates microbial cells, a
 * core "hurdle" alongside low water activity. Same osmotic-mole machinery as the
 * freezing/boiling kernels (sugars i = 1, NaCl i = 2).
 *
 *   osmolality = Σ osmotic moles / kg water     (Osm·kg⁻¹)
 *   π = osmolality · R · T                       (van 't Hoff, ideal/dilute)
 *
 * First-principles. Sources: van 't Hoff osmotic law; osmotic preservation /
 * hurdle technology (Leistner).
 */
import { MOLECULAR_WEIGHTS, NORRISH_SPECIES } from './norrish';

/** Gas constant in L·atm·mol⁻¹·K⁻¹. */
const GAS_CONSTANT_L_ATM = 0.082057;
const SODIUM_MOLAR_MASS = 22.99;
const VAN_T_HOFF_NACL = 2;

const OSMOTIC_SOLUTES = NORRISH_SPECIES.filter((s) => s !== 'water');

export interface OsmolalityResult {
  /** Osmolality, Osm·kg⁻¹ of water. */
  osmolalityOsmPerKg: number;
  /** Osmotic pressure at the given temperature, atm. */
  osmoticPressureAtm: number;
  /** Osmotic moles (sugars/polyols/ethanol i = 1, plus any NaCl at i = 2). */
  osmoticMoles: number;
  /** Grams of water. */
  waterMass: number;
}

/**
 * Osmolality + osmotic pressure from aqueous solute masses (the Norrish `massBy`
 * map). `sodiumMass` adds the NaCl term; `tempC` sets the temperature for π
 * (default 20 °C).
 */
export function computeOsmolality(
  massBy: Record<string, number>,
  opts: { sodiumMass?: number; tempC?: number } = {},
): OsmolalityResult {
  const waterMass = massBy.water ?? 0;

  let osmoticMoles = 0;
  for (const sp of OSMOTIC_SOLUTES) {
    const m = massBy[sp] ?? 0;
    const mw = MOLECULAR_WEIGHTS[sp];
    if (m > 0 && mw) osmoticMoles += m / mw;
  }
  const sodiumMass = opts.sodiumMass ?? 0;
  if (sodiumMass > 0) osmoticMoles += (VAN_T_HOFF_NACL * sodiumMass) / SODIUM_MOLAR_MASS;

  if (waterMass <= 0) {
    return { osmolalityOsmPerKg: 0, osmoticPressureAtm: 0, osmoticMoles, waterMass: 0 };
  }

  const osmolalityOsmPerKg = osmoticMoles / (waterMass / 1000);
  const T = (opts.tempC ?? 20) + 273.15;
  // mol/kg ≈ mol/L for the dilute van 't Hoff limit.
  const osmoticPressureAtm = osmolalityOsmPerKg * GAS_CONSTANT_L_ATM * T;

  return { osmolalityOsmPerKg, osmoticPressureAtm, osmoticMoles, waterMass };
}
