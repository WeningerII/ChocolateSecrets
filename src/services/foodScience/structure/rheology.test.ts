import { describe, test, expect } from 'vitest';
import { computeRheology } from './rheology';

describe('computeRheology', () => {
  test('water is thin and Newtonian (≈ 1× water)', () => {
    const r = computeRheology({ water: 100 });
    expect(r.relativeViscosity).toBeCloseTo(1, 3);
    expect(r.consistency).toBe('thin');
    expect(r.flowType).toBe('newtonian');
  });

  test('a concentrated sugar syrup is far more viscous than a dilute one', () => {
    const dilute = computeRheology({ water: 70, sucrose: 30 });
    const syrup = computeRheology({ water: 40, sucrose: 60 });
    expect(syrup.relativeViscosity).toBeGreaterThan(dilute.relativeViscosity);
    expect(syrup.brix).toBeCloseTo(60, 0);
  });

  test('viscosity falls with temperature (Arrhenius)', () => {
    const cold = computeRheology({ water: 40, sucrose: 60 }, 20);
    const hot = computeRheology({ water: 40, sucrose: 60 }, 60);
    expect(hot.relativeViscosity).toBeLessThan(cold.relativeViscosity);
  });

  test('high fat reads as a plastic (yield-stress) system', () => {
    expect(computeRheology({ water: 30, fat: 60 }).flowType).toBe('plastic_yield_stress');
  });

  test('hydrocolloid shear-thinning is flagged as not inferable from composition', () => {
    expect(computeRheology({ water: 90, sucrose: 10 }).flags).toContainEqual({ kind: 'shear_thinning_not_detected' });
  });
});
