import { describe, test, expect } from 'vitest';
import { calculatePAC, calculatePOD, calculateTotalSugarsPct } from './pac';
import type { ResolvedIngredient } from '../universal';

describe('frozen pac / pod', () => {
  const dummyResolved = (mass: number, comp: any): ResolvedIngredient => ({
    ingredientId: 'a',
    name: 'test',
    mass,
    compositionSource: 'category_default',
    composition: comp,
  });

  test('calculatePAC on 100g mix of 25g sucrose + 75g water returns ~25', () => {
    const resolved = [
      dummyResolved(25, { sucrose: 100 }),
      dummyResolved(75, { water: 100 })
    ];
    expect(calculatePAC(resolved)).toBeCloseTo(25, 2);
  });

  test('100g mix of 20g sucrose + 5g dextrose + 75g water returns ~29.5', () => {
    const resolved = [
      dummyResolved(20, { sucrose: 100 }),
      dummyResolved(5, { glucose: 100 }),
      dummyResolved(75, { water: 100 })
    ];
    expect(calculatePAC(resolved)).toBeCloseTo(29.5, 2);
  });

  test('100g mix with sorbitol contribution', () => {
    const resolved = [
      dummyResolved(5, { sorbitol: 100 }),
      dummyResolved(95, { water: 100 })
    ];
    expect(calculatePAC(resolved)).toBeCloseTo(10, 2); // 5g * 200 = 1000 / 100
  });

  test('calculatePOD on 25g sucrose', () => {
    const resolved = [
      dummyResolved(25, { sucrose: 100 }),
      dummyResolved(75, { water: 100 })
    ];
    expect(calculatePOD(resolved)).toBeCloseTo(25, 2);
  });

  test('calculateTotalSugarsPct on 18g sucrose + 4g lactose + 78g water returns 18 (lactose excluded)', () => {
    const resolved = [
      dummyResolved(18, { sucrose: 100 }),
      dummyResolved(4, { lactose: 100 }),
      dummyResolved(78, { water: 100 })
    ];
    expect(calculateTotalSugarsPct(resolved)).toBeCloseTo(18, 2);
  });

  test('Empty resolved list returns 0', () => {
    expect(calculatePAC([])).toBe(0);
    expect(calculatePOD([])).toBe(0);
    expect(calculateTotalSugarsPct([])).toBe(0);
  });
});
