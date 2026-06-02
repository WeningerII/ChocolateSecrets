import { describe, test, expect } from 'vitest';
import { computeCrossContactRisks } from './foodSafety';
import { Recipe, Ingredient } from '../types';

describe('computeCrossContactRisks', () => {
  const peanut = { id: 'ing-peanut', name: 'Peanut butter', unit: 'g' } as Ingredient;
  const butter = { id: 'ing-butter', name: 'Butter', unit: 'g' } as Ingredient;
  const flour = { id: 'ing-flour', name: 'Flour', unit: 'g' } as Ingredient;
  const ingredients = [peanut, butter, flour];

  const makeRecipe = (id: string, ingIds: string[], station?: string): Recipe => ({
    id,
    name: `Recipe ${id}`,
    description: '',
    stationTag: station ? { primary: station, confidence: 1 } : undefined,
    components: [{
      id: 'c1', name: 'Main', type: 'base', percentageOfTotalWeight: 100, bufferPercentage: 0,
      ingredients: ingIds.map(ingredientId => ({ ingredientId, quantity: 10, unit: 'g' })),
      instructions: [],
    }],
  } as any);

  test('no station → empty array', () => {
    const target = makeRecipe('1', ['ing-butter']);
    const result = computeCrossContactRisks(target, [], ingredients);
    expect(result).toEqual([]);
  });

  test('station exists, but no other recipes share it → empty array', () => {
    const target = makeRecipe('1', ['ing-butter'], 'bonbon');
    const result = computeCrossContactRisks(target, [], ingredients);
    expect(result).toEqual([]);
  });

  test('another recipe on same station with peanut allergen flags cross-contact', () => {
    const target = makeRecipe('1', ['ing-butter'], 'bonbon');
    const other = makeRecipe('2', ['ing-peanut'], 'bonbon');
    const result = computeCrossContactRisks(target, [target, other], ingredients);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(r => r.allergen === 'peanuts' && r.station === 'bonbon')).toBe(true);
  });

  test('other recipe on different station does NOT flag', () => {
    const target = makeRecipe('1', ['ing-butter'], 'bonbon');
    const other = makeRecipe('2', ['ing-peanut'], 'ganache');
    const result = computeCrossContactRisks(target, [target, other], ingredients);
    expect(result).toEqual([]);
  });

  test('a recipe that already contains the allergen is NOT a cross-contact risk for itself', () => {
    const target = makeRecipe('1', ['ing-peanut'], 'bonbon');
    const other = makeRecipe('2', ['ing-peanut'], 'bonbon');
    const result = computeCrossContactRisks(target, [target, other], ingredients);
    // If the target already contains peanuts, peanuts is NOT a cross-contact risk (it's a direct ingredient)
    expect(result.some(r => r.allergen === 'peanuts')).toBe(false);
  });
});
