import { describe, it, expect } from 'vitest';
import { recipeContributions, contributionsFromLeaves } from './recipeContributions';
import type { Recipe, Ingredient } from '../types';

const ing = (over: Partial<Ingredient> & { id: string; name: string }): Ingredient => ({
  unit: 'g', stock: 0, lowStockThreshold: 0, ...over,
} as Ingredient);

const stdComponent = (ingredients: any[]) => ({
  id: 'c1', name: 'Base', type: 'base', percentageOfTotalWeight: 100, bufferPercentage: 0, ingredients, instructions: [],
});

describe('recipeContributions', () => {
  it('attributes cost share per ingredient', () => {
    const recipe = {
      id: 'r', name: 'R', type: 'standard', description: '',
      components: [stdComponent([
        { ingredientId: 'dark', quantity: 100, unit: 'g' },
        { ingredientId: 'sugar', quantity: 100, unit: 'g' },
      ])],
    } as Recipe;
    const ingredients = [
      ing({ id: 'dark', name: 'Dark', costPerUnit: 0.05, composition: { fat: 40, sucrose: 30 } }),
      ing({ id: 'sugar', name: 'Sugar', costPerUnit: 0.01, composition: { sucrose: 100 } }),
    ];
    const r = recipeContributions(recipe, ingredients, [recipe]);
    expect(r.totalCostUsd).toBeCloseTo(6, 6); // 100*0.05 + 100*0.01
    const dark = r.ingredients.find(i => i.ingredientId === 'dark')!;
    const sugar = r.ingredients.find(i => i.ingredientId === 'sugar')!;
    expect(dark.costShare).toBeCloseTo(5 / 6, 6);
    expect(sugar.costShare).toBeCloseTo(1 / 6, 6);
    expect(r.ingredients[0].ingredientId).toBe('dark'); // sorted by cost desc
  });

  it('attributes water share from composition', () => {
    const recipe = {
      id: 'r', name: 'R', type: 'standard', description: '',
      components: [stdComponent([
        { ingredientId: 'cream', quantity: 100, unit: 'g' }, // 60% water → 60 g
        { ingredientId: 'sugar', quantity: 100, unit: 'g' }, // 0% water
      ])],
    } as Recipe;
    const ingredients = [
      ing({ id: 'cream', name: 'Cream', costPerUnit: 0.02, composition: { water: 60, fat: 36 } }),
      ing({ id: 'sugar', name: 'Sugar', costPerUnit: 0.01, composition: { sucrose: 100 } }),
    ];
    const r = recipeContributions(recipe, ingredients, [recipe]);
    expect(r.totalWaterG).toBeCloseTo(60, 6);
    const cream = r.ingredients.find(i => i.ingredientId === 'cream')!;
    expect(cream.waterShare).toBeCloseTo(1, 6); // all the water comes from cream
  });

  it('marks cost as null when an ingredient has no usable cost', () => {
    const recipe = {
      id: 'r', name: 'R', type: 'standard', description: '',
      components: [stdComponent([{ ingredientId: 'mystery', quantity: 50, unit: 'g' }])],
    } as Recipe;
    const r = recipeContributions(recipe, [ing({ id: 'mystery', name: 'Mystery' })], [recipe]);
    expect(r.totalCostUsd).toBe(0);
    expect(r.ingredients[0].costUsd).toBeNull();
    expect(r.ingredients[0].costShare).toBeNull();
  });

  it('attributes a sub-recipe cost driver to the underlying raw ingredient', () => {
    const sub = {
      id: 'sub', name: 'Ganache', type: 'standard', description: '',
      yield: { totalYieldAmount: 100, totalYieldUnit: 'g' },
      components: [stdComponent([{ ingredientId: 'dark', quantity: 100, unit: 'g' }])],
    } as Recipe;
    const parent = {
      id: 'p', name: 'Bonbon', type: 'standard', description: '',
      components: [stdComponent([{ type: 'recipe', recipeId: 'sub', quantity: 50, unit: 'g' }])],
    } as Recipe;
    const r = recipeContributions(parent, [ing({ id: 'dark', name: 'Dark', costPerUnit: 0.05 })], [sub, parent]);
    // 50 g of a 100 g-yield ganache = 50 g dark × $0.05 = $2.50, attributed to "dark".
    expect(r.ingredients).toHaveLength(1);
    expect(r.ingredients[0].ingredientId).toBe('dark');
    expect(r.ingredients[0].costUsd).toBeCloseTo(2.5, 6);
  });

  it('falls back to costPerUnit when weightedAverageCost is 0 (matches calculateRecipeCost precedence)', () => {
    const recipe = {
      id: 'r', name: 'R', type: 'standard', description: '',
      components: [stdComponent([{ ingredientId: 'dark', quantity: 100, unit: 'g' }])],
    } as Recipe;
    const ingredients = [ing({ id: 'dark', name: 'Dark', weightedAverageCost: 0, costPerUnit: 0.05 })];
    const r = recipeContributions(recipe, ingredients, [recipe]);
    // A defined weightedAverageCost of 0 must NOT suppress the costPerUnit fallback (|| not ??).
    expect(r.totalCostUsd).toBeCloseTo(5, 6); // 100 g × $0.05
    expect(r.ingredients[0].costUsd).toBeCloseTo(5, 6);
  });

  it('contributionsFromLeaves rolls up a pre-resolved leaf vector without re-resolving', () => {
    const resolved = [
      { ingredientId: 'a', name: 'A', mass: 100, composition: { water: 50 }, compositionSource: 'explicit' },
      { ingredientId: 'b', name: 'B', mass: 100, composition: { water: 0 }, compositionSource: 'explicit' },
    ] as any;
    const ingredients = [ing({ id: 'a', name: 'A', costPerUnit: 0.1 }), ing({ id: 'b', name: 'B', costPerUnit: 0.1 })];
    const r = contributionsFromLeaves(resolved, ingredients);
    expect(r.totalMassG).toBeCloseTo(200, 6);
    expect(r.totalWaterG).toBeCloseTo(50, 6);
    expect(r.totalCostUsd).toBeCloseTo(20, 6); // 100×0.1 + 100×0.1
    expect(r.ingredients[0].costShare).toBeCloseTo(0.5, 6);
  });
});
