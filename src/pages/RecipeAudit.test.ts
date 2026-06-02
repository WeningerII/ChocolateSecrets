import { describe, it, expect } from 'vitest';
import { Recipe } from '../types';

describe('analyzeRecipe', () => {
  it('returns zero counts for a recipe without meta', async () => {
    const recipe: Recipe = {
      id: 'r1',
      name: 'Test',
      description: '',
      type: 'standard',
      components: [{
        id: 'c1',
        name: 'Main',
        type: 'base',
        percentageOfTotalWeight: 100,
        bufferPercentage: 0,
        ingredients: [{ ingredientId: 'i1', quantity: 100, unit: 'g' }],
      }],
    };
    // Dynamic import to avoid circular test/component deps
    const { analyzeRecipe } = await import('./RecipeAudit');
    const health = analyzeRecipe(recipe);
    expect(health.total).toBe(0);
  });
  
  it('counts verbatim and inferred fields', async () => {
    const recipe: Recipe = {
      id: 'r2',
      name: 'Test',
      description: '',
      type: 'standard',
      meta: {
        name: { provenance: 'verbatim' },
        description: { provenance: 'inferred_high' },
      },
      components: [],
    };
    const { analyzeRecipe } = await import('./RecipeAudit');
    const health = analyzeRecipe(recipe);
    expect(health.verbatim).toBe(1);
    expect(health.inferred_high).toBe(1);
    expect(health.total).toBe(2);
  });
});
