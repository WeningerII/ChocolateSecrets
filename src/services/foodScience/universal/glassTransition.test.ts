import { describe, test, expect } from 'vitest';
import { estimateTgPrime, TG_PRIME_C } from './glassTransition';

describe('estimateTgPrime (glass transition of the freeze-concentrated serum)', () => {
  test('single solute returns its tabulated Tg′', () => {
    expect(estimateTgPrime({ water: 100, sucrose: 100 }).tgPrimeC).toBeCloseTo(TG_PRIME_C.sucrose, 6);
  });

  test('blend is the mass-weighted mean', () => {
    // (50·-32 + 50·-43) / 100 = -37.5
    expect(estimateTgPrime({ sucrose: 50, glucose: 50 }).tgPrimeC).toBeCloseTo(-37.5, 6);
  });

  test('lower-Tg′ sugars (fructose) drag the serum Tg′ down', () => {
    const sucroseOnly = estimateTgPrime({ sucrose: 100 }).tgPrimeC!;
    const withFructose = estimateTgPrime({ sucrose: 50, fructose: 50 }).tgPrimeC!;
    expect(withFructose).toBeLessThan(sucroseOnly);
  });

  test('no glass-forming solutes → null + flag', () => {
    const r = estimateTgPrime({ water: 100, fat: 30 });
    expect(r.tgPrimeC).toBeNull();
    expect(r.flags.some((f) => f.kind === 'no_glass_forming_solutes')).toBe(true);
  });
});
