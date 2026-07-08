import type { UniversalRole } from './roles';
import type { Recipe } from './recipe';
import type { Ingredient } from './ingredient';

// =====================================================================
// Optimizer (Milestone E — Formulation Optimizer)
// =====================================================================

/**
 * One axis of the search space. Each dimension contributes one or more genes
 * to the decision vector. The recipe builder decodes a vector against the base
 * recipe and the dimension list to produce a candidate.
 *
 * Closed enum — adding a new dimension kind is a code change in
 * src/services/foodScience/optimizer/.
 */
export type SearchDimension =
  | {
      kind: 'continuous_mass';
      ingredientId: string;        // existing recipe-ingredient
      componentIndex: number;
      ingredientIndex: number;
      baseMass: number;
      minMass: number;
      maxMass: number;
    }
  | {
      kind: 'continuous_pct_of_role';
      role: UniversalRole;
      componentIndex: number;       // where to insert if not present
      ingredientId: string;          // candidate to insert/scale
      minPct: number;                // 0..1 of total recipe mass
      maxPct: number;
    }
  | {
      kind: 'parametric_choice';
      ingredientId: string;
      componentIndex: number;
      ingredientIndex: number;
      property: 'cocoaPercentage';
      options: number[];             // e.g., [55, 60, 65, 70, 75, 80]
    }
  | {
      kind: 'discrete_swap';
      componentIndex: number;
      ingredientIndex: number;
      candidateIngredientIds: string[];   // includes the base ingredient at index 0
    }
  | {
      kind: 'presence_with_variant';
      role: UniversalRole;
      componentIndex: number;
      candidateIngredientIds: string[];   // ingredients to consider adding
      maxMass: number;
    };

/** A serialized decision vector. One entry per dimension; semantics depend on kind. */
export type DecisionVector = number[];

export type OptimizerObjective =
  | 'aw_distance_to_target'
  | 'aw_below_threshold'
  | 'shelf_life_weeks'
  | 'cost_per_gram'
  | 'curdle_safety_margin'
  | 'fat_regime_distance'
  | 'warning_count'
  | 'composition_completeness'
  | 'ice_fraction_at_serving_distance'
  | 'recrystallization_margin'
  | 'palatability_balance';

export interface OptimizerTargets {
  awTarget?: number;             // e.g., 0.85 for stabilized
  awMaxThreshold?: number;       // hard constraint when set
  shelfLifeWeeksMin?: number;
  costPerGramMaxUsd?: number;
  forbiddenFatRegimes?: Array<'firm-set' | 'standard' | 'inversion-approaching' | 'oil-in-water'>;
  maxCurdleRisk?: 'none' | 'low' | 'medium' | 'high';
  /** Frozen-dessert serving temperature (°C) for the ice-fraction / recrystallization objectives. */
  servingTempC?: number;
  /** Target fraction (0..1) of water frozen at servingTempC. */
  frozenWaterTarget?: number;
}

/** Weights in [0..1]. Normalized at runtime. Keys present here are active objectives. */
export type ObjectiveWeights = Partial<Record<OptimizerObjective, number>>;

export interface OptimizerCandidate {
  id: string;                              // crypto.randomUUID at construction
  vector: DecisionVector;
  recipe: Recipe;                          // the materialized candidate recipe
  /** Per-objective scores; higher is better, normalized to [0..1] except warning_count which is 1/(1+n). */
  objectives: Record<OptimizerObjective, number>;
  topsisCloseness: number;                 // 0..1, higher better
  paretoRank: number;                      // 0 = non-dominated front
  /** Diff from base for display: list of human-readable changes. Computed by recipeBuilder. */
  diff: Array<
    | { kind: 'mass_changed'; ingredientName: string; from: number; to: number }
    | { kind: 'swapped'; from: string; to: string; mass: number }
    | { kind: 'added'; ingredientName: string; mass: number }
    | { kind: 'removed'; ingredientName: string; mass: number }
    | { kind: 'cocoa_changed'; from: number; to: number }
  >;
}

export interface OptimizerInput {
  baseRecipe: Recipe;
  ingredientCatalog: Ingredient[];        // entire catalog accessible to the worker
  recipesCatalog: Recipe[];                // for sub-recipe resolution; usually empty for tuning
  targets: OptimizerTargets;
  weights: ObjectiveWeights;
  /** Locked dimensions (chef pinned these and doesn't want them touched). */
  lockedIngredientIds: string[];
  /** Candidate ingredients to consider adding (presence_with_variant). */
  candidateAdditionIds: string[];
  /** Search algorithm config; pass empty object to use defaults. */
  config?: {
    populationSize?: number;
    generations?: number;
    crossoverRate?: number;       // 0..1
    mutationRate?: number;
    sbxEta?: number;              // SBX distribution index
    polynomialEta?: number;       // mutation distribution index
    tournamentSize?: number;
    topN?: number;
  };
}

export interface OptimizerResult {
  candidates: OptimizerCandidate[];
  searchSpace: SearchDimension[];
  generationsRun: number;
}
