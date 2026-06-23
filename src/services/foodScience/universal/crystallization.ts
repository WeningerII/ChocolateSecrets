/**
 * Sugar crystallization ("graining") — the supersaturation chemistry behind
 * grainy fudge, fondant texture, crystallized jam/honey and gritty ganache.
 *
 * Sucrose has a temperature-dependent solubility. Cook a syrup past saturation
 * and it becomes supersaturated and metastable: any seed or agitation triggers
 * crystal growth. Confectioners control this by "doctoring" — replacing some
 * sucrose with interfering sugars (invert/glucose/fructose, corn syrup) that
 * raise total solubility and disrupt the sucrose lattice. We model:
 *
 *   ratio = (sucrose / water) / solubility(T)          supersaturation
 *   drive = max(0, ratio − 1) · (1 − k · doctorFraction) graining driving force
 *
 * Calibrated (the solubility curve and the doctoring factor are empirical), but
 * grounded in solution thermodynamics. Universal to any sucrose-bearing system.
 *
 * Sources: sucrose solubility vs temperature (standard tables); doctoring /
 * interfering-sugar control of graining (e.g. Hartel, Crystallization in Foods).
 */
import type { Composition } from '../../../types';

/** Sucrose solubility, g per 100 g water, vs temperature (°C). */
const SUCROSE_SOLUBILITY: ReadonlyArray<readonly [number, number]> = [
  [0, 179], [10, 191], [20, 204], [30, 219], [40, 238], [50, 260],
  [60, 287], [70, 320], [80, 362], [90, 415], [100, 487],
];

/** How strongly interfering sugars suppress graining (0..1 of the drive). */
const DOCTOR_SUPPRESSION = 0.7;

export type GrainingRisk = 'none' | 'low' | 'moderate' | 'high';

export type CrystallizationFlag =
  | { kind: 'no_water' }
  | { kind: 'no_sucrose' }
  | { kind: 'undersaturated' };

export interface CrystallizationResult {
  /** Sucrose concentration, g per 100 g water. */
  concentrationGPer100gWater: number;
  /** Saturation concentration at the given temperature. */
  saturationGPer100gWater: number;
  /** Supersaturation ratio (>1 ⇒ supersaturated, graining possible). */
  supersaturationRatio: number;
  /** Fraction of total sugars that are non-sucrose "doctoring" agents. */
  doctorFraction: number;
  risk: GrainingRisk;
  flags: CrystallizationFlag[];
}

/** Interpolate the sucrose solubility curve (clamped at the ends). */
export function sucroseSolubilityAt(tempC: number): number {
  const pts = SUCROSE_SOLUBILITY;
  if (tempC <= pts[0][0]) return pts[0][1];
  if (tempC >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 1; i < pts.length; i++) {
    const [t1, s1] = pts[i];
    if (tempC <= t1) {
      const [t0, s0] = pts[i - 1];
      return s0 + ((tempC - t0) / (t1 - t0)) * (s1 - s0);
    }
  }
  return pts[pts.length - 1][1];
}

function classifyRisk(drive: number, supersaturated: boolean): GrainingRisk {
  if (!supersaturated || drive <= 0) return 'none';
  if (drive < 0.15) return 'low';
  if (drive < 0.4) return 'moderate';
  return 'high';
}

/**
 * Graining risk for a composition held at `tempC`. Doctoring sugars (everything
 * sweet that is not sucrose) are summed as crystallization inhibitors.
 */
export function computeSucroseCrystallization(composition: Composition, tempC: number): CrystallizationResult {
  const flags: CrystallizationFlag[] = [];
  const water = composition.water ?? 0;
  const sucrose = composition.sucrose ?? 0;
  const doctoring =
    (composition.glucose ?? 0) + (composition.fructose ?? 0) + (composition.maltose ?? 0) +
    (composition.lactose ?? 0) + (composition.sorbitol ?? 0) + (composition.glycerol ?? 0);

  const saturation = sucroseSolubilityAt(tempC);
  const doctorFraction = sucrose + doctoring > 0 ? doctoring / (sucrose + doctoring) : 0;

  if (water <= 0) flags.push({ kind: 'no_water' });
  if (sucrose <= 0) flags.push({ kind: 'no_sucrose' });

  const concentration = water > 0 ? (sucrose / water) * 100 : 0;
  const supersaturationRatio = saturation > 0 ? concentration / saturation : 0;
  const supersaturated = supersaturationRatio > 1;
  if (sucrose > 0 && water > 0 && !supersaturated) flags.push({ kind: 'undersaturated' });

  const drive = Math.max(0, supersaturationRatio - 1) * (1 - DOCTOR_SUPPRESSION * doctorFraction);

  return {
    concentrationGPer100gWater: concentration,
    saturationGPer100gWater: saturation,
    supersaturationRatio,
    doctorFraction,
    risk: classifyRisk(drive, supersaturated),
    flags,
  };
}
