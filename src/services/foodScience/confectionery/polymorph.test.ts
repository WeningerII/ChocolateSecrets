import { describe, test, expect } from 'vitest';
import { computePolymorphWindow, computeChocolateSnap } from './polymorph';
import type { ResolvedIngredient } from '../universal';

const choc = (mass: number, cocoaPct: number, cls?: 'dark' | 'milk' | 'white'): ResolvedIngredient => ({
  ingredientId: 'c',
  name: 'chocolate',
  mass,
  composition: { fat: 35 },
  compositionSource: 'explicit',
  chocolateCocoaPercentage: cocoaPct,
  chocolateClass: cls,
});

describe('computePolymorphWindow', () => {
  test('dark chocolate gets a higher temper window than milk', () => {
    const dark = computePolymorphWindow([choc(100, 70)])!;
    const milk = computePolymorphWindow([choc(100, 35)])!;
    expect(dark.workingPointC).toBeGreaterThan(milk.workingPointC);
  });

  test('no chocolate → null', () => {
    expect(computePolymorphWindow([])).toBeNull();
  });
});

describe('computeChocolateSnap', () => {
  test('dark chocolate → hard snap', () => {
    const s = computeChocolateSnap([choc(100, 70)])!;
    expect(s.chocolateClass).toBe('dark');
    expect(s.snapClass).toBe('hard_snap');
  });

  test('milk chocolate is softer than dark at the same eating temp', () => {
    const milk = computeChocolateSnap([choc(100, 35)])!;
    const dark = computeChocolateSnap([choc(100, 70)])!;
    expect(milk.chocolateClass).toBe('milk');
    expect(milk.snapClass).toBe('firm');
    expect(milk.sfcAtEatingTempPct).toBeLessThan(dark.sfcAtEatingTempPct);
  });

  test('no chocolate → null', () => {
    const cream: ResolvedIngredient = {
      ingredientId: 'cream', name: 'cream', mass: 100,
      composition: { fat: 35, water: 60 }, compositionSource: 'explicit',
    };
    expect(computeChocolateSnap([cream])).toBeNull();
  });
});
