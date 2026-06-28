import type {
  Recipe, Ingredient, SearchDimension, UniversalRole,
} from '../../../types';
import { inferRole, getRoleSwapSet } from '../roles';

/**
 * Default tuning ranges per role. Used by deriveSearchSpace when the chef
 * isn't locked down.
 *
 * - Multiplicative bounds: e.g., {min: 0.7, max: 1.3} = ±30% of base mass.
 * - Roles not in this table are locked by default (flavor, salt, water, inclusion).
 */
const DEFAULT_RANGES: Partial<Record<UniversalRole, { min: number; max: number }>> = {
  liquid:        { min: 0.7, max: 1.3 },
  fat:           { min: 0.8, max: 1.2 },
  sweetener:     { min: 0.5, max: 1.5 },
  acidulant:     { min: 0.5, max: 1.5 },
  hydrocolloid:  { min: 0.5, max: 2.0 },
  alcohol:       { min: 0.5, max: 1.5 },
};

/**
 * Cocoa-percentage option set for chocolate ingredients. The candidate-build
 * step looks up the actual ingredient catalog for chocolates with cocoa% in
 * each option's neighborhood (±2%) and substitutes accordingly. If no
 * neighbor exists, the dimension contributes nothing.
 */
const COCOA_OPTIONS = [55, 60, 65, 70, 72, 75, 80, 85];

interface DeriveInput {
  recipe: Recipe;
  catalog: Ingredient[];
  lockedIngredientIds: string[];
  candidateAdditionIds: string[];
}

export function deriveSearchSpace({
  recipe, catalog, lockedIngredientIds, candidateAdditionIds,
}: DeriveInput): SearchDimension[] {
  const dimensions: SearchDimension[] = [];
  const catalogById = new Map(catalog.map(i => [i.id, i]));

  // Walk components × ingredients, derive dimensions for each unlocked entry
  (recipe.components ?? []).forEach((component, componentIndex) => {
    (component.ingredients ?? []).forEach((ri, ingredientIndex) => {
      if (!ri.ingredientId) return;
      if (lockedIngredientIds.includes(ri.ingredientId)) return;

      const ingredient = catalogById.get(ri.ingredientId);
      if (!ingredient) return;

      const role = ri.role?.universal ?? inferRole(ingredient).role;
      if (!role) return;

      // 1) continuous_mass — only for roles in DEFAULT_RANGES
      const range = DEFAULT_RANGES[role];
      if (range && ri.quantity > 0) {
        dimensions.push({
          kind: 'continuous_mass',
          ingredientId: ri.ingredientId,
          componentIndex,
          ingredientIndex,
          baseMass: ri.quantity,
          minMass: ri.quantity * range.min,
          maxMass: ri.quantity * range.max,
        });
      }

      // 2) parametric_choice for chocolate cocoa%
      if (ingredient.chocolateSpec?.cocoaPercentage !== undefined) {
        const baseCocoa = ingredient.chocolateSpec.cocoaPercentage;
        // Filter options to those with at least one neighboring chocolate in the catalog
        const valid = COCOA_OPTIONS.filter(opt => {
          if (Math.abs(opt - baseCocoa) < 1) return true;       // base counts
          return catalog.some(i =>
            i.chocolateSpec?.type === ingredient.chocolateSpec?.type &&
            i.chocolateSpec?.cocoaPercentage !== undefined &&
            Math.abs(i.chocolateSpec.cocoaPercentage - opt) <= 2
          );
        });
        if (valid.length > 1) {
          dimensions.push({
            kind: 'parametric_choice',
            ingredientId: ri.ingredientId,
            componentIndex,
            ingredientIndex,
            property: 'cocoaPercentage',
            options: valid,
          });
        }
      }

      // 3) discrete_swap — find catalog entries that share role (getRoleSwapSet
      // applies the same role + 0.75-confidence filter; both filters preserve
      // catalog order, so excluding self then taking the first 5 is equivalent).
      const swapCandidates = getRoleSwapSet(role, catalog)
        .filter(i => i.id !== ri.ingredientId)
        .slice(0, 5)         // cap at 5 alternatives + the base = 6 choices total
        .map(i => i.id);
      if (swapCandidates.length > 0) {
        dimensions.push({
          kind: 'discrete_swap',
          componentIndex,
          ingredientIndex,
          candidateIngredientIds: [ri.ingredientId, ...swapCandidates],
        });
      }
    });
  });

  // 4) presence_with_variant — chef-opted candidate additions
  for (const addId of candidateAdditionIds) {
    const ingredient = catalogById.get(addId);
    if (!ingredient) continue;
    const role = inferRole(ingredient).role;
    if (!role) continue;

    // Compute total recipe mass to bound the maxMass at 10% of total
    const totalMass = (recipe.components ?? []).reduce(
      (sum, c) => sum + (c.ingredients ?? []).reduce((s, ri) => s + (ri.quantity ?? 0), 0),
      0
    );
    if (totalMass === 0) continue;

    // Pick a sensible component index — the first one
    const componentIndex = 0;

    dimensions.push({
      kind: 'presence_with_variant',
      role,
      componentIndex,
      candidateIngredientIds: [addId],
      maxMass: totalMass * 0.10,
    });
  }

  return dimensions;
}

/**
 * For a given decision vector encoded in [0..1], return the gene count.
 * presence_with_variant uses 3 genes (presence flag + variant choice + mass);
 * all others use 1.
 */
export function geneCount(dimension: SearchDimension): number {
  return dimension.kind === 'presence_with_variant' ? 3 : 1;
}

export function totalGeneCount(dimensions: SearchDimension[]): number {
  return dimensions.reduce((sum, d) => sum + geneCount(d), 0);
}
