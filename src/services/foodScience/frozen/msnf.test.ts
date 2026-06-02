import { describe, test, expect } from 'vitest';
import { calculateMSNF, calculateTotalSolidsPct } from './msnf';
import type { ResolvedIngredient } from '../universal';
import type { Ingredient } from '../../../types';

describe('frozen msnf', () => {
  const dummyResolved = (mass: number, comp: any, name: string): ResolvedIngredient => ({
    ingredientId: name,
    name,
    mass,
    compositionSource: 'category_default',
    composition: comp,
  });

  const catalog = new Map<string, Ingredient>();
  catalog.set('whole milk', { id: 'whole milk', name: 'whole milk', stock: 0, lowStockThreshold: 0 });
  catalog.set('egg yolk', { id: 'egg yolk', name: 'egg yolk', stock: 0, lowStockThreshold: 0 });
  catalog.set('nfdm', { id: 'nfdm', name: 'nfdm', stock: 0, lowStockThreshold: 0 });

  test('whole milk msnf', () => {
    const resolved = [
      dummyResolved(200, { lactose: 4.7, protein: 3.2, ash: 0.7 }, 'whole milk'),
      dummyResolved(800, { water: 100 }, 'water')
    ];
    // 8.6% of 200g = 17.2g. Total 1000g -> 1.72%
    expect(calculateMSNF(resolved, catalog)).toBeCloseTo(1.72, 2);
  });

  test('egg yolk protein does not count toward msnf', () => {
    const resolved = [
      dummyResolved(200, { protein: 16 }, 'egg yolk'),
    ];
    expect(calculateMSNF(resolved, catalog)).toBe(0);
  });

  test('milk powder msnf', () => {
    const resolved = [
      dummyResolved(10, { lactose: 53, protein: 35, ash: 7 }, 'nfdm'),
      dummyResolved(90, { water: 100 }, 'water')
    ];
    expect(calculateMSNF(resolved, catalog)).toBeCloseTo(9.5, 1);
  });

  test('calculateTotalSolidsPct', () => {
    expect(calculateTotalSolidsPct(60)).toBe(40);
    expect(calculateTotalSolidsPct(110)).toBe(0);
  });
});
