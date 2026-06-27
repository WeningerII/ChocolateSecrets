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

  // Regression (hardening sweep): solubility table previously ended at 100 °C and
  // was clamped there. Candy cooked to 120 °C had a falsely-low solubility (487
  // instead of ~653 g/100g), making it appear more supersaturated than it is.
  test('solubility keeps rising above 100 °C (table now extended to 150 °C)', () => {
    expect(sucroseSolubilityAt(110)).toBeGreaterThan(sucroseSolubilityAt(100));
    expect(sucroseSolubilityAt(120)).toBeGreaterThan(sucroseSolubilityAt(110));
    expect(sucroseSolubilityAt(120)).toBeGreaterThan(600); // ~653 g/100g water at 120 °C
  });

  // Regression (hardening sweep): DOCTOR_SUPPRESSION = 0.7 made a well-doctored
  // fondant (37.5 % invert sugar) show 'moderate' graining risk. With 0.9 it is 'low'.
  test('well-doctored fondant (37.5 % invert) grades as low graining risk', () => {
    // sucrose=50, invert(glucose+fructose)=30+12=42, water=20 → doctorFraction≈0.456
    // Adjust to exactly 37.5 % invert: sucrose=40, invert=24, water=20
    const r = computeSucroseCrystallization({ sucrose: 40, glucose: 12, fructose: 12, water: 20 }, 25);
    expect(r.doctorFraction).toBeCloseTo(0.375, 2);
    expect(r.risk === 'low' || r.risk === 'none').toBe(true); // not 'moderate' as before
  });
});
