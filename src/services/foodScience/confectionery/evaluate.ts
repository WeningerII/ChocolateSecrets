import type {
  ResolvedIngredient,
  AwResult,
  PHResult,
  FatRegime,
} from '../universal';
import type { Ingredient } from '../../../types';
import type { ConfectioneryEvaluation } from './types';
import { inferConfectionerySubtype } from './subtypes';
import { assessCurdleRisk } from './curdle';
import { computePolymorphWindow, detectMixedChocolateClasses, computeChocolateSnap } from './polymorph';
import { assessEthanol } from './ethanol';
import { deriveConfectioneryWarnings } from './warnings';

interface EvalInput {
  aw: AwResult;
  pH: PHResult | null;
  fatRegime: FatRegime;
  resolved: ResolvedIngredient[];
  /** Catalog map keyed by id, so we can re-read role.universal for subtype inference. */
  ingredientCatalog: Map<string, Ingredient>;
}

export function evaluateConfectionery(input: EvalInput): ConfectioneryEvaluation {
  const subtypes: Record<string, ReturnType<typeof inferConfectionerySubtype>> = {};
  for (const r of input.resolved) {
    const ing = input.ingredientCatalog.get(r.ingredientId);
    if (!ing) {
      subtypes[r.ingredientId] = null;
      continue;
    }
    subtypes[r.ingredientId] = inferConfectionerySubtype(ing, r.role);
  }

  const curdle = assessCurdleRisk(input.pH?.pH ?? null, input.resolved, input.ingredientCatalog);
  const polymorph = computePolymorphWindow(input.resolved);
  const mixedChocolateClasses = detectMixedChocolateClasses(input.resolved);
  const ethanol = assessEthanol(input.resolved);
  const snap = computeChocolateSnap(input.resolved);

  const warnings = deriveConfectioneryWarnings({
    aw: input.aw,
    fatRegime: input.fatRegime,
    resolved: input.resolved,
    curdle,
    ethanol,
    polymorph,
    mixedChocolateClasses,
  });

  return {
    derived: { subtypes, curdle, polymorph, ethanol, snap },
    warnings,
  };
}
