import { describe, test, expect } from 'vitest';
import { runFormulationOptimizer } from './run';
import type { Recipe, Ingredient, OptimizerInput } from '../../../types';
import { applyDecisionVector } from './recipeBuilder';

const catalog: Ingredient[] = [
  { id: 'dark-70', name: 'Dark 70', chocolateSpec: { type: 'dark', cocoaPercentage: 70 }, unit: 'g', category: 'Chocolates' } as Ingredient,
  { id: 'heavy-cream', name: 'Heavy Cream', bufferRef: 'cream', unit: 'g', category: 'Dairy' } as Ingredient,
];

const baseRecipe: Recipe = {
  id: 'r1', name: 'Base Ganache',
  components: [
    {
      id: 'c1', name: 'Main',
      ingredients: [
        { ingredientId: 'dark-70', quantity: 100, role: { universal: 'fat' } },
        { ingredientId: 'heavy-cream', quantity: 50, role: { universal: 'liquid' } },
      ]
    }
  ],
} as Recipe;

describe('runFormulationOptimizer', () => {
  const baseInput: OptimizerInput = {
    baseRecipe,
    ingredientCatalog: catalog,
    recipesCatalog: [],
    targets: { shelfLifeWeeksMin: 4 },
    weights: { shelf_life_weeks: 1.0 },
    lockedIngredientIds: [],
    candidateAdditionIds: [],
    config: { populationSize: 10, generations: 5 }
  };

  test('runs and returns candidates', () => {
    const res = runFormulationOptimizer(baseInput);
    expect(res.candidates.length).toBeGreaterThan(0);
    expect(res.searchSpace.length).toBeGreaterThan(0);
    expect(res.generationsRun).toBe(5);

    const first = res.candidates[0];
    expect(first.recipe.components![0].ingredients![0].ingredientId).toBeDefined();
    expect(first.objectives.shelf_life_weeks).toBeGreaterThanOrEqual(0.05); // normalized
    expect(first.paretoRank).toBe(0);
  });

  test('can optimize toward palatability (the "make it delicious" objective)', () => {
    const res = runFormulationOptimizer({
      ...baseInput,
      weights: { palatability_balance: 1.0 },
    });
    expect(res.candidates.length).toBeGreaterThan(0);
    const score = res.candidates[0].objectives.palatability_balance;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  test('returns only base recipe if search space empty', () => {
    const input: OptimizerInput = {
      ...baseInput,
      lockedIngredientIds: ['dark-70', 'heavy-cream']
    };
    const res = runFormulationOptimizer(input);
    expect(res.searchSpace.length).toBe(0);
    expect(res.candidates.length).toBe(1);
    expect(res.candidates[0].diff.length).toBe(0);
  });
  
  test('vector reproduces candidate recipe', () => {
    const res = runFormulationOptimizer(baseInput);
    const candidate = res.candidates[0];
    const { recipe } = applyDecisionVector(baseRecipe, candidate.vector, res.searchSpace, catalog);
    // Quick mass comparison
    expect(recipe.components![0].ingredients![0].quantity).toBe(candidate.recipe.components![0].ingredients![0].quantity);
  });
});
