import { describe, test, expect } from 'vitest';
import { computeFormulaBalance } from './formulaBalance';
import type { UniversalRole } from '../../../types';

const leaf = (role: UniversalRole, mass: number) => ({ role, mass });

/** A balanced high-ratio butter cake: sugar≥flour, liquid≥sugar, eggs≥fat. */
function balancedCake() {
  return [
    leaf('flour_starch', 200),
    leaf('sweetener', 220),   // sugar:flour = 1.1
    leaf('protein', 150),     // eggs
    leaf('fat', 120),         // eggs:fat = 1.25, fat:flour = 0.6
    leaf('liquid', 120),      // liquid = 120 + 150 = 270; liquid:sugar = 1.23
  ];
}

describe('computeFormulaBalance', () => {
  test('a balanced high-ratio cake raises no faults', () => {
    const r = computeFormulaBalance(balancedCake());
    expect(r.applicable).toBe(true);
    expect(r.faults).toHaveLength(0);
    expect(r.ratios.sugarToFlour).toBeCloseTo(1.1, 5);
    expect(r.ratios.proteinToFat).toBeCloseTo(1.25, 5);
  });

  test('counts eggs (protein) toward the baker\'s liquid', () => {
    const r = computeFormulaBalance(balancedCake());
    // liquid = added liquid (120) + protein/eggs (150) = 270
    expect(r.masses.liquid).toBe(270);
  });

  test('sugar below flour predicts a denser, leaner crumb', () => {
    const r = computeFormulaBalance([
      leaf('flour_starch', 300),
      leaf('sweetener', 150),   // sugar:flour = 0.5 < 1.0
      leaf('protein', 150),
      leaf('fat', 100),
      leaf('liquid', 200),
    ]);
    expect(r.faults.map(f => f.kind)).toContain('sugar_below_flour');
    const fault = r.faults.find(f => f.kind === 'sugar_below_flour')!;
    expect(fault.ratio).toBeCloseTo(0.5, 5);
    expect(fault.threshold).toBe(1.0);
  });

  test('fat exceeding eggs is a high-severity structural fault', () => {
    const r = computeFormulaBalance([
      leaf('flour_starch', 200),
      leaf('sweetener', 220),
      leaf('protein', 80),      // eggs:fat = 80/200 = 0.4 < 1.0
      leaf('fat', 200),
      leaf('liquid', 200),
    ]);
    const fault = r.faults.find(f => f.kind === 'fat_exceeds_protein');
    expect(fault).toBeDefined();
    expect(fault!.severity).toBe('high');
  });

  test('too little liquid predicts a dry, tight crumb', () => {
    const r = computeFormulaBalance([
      leaf('flour_starch', 200),
      leaf('sweetener', 300),   // lots of sugar
      leaf('protein', 100),
      leaf('fat', 90),
      // no added liquid → liquid = 100 (eggs only); liquid:sugar = 0.33 < 1
    ]);
    expect(r.faults.map(f => f.kind)).toContain('low_liquid');
  });

  test('a frosting with no flour is out of scope (not_cake_like)', () => {
    const r = computeFormulaBalance([
      leaf('fat', 200),         // white chocolate / butter
      leaf('sweetener', 150),
      leaf('liquid', 100),      // cream
    ]);
    expect(r.applicable).toBe(false);
    expect(r.faults).toHaveLength(0);
    expect(r.flags.map(f => f.kind)).toContain('not_cake_like');
  });

  test('low role coverage lowers confidence', () => {
    const r = computeFormulaBalance([
      leaf('flour_starch', 100),
      leaf('sweetener', 110),
      leaf('protein', 80),
      leaf('fat', 70),
      { mass: 500 },            // untagged bulk → tagged fraction < 0.6
    ]);
    const flag = r.flags.find(f => f.kind === 'roles_incomplete');
    expect(flag).toBeDefined();
  });
});
