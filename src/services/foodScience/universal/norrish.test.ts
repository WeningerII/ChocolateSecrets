import { describe, test, expect } from 'vitest';
import { calculateNorrishAw } from './norrish';
import type { ResolvedIngredient } from './types';

function ing(name: string, mass: number, composition: Record<string, number>, bufferRef?: string): ResolvedIngredient {
  return {
    ingredientId: name.toLowerCase().replace(/\s+/g, '-'),
    name, mass, composition, bufferRef,
    compositionSource: 'explicit',
  };
}

describe('calculateNorrishAw', () => {
  test('pure water returns aw 1.0', () => {
    const result = calculateNorrishAw([ing('water', 100, { water: 100 })]);
    expect(result.aw).toBeCloseTo(1.0, 3);
    expect(result.flags.find(f => f.kind === 'no_water')).toBeUndefined();
  });

  test('no water returns null aw with no_water flag', () => {
    const result = calculateNorrishAw([ing('cocoa butter', 100, { fat: 100 })]);
    expect(result.aw).toBeNull();
    expect(result.flags.find(f => f.kind === 'no_water')).toBeDefined();
  });

  test('50 percent sucrose solution lands near 0.93', () => {
    const result = calculateNorrishAw([
      ing('water', 50, { water: 100 }),
      ing('sucrose', 50, { sucrose: 100 }),
    ]);
    expect(result.aw).toBeGreaterThan(0.91);
    expect(result.aw).toBeLessThan(0.95);
  });

  test('pure heavy cream alone — Aw 0.997 ± 0.005', () => {
    const result = calculateNorrishAw([
      ing('heavy cream', 100, { water: 58, fat: 36, lactose: 2.9, protein: 2.1, ash: 0.5 }),
    ]);
    expect(result.aw).toBeGreaterThan(0.992);
    expect(result.aw).toBeLessThan(1.000);
    expect(result.fatPct).toBeCloseTo(36, 0);
    expect(result.waterPct).toBeCloseTo(58, 0);
  });

  test('classic dark 70 ganache (1.7:1 cream:chocolate) — Aw 0.945 ± 0.005, fat 41 ± 1', () => {
    const result = calculateNorrishAw([
      ing('dark 70', 100, { water: 0.5, sucrose: 29, fat: 43.5 }),
      ing('heavy cream', 59, { water: 58, fat: 36, lactose: 2.9, protein: 2.1, ash: 0.5 }),
    ]);
    expect(result.aw).toBeGreaterThan(0.940);
    expect(result.aw).toBeLessThan(0.950);
    expect(result.fatPct).toBeGreaterThan(40);
    expect(result.fatPct).toBeLessThan(42);
  });

  test('Wybauw long-shelf with sorbitol drops Aw significantly (around 0.916)', () => {
    const result = calculateNorrishAw([
      ing('dark 65', 100, { water: 0.5, sucrose: 34, fat: 40.75 }),
      ing('heavy cream', 54, { water: 58, fat: 36, lactose: 2.9, protein: 2.1, ash: 0.5 }),
      ing('sorbitol', 5.4, { sorbitol: 100 }),       // 10% of cream
      ing('butter', 8, { water: 16, fat: 81 }),
    ]);
    expect(result.aw).toBeLessThan(0.92);
    expect(result.aw).toBeGreaterThan(0.91);
  });

  test('ethanol retention applied to ethanol mass when default flag is true', () => {
    const withRetention = calculateNorrishAw([
      ing('water', 50, { water: 100 }),
      ing('spirit 40 abv', 50, { water: 50.4, ethanol: 49.6 }),
    ]);
    const withoutRetention = calculateNorrishAw([
      ing('water', 50, { water: 100 }),
      ing('spirit 40 abv', 50, { water: 50.4, ethanol: 49.6 }),
    ], { applyEthanolRetention: false });

    // Less ethanol present (retention applied) → higher Aw
    expect(withRetention.aw!).toBeGreaterThan(withoutRetention.aw!);
    expect(withRetention.flags.find(f => f.kind === 'ethanol_volatility_applied')).toBeDefined();
    expect(withoutRetention.flags.find(f => f.kind === 'ethanol_volatility_applied')).toBeUndefined();
  });

  test('flags lactose_upper_bound when lactose present', () => {
    const result = calculateNorrishAw([
      ing('heavy cream', 100, { water: 58, fat: 36, lactose: 2.9, protein: 2.1, ash: 0.5 }),
    ]);
    expect(result.flags.find(f => f.kind === 'lactose_upper_bound')).toBeDefined();
  });

  test('flags composition_fallback when source is category_default', () => {
    const fallback: ResolvedIngredient = {
      ingredientId: 'mystery', name: 'mystery', mass: 50,
      composition: { water: 70, fat: 18 },
      compositionSource: 'category_default',
    };
    const result = calculateNorrishAw([fallback]);
    expect(result.flags.find(f => f.kind === 'composition_fallback')).toBeDefined();
  });

  test('flags extreme_saturation above 75 percent aqueous sugar', () => {
    const result = calculateNorrishAw([
      ing('water', 5, { water: 100 }),
      ing('sucrose', 95, { sucrose: 100 }),
    ]);
    expect(result.flags.find(f => f.kind === 'extreme_saturation')).toBeDefined();
  });
});
