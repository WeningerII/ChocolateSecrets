import type { Recipe, Ingredient, BreadRecipeSubtype, BreadSubtype } from '../../../types';
import type { ResolvedIngredient } from '../universal';
import type { BreadEvaluation, BreadComposition } from './types';
import { calculateBakersPct } from './bakersPct';
import { calculateDdtWaterTemp } from './ddt';
import { assessGluten } from './gluten';
import { inferBreadIngredientSubtype } from './subtypes';
import { deriveBreadWarnings } from './warnings';
import {
  BREAD_BANDS_BY_SUBTYPE,
  DEFAULT_DDT_BY_SUBTYPE,
} from './constants';
import { DEFAULT_FRICTION_FACTOR_BY_METHOD } from '../../../types';

interface EvalInput {
  recipe: Recipe;
  resolved: ResolvedIngredient[];
  ingredientCatalog: Map<string, Ingredient>;
}

export function inferBreadRecipeSubtype(input: {
  declared?: BreadRecipeSubtype;
  recipeName: string;
  composition: BreadComposition;
}): { subtype: BreadRecipeSubtype; provenance: 'declared' | 'inferred_name' | 'inferred_composition' | 'fallback' } {
  if (input.declared) return { subtype: input.declared, provenance: 'declared' };

  const n = input.recipeName.toLowerCase();
  if (/\bciabatta\b/.test(n)) return { subtype: 'ciabatta', provenance: 'inferred_name' };
  if (/\bbaguette\b/.test(n)) return { subtype: 'baguette', provenance: 'inferred_name' };
  if (/\bbagel\b/.test(n))    return { subtype: 'bagel', provenance: 'inferred_name' };
  if (/\bpizza\b/.test(n))    return { subtype: 'pizza_dough', provenance: 'inferred_name' };
  if (/\bbrioche\b/.test(n))  return { subtype: 'brioche', provenance: 'inferred_name' };
  if (/\bsourdough|levain|miche\b/.test(n)) return { subtype: 'sourdough', provenance: 'inferred_name' };
  if (/\bwhole wheat|whole-wheat|wholewheat|atta\b/.test(n) || input.composition.wholeGrainFraction >= 0.5) {
    return { subtype: 'whole_wheat', provenance: input.composition.wholeGrainFraction >= 0.5 ? 'inferred_composition' : 'inferred_name' };
  }
  if (/\bsandwich loaf|pan loaf|pullman\b/.test(n)) return { subtype: 'pan_loaf', provenance: 'inferred_name' };

  // Composition heuristics
  if (input.composition.starterPct > 5 && input.composition.instantYeastEquivalentPct < 0.1) {
    return { subtype: 'sourdough', provenance: 'inferred_composition' };
  }
  if (input.composition.fatPct > 8 && input.composition.sweetenerPct > 5) {
    return { subtype: 'brioche', provenance: 'inferred_composition' };
  }
  if (input.composition.hydrationPct >= 75) {
    return { subtype: 'ciabatta', provenance: 'inferred_composition' };
  }
  if (input.composition.hydrationPct < 60) {
    return { subtype: 'bagel', provenance: 'inferred_composition' };
  }

  return { subtype: 'standard_bread', provenance: 'fallback' };
}

export function evaluateBread(input: EvalInput): BreadEvaluation | null {
  const meta = input.recipe.mixingParams ?? {};
  const composition = calculateBakersPct(input.resolved, input.ingredientCatalog, meta.starterHydrationPct);
  if (!composition) return null;

  const { subtype, provenance } = inferBreadRecipeSubtype({
    declared: input.recipe.breadSubtype,
    recipeName: input.recipe.name ?? '',
    composition,
  });

  const desiredDoughTempC = meta.desiredDoughTempC ?? DEFAULT_DDT_BY_SUBTYPE[subtype];
  const roomTempC = meta.roomTempC ?? 22;
  const flourTempC = meta.flourTempC ?? roomTempC;
  const mixingMethod = meta.mixingMethod ?? 'stand_mixer';
  const frictionFactorC = meta.frictionFactor ?? DEFAULT_FRICTION_FACTOR_BY_METHOD[mixingMethod];

  // Preferment temp: if a starter is present at meaningful percentage, assume room temp
  // for the preferment unless overridden. (A real chef-supplied preferment temp is a future
  // metadata field; for now this is a reasonable default that matches kitchen reality.)
  const prefermentTempC = composition.starterPct > 5 ? roomTempC : undefined;

  const ddt = calculateDdtWaterTemp({
    desiredDoughTempC,
    roomTempC,
    flourTempC,
    frictionFactorC,
    prefermentTempC,
  });

  const gluten = assessGluten(composition.lines, composition.hydrationPct);

  const ingredientSubtypes: Record<string, BreadSubtype | null> = {};
  for (const r of input.resolved) {
    const ing = input.ingredientCatalog.get(r.ingredientId);
    if (!ing) { ingredientSubtypes[r.ingredientId] = null; continue; }
    ingredientSubtypes[r.ingredientId] = inferBreadIngredientSubtype(ing, r.role);
  }

  const warnings = deriveBreadWarnings({ subtype, comp: composition, gluten, ddt });

  return {
    derived: {
      composition,
      ddt,
      gluten,
      recipeSubtype: subtype,
      recipeSubtypeProvenance: provenance,
      ingredientSubtypes,
      band: BREAD_BANDS_BY_SUBTYPE[subtype],
    },
    warnings,
  };
}
