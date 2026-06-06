import type { OptimizerObjective, OptimizerTargets, ObjectiveWeights, Recipe, Ingredient } from '../../../types';
import type { AwResult, FatRegime, ShelfLifePrediction } from '../universal';
import { computeFreezing, estimateTgPrime } from '../universal';
import type { ConfectioneryEvaluation } from '../confectionery';

const RISK_RANK: Record<string, number> = { none: 0, low: 1, medium: 2, high: 3 };

interface EvalContext {
  aw: AwResult;
  shelfLife: ShelfLifePrediction;
  fatRegime: FatRegime;
  confectionery: ConfectioneryEvaluation | null;
  costPerGram: number;
  warningCount: number;
  compositionCompleteness: number;
  hardConstraintViolated: boolean;
}

/**
 * Compute all objective scores for a candidate. Higher is better; range [0..1]
 * after normalization. A hard-constraint violation collapses every score to 0.05
 * (small but nonzero so genetic material still propagates).
 */
export function evaluateObjectives(
  ctx: EvalContext,
  targets: OptimizerTargets
): Record<OptimizerObjective, number> {
  if (ctx.hardConstraintViolated) {
    return {
      aw_distance_to_target: 0.05,
      aw_below_threshold: 0.05,
      shelf_life_weeks: 0.05,
      cost_per_gram: 0.05,
      curdle_safety_margin: 0.05,
      fat_regime_distance: 0.05,
      warning_count: 0.05,
      composition_completeness: 0.05,
      ice_fraction_at_serving_distance: 0.05,
      recrystallization_margin: 0.05,
    };
  }

  // Aw distance to target (closer to target_aw is better)
  let awDistanceToTarget = 1.0;
  if (targets.awTarget !== undefined && ctx.aw.aw !== null) {
    const dist = Math.abs(ctx.aw.aw - targets.awTarget);
    awDistanceToTarget = 1 - Math.min(1, dist / 0.20);     // normalize against 0.20 spread
  }

  // Aw below threshold (binary-ish)
  let awBelowThreshold = 1.0;
  if (targets.awMaxThreshold !== undefined && ctx.aw.aw !== null) {
    awBelowThreshold = ctx.aw.aw <= targets.awMaxThreshold ? 1.0 : 0.20;
  }

  // Shelf life (more is better, capped at 26 weeks for normalization)
  const shelfLifeWeeks = Math.min(1, ctx.shelfLife.weeks / 26);

  // Cost per gram (lower is better)
  let costPerGram = 1.0;
  if (targets.costPerGramMaxUsd !== undefined && targets.costPerGramMaxUsd > 0) {
    costPerGram = 1 - Math.min(1, ctx.costPerGram / targets.costPerGramMaxUsd);
  } else {
    costPerGram = 1 - Math.min(1, ctx.costPerGram / 0.10);  // default $0.10/g ceiling
  }

  // Curdle safety margin (lower risk = better)
  let curdleSafetyMargin = 1.0;
  if (ctx.confectionery) {
    const r = RISK_RANK[ctx.confectionery.derived.curdle.level] ?? 0;
    curdleSafetyMargin = 1 - r / 3;
  }

  // Fat regime — firm-set / standard = 1.0, inversion-approaching = 0.5, oil-in-water = 0.0
  let fatRegimeDistance = 1.0;
  switch (ctx.fatRegime.key) {
    case 'firm-set':              fatRegimeDistance = 1.0; break;
    case 'standard':              fatRegimeDistance = 1.0; break;
    case 'inversion-approaching': fatRegimeDistance = 0.5; break;
    case 'oil-in-water':          fatRegimeDistance = 0.0; break;
  }

  // Warning count — fewer is better
  const warningCount = 1 / (1 + ctx.warningCount);

  // Ice fraction at serving temperature (texture). Neutral (1.0) unless the
  // operator specifies a serving temperature and a target frozen fraction.
  let iceFractionDistance = 1.0;
  if (targets.servingTempC !== undefined && targets.frozenWaterTarget !== undefined && ctx.aw.massBy) {
    const phi = computeFreezing(ctx.aw.massBy).frozenFractionAt(targets.servingTempC);
    iceFractionDistance = 1 - Math.min(1, Math.abs(phi - targets.frozenWaterTarget) / 0.20);
  }

  // Recrystallization margin (storage stability): the closer the serving/storage
  // temperature sits to the serum's Tg', the slower it coarsens. Neutral (1.0)
  // unless a serving temperature is given.
  let recrystallizationMargin = 1.0;
  if (targets.servingTempC !== undefined && ctx.aw.massBy) {
    const tgPrimeC = estimateTgPrime(ctx.aw.massBy).tgPrimeC;
    if (tgPrimeC !== null) {
      const marginC = targets.servingTempC - tgPrimeC;
      recrystallizationMargin = 1 - Math.min(1, Math.max(0, marginC) / 30);
    }
  }

  return {
    aw_distance_to_target: awDistanceToTarget,
    aw_below_threshold: awBelowThreshold,
    shelf_life_weeks: shelfLifeWeeks,
    cost_per_gram: costPerGram,
    curdle_safety_margin: curdleSafetyMargin,
    fat_regime_distance: fatRegimeDistance,
    warning_count: warningCount,
    composition_completeness: ctx.compositionCompleteness,
    ice_fraction_at_serving_distance: iceFractionDistance,
    recrystallization_margin: recrystallizationMargin,
  };
}

/**
 * Detect hard-constraint violations. Returns true if any are tripped; the caller
 * collapses objective scores accordingly.
 */
export function detectHardConstraintViolation(
  aw: AwResult,
  fatRegime: FatRegime,
  confectionery: ConfectioneryEvaluation | null,
  targets: OptimizerTargets
): boolean {
  if (targets.awMaxThreshold !== undefined && aw.aw !== null && aw.aw > targets.awMaxThreshold + 0.02) {
    return true;
  }
  if (targets.forbiddenFatRegimes?.includes(fatRegime.key)) return true;
  if (targets.maxCurdleRisk !== undefined && confectionery) {
    if (RISK_RANK[confectionery.derived.curdle.level] > RISK_RANK[targets.maxCurdleRisk]) return true;
  }
  return false;
}

export function activeObjectives(weights: ObjectiveWeights): OptimizerObjective[] {
  return Object.entries(weights)
    .filter(([, w]) => (w ?? 0) > 0)
    .map(([k]) => k as OptimizerObjective);
}
