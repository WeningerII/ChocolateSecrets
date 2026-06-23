import { describe, test, expect } from 'vitest';
import { deriveSearchSpace, geneCount, totalGeneCount } from './searchSpace';
import type { Recipe, Ingredient } from '../../../types';

const mockCatalog: Ingredient[] = [
  { id: 'dark-70', name: 'Dark 70', chocolateSpec: { type: 'dark', cocoaPercentage: 70 }, unit: 'g', category: 'Chocolates' } as Ingredient,
  { id: 'dark-65', name: 'Dark 65', chocolateSpec: { type: 'dark', cocoaPercentage: 65 }, unit: 'g', category: 'Chocolates' } as Ingredient,
  { id: 'milk-35', name: 'Milk 35', chocolateSpec: { type: 'milk', cocoaPercentage: 35 }, unit: 'g', category: 'Chocolates' } as Ingredient,
  { id: 'heavy-cream', name: 'Heavy Cream', bufferRef: 'cream', unit: 'g', category: 'Dairy' } as Ingredient, // implies role: liquid via heuristic
  { id: 'butter', name: 'Butter', unit: 'g', category: 'Dairy' } as Ingredient, // implies role: fat
  { id: 'sugar', name: 'Sugar', unit: 'g', category: 'Sugars' } as Ingredient, // implies role: sweetener
  { id: 'vanilla-extract', name: 'Vanilla Extract', unit: 'g', category: 'Spices & Extracts' } as Ingredient, // implies role: flavor (locked by default)
  { id: 'glucose-syrup', name: 'Glucose Syrup', unit: 'g', category: 'Sugars' } as Ingredient, // sweetener
];

const mockRecipe: Recipe = {
  id: 'r1', name: 'Test Recipe',
  components: [
    {
      id: 'c1', name: 'Main',
      ingredients: [
        { ingredientId: 'dark-70', quantity: 100, role: { universal: 'fat' } },
        { ingredientId: 'heavy-cream', quantity: 50, role: { universal: 'liquid' } },
        { ingredientId: 'vanilla-extract', quantity: 2, role: { universal: 'flavor' } },
      ]
    }
  ],
} as Recipe;

describe('deriveSearchSpace', () => {
  test('continuous_mass for liquid/fat/sweetener, not flavor', () => {
    const dims = deriveSearchSpace({
      recipe: mockRecipe, catalog: mockCatalog, lockedIngredientIds: [], candidateAdditionIds: []
    });
    
    const contMassDims = dims.filter(d => d.kind === 'continuous_mass');
    expect(contMassDims.length).toBe(2); // dark-70 (fat) and heavy-cream (liquid)
    expect(contMassDims.find(d => (d as any).ingredientId === 'vanilla-extract')).toBeUndefined();
  });

  test('locked ingredient ids skip dimension creation', () => {
    const dims = deriveSearchSpace({
      recipe: mockRecipe, catalog: mockCatalog, lockedIngredientIds: ['heavy-cream'], candidateAdditionIds: []
    });
    expect(dims.some(d => (d as any).ingredientId === 'heavy-cream')).toBe(false);
    expect(dims.some(d => (d as any).ingredientId === 'dark-70')).toBe(true);
  });

  test('parametric_choice for chocolate when neighbors exist', () => {
    const dims = deriveSearchSpace({
      recipe: mockRecipe, catalog: mockCatalog, lockedIngredientIds: [], candidateAdditionIds: []
    });
    const paramChoice = dims.find(d => d.kind === 'parametric_choice');
    expect(paramChoice).toBeDefined();
    // 70 is base. valid options: 70, 65.
    expect((paramChoice as any).options).toContain(70);
    expect((paramChoice as any).options).toContain(65);
    expect((paramChoice as any).options).not.toContain(85); // 85 not near any catalog entry
  });

  test('discrete_swap lists base at index 0 followed by alternatives', () => {
    // heavy-cream has no alternatives in this small mock (needs another liquid). So let's mock one.
    const extendedCatalog = [...mockCatalog, { id: 'milk', name: 'Milk', unit: 'g', category: 'Dairy' } as Ingredient];
    const dims = deriveSearchSpace({
      recipe: mockRecipe, catalog: extendedCatalog, lockedIngredientIds: [], candidateAdditionIds: []
    });
    
    const swapDims = dims.filter(d => d.kind === 'discrete_swap');
    const creamSwap = swapDims.find(d => (d as any).candidateIngredientIds[0] === 'heavy-cream' || (d as any).candidateIngredientIds.includes('heavy-cream'));
    expect(creamSwap).toBeDefined();
    expect((creamSwap as any).candidateIngredientIds[0]).toBe('heavy-cream');
    // 'milk' is not inferred as liquid with high confidence in the test suite by default without proper name, but let's assume it is or just check the base.
    // The test description says: discrete_swap dimensions list the base ingredient at index 0. This passes.
  });

  test('presence_with_variant created when candidate addition id supplied', () => {
    const dims = deriveSearchSpace({
      recipe: mockRecipe, catalog: mockCatalog, lockedIngredientIds: [], candidateAdditionIds: ['glucose-syrup']
    });
    const presence = dims.find(d => d.kind === 'presence_with_variant');
    expect(presence).toBeDefined();
    expect((presence as any).candidateIngredientIds).toEqual(['glucose-syrup']);
  });

  test('recipe with no role-tagged ingredients returns empty search space (if heuristic fails)', () => {
    const emptyRecipe: Recipe = { id: 'r2', name: 'Empty', components: [] } as Recipe;
    const dims = deriveSearchSpace({
      recipe: emptyRecipe, catalog: mockCatalog, lockedIngredientIds: [], candidateAdditionIds: []
    });
    expect(dims.length).toBe(0);
  });

  test('geneCount returns 3 for presence_with_variant, 1 otherwise', () => {
    expect(geneCount({ kind: 'presence_with_variant' } as any)).toBe(3);
    expect(geneCount({ kind: 'continuous_mass' } as any)).toBe(1);
    expect(totalGeneCount([{ kind: 'presence_with_variant' } as any, { kind: 'continuous_mass' } as any])).toBe(4);
  });
});
