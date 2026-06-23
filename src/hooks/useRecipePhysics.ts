import { useMemo } from 'react';
import type { Recipe, Ingredient } from '../types';
import {
  calculateNorrishAw,
  calculateMixedPH,
  computeTitratableAcidity,
  computeNutrition,
  predictShelfLife,
  classifyAwBand,
  classifyFatRegime,
  aggregateComposition,
  type ResolvedIngredient,
  type TitratableAcidityResult,
  type AwResult,
  type PHResult,
  type ShelfLifePrediction,
  type AwBand,
  type FatRegime,
  type NutritionResult,
} from '../services/foodScience/universal';

import { evaluateConfectionery, type ConfectioneryEvaluation, type ConfectioneryWarning } from '../services/foodScience/confectionery';
import { evaluateFrozen, type FrozenEvaluation } from '../services/foodScience/frozen';
import { evaluateBread, type BreadEvaluation } from '../services/foodScience/bread';
import { buildProcessProfile, profileFromSegments, computeMaillardBrowning, computeDoneness, computeLipidOxidation, computeMoistureMigration, DEFAULT_CHAR_LENGTH_M, type MaillardResult, type DonenessResult, type OxidationResult, type MoistureMigrationResult } from '../services/foodScience/process';
import { computeTasteProfile, computePalatability, type TasteProfile, type PalatabilityResult } from '../services/foodScience/perception';
import { computeEmulsion, computeFoam, computeRheology, computeGelation, resolveFunctionalAgent, type EmulsionResult, type FoamResult, type RheologyResult, type GelationResult, type GellingAgent } from '../services/foodScience/structure';
import { resolveRecipeLeaves, type UnmassableLeaf } from '../utils/resolveRecipeLeaves';

/** Assumed storage scenario for the shelf-life models (lipid oxidation, moisture
 *  migration): ambient room temperature for the declared shelf life (or a
 *  conservative default). Packaging/interface barriers are not modeled. */
const STORAGE_TEMP_C = 20;
const STORAGE_DEFAULT_DAYS = 90;
const SECONDS_PER_DAY = 86_400;
/** Temperature at which consistency/viscosity is reported (working/room temp). */
const RHEOLOGY_TEMP_C = 20;

export interface PhysicsWarning {
  kind:
    | 'composition_incomplete'
    | 'no_buffer_data'
    | 'no_water'
    | 'extreme_saturation'
    | 'declared_diverges'
    | 'bread_no_flour'
    | 'missing_density';
  ingredientCount?: number;
  ingredientNames?: string[];
  pH?: number;
  aqueousSugarPct?: number;
  declaredDays?: number;
  predictedWeeks?: number;
}

export interface RecipePhysics {
  aw: AwResult;
  pH: PHResult | null;
  titratableAcidity: TitratableAcidityResult | null;
  shelfLife: ShelfLifePrediction;
  awBand: AwBand;
  fatRegime: FatRegime;
  warnings: PhysicsWarning[];
  computedAmounts: Map<string, number>;        // recipeIngredient.id → grams at scale
  totalMass: number;                            // grams at scale
  scale: number;
  resolvedIngredients: ResolvedIngredient[];   // for downstream rendering
  confectionery: ConfectioneryEvaluation | null;
  frozen: FrozenEvaluation | null;
  bread: BreadEvaluation | null;
  /** Maillard browning over the bake T·time profile; null when no thermal step. */
  browning: MaillardResult | null;
  /** Core-temperature doneness over the bake profile; null when no thermal step. */
  doneness: DonenessResult | null;
  /** Lipid-oxidation rancidity potential over an assumed storage scenario. */
  oxidation: OxidationResult | null;
  /** Moisture migration between phases (components) at different a_w; null when single-phase. */
  moisture: MoistureMigrationResult | null;
  /** Perceived basic-taste intensities (0–100) from composition + pH. */
  taste: TasteProfile;
  /** Population-level taste balance (0–100) — the optimizer's "delicious" target. */
  palatability: PalatabilityResult;
  /** Emulsion type & stability (composition-based; emulsifier not yet auto-detected). */
  emulsion: EmulsionResult;
  /** Foam capacity & stability. */
  foam: FoamResult;
  /** Apparent viscosity, flow type & consistency. */
  rheology: RheologyResult;
  /** Gel set/melt behavior when a gelling agent is detected; null otherwise. */
  gelation: GelationResult | null;
  /** Atwater energy + macronutrients (per 100 g). */
  nutrition: NutritionResult;
}

function deriveWarnings(
  aw: AwResult,
  pH: PHResult | null,
  shelfLife: ShelfLifePrediction,
  fallbackCount: number,
  recipeCategories: string[],
  resolvedIngredientsLength: number,
  breadEval: BreadEvaluation | null,
  unmassableLeaves: UnmassableLeaf[],
  declaredShelfLifeDays?: number
): PhysicsWarning[] {
  const warnings: PhysicsWarning[] = [];
  if (fallbackCount >= 3) warnings.push({ kind: 'composition_incomplete', ingredientCount: fallbackCount });
  // Volume-measured ingredients with no density were dropped from the gram basis,
  // so Aw/shelf-life silently omit them. Flag them (deduped by ingredient); discrete
  // "each"/"piece" leaves are excluded by design and intentionally not warned about.
  const missingDensity = unmassableLeaves.filter(l => l.reason === 'missing_density');
  if (missingDensity.length > 0) {
    const ingredientNames = [...new Set(missingDensity.map(l => l.name))];
    warnings.push({ kind: 'missing_density', ingredientCount: ingredientNames.length, ingredientNames });
  }
  if (aw.flags.find(f => f.kind === 'no_water')) warnings.push({ kind: 'no_water' });
  const sat = aw.flags.find(f => f.kind === 'extreme_saturation');
  if (sat && sat.kind === 'extreme_saturation') warnings.push({ kind: 'extreme_saturation', aqueousSugarPct: sat.aqueousSugarPct });
  if (declaredShelfLifeDays !== undefined && shelfLife.flags.find(f => f.kind === 'declared_diverges')) {
    warnings.push({ kind: 'declared_diverges', declaredDays: declaredShelfLifeDays, predictedWeeks: shelfLife.weeks });
  }
  if (recipeCategories.includes('bread') && resolvedIngredientsLength > 0 && breadEval === null) {
    warnings.push({ kind: 'bread_no_flour' });
  }
  return warnings;
}

export function useRecipePhysics(
  recipe: Recipe | undefined,
  ingredients: Ingredient[],
  allRecipes: Recipe[],
  scale = 1
): RecipePhysics | null {
  return useMemo(() => {
    if (!recipe) return null;

    const ingredientMap = new Map(ingredients.map(i => [i.id, i]));

    const { resolved: resolvedIngredients, fallbackCount, unmassableLeaves } = resolveRecipeLeaves(
      recipe,
      ingredients,
      allRecipes,
      scale,
    );
    if (resolvedIngredients.length === 0) {
      // Empty or fully-unresolvable recipe — return null so consumers render an
      // "incomplete recipe" state rather than a misleading zero-physics result.
      return null;
    }

    const aw = calculateNorrishAw(resolvedIngredients);
    const pH = calculateMixedPH(resolvedIngredients);
    const titratableAcidity = computeTitratableAcidity(resolvedIngredients);
    const shelfLife = predictShelfLife(aw, resolvedIngredients, {
      declaredShelfLifeDays: recipe.haccp?.shelfLifeDays,
    });
    const awBand = classifyAwBand(aw.aw ?? 0);
    const fatRegime = classifyFatRegime(aw.fatPct);

    const isConfectionery = (recipe.categories ?? []).includes('confectionery');
    let confectionery: ConfectioneryEvaluation | null = null;
    if (isConfectionery) {
      confectionery = evaluateConfectionery({
        aw, pH, fatRegime,
        resolved: resolvedIngredients,
        ingredientCatalog: ingredientMap,
      });
    }

    const isFrozen = (recipe.categories ?? []).includes('frozen');
    let frozen: FrozenEvaluation | null = null;
    if (isFrozen) {
      frozen = evaluateFrozen({
        recipe, aw,
        resolved: resolvedIngredients,
        ingredientCatalog: ingredientMap,
      });
    }

    const isBread = (recipe.categories ?? []).includes('bread');
    let bread: BreadEvaluation | null = null;
    if (isBread) {
      bread = evaluateBread({
        recipe,
        resolved: resolvedIngredients,
        ingredientCatalog: ingredientMap,
      });
    }

    // Process layer: integrate reaction kinetics over the recipe's bake T·time
    // profile (assembled from every component's steps; extent is order-independent,
    // so flattening components is exact). Null when there is no thermal step
    // (unbaked / frozen items). Geometry for the doneness core-temperature model
    // is unknown in the data model, so a default portion size is assumed.
    const processProfile = buildProcessProfile(
      (recipe.components ?? []).flatMap(c => c.steps ?? []),
    );
    const hasThermalProfile = processProfile.segments.length > 0;
    const mixComposition = aggregateComposition(resolvedIngredients);
    const browning: MaillardResult | null =
      hasThermalProfile && aw.aw !== null
        ? computeMaillardBrowning(mixComposition, aw.aw, processProfile)
        : null;
    const doneness: DonenessResult | null =
      hasThermalProfile
        ? computeDoneness({ profile: processProfile, composition: mixComposition, charLengthM: DEFAULT_CHAR_LENGTH_M })
        : null;

    // Storage-scenario models run over an assumed timeline (ambient × shelf life).
    const storageDays = recipe.haccp?.shelfLifeDays ?? STORAGE_DEFAULT_DAYS;
    const storageProfile = profileFromSegments([{ tempC: STORAGE_TEMP_C, durationS: storageDays * SECONDS_PER_DAY }]);
    const oxidation: OxidationResult | null =
      aw.aw !== null ? computeLipidOxidation(mixComposition, aw.aw, storageProfile) : null;

    // Moisture migration between phases (components) at different a_w. a_w is
    // intensive, so each component's a_w is computed by resolving it in isolation.
    const recipeComponents = recipe.components ?? [];
    let moisture: MoistureMigrationResult | null = null;
    if (recipeComponents.length >= 2) {
      const phaseAws: number[] = [];
      for (const comp of recipeComponents) {
        const { resolved } = resolveRecipeLeaves({ ...recipe, components: [comp] }, ingredients, allRecipes, scale);
        if (resolved.length === 0) continue;
        const a = calculateNorrishAw(resolved).aw;
        if (a !== null) phaseAws.push(a);
      }
      moisture = computeMoistureMigration(phaseAws, storageProfile);
    }

    // Perception: receptor-level taste intensities from the mix composition + pH,
    // then population-level palatability balance — the number the formulation
    // optimizer maximizes ("make it delicious").
    const taste = computeTasteProfile(mixComposition, pH?.pH ?? null, {
      titratableAcidityEqPerL: titratableAcidity?.eqPerLitre,
    });
    const palatability = computePalatability(taste);

    const nutrition = computeNutrition(mixComposition);

    // Structure & texture. Detect functional agents by ingredient name so the
    // emulsion (emulsifier HLB) and gelation (which agent + dose) are data-driven.
    let emulsifierHlbMass = 0;
    let emulsifierMass = 0;
    let topGellingAgent: { agent: GellingAgent; mass: number } | null = null;
    let leafTotalMass = 0;
    for (const r of resolvedIngredients) {
      leafTotalMass += r.mass;
      const fa = resolveFunctionalAgent(r.name);
      if (!fa) continue;
      if (fa.kind === 'emulsifier') {
        emulsifierHlbMass += fa.hlb * r.mass;
        emulsifierMass += r.mass;
      } else if (!topGellingAgent || r.mass > topGellingAgent.mass) {
        topGellingAgent = { agent: fa.agent, mass: r.mass };
      }
    }
    const emulsifierHLB = emulsifierMass > 0 ? emulsifierHlbMass / emulsifierMass : undefined;

    const rheology = computeRheology(mixComposition, RHEOLOGY_TEMP_C);
    const emulsion = computeEmulsion({ composition: mixComposition, emulsifierHLB });
    const foam = computeFoam(mixComposition);
    const gelation: GelationResult | null =
      topGellingAgent && leafTotalMass > 0
        ? computeGelation(topGellingAgent.agent, (topGellingAgent.mass / leafTotalMass) * 100, { sugarBrix: rheology.brix })
        : null;

    const warnings = deriveWarnings(aw, pH, shelfLife, fallbackCount, recipe.categories ?? [], resolvedIngredients.length, bread, unmassableLeaves, recipe.haccp?.shelfLifeDays);

    // Production-accurate per-ingredient amounts and total mass derive directly
    // from the resolved leaf vector (buffers, hardware yield, sub-recipe expansion
    // and unit->grams conversion already applied), grouped by ingredient id.
    const computedAmounts = new Map<string, number>();
    let totalMass = 0;
    for (const r of resolvedIngredients) {
      computedAmounts.set(r.ingredientId, (computedAmounts.get(r.ingredientId) ?? 0) + r.mass);
      totalMass += r.mass;
    }

    return {
      aw, pH, titratableAcidity, shelfLife, awBand, fatRegime, warnings,
      computedAmounts,
      totalMass,
      scale,
      resolvedIngredients,
      confectionery,
      frozen,
      bread,
      browning,
      doneness,
      oxidation,
      moisture,
      taste,
      palatability,
      emulsion,
      foam,
      rheology,
      gelation,
      nutrition,
    };
  }, [recipe, ingredients, allRecipes, scale]);
}
