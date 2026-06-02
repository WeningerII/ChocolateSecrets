import { describe, test, expect } from 'vitest';
import { calculateHardeningFactor, classifyScoopability } from './scoopability';

describe('frozen scoopability', () => {
  test('standard gelato anchor', () => {
    // TS=35, fat=8, MSNF=11, PAC=29
    const hardening = calculateHardeningFactor(35, 8, 11, 29);
    const result = classifyScoopability(29, hardening);
    expect(result === 'standard' || result === 'soft').toBe(true);
  });

  test('overloaded American ice cream', () => {
    // TS=40, fat=14, MSNF=11, PAC=18 -> brick or firm
    const hardening = calculateHardeningFactor(40, 14, 11, 18);
    const result = classifyScoopability(18, hardening);
    expect(result === 'brick' || result === 'firm').toBe(true);
  });

  test('granita', () => {
    // TS=24, fat=0, MSNF=0, PAC=22
    const hardening = calculateHardeningFactor(24, 0, 0, 22);
    const result = classifyScoopability(22, hardening);
    expect(result === 'standard' || result === 'soft' || result === 'too_soft').toBe(true);
  });

  test('boundaries', () => {
    // hand-pick
    // idx < -10 -> brick
    expect(classifyScoopability(20, 52)).toBe('brick'); // 20 - 31.2 = -11.2
    
    // < -2 -> firm
    expect(classifyScoopability(20, 38)).toBe('firm'); // 20 - 22.8 = -2.8

    // < 5 -> standard
    expect(classifyScoopability(20, 28)).toBe('standard'); // 20 - 16.8 = 3.2

    // < 12 -> soft
    expect(classifyScoopability(20, 15)).toBe('soft'); // 20 - 9.0 = 11.0

    // > 12 -> too_soft
    expect(classifyScoopability(20, 10)).toBe('too_soft'); // 20 - 6.0 = 14
  });
});
