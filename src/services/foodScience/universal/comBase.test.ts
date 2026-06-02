import { describe, test, expect } from 'vitest';
import { predictShelfLife } from './comBase';
import { calculateNorrishAw } from './norrish';
import type { ResolvedIngredient } from './types';

function ing(name: string, mass: number, composition: Record<string, number>, bufferRef?: string): ResolvedIngredient {
  return {
    ingredientId: name.toLowerCase().replace(/\s+/g, '-'),
    name, mass, composition, bufferRef,
    compositionSource: 'explicit',
  };
}

describe('predictShelfLife', () => {
  test('flags combase_unavailable in v1', () => {
    const ings = [ing('water', 100, { water: 100 })];
    const aw = calculateNorrishAw(ings);
    const result = predictShelfLife(aw, ings);
    expect(result.flags.find(f => f.kind === 'combase_unavailable')).toBeDefined();
  });

  test('high Aw → 1 week', () => {
    const ings = [ing('water', 100, { water: 100 })];
    const aw = calculateNorrishAw(ings);
    const result = predictShelfLife(aw, ings);
    expect(result.weeks).toBe(1);
    expect(result.band).toBe('very-fragile');
  });

  test('classic ganache Aw 0.945 → 2 weeks', () => {
    const ings = [
      ing('dark 70', 100, { water: 0.5, sucrose: 29, fat: 43.5 }),
      ing('heavy cream', 59, { water: 58, fat: 36, lactose: 2.9, protein: 2.1, ash: 0.5 }),
    ];
    const aw = calculateNorrishAw(ings);
    const result = predictShelfLife(aw, ings);
    expect(result.weeks).toBe(2);
  });

  test('alcohol bonus adds 6 weeks above 4 percent ABV (retention-adjusted)', () => {
    const ings = [
      ing('dark 70', 100, { water: 0.5, sucrose: 29, fat: 43.5 }),
      ing('heavy cream', 50, { water: 58, fat: 36, lactose: 2.9, protein: 2.1, ash: 0.5 }),
      ing('high-proof spirit', 30, { water: 30, ethanol: 70 }),
    ];
    const aw = calculateNorrishAw(ings);
    const result = predictShelfLife(aw, ings);
    expect(result.alcoholBonus).toBeGreaterThanOrEqual(6);
    expect(result.finalABV).toBeGreaterThan(3);
  });

  test('declared shelf life divergence flagged', () => {
    const ings = [
      ing('dark 70', 100, { water: 0.5, sucrose: 29, fat: 43.5 }),
      ing('heavy cream', 59, { water: 58, fat: 36, lactose: 2.9, protein: 2.1, ash: 0.5 }),
    ];
    const aw = calculateNorrishAw(ings);
    const result = predictShelfLife(aw, ings, { declaredShelfLifeDays: 30 });  // declared ~4 weeks vs predicted 2
    expect(result.flags.find(f => f.kind === 'declared_diverges')).toBeDefined();
  });
});
