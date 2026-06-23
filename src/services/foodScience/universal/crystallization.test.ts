import { describe, test, expect } from 'vitest';
import { computeSucroseCrystallization, sucroseSolubilityAt } from './crystallization';

describe('sucroseSolubilityAt', () => {
  test('rises with temperature (interpolated, clamped)', () => {
    expect(sucroseSolubilityAt(20)).toBeCloseTo(204, 0);
    expect(sucroseSolubilityAt(80)).toBeGreaterThan(sucroseSolubilityAt(20));
    expect(sucroseSolubilityAt(25)).toBeGreaterThan(sucroseSolubilityAt(20));
    expect(sucroseSolubilityAt(-50)).toBe(sucroseSolubilityAt(0)); // clamp
  });
});

describe('computeSucroseCrystallization', () => {
  test('a dilute syrup is undersaturated — no graining', () => {
    const r = computeSucroseCrystallization({ water: 60, sucrose: 50 }, 20);
    expect(r.supersaturationRatio).toBeLessThan(1);
    expect(r.risk).toBe('none');
    expect(r.flags).toContainEqual({ kind: 'undersaturated' });
  });

  test('a cooked-down sucrose syrup is supersaturated — high graining risk', () => {
    const r = computeSucroseCrystallization({ water: 20, sucrose: 70 }, 20);
    expect(r.supersaturationRatio).toBeGreaterThan(1);
    expect(r.risk).toBe('high');
  });

  test('doctoring sugars reduce graining at the same sucrose level', () => {
    const order = { none: 0, low: 1, moderate: 2, high: 3 } as const;
    const plain = computeSucroseCrystallization({ water: 20, sucrose: 60 }, 20);
    const doctored = computeSucroseCrystallization({ water: 20, sucrose: 60, glucose: 20 }, 20);
    expect(doctored.doctorFraction).toBeGreaterThan(0);
    expect(order[doctored.risk]).toBeLessThanOrEqual(order[plain.risk]);
  });

  test('higher temperature dissolves more sugar — less supersaturation', () => {
    const cold = computeSucroseCrystallization({ water: 20, sucrose: 60 }, 20);
    const hot = computeSucroseCrystallization({ water: 20, sucrose: 60 }, 80);
    expect(hot.supersaturationRatio).toBeLessThan(cold.supersaturationRatio);
  });

  test('no sucrose → no graining, flagged', () => {
    const r = computeSucroseCrystallization({ water: 50, fructose: 30 }, 20);
    expect(r.risk).toBe('none');
    expect(r.flags).toContainEqual({ kind: 'no_sucrose' });
  });

  test('no water → flagged', () => {
    expect(computeSucroseCrystallization({ sucrose: 99 }, 20).flags).toContainEqual({ kind: 'no_water' });
  });
});
