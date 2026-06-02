import { describe, test, expect } from 'vitest';
import { inferRole, inferRoleTag, getRoleSwapSet } from './roles';
import type { Ingredient } from '../../types';

function ing(overrides: Partial<Ingredient> & { name: string }): Ingredient {
  return {
    id: overrides.name.toLowerCase().replace(/\s+/g, '-'),
    stock: 0, lowStockThreshold: 0,
    ...overrides,
  } as Ingredient;
}

describe('inferRole — positive cases', () => {
  test.each([
    ['Heavy Cream', 'liquid'],
    ['Whole Milk', 'liquid'],
    ['Buttermilk', 'liquid'],
    ['Unsalted Butter', 'fat'],
    ['Olive Oil', 'fat'],
    ['Cocoa Butter', 'fat'],
    ['Granulated Sugar', 'sweetener'],
    ['Honey', 'sweetener'],
    ['Glucose Syrup', 'sweetener'],
    ['Sorbitol', 'sweetener'],
    ['All-Purpose Flour', 'flour_starch'],
    ['Bread Flour', 'flour_starch'],
    ['Cornstarch', 'flour_starch'],
    ['Active Dry Yeast', 'leavener'],
    ['Sourdough Starter', 'leavener'],
    ['White Wine Vinegar', 'acidulant'],
    ['Lemon Juice', 'acidulant'],
    ['Citric Acid', 'acidulant'],
    ['Kappa Carrageenan', 'hydrocolloid'],
    ['LM Pectin', 'hydrocolloid'],
    ['Xanthan Gum', 'hydrocolloid'],
    ['Gelatin Sheets', 'hydrocolloid'],
    ['Whole Egg', 'protein'],
    ['Egg Yolks', 'protein'],
    ['Milk Powder', 'protein'],
    ['Bourbon Whiskey', 'alcohol'],
    ['Coffee Liqueur', 'alcohol'],
    ['Peppermint Oil', 'flavor'],
    ['Vanilla Extract', 'flavor'],
    ['Espresso Beans', 'flavor'],
    ['Cinnamon Stick', 'flavor'],
    ['Sea Salt', 'salt'],
    ['Kosher Salt', 'salt'],
    ['Filtered Water', 'water'],
    ['Cocoa Nibs', 'inclusion'],
    ['Praline Paste', 'inclusion'],
    ['Almond Butter', 'inclusion'],
    ['Peanut Butter', 'inclusion'],
  ])('%s → %s', (name, expectedRole) => {
    const result = inferRole(ing({ name }));
    expect(result.role).toBe(expectedRole);
    expect(result.confidence).toBeGreaterThanOrEqual(0.75);
  });
});

describe('inferRole — negative cases (must NOT match)', () => {
  test('sour cream is not "cream/liquid"', () => {
    expect(inferRole(ing({ name: 'Sour Cream' })).role).not.toBe('liquid');
  });
  test('ice cream is not "cream/liquid"', () => {
    expect(inferRole(ing({ name: 'Vanilla Ice Cream' })).role).not.toBe('liquid');
  });
  test('cream cheese is not "cream/liquid"', () => {
    expect(inferRole(ing({ name: 'Cream Cheese' })).role).not.toBe('liquid');
  });
  test('peanut butter is not "fat/butter"', () => {
    expect(inferRole(ing({ name: 'Peanut Butter' })).role).not.toBe('fat');
  });
  test('milk powder is not "liquid"', () => {
    expect(inferRole(ing({ name: 'Nonfat Milk Powder' })).role).not.toBe('liquid');
  });
});

describe('inferRole — chocolate spec drives "fat"', () => {
  test('any ingredient with chocolateSpec returns fat at 0.92', () => {
    const result = inferRole(ing({
      name: 'Mystery Couverture',
      chocolateSpec: { type: 'dark', cocoaPercentage: 70 } as any,
    }));
    expect(result.role).toBe('fat');
    expect(result.confidence).toBeCloseTo(0.92, 1);
  });
});

describe('inferRole — alcohol spec drives "alcohol"', () => {
  test('any ingredient with alcoholSpec returns alcohol at 0.95', () => {
    const result = inferRole(ing({
      name: 'Pre-batched Old Fashioned Mix',
      alcoholSpec: { abv: 35, type: 'spirit' } as any,
    }));
    expect(result.role).toBe('alcohol');
    expect(result.confidence).toBeCloseTo(0.95, 1);
  });
});

describe('inferRole — category fallback', () => {
  test('unrecognized name with category falls back at 0.60', () => {
    const result = inferRole(ing({
      name: 'House-blend Custom Curing Mix',
      category: 'Sugars & Sweeteners',
    }));
    expect(result.role).toBe('sweetener');
    expect(result.confidence).toBeCloseTo(0.60, 1);
  });
});

describe('inferRole — total miss', () => {
  test('no name, no category → null', () => {
    const result = inferRole(ing({ name: 'zzqqxx-totally-unknown' }));
    expect(result.role).toBeNull();
  });
});

describe('inferRoleTag', () => {
  test('confidence ≥ 0.85 → inferred_high', () => {
    const tag = inferRoleTag(ing({ name: 'Heavy Cream' }));
    expect(tag?.provenance).toBe('inferred_high');
  });

  test('confidence 0.75–0.85 → inferred_low', () => {
    const tag = inferRoleTag(ing({ name: 'Cinnamon Stick' }));
    expect(tag?.provenance).toBe('inferred_low');
  });

  test('confidence < 0.75 → null (default threshold)', () => {
    const tag = inferRoleTag(ing({ name: 'House-blend Custom Curing Mix', category: 'Sugars & Sweeteners' }));
    expect(tag).toBeNull();    // 0.60 fallback is below default threshold
  });

  test('lowering threshold accepts category fallbacks', () => {
    const tag = inferRoleTag(ing({ name: 'House-blend', category: 'Sugars & Sweeteners' }), 0.5);
    expect(tag?.universal).toBe('sweetener');
    expect(tag?.provenance).toBe('inferred_low');
  });
});

describe('getRoleSwapSet', () => {
  test('returns all ingredients matching the role above threshold', () => {
    const catalog = [
      ing({ name: 'Heavy Cream' }),
      ing({ name: 'Light Cream' }),
      ing({ name: 'Whole Milk' }),
      ing({ name: 'Granulated Sugar' }),
      ing({ name: 'Sourdough Starter' }),
    ];
    const liquids = getRoleSwapSet('liquid', catalog);
    expect(liquids.map(i => i.name).sort()).toEqual(['Heavy Cream', 'Light Cream', 'Whole Milk']);
    expect(getRoleSwapSet('sweetener', catalog).map(i => i.name)).toEqual(['Granulated Sugar']);
    expect(getRoleSwapSet('leavener', catalog).map(i => i.name)).toEqual(['Sourdough Starter']);
  });
});
