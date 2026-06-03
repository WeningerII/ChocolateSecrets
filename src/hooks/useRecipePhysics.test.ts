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

  test('production-aware resolution: component buffer scales resolved masses (regression lock)', () => {
    const buffered: Recipe = {
      ...CLASSIC_GANACHE,
      components: [{
        id: 'main', name: 'Ganache', type: 'base', percentageOfTotalWeight: 100, bufferPercentage: 10,
        ingredients: [
          { ingredientId: 'dark-70', quantity: 100 },
          { ingredientId: 'heavy-cream', quantity: 59 },
        ],
      }],
    } as Recipe;
    const { result } = renderHook(() =>
      useRecipePhysics(buffered, [DARK_70, HEAVY_CREAM], [buffered], 1)
    );
    const byId = Object.fromEntries(result.current!.resolvedIngredients.map(r => [r.ingredientId, r.mass]));
    // The old resolver ignored bufferPercentage and would have reported 100 / 59.
    expect(byId['dark-70']).toBeCloseTo(110, 3);
    expect(byId['heavy-cream']).toBeCloseTo(64.9, 3);
  });

  test('production-aware resolution: sub-recipe expands into physics by declared yield (regression lock)', () => {
    const sub: Recipe = {
      id: 'sub-syrup', name: 'Syrup', description: '',
      yield: { totalYieldAmount: 100, totalYieldUnit: 'g' },
      components: [{
        id: 's', name: 'S', type: 'base', percentageOfTotalWeight: 100, bufferPercentage: 0,
        ingredients: [{ ingredientId: 'heavy-cream', quantity: 100 }],
      }],
    } as Recipe;
    const parent: Recipe = {
      id: 'parent', name: 'Parent', description: '',
      components: [{
        id: 'm', name: 'M', type: 'base', percentageOfTotalWeight: 100, bufferPercentage: 0,
        ingredients: [
          { ingredientId: 'dark-70', quantity: 100 },
          { type: 'recipe', recipeId: 'sub-syrup', quantity: 50, unit: 'g' },
        ],
      }],
    } as Recipe;
    const { result } = renderHook(() =>
      useRecipePhysics(parent, [DARK_70, HEAVY_CREAM], [sub, parent], 1)
    );
    const byId = Object.fromEntries(result.current!.resolvedIngredients.map(r => [r.ingredientId, r.mass]));
    expect(byId['dark-70']).toBeCloseTo(100, 3);
    expect(byId['heavy-cream']).toBeCloseTo(50, 3); // 50 g of a 100 g-yield syrup = 50 g cream
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

describe('useRecipePhysics — production-aware physics (buffers / molds / volume units / sub-recipes)', () => {
  const phys = (recipe: Recipe, ings: Ingredient[], recipes: Recipe[]) =>
    renderHook(() => useRecipePhysics(recipe, ings, recipes, 1)).result.current!;

  const GLUCOSE_SYRUP: Ingredient = {
    id: 'glucose', name: 'Glucose Syrup DE60', stock: 0, lowStockThreshold: 0,
    unit: 'g', category: 'Sweeteners',
    composition: { water: 18, glucose: 82 }, density: 1.4,
  } as Ingredient;

  const ganacheComponent = (bufferPercentage: number) => ({
    id: 'main', name: 'Ganache', type: 'base', percentageOfTotalWeight: 100, bufferPercentage,
    ingredients: [
      { ingredientId: 'dark-70', quantity: 100 },
      { ingredientId: 'heavy-cream', quantity: 59 },
    ],
  });

  test('component buffer scales total mass but leaves Aw invariant (ratios preserved)', () => {
    const make = (b: number) => ({ id: `g-${b}`, name: 'G', components: [ganacheComponent(b)] } as Recipe);
    const p0 = phys(make(0), [DARK_70, HEAVY_CREAM], [make(0)]);
    const p25 = phys(make(25), [DARK_70, HEAVY_CREAM], [make(25)]);
    expect(p25.totalMass).toBeCloseTo(p0.totalMass * 1.25, 6); // buffer applied to mass
    expect(p25.aw.aw!).toBeCloseTo(p0.aw.aw!, 6);              // composition ratios unchanged
  });

  test('molded recipe resolves the full mold batch mass; Aw matches the unmolded ratio', () => {
    const molded: Recipe = {
      id: 'molded-1', name: 'Bonbon Shells', type: 'molded_praline',
      hardware: { cavitiesPerMold: 24, moldCount: 2, gramPerCavity: 10 },
      components: [ganacheComponent(0)],
    } as Recipe;
    const pm = phys(molded, [DARK_70, HEAVY_CREAM], [molded]);
    // 24 cavities x 2 molds x 10 g = 480 g batch — the old physics ignored hardware (159 g).
    expect(pm.totalMass).toBeCloseTo(480, 4);
    const byId = Object.fromEntries(pm.resolvedIngredients.map(r => [r.ingredientId, r.mass]));
    expect(byId['dark-70']).toBeCloseTo((100 / 159) * 480, 3);
    expect(byId['heavy-cream']).toBeCloseTo((59 / 159) * 480, 3);
    // Uniform scaling => identical composition => identical Aw, band and shelf-life.
    const pc = phys(CLASSIC_GANACHE, [DARK_70, HEAVY_CREAM], [CLASSIC_GANACHE]);
    expect(pm.aw.aw!).toBeCloseTo(pc.aw.aw!, 6);
    expect(pm.awBand.key).toBe(pc.awBand.key);
    expect(pm.shelfLife.weeks).toBe(pc.shelfLife.weeks);
  });

  test('volume units convert to grams by density (50 ml glucose @1.4 = 70 g) and feed Aw on a true gram basis', () => {
    const comp = (rows: any[]) => ({ id: 'm', name: 'M', type: 'base', percentageOfTotalWeight: 100, bufferPercentage: 0, ingredients: rows });
    const rMl: Recipe = { id: 'vol-ml', name: 'ml', components: [comp([
      { ingredientId: 'glucose', quantity: 50, unit: 'ml' },
      { ingredientId: 'dark-70', quantity: 100, unit: 'g' },
    ])] } as Recipe;
    const rGramEquiv: Recipe = { id: 'vol-g', name: 'g-equiv', components: [comp([
      { ingredientId: 'glucose', quantity: 70, unit: 'g' },
      { ingredientId: 'dark-70', quantity: 100, unit: 'g' },
    ])] } as Recipe;
    const rGramNaive: Recipe = { id: 'vol-naive', name: 'g-naive', components: [comp([
      { ingredientId: 'glucose', quantity: 50, unit: 'g' }, // what the old physics did: ml treated as g
      { ingredientId: 'dark-70', quantity: 100, unit: 'g' },
    ])] } as Recipe;
    const cat = [GLUCOSE_SYRUP, DARK_70];

    const pMl = phys(rMl, cat, [rMl]);
    const byId = Object.fromEntries(pMl.resolvedIngredients.map(r => [r.ingredientId, r.mass]));
    expect(byId['glucose']).toBeCloseTo(70, 4); // 50 ml x 1.4 g/ml

    // Modeled at its true gram mass: equals the 70 g recipe, not the naive (ml-as-g) 50 g one.
    expect(pMl.aw.aw!).toBeCloseTo(phys(rGramEquiv, cat, [rGramEquiv]).aw.aw!, 6);
    expect(pMl.aw.aw!).not.toBeCloseTo(phys(rGramNaive, cat, [rGramNaive]).aw.aw!, 5);
  });

  test('sub-recipe expansion yields the same physics as the equivalent flattened recipe', () => {
    const sub: Recipe = {
      id: 'sub-syrup', name: 'Ganache Base',
      yield: { totalYieldAmount: 159, totalYieldUnit: 'g' }, // = raw sum => clean 1:1 expansion
      components: [ganacheComponent(0)],
    } as Recipe;
    const parent: Recipe = {
      id: 'parent-x', name: 'Parent',
      components: [{
        id: 'm', name: 'M', type: 'base', percentageOfTotalWeight: 100, bufferPercentage: 0,
        ingredients: [{ type: 'recipe', recipeId: 'sub-syrup', quantity: 159, unit: 'g' }],
      }],
    } as Recipe;
    const pSub = phys(parent, [DARK_70, HEAVY_CREAM], [sub, parent]);
    const pFlat = phys(CLASSIC_GANACHE, [DARK_70, HEAVY_CREAM], [CLASSIC_GANACHE]);
    expect(pSub.totalMass).toBeCloseTo(pFlat.totalMass, 4); // both 159 g
    expect(pSub.aw.aw!).toBeCloseTo(pFlat.aw.aw!, 6);
  });
});
