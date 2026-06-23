import { describe, test, expect } from 'vitest';
import { collectFaults } from './faults';
import type { EmulsionResult, GelationResult, FormulaBalanceResult } from '../structure';
import type { OxidationResult, MoistureMigrationResult } from '../process';
import type { TasteProfile, PalatabilityResult } from '../perception';

describe('collectFaults (universal diagnostics)', () => {
  test('an empty recipe has no faults', () => {
    const r = collectFaults({});
    expect(r.faults).toHaveLength(0);
    expect(r.worst).toBeNull();
    expect(r.counts).toEqual({ high: 0, warn: 0, info: 0 });
  });

  test('sources stay silent unless their input is present (universality)', () => {
    // Only a flavor input → only a flavor fault, nothing structural fires.
    const taste = { sweet: 95, salty: 0, sour: 0, bitter: 0, umami: 0, flags: [] } as TasteProfile;
    const r = collectFaults({ taste });
    expect(r.faults).toHaveLength(1);
    expect(r.faults[0].code).toBe('flavor_too_sweet');
  });

  test('emulsion near inversion → will-split, high when unstable', () => {
    const emulsion = { type: 'oil_in_water', oilPhaseFraction: 0.8, dispersedFraction: 0.8, stability: 'unstable', flags: [{ kind: 'near_inversion' }] } as EmulsionResult;
    const r = collectFaults({ emulsion });
    expect(r.faults[0]).toMatchObject({ code: 'emulsion_will_split', severity: 'high', domain: 'structure' });
  });

  test('a stable emulsion raises nothing', () => {
    const emulsion = { type: 'oil_in_water', oilPhaseFraction: 0.3, dispersedFraction: 0.3, stability: 'stable', flags: [] } as EmulsionResult;
    expect(collectFaults({ emulsion }).faults).toHaveLength(0);
  });

  test('a gelling agent below its dose → wont set', () => {
    const gelation = { agent: 'gelatin', gels: false, setTempC: null, meltTempC: null, thermoreversible: true, character: 'elastic', strength: 0, flags: [{ kind: 'below_min_concentration', minPct: 0.5 }] } as GelationResult;
    expect(collectFaults({ gelation }).faults[0].code).toBe('gelation_wont_set');
  });

  test('formula-balance faults are carried through with their ratios', () => {
    const formulaBalance = {
      applicable: true,
      masses: { flour: 300, sugar: 150, fat: 100, protein: 150, liquid: 350 },
      ratios: { sugarToFlour: 0.5, liquidToSugar: 2.3, proteinToFat: 1.5, fatToFlour: 0.33 },
      faults: [{ kind: 'sugar_below_flour', severity: 'warn', ratio: 0.5, threshold: 1.0 }],
      flags: [],
    } as FormulaBalanceResult;
    const r = collectFaults({ formulaBalance });
    expect(r.faults[0]).toMatchObject({ code: 'formula_sugar_below_flour', detail: { value: 0.5, threshold: 1.0 } });
  });

  test('keeping-quality: rancidity severity tracks the band; curdle high is high', () => {
    const oxidation = { band: 'severe' } as OxidationResult;
    const moisture = { band: 'high' } as MoistureMigrationResult;
    const r = collectFaults({ oxidation, moisture, curdleLevel: 'high' });
    const codes = r.faults.map(f => f.code);
    expect(codes).toContain('oxidation_rancidity');
    expect(codes).toContain('moisture_migration');
    expect(codes).toContain('curdle_risk');
    expect(r.faults.find(f => f.code === 'oxidation_rancidity')!.severity).toBe('high');
  });

  test('faults are ranked worst-first and summarized', () => {
    const taste = { sweet: 95, salty: 0, sour: 0, bitter: 0, umami: 0, flags: [] } as TasteProfile; // warn
    const oxidation = { band: 'severe' } as OxidationResult;                                          // high
    const r = collectFaults({ taste, oxidation });
    expect(r.faults[0].severity).toBe('high');
    expect(r.worst).toBe('high');
    expect(r.counts.high).toBe(1);
    expect(r.counts.warn).toBe(1);
  });

  test('dominant aversive taste is flagged from palatability', () => {
    const palatability = { balance: 30, acceptability: {}, flags: [{ kind: 'dominant_aversive', taste: 'bitter' }] } as PalatabilityResult;
    expect(collectFaults({ palatability }).faults[0].code).toBe('flavor_dominant_bitter');
  });

  test('safety is intent-aware: low-acid + high-moisture only faults when shelf-stable is claimed', () => {
    // Fresh (no/short shelf life declared) → no safety fault even at risky aw/pH.
    expect(collectFaults({ aw: 0.95, pH: 6.5 }).faults).toHaveLength(0);
    expect(collectFaults({ aw: 0.95, pH: 6.5, declaredShelfLifeDays: 5 }).faults).toHaveLength(0);
    // Declared shelf-stable (long ambient life) but low-acid + high-moisture → high fault.
    const r = collectFaults({ aw: 0.95, pH: 6.5, declaredShelfLifeDays: 120 });
    expect(r.faults[0]).toMatchObject({ code: 'safety_not_shelf_stable', domain: 'safety', severity: 'high' });
    // An acid hurdle (pH ≤ 4.6) clears it even with a long shelf life.
    expect(collectFaults({ aw: 0.95, pH: 4.2, declaredShelfLifeDays: 120 }).faults).toHaveLength(0);
  });

  test('doneness: raw core is high severity, underdone is a warning', () => {
    expect(collectFaults({ doneness: { band: 'raw' } as any }).faults[0]).toMatchObject({ code: 'doneness_raw', severity: 'high' });
    expect(collectFaults({ doneness: { band: 'underdone' } as any }).faults[0]).toMatchObject({ code: 'doneness_underdone', severity: 'warn' });
    expect(collectFaults({ doneness: { band: 'done' } as any }).faults).toHaveLength(0);
  });

  test('graining: high risk warns, moderate is informational', () => {
    expect(collectFaults({ crystallization: { risk: 'high' } as any }).faults[0]).toMatchObject({ code: 'graining_risk', severity: 'warn' });
    expect(collectFaults({ crystallization: { risk: 'moderate' } as any }).faults[0].severity).toBe('info');
    expect(collectFaults({ crystallization: { risk: 'none' } as any }).faults).toHaveLength(0);
  });

  test('over-browning fires only at the dark extreme', () => {
    expect(collectFaults({ browning: { band: 'dark' } as any }).faults[0]).toMatchObject({ code: 'over_browning', domain: 'process' });
    expect(collectFaults({ browning: { band: 'golden' } as any }).faults).toHaveLength(0);
  });

  test('mixing chocolate classes raises a temper/bloom risk', () => {
    expect(collectFaults({ chocolateClassesMixed: true }).faults[0]).toMatchObject({ code: 'chocolate_bloom_risk' });
    expect(collectFaults({ chocolateClassesMixed: false }).faults).toHaveLength(0);
  });

  test('a declared shelf life beyond the model is a high stability fault', () => {
    const shelfLife = { flags: [{ kind: 'declared_diverges', declaredDays: 180, predictedWeeks: 4 }] } as any;
    expect(collectFaults({ shelfLife }).faults[0]).toMatchObject({ code: 'shelf_life_short', severity: 'high', domain: 'stability' });
    expect(collectFaults({ shelfLife: { flags: [] } as any }).faults).toHaveLength(0);
  });
});
