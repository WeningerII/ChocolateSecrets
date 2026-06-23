import { describe, test, expect } from 'vitest';
import { computeNutrition } from './nutrition';

describe('computeNutrition (Atwater)', () => {
  test('pure macronutrients give their Atwater energy per 100 g', () => {
    expect(computeNutrition({ fat: 100 }).energyKcalPer100g).toBeCloseTo(900, 6);
    expect(computeNutrition({ sucrose: 100 }).energyKcalPer100g).toBeCloseTo(400, 6);
    expect(computeNutrition({ protein: 100 }).energyKcalPer100g).toBeCloseTo(400, 6);
    expect(computeNutrition({ ethanol: 100 }).energyKcalPer100g).toBeCloseTo(700, 6);
  });

  test('water and ash contribute no energy', () => {
    expect(computeNutrition({ water: 80, ash: 20 }).energyKcalPer100g).toBe(0);
  });

  test('polyols are lower-energy than sugars', () => {
    expect(computeNutrition({ sorbitol: 100 }).energyKcalPer100g)
      .toBeLessThan(computeNutrition({ sucrose: 100 }).energyKcalPer100g);
  });

  test('mixed formula sums macros and reports energy shares', () => {
    const r = computeNutrition({ water: 20, sucrose: 50, fat: 20, protein: 10 });
    expect(r.energyKcalPer100g).toBeCloseTo(420, 6); // 50·4 + 20·9 + 10·4
    expect(r.energyFromFatPct).toBeCloseTo((180 / 420) * 100, 1);
    expect(r.energyKJPer100g).toBeCloseTo(420 * 4.184, 1);
    expect(r.carbohydrateG).toBeCloseTo(50, 6);
  });
});
