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

  // Regression (hardening sweep): 30 % cocoa-butter white chocolate must classify
  // as WHITE (not milk) — it already received the white 26.5–28 °C window, so the
  // label was self-contradictory before the <25 → ≤30 cutoff fix.
  test('30 % cocoa-butter chocolate is white and gets the white temper window', () => {
    const w = computePolymorphWindow([choc(100, 30)])!;
    expect(w.chocolateClass).toBe('white');
    expect(w.tempWindowC).toEqual([26.5, 28.0]);
    expect(computeChocolateSnap([choc(100, 30)])!.chocolateClass).toBe('white');
    // 35 % stays milk (the cutoff is ≤30) — guards the existing boundary.
    expect(computePolymorphWindow([choc(100, 35)])!.chocolateClass).toBe('milk');
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
