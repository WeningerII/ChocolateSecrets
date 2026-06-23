/**
 * Boiling-point elevation and candy stages — the colligative sibling of the
 * freezing kernel, for the hot end of sugar cookery (syrups, jams, caramels,
 * confections). As water boils off, solute molality rises and the boiling point
 * climbs; the temperature of a boiling syrup therefore *reports* its
 * concentration, which is exactly how candy "stages" are read off a thermometer.
 *
 *   ΔTb = Kb · m · i      (m = osmotic molality, i folded in via the solute set)
 *   Tb  = 100 + ΔTb       (°C, at 1 atm)
 *
 * First-principles for the elevation (van 't Hoff, cross-checks the freezing
 * kernel's osmotic-mole machinery); the stage cut-points are the calibrated
 * confectioner's table. Sugars are i = 1; sodium is treated as NaCl at i = 2,
 * matching computeFreezing.
 *
 * Sources: ebullioscopy (Kb,water = 0.512 °C·kg·mol⁻¹); standard candy-stage
 * temperatures (e.g. McGee, On Food and Cooking).
 */
import { MOLECULAR_WEIGHTS, NORRISH_SPECIES } from './norrish';

/** Ebullioscopic constant of water, °C·kg/mol. */
export const KB_WATER = 0.512;
const SODIUM_MOLAR_MASS = 22.99;
const VAN_T_HOFF_NACL = 2;

const BOILING_SOLUTES = NORRISH_SPECIES.filter((s) => s !== 'water');

export interface BoilingResult {
  /** Boiling point of the current mix at 1 atm, °C (≥ 100). null when there is no water. */
  boilingPointC: number | null;
  /** Elevation above pure water, °C. */
  elevationC: number;
  /** Osmotic moles (sugars/polyols/ethanol at i = 1, plus any NaCl at i = 2). */
  osmoticMoles: number;
  /** Grams of water. */
  waterMass: number;
}

/**
 * Boiling point from aqueous solute masses (the Norrish `massBy` map). Optional
 * `sodiumMass` adds the NaCl electrolyte term, mirroring computeFreezing.
 */
export function computeBoilingPoint(
  massBy: Record<string, number>,
  opts: { sodiumMass?: number } = {},
): BoilingResult {
  const waterMass = massBy.water ?? 0;

  let osmoticMoles = 0;
  for (const sp of BOILING_SOLUTES) {
    const m = massBy[sp] ?? 0;
    const mw = MOLECULAR_WEIGHTS[sp];
    if (m > 0 && mw) osmoticMoles += m / mw;
  }
  const sodiumMass = opts.sodiumMass ?? 0;
  if (sodiumMass > 0) osmoticMoles += (VAN_T_HOFF_NACL * sodiumMass) / SODIUM_MOLAR_MASS;

  if (waterMass <= 0) {
    return { boilingPointC: null, elevationC: 0, osmoticMoles, waterMass: 0 };
  }

  const molality = osmoticMoles / (waterMass / 1000);
  const elevationC = KB_WATER * molality;
  return { boilingPointC: 100 + elevationC, elevationC, osmoticMoles, waterMass };
}

export type CandyStage =
  | 'syrup' | 'thread' | 'soft_ball' | 'firm_ball'
  | 'hard_ball' | 'soft_crack' | 'hard_crack' | 'caramel';

/** Confectioner's stage cut-points (upper temperature of each stage, °C). */
const CANDY_STAGES: ReadonlyArray<{ maxTempC: number; stage: CandyStage }> = [
  { maxTempC: 110, stage: 'syrup' },
  { maxTempC: 112, stage: 'thread' },
  { maxTempC: 116, stage: 'soft_ball' },
  { maxTempC: 120, stage: 'firm_ball' },
  { maxTempC: 130, stage: 'hard_ball' },
  { maxTempC: 143, stage: 'soft_crack' },
  { maxTempC: 154, stage: 'hard_crack' },
  { maxTempC: Infinity, stage: 'caramel' },
];

/** Map a boiling-syrup temperature (°C) to its candy stage. */
export function classifyCandyStage(syrupTempC: number): CandyStage {
  for (const s of CANDY_STAGES) {
    if (syrupTempC <= s.maxTempC) return s.stage;
  }
  return 'caramel';
}
