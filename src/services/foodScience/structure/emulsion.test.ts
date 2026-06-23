import { describe, test, expect } from 'vitest';
import { computeEmulsion } from './emulsion';

describe('computeEmulsion', () => {
  test('a single phase (no fat or no water) is not an emulsion', () => {
    expect(computeEmulsion({ composition: { water: 100 } }).type).toBe('none');
    expect(computeEmulsion({ composition: { fat: 100 } }).type).toBe('none');
  });

  test('a hydrophilic emulsifier (high HLB) gives a stable oil-in-water emulsion', () => {
    const r = computeEmulsion({ composition: { fat: 30, water: 60 }, emulsifierHLB: 12 });
    expect(r.type).toBe('oil_in_water');
    expect(r.stability).toBe('stable');
  });

  test('a lipophilic emulsifier (low HLB) gives water-in-oil', () => {
    expect(computeEmulsion({ composition: { fat: 60, water: 30 }, emulsifierHLB: 4 }).type).toBe('water_in_oil');
  });

  test('without an emulsifier the emulsion is unstable, flagged', () => {
    const r = computeEmulsion({ composition: { fat: 30, water: 60 } });
    expect(r.stability).toBe('unstable');
    expect(r.flags).toContainEqual({ kind: 'no_emulsifier' });
  });

  test('too much dispersed phase risks inversion', () => {
    const r = computeEmulsion({ composition: { fat: 80, water: 12 }, emulsifierHLB: 12 });
    expect(r.dispersedFraction).toBeGreaterThan(0.74);
    expect(r.stability).toBe('unstable');
    expect(r.flags).toContainEqual({ kind: 'near_inversion' });
  });
});
