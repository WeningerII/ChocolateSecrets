import { describe, it, expect } from 'vitest';
import { PAC_FACTORS } from './constants';
import { MOLECULAR_WEIGHTS } from '../universal/norrish';

// Cross-validated against Wolfram (van 't Hoff colligative baseline): for equal
// mass, freezing-point depression scales as 1/MW, so each sugar's PAC factor
// (anti-freezing power, sucrose = 100) must equal 100 * MW_sucrose / MW_solute.
//   glucose: 100 * 342.30 / 180.16 = 190.0  ✓ matches PAC_FACTORS.glucose
// This guards the sugar factors against silent drift. The polyols/alcohol
// (sorbitol, glycerol, ethanol) are deliberately excluded: those are empirical
// values that legitimately deviate from the ideal colligative baseline.
describe('PAC sugar factors follow the colligative MW ratio', () => {
  const SUGARS = ['sucrose', 'glucose', 'fructose', 'lactose', 'maltose'] as const;
  const mwSucrose = MOLECULAR_WEIGHTS.sucrose;

  it.each(SUGARS)('%s PAC factor equals round(100 * MW_sucrose / MW)', (sp) => {
    const predicted = Math.round((100 * mwSucrose) / MOLECULAR_WEIGHTS[sp]);
    expect(PAC_FACTORS[sp]).toBe(predicted);
  });
});
