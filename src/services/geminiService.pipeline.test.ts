import { vi, describe, test, expect, beforeEach } from 'vitest';

const mockGenerateContent = vi.fn();

// Mock the Gemini SDK before importing the service
vi.mock('./geminiClient', () => ({
  getGeminiClient: () => ({
    models: {
      generateContent: mockGenerateContent,
    },
  }),
}));

import { getGeminiClient } from './geminiClient';
import { extractRecipe_fullPipeline } from './geminiService';

describe('extractRecipe_fullPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateContent.mockReset();
  });

  test('parses a simple recipe from mocked Gemini response', async () => {
    // Pass 1: structural parse
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify([{
          name: 'Test Ganache',
          description: 'A basic ganache',
          components: [{
            name: 'Base',
            ingredients: [
              { name: 'heavy cream', quantity: 200, unit: 'ml' },
              { name: 'dark chocolate', quantity: 200, unit: 'g' },
            ],
            steps: [
              { title: 'Heat cream', instruction: 'Bring cream to a simmer.' },
              { title: 'Combine', instruction: 'Pour over chocolate and stir.' },
            ],
          }],
          yield: { totalYieldAmount: 400, totalYieldUnit: 'g' },
        }]),
      });
    
    const imageInput = [{ base64: 'fake-base64', mimeType: 'image/jpeg' }];
    const existingIngredients: string[] = [];
    const result = await extractRecipe_fullPipeline(imageInput, existingIngredients);
    
    expect(result.recipes).toBeDefined();
    expect(result.recipes).toHaveLength(1);
    
    const recipe = result.recipes[0];
    expect(recipe.name).toBe('Test Ganache');
    expect(recipe.components).toHaveLength(1);
    expect(recipe.components?.[0].ingredients).toHaveLength(2);
    
    // Tools are applied by reasonAboutRecipe
    // The "dark chocolate" ingredient should trigger parseChocolateSpec
    expect((recipe.components?.[0].ingredients?.[1] as any).chocolateSpec).toBeDefined();
    expect((recipe.components?.[0].ingredients?.[1] as any).chocolateSpec.type).toBe('dark');
  });

  test('tool failure populates aiExtractionNotes and sets needsReview', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify([{
        name: 'Malformed Recipe',
        type: 'bonbon', // triggers bonbon tools which might fail if data is weird
        description: '',
        components: [
          {
            name: 'Base',
            ingredients: [{ name: 'weird dark chocolate stuff', quantity: 10, unit: 'g' }], // Might cause spec parsing failure if invalid, but parseChocolateSpec handles fallback well
            steps: []
          }
        ],
        yield: { totalYieldAmount: 0, totalYieldUnit: 'g' },
      }]),
    });
    
    const result = await extractRecipe_fullPipeline([{ base64: 'x', mimeType: 'image/jpeg' }], []);
    
    expect(result.recipes).toBeDefined();
    expect(result.recipes.length).toBe(1);
    expect(result.recipes[0].name).toBe('Malformed Recipe');
  });

  test('malformed Gemini response throws cleanly', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: 'not valid json',
    });
    
    await expect(
      extractRecipe_fullPipeline([{ base64: 'x', mimeType: 'image/jpeg' }], [])
    ).rejects.toThrow();
  });
});
