import { describe, test, expect } from 'vitest';
import { hydrateTranslationsFromLegacy } from './RecipeEditor';
import { Recipe } from '../types';

describe('hydrateTranslationsFromLegacy', () => {
  test('returns null if recipe is null', () => {
    expect(hydrateTranslationsFromLegacy(null)).toBeNull();
  });

  test('hydrates legacy nameSpanish into nameTranslations.es', () => {
    const rawState: Partial<Recipe> = {
      name: 'Cake',
      nameSpanish: 'Pastel'
    };
    
    const hydrated = hydrateTranslationsFromLegacy(rawState as Recipe);
    expect(hydrated?.nameTranslations?.es).toBe('Pastel');
    expect(hydrated?.nameSpanish).toBe('Pastel'); // preserves original field
  });

  test('does not overwrite existing nameTranslations.es', () => {
    const rawState: Partial<Recipe> = {
      name: 'Cake',
      nameSpanish: 'Legacy Pastel',
      nameTranslations: { es: 'New Pastel' }
    };
    
    const hydrated = hydrateTranslationsFromLegacy(rawState as Recipe);
    expect(hydrated?.nameTranslations?.es).toBe('New Pastel');
  });

  test('hydrates legacy instructionSpanish into instructionTranslations.es', () => {
    const rawState: Partial<Recipe> = {
      components: [
        {
          id: 'c1',
          name: 'Component',
          type: 'filling',
          percentageOfTotalWeight: 100,
          bufferPercentage: 0,
          ingredients: [],
          steps: [
            {
              id: 's1',
              title: '',
              equipment: [],
              order: 1,
              actionType: 'other',
              instruction: 'Mix well',
              instructionSpanish: 'Mezclar bien'
            }
          ]
        }
      ]
    };
    
    const hydrated = hydrateTranslationsFromLegacy(rawState as Recipe);
    const step = hydrated?.components?.[0].steps?.[0];
    expect(step?.instructionTranslations?.es).toBe('Mezclar bien');
    expect(step?.instructionSpanish).toBe('Mezclar bien');
  });

  test('does not overwrite existing instructionTranslations.es', () => {
    const rawState: Partial<Recipe> = {
      components: [
        {
          id: 'c1',
          name: 'Component',
          type: 'filling',
          percentageOfTotalWeight: 100,
          bufferPercentage: 0,
          ingredients: [],
          steps: [
            {
              id: 's1',
              title: '',
              equipment: [],
              order: 1,
              actionType: 'other',
              instruction: 'Mix well',
              instructionSpanish: 'Mezclar bien legacy',
              instructionTranslations: { es: 'Mezclar bien new' }
            }
          ]
        }
      ]
    };
    
    const hydrated = hydrateTranslationsFromLegacy(rawState as Recipe);
    const step = hydrated?.components?.[0].steps?.[0];
    expect(step?.instructionTranslations?.es).toBe('Mezclar bien new');
  });
});
