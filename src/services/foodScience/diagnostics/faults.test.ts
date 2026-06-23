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
});
