import { Recipe, Ingredient } from '../../types';

export const fixtureIngredients: Ingredient[] = [
  { id: 'ing-cream', name: 'Heavy Cream', unit: 'L', stock: 100, lowStockThreshold: 0, category: 'Dairy & Alternatives', costPerUnit: 8 } as Ingredient,
  { id: 'ing-sugar', name: 'Sugar', unit: 'kg', stock: 50, lowStockThreshold: 0, category: 'Sweeteners', costPerUnit: 2 } as Ingredient,
  { id: 'ing-dark-choc', name: 'Dark Chocolate 66%', unit: 'kg', stock: 20, lowStockThreshold: 0, category: 'Chocolate', costPerUnit: 25 } as Ingredient,
  { id: 'ing-butter', name: 'Butter', unit: 'kg', stock: 10, lowStockThreshold: 0, category: 'Dairy & Alternatives', costPerUnit: 12 } as Ingredient,
];

export const subRecipeTemperedDark: Recipe = {
  id: 'rec-tempered-dark-66',
  name: 'Tempered Dark 66%',
  description: '',
  type: 'standard',
  components: [{
    id: 'c1', name: 'Base', type: 'base', percentageOfTotalWeight: 100, bufferPercentage: 0,
    ingredients: [{ ingredientId: 'ing-dark-choc', quantity: 1, unit: 'kg' }],
    instructions: [],
  }],
  yield: { totalYieldAmount: 1, totalYieldUnit: 'kg' },
} as Recipe;

export const subRecipeGanache: Recipe = {
  id: 'rec-ganache',
  name: 'Basic Ganache',
  description: '',
  type: 'standard',
  components: [{
    id: 'c1', name: 'Base', type: 'base', percentageOfTotalWeight: 100, bufferPercentage: 0,
    ingredients: [
      { ingredientId: 'ing-cream', quantity: 0.5, unit: 'L' },
      { ingredientId: 'ing-dark-choc', quantity: 1, unit: 'kg' },
      { ingredientId: 'ing-butter', quantity: 0.1, unit: 'kg' },
    ],
    instructions: [],
  }],
  yield: { totalYieldAmount: 1.6, totalYieldUnit: 'kg' },
} as Recipe;

// Bonbon uses tempered dark in TWO components — this is the case that broke in Phase 0
export const bonbonRecipe: Recipe = {
  id: 'rec-bonbon',
  name: 'Dark Chocolate Bonbon',
  description: '',
  type: 'bonbon',
  components: [
    {
      id: 'shell', name: 'Shell', type: 'base', percentageOfTotalWeight: 40, bufferPercentage: 0,
      ingredients: [
        // Sub-recipe reference: 40g of tempered dark per bonbon batch
        { ingredientId: 'rec-tempered-dark-66', type: 'recipe', recipeId: 'rec-tempered-dark-66', quantity: 0.04, unit: 'kg' },
      ],
      instructions: [],
    },
    {
      id: 'filling', name: 'Filling', type: 'base', percentageOfTotalWeight: 40, bufferPercentage: 0,
      ingredients: [
        { ingredientId: 'rec-ganache', type: 'recipe', recipeId: 'rec-ganache', quantity: 0.06, unit: 'kg' },
      ],
      instructions: [],
    },
    {
      id: 'capping', name: 'Capping', type: 'base', percentageOfTotalWeight: 20, bufferPercentage: 0,
      ingredients: [
        // SAME sub-recipe as shell — this is the DAG case that Phase 0's memoization fixed
        { ingredientId: 'rec-tempered-dark-66', type: 'recipe', recipeId: 'rec-tempered-dark-66', quantity: 0.02, unit: 'kg' },
      ],
      instructions: [],
    },
  ],
  yield: { totalYieldAmount: 0.12, totalYieldUnit: 'kg' },
  laborTimeMinutes: 60,
  hourlyRate: 20,
  overheadPercentage: 10,
} as Recipe;

export const fixtureRecipes: Recipe[] = [subRecipeTemperedDark, subRecipeGanache, bonbonRecipe];
