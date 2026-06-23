import { describe, test, expect } from 'vitest';
import { solveDose, type DosingAddition } from './solve';
import type { ResolvedIngredient } from '../universal';
import type { Composition } from '../../../types';

const leaf = (name: string, mass: number, composition: Composition): ResolvedIngredient => ({
  ingredientId: name, name, mass, composition, compositionSource: 'explicit',
});

const SUGAR: DosingAddition = { name: 'Sugar', composition: { sucrose: 100 }, role: 'sweetener' };

describe('solveDose', () => {
  test('adds sugar to a bland base to maximize palatability (interior optimum)', () => {
    const base = [leaf('Water', 100, { water: 100 })];
    const r = solveDose(base, SUGAR, { kind: 'maximize_palatability' });
    expect(r.recommendedDoseG).toBeGreaterThan(0);
    expect(r.recommendedDoseG).toBeLessThan(30);          // default max = 30 % of 100 g
    expect(r.achieved.palatability).toBeGreaterThan(r.baseline.palatability);
    expect(r.baseline.doseG).toBe(0);
  });

  test('solves for a dose that hits a target sweetness', () => {
    const base = [leaf('Water', 100, { water: 100 })];
    const r = solveDose(base, SUGAR, { kind: 'target_taste', quality: 'sweet', target: 30 });
    expect(r.achieved.taste.sweet).toBeGreaterThan(27);
    expect(r.achieved.taste.sweet).toBeLessThan(33);
  });

  test('reports a flavor ceiling once a taste turns overpowering', () => {
    const base = [leaf('Water', 100, { water: 100 })];
    const r = solveDose(base, SUGAR, { kind: 'maximize_palatability' }, { maxDoseG: 300 });
    expect(r.flavorCeilingG).not.toBeNull();
    expect(r.flavorCeilingG!).toBeGreaterThan(0);
  });

  test('when the base is already at peak sweetness, the best move is to add nothing', () => {
    const base = [leaf('Water', 80, { water: 100 }), leaf('Sugar', 12, { sucrose: 100 })];
    const r = solveDose(base, SUGAR, { kind: 'maximize_palatability' });
    expect(r.recommendedDoseG).toBe(0);
    expect(r.flags.map(f => f.kind)).toContain('optimum_at_zero');
  });

  test('an aroma-dominant addition is flagged (dosed for taste only)', () => {
    const base = [leaf('Water', 100, { water: 100 })];
    const zest: DosingAddition = { name: 'Lemon zest', composition: { water: 80 }, role: 'flavor' };
    const r = solveDose(base, zest, { kind: 'maximize_palatability' });
    expect(r.flags.map(f => f.kind)).toContain('aroma_dominant_addition');
  });

  test('a tasteless addition to a flat base registers no measurable effect', () => {
    const base = [leaf('Water', 100, { water: 100 })];
    const water: DosingAddition = { name: 'Water', composition: { water: 100 }, role: 'water' };
    const r = solveDose(base, water, { kind: 'maximize_palatability' });
    expect(r.flags.map(f => f.kind)).toContain('no_measurable_effect');
  });

  test('the curve spans 0..maxDose and feeds the baseline', () => {
    const base = [leaf('Water', 100, { water: 100 })];
    const r = solveDose(base, SUGAR, { kind: 'maximize_palatability' }, { maxDoseG: 30, steps: 60 });
    expect(r.curve).toHaveLength(61);
    expect(r.curve[0].doseG).toBe(0);
    expect(r.curve[r.curve.length - 1].doseG).toBeCloseTo(30, 6);
    expect(r.baseline).toEqual(r.curve[0]);
  });
});
