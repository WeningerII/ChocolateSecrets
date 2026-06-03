import type {
  Recipe, Ingredient, OptimizerInput, OptimizerResult, OptimizerCandidate,
  OptimizerObjective, DecisionVector,
} from '../../../types';
import {
  calculateNorrishAw, calculateMixedPH, predictShelfLife,
  classifyAwBand, classifyFatRegime,
} from '../universal';
import { evaluateConfectionery } from '../confectionery';
import { deriveSearchSpace, totalGeneCount } from './searchSpace';
import { applyDecisionVector } from './recipeBuilder';
import { evaluateObjectives, detectHardConstraintViolation, activeObjectives } from './objectives';
import { convertUnit } from '../../../utils/units';
import {
  paretoRank, crowdingDistance, tournamentSelect,
  sbxCrossover, polynomialMutation, makeRng,
  type IndividualScored, NSGA2_DEFAULTS,
} from './nsga2';
import { topsisRank } from './topsis';
import { resolveRecipeLeaves } from '../../../utils/resolveRecipeLeaves';

export interface OptimizerProgressMessage {
  generation: number;
  totalGenerations: number;
  bestObjectiveSum: number;
  paretoFrontSize: number;
}

export type ProgressCallback = (m: OptimizerProgressMessage) => void;

/**
 * Top-level orchestrator. Pure; can run on the main thread or in a worker.
 */
export function runFormulationOptimizer(
  input: OptimizerInput,
  onProgress?: ProgressCallback
): OptimizerResult {
  const config = { ...NSGA2_DEFAULTS, ...(input.config ?? {}) };
  const dimensions = deriveSearchSpace({
    recipe: input.baseRecipe,
    catalog: input.ingredientCatalog,
    lockedIngredientIds: input.lockedIngredientIds,
    candidateAdditionIds: input.candidateAdditionIds,
  });

  const numGenes = totalGeneCount(dimensions);
  const active = activeObjectives(input.weights);
  const rng = makeRng(0xC0C0A);

  // If the search space is empty, return the base recipe as a single candidate
  if (numGenes === 0 || active.length === 0) {
    const baseScored = scoreCandidate(
      input.baseRecipe, [], dimensions, input.ingredientCatalog, input.recipesCatalog, input
    );
    return {
      candidates: [{ ...baseScored.candidate, paretoRank: 0, topsisCloseness: 1.0 }],
      searchSpace: dimensions,
      generationsRun: 0,
    };
  }

  // Initial population
  const popSize = config.populationSize;
  let population: IndividualScored[] = Array.from({ length: popSize }, () => {
    const vector = Array.from({ length: numGenes }, () => rng());
    const scored = scoreCandidate(
      input.baseRecipe, vector, dimensions, input.ingredientCatalog, input.recipesCatalog, input
    );
    return {
      vector,
      objectives: active.map(o => scored.candidate.objectives[o]),
    };
  });

  for (let gen = 0; gen < config.generations; gen++) {
    paretoRank(population);
    // Group by rank for crowding distance computation
    const byRank = new Map<number, IndividualScored[]>();
    for (const ind of population) {
      const r = ind.paretoRank ?? 0;
      const list = byRank.get(r) ?? [];
      list.push(ind);
      byRank.set(r, list);
    }
    for (const list of byRank.values()) crowdingDistance(list);

    // Generate children
    const children: IndividualScored[] = [];
    while (children.length < popSize) {
      const parent1 = tournamentSelect(population, config.tournamentSize, rng);
      const parent2 = tournamentSelect(population, config.tournamentSize, rng);
      const child1: number[] = [];
      const child2: number[] = [];
      for (let g = 0; g < numGenes; g++) {
        const [c1, c2] = rng() < config.crossoverRate
          ? sbxCrossover(parent1.vector[g], parent2.vector[g], config.sbxEta, rng)
          : [parent1.vector[g], parent2.vector[g]];
        const m1 = rng() < config.mutationRate ? polynomialMutation(c1, config.polynomialEta, rng) : c1;
        const m2 = rng() < config.mutationRate ? polynomialMutation(c2, config.polynomialEta, rng) : c2;
        child1.push(m1);
        child2.push(m2);
      }
      for (const v of [child1, child2]) {
        if (children.length >= popSize) break;
        const scored = scoreCandidate(
          input.baseRecipe, v, dimensions, input.ingredientCatalog, input.recipesCatalog, input
        );
        children.push({
          vector: v,
          objectives: active.map(o => scored.candidate.objectives[o]),
        });
      }
    }

    // Combine parents + children, environmentally select top popSize
    const combined = [...population, ...children];
    paretoRank(combined);
    const cByRank = new Map<number, IndividualScored[]>();
    for (const ind of combined) {
      const r = ind.paretoRank ?? 0;
      const list = cByRank.get(r) ?? [];
      list.push(ind);
      cByRank.set(r, list);
    }
    for (const list of cByRank.values()) crowdingDistance(list);

    const selected: IndividualScored[] = [];
    const sortedRanks = Array.from(cByRank.keys()).sort((a, b) => a - b);
    for (const r of sortedRanks) {
      const list = cByRank.get(r)!;
      if (selected.length + list.length <= popSize) {
        selected.push(...list);
      } else {
        list.sort((a, b) => (b.crowdingDistance ?? 0) - (a.crowdingDistance ?? 0));
        selected.push(...list.slice(0, popSize - selected.length));
        break;
      }
    }
    population = selected;

    if (onProgress) {
      const front = population.filter(p => p.paretoRank === 0);
      const bestSum = front.reduce(
        (max, p) => Math.max(max, p.objectives.reduce((s, x) => s + x, 0)), 0
      );
      onProgress({
        generation: gen + 1,
        totalGenerations: config.generations,
        bestObjectiveSum: bestSum,
        paretoFrontSize: front.length,
      });
    }
  }

  // Final ranking: take the non-dominated front, score with TOPSIS
  paretoRank(population);
  const front = population.filter(p => p.paretoRank === 0);
  const candidates: OptimizerCandidate[] = front.map(ind => {
    const { candidate } = scoreCandidate(
      input.baseRecipe, ind.vector, dimensions, input.ingredientCatalog, input.recipesCatalog, input
    );
    return { ...candidate, paretoRank: 0, topsisCloseness: 0 };
  });

  const closenesses = topsisRank(
    candidates.map(c => ({ objectives: c.objectives })),
    input.weights,
    active
  );
  candidates.forEach((c, i) => { c.topsisCloseness = closenesses[i]; });
  candidates.sort((a, b) => b.topsisCloseness - a.topsisCloseness);

  // Deduplicate by recipe shape (same diff list = same candidate effectively)
  const seen = new Set<string>();
  const unique = candidates.filter(c => {
    const key = JSON.stringify(c.diff);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    candidates: unique.slice(0, input.config?.topN ?? 8),
    searchSpace: dimensions,
    generationsRun: config.generations,
  };
}

interface ScoreInput {
  weights: OptimizerInput['weights'];
  targets: OptimizerInput['targets'];
}

function scoreCandidate(
  baseRecipe: Recipe,
  vector: DecisionVector,
  dimensions: OptimizerInput['baseRecipe'] extends never ? never : ReturnType<typeof deriveSearchSpace>,
  catalog: Ingredient[],
  recipesCatalog: Recipe[],
  scoreInput: ScoreInput,
): { candidate: OptimizerCandidate } {
  const { recipe: candidateRecipe, diff } = applyDecisionVector(baseRecipe, vector, dimensions, catalog);
  const catalogById = new Map(catalog.map(i => [i.id, i]));

  // Resolve through the shared production-aware operator: real grams (unit
  // conversion via density), sub-recipe expansion, and component buffers/yield —
  // the same view the recipe pages display, so the optimizer scores the product
  // as it will actually be made.
  const { resolved } = resolveRecipeLeaves(candidateRecipe, catalog, recipesCatalog, 1);

  const aw = calculateNorrishAw(resolved);
  const pH = calculateMixedPH(resolved);
  const shelfLife = predictShelfLife(aw, resolved, {});
  const fatRegime = classifyFatRegime(aw.fatPct);
  const confectionery = (candidateRecipe.categories ?? []).includes('confectionery')
    ? evaluateConfectionery({ aw, pH, fatRegime, resolved, ingredientCatalog: catalogById })
    : null;

  const totalCost = resolved.reduce((sum, r) => {
    const ing = catalogById.get(r.ingredientId);
    if (!ing || typeof ing.costPerUnit !== 'number') return sum;
    // convertUnit(1, unit, 'g', density) finds how many units equal 1 gram?
    // Cost is in $/unit. We have r.mass in grams. We need the cost for r.mass grams.
    // Convert r.mass from 'g' to the ingredient's unit.
    const massInIngUnit = convertUnit(r.mass, 'g', ing.unit ?? 'g', ing.density);
    if (massInIngUnit === null) {
      // Cannot convert (e.g., 'each' or 'dozen' without weight info). Skip this
      // ingredient's cost contribution rather than silently misreport. The cost
      // objective will be slightly under-counted for unconvertible ingredients,
      // which is the conservative behavior.
      return sum;
    }
    return sum + massInIngUnit * ing.costPerUnit;
  }, 0);
  const totalMass = resolved.reduce((sum, r) => sum + r.mass, 0) || 1;

  const fallbackCount = resolved.filter(r =>
    r.compositionSource === 'category_default' || r.compositionSource === 'unknown'
  ).length;
  const compositionCompleteness = 1 - fallbackCount / Math.max(1, resolved.length);

  const warningCount =
    (confectionery?.warnings.length ?? 0) +
    aw.flags.filter(f => f.kind === 'extreme_saturation' || f.kind === 'no_water').length;

  const hardConstraintViolated = detectHardConstraintViolation(
    aw, fatRegime, confectionery, scoreInput.targets
  );

  const objectives = evaluateObjectives({
    aw, shelfLife, fatRegime, confectionery,
    costPerGram: totalCost / totalMass,
    warningCount,
    compositionCompleteness,
    hardConstraintViolated,
  }, scoreInput.targets);

  const candidate: OptimizerCandidate = {
    id: cryptoRandomId(),
    vector,
    recipe: candidateRecipe,
    objectives,
    topsisCloseness: 0,
    paretoRank: 0,
    diff,
  };
  return { candidate };
}

function cryptoRandomId(): string {
  // Worker-safe: crypto.randomUUID is available in Web Workers as of recent runtimes.
  // Fallback to a simple random-hex id if the API is missing.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
