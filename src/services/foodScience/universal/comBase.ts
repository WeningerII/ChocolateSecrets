import type { ResolvedIngredient, AwResult, ShelfLifePrediction, ShelfLifeFlag } from './types';
import { ETHANOL_RETENTION } from './norrish';
import { classifyAwBand } from './classifiers';

/**
 * V1: piecewise Aw → shelf life weeks, calibrated against published values.
 * Future: replace with ComBase API call (https://www.combase.cc/) returning
 * pathogen-specific growth predictions.
 *
 * The shape of this function is forward-compatible: inputs are Aw, pH (optional),
 * temperature (optional, defaults to ambient), ethanol mass. ComBase replacement
 * keeps the same signature, returns the same shape, plus richer flags.
 */
export interface ShelfLifeInputs {
  aw: number;
  pH?: number;
  temperatureC?: number;       // ambient default 22
  ethanolMassG?: number;       // already retention-adjusted by caller
  totalMassG: number;
}

const PIECEWISE_AW_TO_WEEKS: Array<[number, number]> = [
  [0.95, 1],
  [0.92, 2],
  [0.88, 3],
  [0.85, 4],
  [0.80, 8],
  [0.75, 16],
  [0.70, 26],
  [0.00, 52],
];

function piecewiseAwToWeeks(aw: number): number {
  for (const [threshold, weeks] of PIECEWISE_AW_TO_WEEKS) {
    if (aw > threshold) return weeks;
  }
  return 52;
}

export function predictShelfLife(
  awResult: AwResult,
  ingredients: ResolvedIngredient[],
  options: { declaredShelfLifeDays?: number; temperatureC?: number } = {}
): ShelfLifePrediction {
  const flags: ShelfLifeFlag[] = [{ kind: 'combase_unavailable' }];
  const aw = awResult.aw ?? 1.0;

  const baseWeeks = piecewiseAwToWeeks(aw);

  // Universal alcohol microbial inhibition bonus.
  // Threshold scaled by ETHANOL_RETENTION to preserve calibration intent.
  const ethanolMass = ingredients.reduce(
    (acc, ing) => acc + (ing.composition.ethanol ?? 0) * ing.mass / 100,
    0
  ) * ETHANOL_RETENTION;

  const finalABV = awResult.totalMass > 0 ? (ethanolMass / awResult.totalMass) * 100 : 0;
  let alcoholBonus = 0;
  if (finalABV >= 8 * ETHANOL_RETENTION) alcoholBonus = 12;
  else if (finalABV >= 4 * ETHANOL_RETENTION) alcoholBonus = 6;

  const weeks = baseWeeks + alcoholBonus;

  if (options.declaredShelfLifeDays !== undefined) {
    const predictedDays = weeks * 7;
    const divergence = Math.abs(predictedDays - options.declaredShelfLifeDays);
    // One band's width as the divergence threshold (~1 week)
    if (divergence > 7 && Math.abs(weeks - options.declaredShelfLifeDays / 7) > 1) {
      flags.push({
        kind: 'declared_diverges',
        declaredDays: options.declaredShelfLifeDays,
        predictedWeeks: weeks,
      });
    }
  }

  if (aw < 0.6) flags.push({ kind: 'shelf_life_unbounded' });

  return {
    weeks,
    band: classifyAwBand(aw).key,
    alcoholBonus,
    finalABV,
    flags,
  };
}
