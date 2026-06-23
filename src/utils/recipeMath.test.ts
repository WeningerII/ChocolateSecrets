import { describe, it, expect } from 'vitest';
import {
  calculateTotalTargetYield,
  calculateTotalTargetWeight,
  calculateComponentTargetWeight,
  scaleIngredient,
  calculateRecipeCost,
  getRecipeRawIngredients,
  calculateFullyLoadedCost
} from './recipeMath';
import { Recipe, RecipeComponent, Ingredient } from '../types';
import { fixtureIngredients, fixtureRecipes, bonbonRecipe, subRecipeTemperedDark, subRecipeGanache } from './__fixtures__/recipes';

describe('recipeMath', () => {
  const mockIngredient: Ingredient = {
    id: 'ing1',
    name: 'Sugar',
    unit: 'g',
    stock: 1000,
    lowStockThreshold: 100,
    costPerUnit: 0.05,
    weightedAverageCost: 0.05
  };

  const mockRecipe: Recipe = {
    id: 'rec1',
    name: 'Simple Syrup',
    description: 'A simple syrup recipe',
    type: 'standard',
    components: [
      {
        id: 'comp1',
        name: 'Base',
        type: 'base',
        percentageOfTotalWeight: 100,
        bufferPercentage: 0,
        ingredients: [
          { ingredientId: 'ing1', quantity: 100, unit: 'g', isDiscrete: false }
        ],
        instructions: []
      }
    ]
  };

  it('calculates total target yield', () => {
    expect(calculateTotalTargetYield(mockRecipe, 2)).toBe(2);
  });

  it('calculates total target weight', () => {
    expect(calculateTotalTargetWeight(mockRecipe, 2)).toBe(200);
  });

  it('calculates component target weight', () => {
    const comp = mockRecipe.components![0];
    expect(calculateComponentTargetWeight(comp, 200, 'standard', 2)).toBe(200);
  });

  it('scales ingredient', () => {
    const comp = mockRecipe.components![0];
    const ing = comp.ingredients[0];
    expect(scaleIngredient(ing, comp, 2, 200)).toBe(200);
  });

  it('calculates recipe cost', () => {
    expect(calculateRecipeCost(mockRecipe, [mockIngredient]).cost).toBe(5); // 100g * 0.05 = 5
  });

  it('gets recipe raw ingredients', () => {
    const raw = getRecipeRawIngredients(mockRecipe, 2, [], [mockIngredient]);
    expect(raw.get('ing1')).toBe(200);
  });

  it('handles valid sub-recipe DAG structures without true-cycle zeroing', () => {
    const darkChocolateEnv: Ingredient = {
      id: 'dark_66', name: 'Dark 66%', unit: 'g', stock: 1000, lowStockThreshold: 100, costPerUnit: 0.05
    };
    const temperedDarkSub: Recipe = {
      id: 'tempered_dark_66', name: 'Tempered Dark 66%', type: 'standard', description: '', yield: { totalYieldAmount: 100, totalYieldUnit: 'g', portionAmount: 100, portionUnit: 'g', portionApplication: 'count' },
      components: [{ id: 'c1', name: 'Base', type: 'base', percentageOfTotalWeight: 100, bufferPercentage: 0, ingredients: [{ ingredientId: 'dark_66', quantity: 100, unit: 'g', isDiscrete: false }], instructions: [] }]
    };
    const bonbonRecipe: Recipe = {
      id: 'bonbon1', name: 'Bonbon', type: 'standard', description: '',
      components: [
        { id: 'shell', name: 'Shell', type: 'shell', percentageOfTotalWeight: 50, bufferPercentage: 0, ingredients: [{ type: 'recipe', recipeId: 'tempered_dark_66', quantity: 40, unit: 'g', isDiscrete: false }], instructions: [] },
        { id: 'capping', name: 'Capping', type: 'base', percentageOfTotalWeight: 50, bufferPercentage: 0, ingredients: [{ type: 'recipe', recipeId: 'tempered_dark_66', quantity: 40, unit: 'g', isDiscrete: false }], instructions: [] }
      ]
    };
    
    // Original bug would return 2.00 because second time seeing tempered_dark_66 returns 0
    // Fix will return 4.00 (40g + 40g = 80g * 0.05/g = 4.00)
    const result = calculateRecipeCost(bonbonRecipe, [darkChocolateEnv], [temperedDarkSub]);
    expect(result.cost).toBe(4);
    expect(result.unitWarnings.length).toBe(0);

    const raw = getRecipeRawIngredients(bonbonRecipe, 1, [temperedDarkSub], [darkChocolateEnv]);
    expect(raw.get('dark_66')).toBe(80);
  });

  it('gracefully handles missing unit conversions', () => {
    const badRecipe: Recipe = {
      id: 'bad1', name: 'Bad Conversion', type: 'standard', description: '',
      components: [
        { id: 'c1', name: 'Base', type: 'base', percentageOfTotalWeight: 100, bufferPercentage: 0, ingredients: [{ ingredientId: 'ing1', quantity: 10, unit: 'pcs', isDiscrete: false }], instructions: [] }
      ]
    };
    const result = calculateRecipeCost(badRecipe, [mockIngredient]);
    expect(result.cost).toBe(0); // Cost shouldn't crash or multiply wrong number
    expect(result.unitWarnings.length).toBe(1);
    expect((result.unitWarnings[0] as any).fromUnit).toBe('pcs');
    expect((result.unitWarnings[0] as any).toUnit).toBe('g');
  });

});

describe('cost consistency across callers', () => {
  const darkChocolateEnv: Ingredient = {
    id: 'dark_66', name: 'Dark 66%', unit: 'g', stock: 1000, lowStockThreshold: 100, costPerUnit: 0.05
  };
  const temperedDarkSub: Recipe = {
    id: 'tempered_dark_66', name: 'Tempered Dark 66%', type: 'standard', description: '', yield: { totalYieldAmount: 100, totalYieldUnit: 'g', portionAmount: 100, portionUnit: 'g', portionApplication: 'count' },
    components: [{ id: 'c1', name: 'Base', type: 'base', percentageOfTotalWeight: 100, bufferPercentage: 0, ingredients: [{ ingredientId: 'dark_66', quantity: 100, unit: 'g', isDiscrete: false }], instructions: [] }]
  };
  const bonbonFixture: Recipe = {
    id: 'bonbon1', name: 'Bonbon', type: 'standard', description: '', yield: { totalYieldAmount: 10, totalYieldUnit: 'units', portionAmount: 1, portionUnit: 'unit', portionApplication: 'count' },
    components: [
      { id: 'shell', name: 'Shell', type: 'shell', percentageOfTotalWeight: 50, bufferPercentage: 0, ingredients: [{ type: 'recipe', recipeId: 'tempered_dark_66', quantity: 40, unit: 'g', isDiscrete: false }], instructions: [] },
      { id: 'capping', name: 'Capping', type: 'base', percentageOfTotalWeight: 50, bufferPercentage: 0, ingredients: [{ type: 'recipe', recipeId: 'tempered_dark_66', quantity: 40, unit: 'g', isDiscrete: false }], instructions: [] }
    ]
  };
  const ingredients = [darkChocolateEnv];
  const recipes = [temperedDarkSub, bonbonFixture];

  it('bonbon recipe: calculateRecipeCost and calculateFullyLoadedCost agree on ingredient portion', () => {
    const { cost: rawCost } = calculateRecipeCost(bonbonFixture, ingredients, recipes);
    const { cost: loadedCost } = calculateFullyLoadedCost(bonbonFixture, ingredients, recipes);
    
    // Loaded cost equals raw cost when labor/overhead are absent
    expect(loadedCost).toBe(rawCost);
    expect(loadedCost).toBe(4); // 80g * 0.05
  });

  it('recipe with labor adds labor cost correctly', () => {
    const recipe = {
      ...bonbonFixture,
      laborTimeMinutes: 60,
      hourlyRate: 20,
    };
    const { cost: rawCost } = calculateRecipeCost(recipe, ingredients, recipes);
    const { cost: loadedCost } = calculateFullyLoadedCost(recipe, ingredients, recipes);
    
    expect(loadedCost).toBe(rawCost + 20);  // 60 min × $20/hr = $20 labor
  });

  it('overhead percentage applies to ingredient+labor total', () => {
    const recipe = {
      ...bonbonFixture,
      laborTimeMinutes: 60,
      hourlyRate: 20,
      overheadPercentage: 10,
    };
    const { cost: loadedCost } = calculateFullyLoadedCost(recipe, ingredients, recipes);
    const expectedBase = 4 + 20; // 4 ingredient + 20 labor
    expect(loadedCost).toBeCloseTo(expectedBase * 1.10, 2);
  });
});

describe('cost matrix — fixtures pin expected values', () => {
  it('tempered dark 66% cost: 1kg of dark chocolate at $25/kg = $25', () => {
    const { cost } = calculateRecipeCost(subRecipeTemperedDark, fixtureIngredients, fixtureRecipes);
    expect(cost).toBeCloseTo(25, 2);
  });

  it('basic ganache cost: 0.5L cream ($4) + 1kg dark ($25) + 0.1kg butter ($1.2) = $30.2', () => {
    const { cost } = calculateRecipeCost(subRecipeGanache, fixtureIngredients, fixtureRecipes);
    expect(cost).toBeCloseTo(30.2, 2);
  });

  it('bonbon cost with sub-recipe DAG reuse: shell + filling + capping', () => {
    // shell: 0.048kg tempered dark × $25/kg = $1.20 (40% of 0.12kg)
    // capping: 0.024kg tempered dark × $25/kg = $0.60 (20% of 0.12kg)
    // filling: 0.048kg ganache × ($30.2/1.6kg) = $0.906 (40% of 0.12kg)
    // total: $1.20 + $0.60 + $0.906 = $2.706
    const { cost } = calculateRecipeCost(bonbonRecipe, fixtureIngredients, fixtureRecipes);
    expect(cost).toBeCloseTo(2.706, 3);
  });

  it('bonbon fully-loaded cost: adds labor + overhead', () => {
    // raw: 2.706
    // labor: 60 min × $20/hr = $20
    // overhead: (2.706 + 20) × 10% = 2.2706
    // total: 2.706 + 20 + 2.2706 = 24.9766
    const { cost } = calculateFullyLoadedCost(bonbonRecipe, fixtureIngredients, fixtureRecipes);
    expect(cost).toBeCloseTo(24.9766, 3);
  });

  it('unit warnings surface when an ingredient uses incompatible units', () => {
    const badRecipe: Recipe = {
      ...subRecipeGanache,
      id: 'rec-bad-units',
      components: [{
        ...subRecipeGanache.components![0],
        ingredients: [
          { ingredientId: 'ing-cream', quantity: 2, unit: 'pieces' }, // pieces → L with no density
        ],
      }],
    };
    const { cost, unitWarnings } = calculateRecipeCost(badRecipe, fixtureIngredients, fixtureRecipes);
    expect(unitWarnings.length).toBeGreaterThan(0);
    expect(cost).toBe(0);  // bad ingredient contributes nothing
  });

  it('cycle detection: recipe referencing itself returns 0 without infinite loop', () => {
    const cyclic: Recipe = {
      id: 'rec-cyclic',
      name: 'Cyclic',
      description: '',
      type: 'standard',
      components: [{
        id: 'c1', name: 'Base', type: 'base', percentageOfTotalWeight: 100, bufferPercentage: 0,
        ingredients: [{ ingredientId: 'rec-cyclic', type: 'recipe', recipeId: 'rec-cyclic', quantity: 1, unit: 'kg' }],
        instructions: [],
      }],
      yield: { totalYieldAmount: 1, totalYieldUnit: 'kg' },
    } as Recipe;
    const startTime = Date.now();
    const { cost } = calculateRecipeCost(cyclic, fixtureIngredients, [...fixtureRecipes, cyclic]);
    const duration = Date.now() - startTime;
    expect(cost).toBe(0);
    expect(duration).toBeLessThan(100);  // did not hang
  });
});

describe('getRecipeRawIngredients — raw expansion behavior (unified traversal)', () => {
  const gIng: Ingredient = { id: 'ing1', name: 'Sugar', unit: 'g', stock: 1000, lowStockThreshold: 100, costPerUnit: 0.05, weightedAverageCost: 0.05 };

  it('applies component buffer to raw quantities', () => {
    const buffered: Recipe = {
      id: 'buf1', name: 'Buffered', type: 'standard', description: '',
      components: [{ id: 'c1', name: 'Base', type: 'base', percentageOfTotalWeight: 100, bufferPercentage: 10,
        ingredients: [{ ingredientId: 'ing1', quantity: 100, unit: 'g', isDiscrete: false }], instructions: [] }],
    };
    expect(getRecipeRawIngredients(buffered, 1, [], [gIng]).get('ing1')).toBeCloseTo(110, 6); // 100 × 1.10
  });

  it('scales discrete items by total cavities for molded hardware', () => {
    const deco: Ingredient = { id: 'deco', name: 'Gold leaf', unit: 'pcs', stock: 100, lowStockThreshold: 1, costPerUnit: 0.1 };
    const molded: Recipe = {
      id: 'mold1', name: 'Molded', type: 'molded_praline', description: '',
      hardware: { moldId: 'm', shape: 'sphere', cavitiesPerMold: 10, moldCount: 2, gramPerCavity: 5 },
      components: [{ id: 'c1', name: 'Base', type: 'base', percentageOfTotalWeight: 100, bufferPercentage: 0,
        ingredients: [
          { ingredientId: 'ing1', quantity: 100, unit: 'g', isDiscrete: false },
          { ingredientId: 'deco', quantity: 1, unit: 'pcs', isDiscrete: true },
        ], instructions: [] }],
    };
    expect(getRecipeRawIngredients(molded, 1, [], [gIng, deco]).get('deco')).toBe(20); // 10 × 2 cavities × 1
  });

  it('flattens nested sub-recipes and scales by baseQuantity', () => {
    const darkEnv: Ingredient = { id: 'dark_66', name: 'Dark 66%', unit: 'g', stock: 1000, lowStockThreshold: 100, costPerUnit: 0.05 };
    const temperedDark: Recipe = {
      id: 'tempered_dark_66', name: 'Tempered Dark 66%', type: 'standard', description: '',
      yield: { totalYieldAmount: 100, totalYieldUnit: 'g', portionAmount: 100, portionUnit: 'g', portionApplication: 'count' },
      components: [{ id: 'c1', name: 'Base', type: 'base', percentageOfTotalWeight: 100, bufferPercentage: 0,
        ingredients: [{ ingredientId: 'dark_66', quantity: 100, unit: 'g', isDiscrete: false }], instructions: [] }],
    };
    const bonbon: Recipe = {
      id: 'bonbon1', name: 'Bonbon', type: 'standard', description: '',
      components: [
        { id: 'shell', name: 'Shell', type: 'shell', percentageOfTotalWeight: 50, bufferPercentage: 0, ingredients: [{ type: 'recipe', recipeId: 'tempered_dark_66', quantity: 40, unit: 'g', isDiscrete: false }], instructions: [] },
        { id: 'capping', name: 'Capping', type: 'base', percentageOfTotalWeight: 50, bufferPercentage: 0, ingredients: [{ type: 'recipe', recipeId: 'tempered_dark_66', quantity: 40, unit: 'g', isDiscrete: false }], instructions: [] },
      ],
    };
    expect(getRecipeRawIngredients(bonbon, 1, [temperedDark], [darkEnv]).get('dark_66')).toBe(80);
    expect(getRecipeRawIngredients(bonbon, 2, [temperedDark], [darkEnv]).get('dark_66')).toBe(160);
  });

  it('keeps an unconvertible-unit ingredient in raw (unconverted) while cost drops it', () => {
    const badRecipe: Recipe = {
      id: 'bad1', name: 'Bad', type: 'standard', description: '',
      components: [{ id: 'c1', name: 'Base', type: 'base', percentageOfTotalWeight: 100, bufferPercentage: 0,
        ingredients: [{ ingredientId: 'ing1', quantity: 10, unit: 'pcs', isDiscrete: false }], instructions: [] }],
    };
    // Shopping/allergen view never silently drops a leaf — it keeps the unconverted qty.
    expect(getRecipeRawIngredients(badRecipe, 1, [], [gIng]).get('ing1')).toBe(10);
    // Cost drops it and warns — the divergence preserved through the shared traversal.
    const { cost, unitWarnings } = calculateRecipeCost(badRecipe, [gIng]);
    expect(cost).toBe(0);
    expect(unitWarnings.length).toBe(1);
  });
});
