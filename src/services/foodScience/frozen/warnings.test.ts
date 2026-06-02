import { describe, test, expect } from 'vitest';
import { deriveFrozenWarnings } from './warnings';

describe('frozen warnings', () => {
  const dummyComp = {
    totalSolidsPct: 35,
    fatPct: 8,
    msnfPct: 11,
    totalSugarsPct: 18,
    lactosePct: 0,
    pac: 29,
    pod: 20,
    lactoseInWaterPct: 0,
  };

  test('Gelato anchor in band', () => {
    const warnings = deriveFrozenWarnings({
      subtype: 'gelato',
      comp: dummyComp,
      hardeningFactor: 50,
      scoopability: 'standard',
      hasMilkPowder: true,
    });
    expect(warnings).toEqual([]);
  });

  test('Sorbet with msnf=2', () => {
    const warnings = deriveFrozenWarnings({
      subtype: 'sorbet',
      comp: { ...dummyComp, msnfPct: 2 },
      hardeningFactor: 50,
      scoopability: 'standard',
      hasMilkPowder: false,
    });
    expect(warnings.find(w => w.kind === 'sorbet_dairy_present')).toBeDefined();
  });

  test('Gelato with no milk powder', () => {
    const warnings = deriveFrozenWarnings({
      subtype: 'gelato',
      comp: dummyComp,
      hardeningFactor: 50,
      scoopability: 'standard',
      hasMilkPowder: false,
    });
    expect(warnings.find(w => w.kind === 'gelato_no_milk_powder')).toBeDefined();
  });

  test('Lactose-in-water = 12%', () => {
    const warnings = deriveFrozenWarnings({
      subtype: 'gelato',
      comp: { ...dummyComp, lactoseInWaterPct: 12 },
      hardeningFactor: 50,
      scoopability: 'standard',
      hasMilkPowder: true,
    });
    expect(warnings.find(w => w.kind === 'sandiness_risk')).toBeDefined();
  });

  test('Hardening + low PAC producing brick', () => {
    const warnings = deriveFrozenWarnings({
      subtype: 'gelato',
      comp: { ...dummyComp, pac: 15 },
      hardeningFactor: 100,
      scoopability: 'brick',
      hasMilkPowder: true,
    });
    expect(warnings.find(w => w.kind === 'scoopability_brick')).toBeDefined();
  });
});
