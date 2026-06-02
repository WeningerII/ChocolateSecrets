import { describe, test, expect } from 'vitest';
import { applyDecisionVector } from './recipeBuilder';
import type { Recipe, Ingredient, SearchDimension } from '../../../types';

const catalog: Ingredient[] = [
  { id: 'ing1', name: 'Ingredient 1' } as Ingredient,
  { id: 'ing2', name: 'Ingredient 2' } as Ingredient,
  { id: 'dark-70', name: 'Dark 70', chocolateSpec: { type: 'dark', cocoaPercentage: 70 } } as Ingredient,
  { id: 'dark-65', name: 'Dark 65', chocolateSpec: { type: 'dark', cocoaPercentage: 65 } } as Ingredient,
];

const baseRecipe: Recipe = {
  id: 'r1',
  components: [{ ingredients: [{ ingredientId: 'ing1', quantity: 100 }, { ingredientId: 'dark-70', quantity: 50 }] }]
} as Recipe;

describe('applyDecisionVector', () => {
  test('continuous_mass with 0.5 produces midpoint', () => {
    const dims: SearchDimension[] = [{ kind: 'continuous_mass', ingredientId: 'ing1', componentIndex: 0, ingredientIndex: 0, baseMass: 100, minMass: 50, maxMass: 150 }];
    const res = applyDecisionVector(baseRecipe, [0.5], dims, catalog);
    expect(res.recipe.components![0].ingredients![0].quantity).toBe(100); // 50 + 100 * 0.5 = 100
  });

  test('diff list captures mass change', () => {
    const dims: SearchDimension[] = [{ kind: 'continuous_mass', ingredientId: 'ing1', componentIndex: 0, ingredientIndex: 0, baseMass: 100, minMass: 50, maxMass: 150 }];
    const res = applyDecisionVector(baseRecipe, [1.0], dims, catalog);
    expect(res.recipe.components![0].ingredients![0].quantity).toBe(150);
    expect(res.diff).toContainEqual({ kind: 'mass_changed', ingredientName: 'Ingredient 1', from: 100, to: 150 });
  });

  test('discrete_swap with gene 0 keeps base, 1 swaps to alternative', () => {
    const dims: SearchDimension[] = [{ kind: 'discrete_swap', componentIndex: 0, ingredientIndex: 0, candidateIngredientIds: ['ing1', 'ing2'] }];
    const res0 = applyDecisionVector(baseRecipe, [0.0], dims, catalog);
    expect(res0.recipe.components![0].ingredients![0].ingredientId).toBe('ing1');
    
    const res1 = applyDecisionVector(baseRecipe, [0.99], dims, catalog); // math floor (0.99 * 2) = 1
    expect(res1.recipe.components![0].ingredients![0].ingredientId).toBe('ing2');
    expect(res1.diff).toContainEqual({ kind: 'swapped', from: 'Ingredient 1', to: 'Ingredient 2', mass: 100 });
  });

  test('parametric_choice picks last option at gene 1', () => {
    const dims: SearchDimension[] = [{ kind: 'parametric_choice', ingredientId: 'dark-70', componentIndex: 0, ingredientIndex: 1, property: 'cocoaPercentage', options: [70, 65] }];
    const res = applyDecisionVector(baseRecipe, [0.99], dims, catalog);
    expect(res.recipe.components![0].ingredients![1].ingredientId).toBe('dark-65');
  });

  test('presence_with_variant inserts based on presence gene and scales mass', () => {
    const dims: SearchDimension[] = [{ kind: 'presence_with_variant', role: 'sweetener', componentIndex: 0, candidateIngredientIds: ['ing2'], maxMass: 20 }];
    const resAbsent = applyDecisionVector(baseRecipe, [0.4, 1.0], dims, catalog);
    expect(resAbsent.recipe.components![0].ingredients!.length).toBe(2);

    const resPresent = applyDecisionVector(baseRecipe, [0.6, 0.5], dims, catalog);
    expect(resPresent.recipe.components![0].ingredients!.length).toBe(3);
    const added = resPresent.recipe.components![0].ingredients![2];
    expect(added.ingredientId).toBe('ing2');
    expect(added.quantity).toBe(10); // 20 * 0.5
    expect(resPresent.diff).toContainEqual({ kind: 'added', ingredientName: 'Ingredient 2', mass: 10 });
  });
});
