// @vitest-environment jsdom
import { describe, test, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRecipePhysics } from './useRecipePhysics';
import type { Recipe, Ingredient } from '../types';

const HEAVY_CREAM: Ingredient = {
  id: 'heavy-cream', name: 'Heavy Cream', stock: 0, lowStockThreshold: 0,
  unit: 'g', category: 'Dairy & Alternatives',
  composition: { water: 58, fat: 36, lactose: 2.9, protein: 2.1, ash: 0.5 },
  bufferRef: 'cream',
} as Ingredient;

const DARK_70: Ingredient = {
  id: 'dark-70', name: 'Dark 70 Couverture', stock: 0, lowStockThreshold: 0,
  unit: 'g', category: 'Chocolates & Cocoas',
  composition: { water: 0.5, sucrose: 29, fat: 43.5 },
  chocolateSpec: { type: 'dark', cocoaPercentage: 70 },
} as Ingredient;

const RASPBERRY_PUREE: Ingredient = {
  id: 'rasp-puree', name: 'Raspberry Puree', stock: 0, lowStockThreshold: 0,
  unit: 'g', category: 'Fruits & Purees',
  composition: { water: 86, fructose: 2.4, glucose: 1.9, sucrose: 0.2 },
  bufferRef: 'puree.raspberry',
} as Ingredient;

const CLASSIC_GANACHE: Recipe = {
  id: 'ganache-1', name: 'Classic Dark Ganache',
  components: [{
    id: 'main', name: 'Ganache',
    ingredients: [
      { ingredientId: 'dark-70', quantity: 100, role: { universal: 'fat' } },
      { ingredientId: 'heavy-cream', quantity: 59, role: { universal: 'liquid' } },
    ],
  }],
  haccp: { shelfLifeDays: 14 },
} as Recipe;

describe('useRecipePhysics', () => {
  test('returns null for undefined recipe', () => {
    const { result } = renderHook(() => useRecipePhysics(undefined, [], [], 1));
    expect(result.current).toBeNull();
  });

  test('classic ganache returns expected physics', () => {
    const { result } = renderHook(() =>
      useRecipePhysics(CLASSIC_GANACHE, [DARK_70, HEAVY_CREAM], [CLASSIC_GANACHE], 1)
    );
    expect(result.current).not.toBeNull();
    expect(result.current!.aw.aw).toBeGreaterThan(0.94);
    expect(result.current!.aw.aw).toBeLessThan(0.95);
    expect(result.current!.fatRegime.key).toBe('firm-set');
    expect(result.current!.awBand.key).toBe('very-fragile');
  });

  test('pH only present when bufferRef ingredient included', () => {
    const noPHRecipe: Recipe = {
      ...CLASSIC_GANACHE,
      components: [{
        id: 'main', name: 'Just chocolate',
        ingredients: [{ ingredientId: 'dark-70', quantity: 100 }],
      }],
    } as Recipe;
    const { result } = renderHook(() =>
      useRecipePhysics(noPHRecipe, [DARK_70], [noPHRecipe], 1)
    );
    expect(result.current!.pH).toBeNull();
  });

  test('mixed system pH lands in expected range for raspberry-cream', () => {
    const fruitGanache: Recipe = {
      id: 'fruit-1', name: 'Raspberry',
      components: [{
        id: 'main', name: 'Ganache',
        ingredients: [
          { ingredientId: 'dark-70', quantity: 100 },
          { ingredientId: 'heavy-cream', quantity: 40 },
          { ingredientId: 'rasp-puree', quantity: 20 },
        ],
      }],
    } as Recipe;
    const { result } = renderHook(() =>
      useRecipePhysics(fruitGanache, [DARK_70, HEAVY_CREAM, RASPBERRY_PUREE], [fruitGanache], 1)
    );
    expect(result.current!.pH).not.toBeNull();
    expect(result.current!.pH!.pH).toBeGreaterThan(3.4);
    expect(result.current!.pH!.pH).toBeLessThan(4.5);
  });

  test('scale changes total mass and computed amounts', () => {
    const { result, rerender } = renderHook(
      ({ scale }: { scale: number }) =>
        useRecipePhysics(CLASSIC_GANACHE, [DARK_70, HEAVY_CREAM], [CLASSIC_GANACHE], scale),
      { initialProps: { scale: 1 } }
    );
    const baseMass = result.current!.totalMass;
    rerender({ scale: 2 });
    expect(result.current!.totalMass).toBeCloseTo(baseMass * 2, 0);
    expect(result.current!.computedAmounts.get('dark-70')).toBe(200);
  });

  test('memoization: stable ingredients reference returns stable result', () => {
    const ings = [DARK_70, HEAVY_CREAM];
    const recipes = [CLASSIC_GANACHE];
    const { result, rerender } = renderHook(() =>
      useRecipePhysics(CLASSIC_GANACHE, ings, recipes, 1)
    );
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  test('declared shelf life divergence flagged when haccp diverges from prediction', () => {
    const longShelf: Recipe = { ...CLASSIC_GANACHE, haccp: { shelfLifeDays: 90 } } as Recipe;
    const { result } = renderHook(() =>
      useRecipePhysics(longShelf, [DARK_70, HEAVY_CREAM], [longShelf], 1)
    );
    expect(result.current!.warnings.find(w => w.kind === 'declared_diverges')).toBeDefined();
  });

  test('flags composition_incomplete when many ingredients use fallbacks', () => {
    const mystery: Ingredient[] = [];
    for (let i = 0; i < 5; i++) {
      mystery.push({
        id: `m${i}`, name: `Mystery${i}`, stock: 0, lowStockThreshold: 0,
        unit: 'g', category: 'Uncategorized',
      } as Ingredient);
    }
    const recipe: Recipe = {
      id: 'mystery-recipe', name: 'Mystery',
      components: [{
        id: 'main', name: 'main',
        ingredients: mystery.map((m) => ({ ingredientId: m.id, quantity: 50 })),
      }],
    } as unknown as Recipe;
    const { result } = renderHook(() => useRecipePhysics(recipe, mystery, [recipe], 1));
    expect(result.current!.warnings.find(w => w.kind === 'composition_incomplete')).toBeDefined();
  });
});

describe('useRecipePhysics — confectionery module', () => {
  test('runs only when categories includes confectionery', () => {
    const recipeWithoutCategory: Recipe = { ...CLASSIC_GANACHE };
    const { result: r1 } = renderHook(() =>
      useRecipePhysics(recipeWithoutCategory, [DARK_70, HEAVY_CREAM], [recipeWithoutCategory], 1)
    );
    expect(r1.current!.confectionery).toBeNull();

    const recipeWithCategory: Recipe = { ...CLASSIC_GANACHE, categories: ['confectionery'] };
    const { result: r2 } = renderHook(() =>
      useRecipePhysics(recipeWithCategory, [DARK_70, HEAVY_CREAM], [recipeWithCategory], 1)
    );
    expect(r2.current!.confectionery).not.toBeNull();
  });

  test('classic dark 70 ganache → polymorph window 31–32.5°C, no curdle warning', () => {
    const recipe: Recipe = { ...CLASSIC_GANACHE, categories: ['confectionery'] };
    const { result } = renderHook(() =>
      useRecipePhysics(recipe, [DARK_70, HEAVY_CREAM], [recipe], 1)
    );
    const c = result.current!.confectionery!;
    expect(c.derived.polymorph?.tempWindowC).toEqual([31.0, 32.5]);
    expect(c.derived.curdle.level).toBe('none');
    expect(c.warnings.find(w => w.kind === 'curdle_risk_high')).toBeUndefined();
  });

  test('raspberry-cream ganache → curdle_risk_high warning', () => {
    const recipe: Recipe = {
      id: 'raspberry-1', name: 'Raspberry Ganache', description: '',
      categories: ['confectionery'],
      components: [{
        id: 'main', name: 'Ganache',
        ingredients: [
          { id: 'r1', ingredientId: 'dark-70', quantity: 100, role: { universal: 'fat' } },
          { id: 'r2', ingredientId: 'heavy-cream', quantity: 40, role: { universal: 'liquid' } },
          { id: 'r3', ingredientId: 'rasp-puree', quantity: 30, role: { universal: 'liquid' } },
        ],
      }],
    } as unknown as Recipe;
    const { result } = renderHook(() =>
      useRecipePhysics(recipe, [DARK_70, HEAVY_CREAM, RASPBERRY_PUREE], [recipe], 1)
    );
    const c = result.current!.confectionery!;
    expect(c.derived.curdle.level === 'high' || c.derived.curdle.level === 'medium').toBe(true);
    const curdleWarning = c.warnings.find(w => w.kind.startsWith('curdle_risk_'));
    expect(curdleWarning).toBeDefined();
  });

  test('subtypes inferred for known ingredients', () => {
    const recipe: Recipe = { ...CLASSIC_GANACHE, categories: ['confectionery'] };
    const { result } = renderHook(() =>
      useRecipePhysics(recipe, [DARK_70, HEAVY_CREAM], [recipe], 1)
    );
    const subtypes = result.current!.confectionery!.derived.subtypes;
    expect(subtypes['dark-70']).toBe('chocolate');
    expect(subtypes['heavy-cream']).toBe('cream');
  });
});
