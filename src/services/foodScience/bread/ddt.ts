import type { DdtCalculation } from './types';

interface DdtInput {
  desiredDoughTempC: number;
  roomTempC: number;
  flourTempC: number;
  frictionFactorC: number;
  /** When a preferment is present, its temperature contributes to the 4-factor formula. */
  prefermentTempC?: number;
}

/**
 * 3-factor DDT formula (Hamelman, Bread 3e):
 *   Water = DDT*3 − Room − Flour − Friction
 *
 * 4-factor formula (with preferment):
 *   Water = DDT*4 − Room − Flour − Preferment − Friction
 *
 * The friction factor accounts for the heat added during mechanical mixing.
 * Hand kneading: 0. Stand mixer: 8–15 (default 10). Spiral mixer: 20–30 (default 25).
 */
export function calculateDdtWaterTemp(input: DdtInput): DdtCalculation {
  const { desiredDoughTempC, roomTempC, flourTempC, frictionFactorC, prefermentTempC } = input;

  if (prefermentTempC !== undefined) {
    const waterTempC =
      desiredDoughTempC * 4 - roomTempC - flourTempC - prefermentTempC - frictionFactorC;
    return {
      desiredDoughTempC, roomTempC, flourTempC, frictionFactorC,
      waterTempC, formula: '4-factor', prefermentTempC,
    };
  }

  const waterTempC = desiredDoughTempC * 3 - roomTempC - flourTempC - frictionFactorC;
  return {
    desiredDoughTempC, roomTempC, flourTempC, frictionFactorC,
    waterTempC, formula: '3-factor',
  };
}
