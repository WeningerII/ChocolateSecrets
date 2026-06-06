import type { Recipe, Ingredient, FrozenRecipeSubtype, FrozenSubtype } from '../../../types';
import type { ResolvedIngredient, AwResult } from '../universal';
import { computeFreezing, estimateTgPrime } from '../universal';
import type { FrozenEvaluation, FrozenComposition } from './types';
import { calculatePAC, calculatePOD, calculateTotalSugarsPct } from './pac';
import { calculateMSNF, calculateLactosePct, calculateTotalSolidsPct } from './msnf';
import { calculateHardeningFactor, classifyScoopability, classifyFrozenWaterScoopability } from './scoopability';
import { inferFrozenIngredientSubtype } from './subtypes';
import { deriveFrozenWarnings } from './warnings';
import { FROZEN_BANDS_BY_SUBTYPE, TARGET_FROZEN_WATER_PCT_BY_SUBTYPE } from './constants';

interface EvalInput {
  recipe: Recipe;
  aw: AwResult;
  resolved: ResolvedIngredient[];
  ingredientCatalog: Map<string, Ingredient>;
}

/**
 * Recipe-subtype inference fallback chain:
 *   1) Recipe.frozenSubtype is set explicitly → use it
 *   2) Name regex match → use the matched subtype
 *   3) Composition heuristic (msnf=0 + fat=0 → sorbet/granita, etc.)
 *   4) Default to 'gelato' (the most permissive band; if wrong, warnings will guide)
 */
export function inferFrozenRecipeSubtype(input: {
  declared?: FrozenRecipeSubtype;
  recipeName: string;
  msnfPct: number;
  fatPct: number;
  totalSolidsPct: number;
  ts: number;
}): { subtype: FrozenRecipeSubtype; provenance: 'declared' | 'inferred_name' | 'inferred_composition' | 'fallback' } {
  if (input.declared) return { subtype: input.declared, provenance: 'declared' };

  const n = input.recipeName.toLowerCase();
  if (/\bgranita\b/.test(n)) return { subtype: 'granita', provenance: 'inferred_name' };
  if (/\bsorbet|sorbetto|granizado\b/.test(n)) return { subtype: 'sorbet', provenance: 'inferred_name' };
  if (/\bsherbet|sherbert\b/.test(n)) return { subtype: 'sherbet', provenance: 'inferred_name' };
  if (/\bsemifreddo\b/.test(n)) return { subtype: 'semifreddo', provenance: 'inferred_name' };
  if (/\bfrozen yogurt|yogurt helado|froyo\b/.test(n)) return { subtype: 'frozen_yogurt', provenance: 'inferred_name' };
  if (/\bgelato|helado artesanal\b/.test(n)) return { subtype: 'gelato', provenance: 'inferred_name' };
  if (/\bice cream|ice-cream|helado\b/.test(n)) return { subtype: 'ice_cream', provenance: 'inferred_name' };

  // Composition heuristic
  if (input.msnfPct < 0.5 && input.fatPct < 0.5) {
    return { subtype: input.totalSolidsPct < 28 ? 'granita' : 'sorbet', provenance: 'inferred_composition' };
  }
  if (input.fatPct >= 18) return { subtype: 'semifreddo', provenance: 'inferred_composition' };
  if (input.fatPct >= 10) return { subtype: 'ice_cream', provenance: 'inferred_composition' };
  if (input.msnfPct >= 12) return { subtype: 'frozen_yogurt', provenance: 'inferred_composition' };

  return { subtype: 'gelato', provenance: 'fallback' };
}

export function evaluateFrozen(input: EvalInput): FrozenEvaluation {
  const totalSolidsPct = calculateTotalSolidsPct(input.aw.waterPct);
  const fatPct = input.aw.fatPct;
  const msnfPct = calculateMSNF(input.resolved, input.ingredientCatalog);
  const totalSugarsPct = calculateTotalSugarsPct(input.resolved);
  const lactosePct = calculateLactosePct(input.resolved);
  const pac = calculatePAC(input.resolved);
  const pod = calculatePOD(input.resolved);
  const lactoseInWaterPct = input.aw.waterPct > 0 ? (lactosePct / input.aw.waterPct) * 100 : 0;

  const composition: FrozenComposition = {
    totalSolidsPct,
    fatPct,
    msnfPct,
    totalSugarsPct,
    lactosePct,
    pac,
    pod,
    lactoseInWaterPct,
  };

  const { subtype, provenance } = inferFrozenRecipeSubtype({
    declared: input.recipe.frozenSubtype,
    recipeName: input.recipe.name ?? '',
    msnfPct,
    fatPct,
    totalSolidsPct,
    ts: totalSolidsPct,
  });

  const band = FROZEN_BANDS_BY_SUBTYPE[subtype];

  // Freezing curve / ice fraction — the texture-causal coordinate. Reuses the
  // aqueous masses the Norrish kernel already produced (aw.massBy); null-safe so
  // callers that don't supply massBy simply get null freezing fields.
  const freezing = input.aw.massBy ? computeFreezing(input.aw.massBy) : null;
  const servingTempC = (band.servingTempCRange[0] + band.servingTempCRange[1]) / 2;
  const initialFreezingPointC = freezing?.initialFreezingPointC ?? null;
  const frozenWaterPctAtServing =
    freezing && freezing.initialFreezingPointC !== null
      ? freezing.frozenFractionAt(servingTempC) * 100
      : null;
  const frozenWaterScoopability =
    frozenWaterPctAtServing !== null
      ? classifyFrozenWaterScoopability(frozenWaterPctAtServing, TARGET_FROZEN_WATER_PCT_BY_SUBTYPE[subtype])
      : null;

  // Glass transition of the freeze-concentrated serum — the storage-stability
  // coordinate. recrystallization margin = how far above Tg′ the product is served.
  const tgPrime = input.aw.massBy ? estimateTgPrime(input.aw.massBy) : null;
  const tgPrimeC = tgPrime?.tgPrimeC ?? null;
  const recrystallizationMarginC = tgPrimeC !== null ? servingTempC - tgPrimeC : null;

  const hardeningFactor = calculateHardeningFactor(totalSolidsPct, fatPct, msnfPct, pac);
  const scoopability = classifyScoopability(pac, hardeningFactor);

  const ingredientSubtypes: Record<string, FrozenSubtype | null> = {};
  for (const r of input.resolved) {
    const ing = input.ingredientCatalog.get(r.ingredientId);
    if (!ing) { ingredientSubtypes[r.ingredientId] = null; continue; }
    ingredientSubtypes[r.ingredientId] = inferFrozenIngredientSubtype(ing, r.role);
  }

  const hasMilkPowder = input.resolved.some(r => {
    const ing = input.ingredientCatalog.get(r.ingredientId);
    if (!ing) return false;
    return /milk powder|nonfat dry|nfdm/.test((ing.name ?? '').toLowerCase());
  });

  const warnings = deriveFrozenWarnings({
    subtype,
    comp: composition,
    hardeningFactor,
    scoopability,
    hasMilkPowder,
  });

  return {
    derived: {
      composition,
      hardeningFactor,
      scoopability,
      recipeSubtype: subtype,
      recipeSubtypeProvenance: provenance,
      ingredientSubtypes,
      band,
      initialFreezingPointC,
      frozenWaterPctAtServing,
      frozenWaterScoopability,
      tgPrimeC,
      recrystallizationMarginC,
    },
    warnings,
  };
}
