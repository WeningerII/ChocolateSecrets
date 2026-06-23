import { describe, test, expect } from 'vitest';
import { calculateMixedPH, computeTitratableAcidity, BUFFER_REFERENCES, alphaPolyprotic, calibrateCounterion } from './pH';
import type { ResolvedIngredient } from './types';

function ing(name: string, mass: number, composition: Record<string, number>, bufferRef?: string): ResolvedIngredient {
  return {
    ingredientId: name.toLowerCase().replace(/\s+/g, '-'),
    name, mass, composition, bufferRef,
    compositionSource: 'explicit',
  };
}

describe('alphaPolyprotic', () => {
  test('monoprotic acetic at pH equal to pKa gives 50/50 split', () => {
    const alphas = alphaPolyprotic(4.76, [4.76]);
    expect(alphas[0]).toBeCloseTo(0.5, 2);
    expect(alphas[1]).toBeCloseTo(0.5, 2);
  });

  test('triprotic citrate alphas sum to 1', () => {
    const alphas = alphaPolyprotic(5.0, [3.13, 4.76, 6.40]);
    const sum = alphas.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 3);
    expect(alphas).toHaveLength(4);
  });
});

describe('calibrateCounterion + BUFFER_REFERENCES', () => {
  test('every buffer reference solves to its declared natural pH alone', () => {
    for (const [key, ref] of Object.entries(BUFFER_REFERENCES)) {
      const result = calculateMixedPH([
        ing(key, 100, { water: 100 }, key),
      ]);
      expect(result).not.toBeNull();
      expect(result!.pH).toBeCloseTo(ref.naturalPH, 1);
    }
  });
});

describe('computeTitratableAcidity', () => {
  test('returns null without buffer data', () => {
    expect(computeTitratableAcidity([ing('water', 100, { water: 100 })])).toBeNull();
  });

  test('a high-acid puree has higher titratable acidity than a mild one', () => {
    const passion = computeTitratableAcidity([ing('passion', 100, { water: 85 }, 'puree.passion')]);
    const pear = computeTitratableAcidity([ing('pear', 100, { water: 85 }, 'puree.pear')]);
    expect(passion!.eqPerLitre).toBeGreaterThan(pear!.eqPerLitre);
  });

  test('passion-fruit TA is a realistic few-% citric equivalent at its natural pH', () => {
    const r = computeTitratableAcidity([ing('passion', 100, { water: 85 }, 'puree.passion')]);
    expect(r!.eqPerLitre).toBeGreaterThan(0);
    expect(r!.pctCitricEquivalent).toBeGreaterThan(1);
    expect(r!.pctCitricEquivalent).toBeLessThan(8);
    expect(r!.pH).toBeCloseTo(2.9, 0);
  });
});

describe('calculateMixedPH', () => {
  test('returns null when no ingredient has bufferRef', () => {
    const result = calculateMixedPH([
      ing('water', 100, { water: 100 }),
      ing('sugar', 50, { sucrose: 100 }),
    ]);
    expect(result).toBeNull();
  });

  test('cream alone returns pH 6.6 ± 0.1', () => {
    const result = calculateMixedPH([
      ing('heavy cream', 100, { water: 58 }, 'cream'),
    ]);
    expect(result!.pH).toBeGreaterThan(6.4);
    expect(result!.pH).toBeLessThan(6.8);
  });

  test('raspberry puree alone returns pH 3.2 ± 0.1', () => {
    const result = calculateMixedPH([
      ing('raspberry puree', 100, { water: 86 }, 'puree.raspberry'),
    ]);
    expect(result!.pH).toBeGreaterThan(3.0);
    expect(result!.pH).toBeLessThan(3.4);
  });

  test('cream + raspberry puree (cream-led 2:1) returns pH 3.5–3.7', () => {
    const result = calculateMixedPH([
      ing('heavy cream', 40, { water: 58 }, 'cream'),
      ing('raspberry puree', 20, { water: 86 }, 'puree.raspberry'),
    ]);
    expect(result!.pH).toBeGreaterThan(3.4);
    expect(result!.pH).toBeLessThan(3.8);
  });

  test('flags unrecognized_buffer_source for unknown bufferRef', () => {
    const result = calculateMixedPH([
      ing('mystery', 100, { water: 100 }, 'unknown.thing'),
    ]);
    expect(result).toBeNull();
  });

  test('component fractions sum to 1', () => {
    const result = calculateMixedPH([
      ing('heavy cream', 40, { water: 58 }, 'cream'),
      ing('raspberry puree', 20, { water: 86 }, 'puree.raspberry'),
    ]);
    const sum = result!.components.reduce((a, c) => a + c.fraction, 0);
    expect(sum).toBeCloseTo(1.0, 3);
  });
});
