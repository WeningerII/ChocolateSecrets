import { describe, test, expect } from 'vitest';
import { computeFoam } from './foam';

describe('computeFoam', () => {
  test('no protein → no foam, flagged', () => {
    const r = computeFoam({ water: 90, sucrose: 10 });
    expect(r.band).toBe('none');
    expect(r.flags).toContainEqual({ kind: 'no_foaming_agent' });
  });

  test('egg-white-like (high protein, no fat) foams well', () => {
    const r = computeFoam({ water: 88, protein: 11 });
    expect(r.band).toBe('good');
    expect(r.foamability).toBeGreaterThan(0.7);
  });

  test('dissolved sugar stabilizes the foam (meringue)', () => {
    const noSugar = computeFoam({ water: 89, protein: 11 }).stability;
    const withSugar = computeFoam({ water: 59, protein: 11, sucrose: 30 }).stability;
    expect(withSugar).toBeGreaterThan(noSugar);
  });

  test('fat destabilizes a protein foam, flagged', () => {
    const lean = computeFoam({ water: 89, protein: 11 }).stability;
    const fatty = computeFoam({ water: 69, protein: 11, fat: 20 });
    expect(fatty.stability).toBeLessThan(lean);
    expect(fatty.flags).toContainEqual({ kind: 'fat_destabilizing' });
  });
});
