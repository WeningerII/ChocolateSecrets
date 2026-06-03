import { describe, it, expect } from 'vitest';
import { resolveRecipeLeaves } from './resolveRecipeLeaves';
import type { Recipe, Ingredient } from '../types';

const ing = (over: Partial<Ingredient> & { id: string; name: string }): Ingredient => ({
  unit: 'g', stock: 0, lowStockThreshold: 0, ...over,
} as Ingredient);

const stdComponent = (ingredients: any[], bufferPercentage = 0) => ({
  id: 'c1', name: 'Base', type: 'base', percentageOfTotalWeight: 100, bufferPercentage, ingredients, instructions: [],
});

describe('resolveRecipeLeaves', () => {
  it('resolves a simple gram recipe to grams', () => {
    const recipe = {
      id: 'r', name: 'R', type: 'standard', description: '',
      components: [stdComponent([{ ingredientId: 'sugar', quantity: 100, unit: 'g' }])],
    } as Recipe;
    const { resolved } = resolveRecipeLeaves(recipe, [ing({ id: 'sugar', name: 'Sugar' })], [recipe]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].mass).toBe(100);
  });

  it('converts non-gram weight units to grams (1 kg → 1000 g)', () => {
    const recipe = {
      id: 'r', name: 'R', type: 'standard', description: '',
      components: [stdComponent([{ ingredientId: 'dark', quantity: 1, unit: 'kg' }])],
    } as Recipe;
    const { resolved } = resolveRecipeLeaves(recipe, [ing({ id: 'dark', name: 'Dark', unit: 'kg' })], [recipe]);
    expect(resolved[0].mass).toBeCloseTo(1000, 6);
  });

  it('applies component buffer to the resolved mass (the bug the old physics resolver missed)', () => {
    const recipe = {
      id: 'r', name: 'R', type: 'standard', description: '',
      components: [stdComponent([{ ingredientId: 'sugar', quantity: 100, unit: 'g' }], 10)],
    } as Recipe;
    const { resolved } = resolveRecipeLeaves(recipe, [ing({ id: 'sugar', name: 'Sugar' })], [recipe]);
    expect(resolved[0].mass).toBeCloseTo(110, 6); // 100g × (1 + 10%)
  });

  it('expands a sub-recipe by its declared yield', () => {
    const sub = {
      id: 'sub', name: 'Tempered', type: 'standard', description: '',
      yield: { totalYieldAmount: 100, totalYieldUnit: 'g' },
      components: [stdComponent([{ ingredientId: 'dark', quantity: 100, unit: 'g' }])],
    } as Recipe;
    const parent = {
      id: 'p', name: 'Parent', type: 'standard', description: '',
      components: [stdComponent([{ type: 'recipe', recipeId: 'sub', quantity: 50, unit: 'g' }])],
    } as Recipe;
    const { resolved } = resolveRecipeLeaves(parent, [ing({ id: 'dark', name: 'Dark' })], [sub, parent]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].ingredientId).toBe('dark');
    expect(resolved[0].mass).toBeCloseTo(50, 6); // 50g of a 100g-yield sub = 50g dark
  });

  it('converts volume→grams with density, and excludes a volume leaf without density', () => {
    const recipe = {
      id: 'r', name: 'R', type: 'standard', description: '',
      components: [stdComponent([{ ingredientId: 'water', quantity: 200, unit: 'ml' }])],
    } as Recipe;
    const withDensity = resolveRecipeLeaves(recipe, [ing({ id: 'water', name: 'Water', unit: 'ml', density: 1 })], [recipe]);
    expect(withDensity.resolved[0].mass).toBeCloseTo(200, 6);

    const noDensity = resolveRecipeLeaves(recipe, [ing({ id: 'water', name: 'Water', unit: 'ml' })], [recipe]);
    expect(noDensity.resolved).toHaveLength(0);
    expect(noDensity.unmassableLeaves).toHaveLength(1);
  });

  it('counts composition fallbacks', () => {
    const recipe = {
      id: 'r', name: 'R', type: 'standard', description: '',
      components: [stdComponent([
        { ingredientId: 'mystery', quantity: 50, unit: 'g' },
        { ingredientId: 'sugar', quantity: 50, unit: 'g' },
      ])],
    } as Recipe;
    const { fallbackCount } = resolveRecipeLeaves(
      recipe,
      [ing({ id: 'mystery', name: 'Mystery', category: 'Uncategorized' }), ing({ id: 'sugar', name: 'Sugar', composition: { sucrose: 100 } })],
      [recipe],
    );
    expect(fallbackCount).toBe(1); // mystery falls back; sugar has explicit composition
  });

  it('does not hang on a self-referential (cyclic) recipe', () => {
    const cyclic = {
      id: 'cyc', name: 'Cyclic', type: 'standard', description: '',
      components: [stdComponent([
        { ingredientId: 'sugar', quantity: 100, unit: 'g' },
        { type: 'recipe', recipeId: 'cyc', quantity: 50, unit: 'g' },
      ])],
    } as Recipe;
    const start = Date.now();
    const { resolved } = resolveRecipeLeaves(cyclic, [ing({ id: 'sugar', name: 'Sugar' })], [cyclic]);
    expect(Date.now() - start).toBeLessThan(100);
    expect(resolved.map(r => r.ingredientId)).toEqual(['sugar']); // cyclic ref skipped
  });
});
