import { describe, test, expect } from 'vitest';
import { inferFrozenIngredientSubtype } from './subtypes';
import type { Ingredient } from '../../../types';

describe('frozen subtypes', () => {
  const dummy = (name: string, bufferRef?: string): Ingredient => ({
    id: '1', name, stock: 0, lowStockThreshold: 0, bufferRef
  });

  test('Heavy Cream with role liquid and bufferRef cream', () => {
    expect(inferFrozenIngredientSubtype(dummy('Heavy Cream', 'cream'), 'liquid')).toBe('base_dairy');
  });

  test('Whole Milk with role liquid', () => {
    expect(inferFrozenIngredientSubtype(dummy('Whole Milk'), 'liquid')).toBe('base_dairy');
  });

  test('Filtered Water with role water', () => {
    expect(inferFrozenIngredientSubtype(dummy('Filtered Water'), 'water')).toBe('base_water');
  });

  test('Granulated Sugar', () => {
    expect(inferFrozenIngredientSubtype(dummy('Granulated Sugar'), 'sweetener')).toBe('sugar_blend');
  });

  test('Vanilla Extract', () => {
    expect(inferFrozenIngredientSubtype(dummy('Vanilla Extract'), 'flavor')).toBe('flavor_paste');
  });

  test('Locust Bean Gum', () => {
    expect(inferFrozenIngredientSubtype(dummy('Locust Bean Gum'), 'hydrocolloid')).toBe('stabilizer_blend');
  });

  test('Cocoa Butter', () => {
    expect(inferFrozenIngredientSubtype(dummy('Cocoa Butter'), 'fat')).toBe('fat_addition');
  });

  test('Bourbon', () => {
    expect(inferFrozenIngredientSubtype(dummy('Bourbon'), 'alcohol')).toBe('alcohol_low_dose');
  });

  test('Strawberry Puree with role liquid', () => {
    expect(inferFrozenIngredientSubtype(dummy('Strawberry Puree'), 'liquid')).toBe('flavor_paste');
  });

  test('Milk Powder', () => {
    expect(inferFrozenIngredientSubtype(dummy('Milk Powder'), 'protein')).toBe('base_dairy');
  });
});
