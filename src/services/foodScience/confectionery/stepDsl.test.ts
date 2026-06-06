import { describe, test, expect } from 'vitest';
import { evaluateStepCondition, resolveSlot, renderStepTemplate, type DslContext } from './stepDsl';
import type { ResolvedIngredient } from '../universal';
import type { StepCondition } from '../../../types';

const ctx: DslContext = {
  aw: {
    aw: 0.945,
    Xw: 0.95, lnXw: -0.0513, terms: [],
    massBy: {}, moles: {},
    aqueousMass: 100, aqueousSugarPct: 35,
    waterPct: 35, fatPct: 41, totalMass: 159,
    flags: [],
  },
  pH: { pH: 3.75, components: [], flags: [] },
  fatRegime: { key: 'firm-set', labelKey: 'chemistry:bands.fatRegime.firm-set' as any },
  awBandKey: 'very-fragile',
  shelfLifeWeeks: 2,
  resolved: [
    { ingredientId: 'cream', name: 'Heavy Cream', mass: 59, composition: { water: 58, fat: 36 }, compositionSource: 'explicit', bufferRef: 'cream', role: 'liquid' },
    { ingredientId: 'dark', name: 'Dark 70', mass: 100, composition: { water: 0.5, sucrose: 29, fat: 43.5 }, compositionSource: 'explicit', role: 'fat', chocolateCocoaPercentage: 70, chocolateClass: 'dark' },
  ] as ResolvedIngredient[],
  confectionery: {
    derived: {
      subtypes: { cream: 'cream', dark: 'chocolate' },
      curdle: { level: 'high', reasons: [{ kind: 'ph_low', pH: 3.75 }], recommendedFoldTempCeilingC: 30 },
      polymorph: { chocolateClass: 'dark', cocoaPercentage: 70, tempWindowC: [31.0, 32.5], workingPointC: 31.75 },
      ethanol: { abv: null, retentionApplied: 0.9, postRetentionMassPct: 0, inLongShelfBand: false },
      snap: null,
    },
    warnings: [],
  },
};

describe('evaluateStepCondition', () => {
  test('always', () => {
    expect(evaluateStepCondition({ kind: 'always' }, ctx)).toBe(true);
  });

  test('role_present / role_absent', () => {
    expect(evaluateStepCondition({ kind: 'role_present', role: 'liquid' }, ctx)).toBe(true);
    expect(evaluateStepCondition({ kind: 'role_present', role: 'leavener' }, ctx)).toBe(false);
    expect(evaluateStepCondition({ kind: 'role_absent', role: 'leavener' }, ctx)).toBe(true);
  });

  test('role_quantity comparisons', () => {
    expect(evaluateStepCondition({ kind: 'role_quantity', role: 'liquid', op: '>', grams: 50 }, ctx)).toBe(true);
    expect(evaluateStepCondition({ kind: 'role_quantity', role: 'liquid', op: '<', grams: 30 }, ctx)).toBe(false);
  });

  test('physics_compare on aw and pH', () => {
    expect(evaluateStepCondition({ kind: 'physics_compare', metric: 'aw', op: '>', value: 0.92 }, ctx)).toBe(true);
    expect(evaluateStepCondition({ kind: 'physics_compare', metric: 'pH', op: '<', value: 4.6 }, ctx)).toBe(true);
  });

  test('aw_band — single and array', () => {
    expect(evaluateStepCondition({ kind: 'aw_band', band: 'very-fragile' }, ctx)).toBe(true);
    expect(evaluateStepCondition({ kind: 'aw_band', band: ['stabilized', 'shelf-stable'] }, ctx)).toBe(false);
  });

  test('curdle_risk — high triggers high+, but not just-low ranges below', () => {
    expect(evaluateStepCondition({ kind: 'curdle_risk', min: 'high' }, ctx)).toBe(true);
    expect(evaluateStepCondition({ kind: 'curdle_risk', min: 'medium' }, ctx)).toBe(true);
  });

  test('category_subtype_present', () => {
    expect(evaluateStepCondition({ kind: 'category_subtype_present', subtype: 'cream' }, ctx)).toBe(true);
    expect(evaluateStepCondition({ kind: 'category_subtype_present', subtype: 'fondant' }, ctx)).toBe(false);
  });

  test('and / or / not composition', () => {
    const composed: StepCondition = {
      kind: 'and',
      conditions: [
        { kind: 'role_present', role: 'liquid' },
        { kind: 'or', conditions: [
          { kind: 'physics_compare', metric: 'aw', op: '>', value: 0.92 },
          { kind: 'aw_band', band: 'shelf-stable' },
        ]},
        { kind: 'not', condition: { kind: 'role_present', role: 'leavener' } },
      ],
    };
    expect(evaluateStepCondition(composed, ctx)).toBe(true);
  });
});

describe('resolveSlot', () => {
  test('physics aw, three decimals', () => {
    expect(resolveSlot({ kind: 'physics', metric: 'aw', formatter: 'aw_three_decimals' }, ctx)).toBe('0.945');
  });

  test('physics pH, two decimals', () => {
    expect(resolveSlot({ kind: 'physics', metric: 'pH', formatter: 'ph_two_decimals' }, ctx)).toBe('3.75');
  });

  test('role_quantity in grams int', () => {
    expect(resolveSlot({ kind: 'role_quantity', role: 'liquid', formatter: 'gram_int' }, ctx)).toBe('59 g');
  });

  test('derived temperWindow + curdleFoldCeiling', () => {
    expect(resolveSlot({ kind: 'derived', name: 'temperWindow', formatter: 'identity' }, ctx)).toBe('31–32.5°C');
    expect(resolveSlot({ kind: 'derived', name: 'curdleFoldCeiling', formatter: 'identity' }, ctx)).toBe('30.0°C');
  });
});

describe('renderStepTemplate', () => {
  test('substitutes named slots', () => {
    const tmpl = 'Heat the cream ({{creamMass}}) and pour over the chocolate. Hold below {{ceiling}}.';
    const slots = {
      creamMass: { kind: 'role_quantity', role: 'liquid', formatter: 'gram_int' } as const,
      ceiling: { kind: 'derived', name: 'curdleFoldCeiling', formatter: 'identity' } as const,
    };
    expect(renderStepTemplate(tmpl, slots, ctx)).toBe('Heat the cream (59 g) and pour over the chocolate. Hold below 30.0°C.');
  });

  test('leaves unrecognized markers literal', () => {
    expect(renderStepTemplate('hello {{unknown}}', {}, ctx)).toBe('hello {{unknown}}');
  });
});
