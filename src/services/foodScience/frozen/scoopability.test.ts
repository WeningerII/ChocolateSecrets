import { describe, test, expect } from 'vitest';
import { calculateHardeningFactor, classifyScoopability, classifyFrozenWaterScoopability } from './scoopability';

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
    // idx < -10 → brick
    expect(classifyScoopability(20, 52)).toBe('brick');    // 20 - 31.2 = -11.2

    // -10 to 2 → firm
    expect(classifyScoopability(20, 38)).toBe('firm');     // 20 - 22.8 = -2.8

    // 2 to 20 → standard (includes the PAC=30 sweet-spot at idx≈12)
    expect(classifyScoopability(20, 28)).toBe('standard'); // 20 - 16.8 = 3.2
    expect(classifyScoopability(20, 15)).toBe('standard'); // 20 - 9.0  = 11.0

    // 20 to 28 → soft
    expect(classifyScoopability(25, 3)).toBe('soft');      // 25 - 1.8  = 23.2

    // > 28 → too_soft
    expect(classifyScoopability(32, 3)).toBe('too_soft');  // 32 - 1.8  = 30.2
  });

  // Regression (hardening sweep): PAC=30 is the gelato sweet-spot. With the old
  // thresholds, the standard gelato formula (TS=38, fat=8, MSNF=10) gave idx≈12.24
  // and was falsely classified as 'too_soft'. It must land in 'standard'.
  test('PAC=30 gelato sweet-spot classifies as standard', () => {
    const hardening = calculateHardeningFactor(38, 8, 10, 30); // idx = 30 - hardening * 0.6
    expect(classifyScoopability(30, hardening)).toBe('standard');
  });
});

describe('frozen-water scoopability (physics-based)', () => {
  const ICE_CREAM: [number, number] = [70, 80]; // target % water frozen at serving

  test('within the target band → standard', () => {
    expect(classifyFrozenWaterScoopability(75, ICE_CREAM)).toBe('standard');
    expect(classifyFrozenWaterScoopability(70, ICE_CREAM)).toBe('standard');
    expect(classifyFrozenWaterScoopability(80, ICE_CREAM)).toBe('standard');
  });

  test('above band → firm, well above → brick', () => {
    expect(classifyFrozenWaterScoopability(84, ICE_CREAM)).toBe('firm');
    expect(classifyFrozenWaterScoopability(92, ICE_CREAM)).toBe('brick');
  });

  test('below band → soft, well below → too_soft', () => {
    expect(classifyFrozenWaterScoopability(65, ICE_CREAM)).toBe('soft');
    expect(classifyFrozenWaterScoopability(55, ICE_CREAM)).toBe('too_soft');
  });
});
