import { describe, test, expect } from 'vitest';
import { computeChemesthesis, chemesthesisFromComposition } from './chemesthesis';

describe('chemesthesis', () => {
  test('no agonists → every channel zero, flagged', () => {
    const r = computeChemesthesis();
    expect(r.pungency.intensity).toBe(0);
    expect(r.pungency.scovilleSHU).toBe(0);
    expect(r.pungency.band).toBe('none');
    expect(r.cooling.intensity).toBe(0);
    expect(r.carbonation.intensity).toBe(0);
    expect(r.flags.some(f => f.kind === 'no_chemesthetic_agonists')).toBe(true);
  });

  test('pungency uses the Scoville anchor (16 SHU per ppm capsaicin)', () => {
    const r = computeChemesthesis({ capsaicinoidsPpm: 1000 }); // → 16,000 SHU
    expect(r.pungency.scovilleSHU).toBe(16000);
    expect(r.pungency.band).toBe('medium'); // 2.5k–25k
    expect(r.pungency.receptor).toBe('TRPV1');
    expect(r.pungency.intensity).toBeGreaterThan(0);
    expect(r.pungency.intensity).toBeLessThan(100);
  });

  test('more capsaicin → more heat, and the Scoville band climbs', () => {
    const jalapeno = computeChemesthesis({ capsaicinoidsPpm: 300 });    // ~4,800 SHU
    const habanero = computeChemesthesis({ capsaicinoidsPpm: 20000 });  // ~320,000 SHU
    expect(habanero.pungency.intensity).toBeGreaterThan(jalapeno.pungency.intensity);
    expect(jalapeno.pungency.band).toBe('medium');
    expect(habanero.pungency.band).toBe('very_hot');
  });

  test('piperine and gingerol are far weaker than capsaicin per ppm', () => {
    const cap = computeChemesthesis({ capsaicinoidsPpm: 1000 }).pungency.scovilleSHU;
    const pip = computeChemesthesis({ piperinePpm: 1000 }).pungency.scovilleSHU;
    const gin = computeChemesthesis({ gingerolPpm: 1000 }).pungency.scovilleSHU;
    expect(pip).toBeLessThan(cap);
    expect(gin).toBeLessThan(pip);
    expect(pip).toBe(Math.round(1000 * 0.00625 * 16)); // 100 SHU
  });

  test('nasal pungency (TRPA1) is a channel distinct from capsaicin burn', () => {
    const wasabi = computeChemesthesis({ allylIsothiocyanatePpm: 200 });
    expect(wasabi.nasalPungency.intensity).toBeGreaterThan(50);
    expect(wasabi.nasalPungency.receptor).toBe('TRPA1');
    expect(wasabi.pungency.intensity).toBe(0); // no capsaicinoids → no TRPV1 burn
  });

  test('cooling from menthol (TRPM8) hits the half-max at its K', () => {
    const r = computeChemesthesis({ mentholPpm: 100 });
    expect(r.cooling.intensity).toBeCloseTo(50, 0);
    expect(r.cooling.receptor).toBe('TRPM8');
  });

  test('astringency rises with tannin load', () => {
    const light = computeChemesthesis({ tanninsGPerL: 0.5 });
    const heavy = computeChemesthesis({ tanninsGPerL: 4 });
    expect(heavy.astringency.intensity).toBeGreaterThan(light.astringency.intensity);
    expect(heavy.astringency.receptor).toBe('mechano-chemical');
  });

  test('carbonation converts CO₂ to volumes (1 vol ≈ 1.96 g/L) and bands', () => {
    const soda = computeChemesthesis({ co2GPerL: 6.86 }); // ~3.5 volumes
    expect(soda.carbonation.volumes).toBeCloseTo(3.5, 1);
    expect(soda.carbonation.band).toBe('sparkling');
    expect(computeChemesthesis({ co2GPerL: 11.76 }).carbonation.band).toBe('highly_sparkling');
    expect(computeChemesthesis({ co2GPerL: 0.5 }).carbonation.band).toBe('still');
  });

  test('tingle / paresthesia from sanshool (KCNK)', () => {
    const r = computeChemesthesis({ sanshoolPpm: 300 });
    expect(r.tingle.intensity).toBeGreaterThan(0);
    expect(r.tingle.receptor).toBe('KCNK');
  });

  test('intensities stay within 0–100 even at extreme doses', () => {
    const r = computeChemesthesis({ capsaicinoidsPpm: 1e6, mentholPpm: 1e6, tanninsGPerL: 1e3, co2GPerL: 1e3, sanshoolPpm: 1e6, allylIsothiocyanatePpm: 1e6 });
    for (const ch of [r.pungency, r.nasalPungency, r.cooling, r.astringency, r.carbonation, r.tingle]) {
      expect(ch.intensity).toBeLessThanOrEqual(100);
      expect(ch.intensity).toBeGreaterThanOrEqual(0);
    }
    expect(r.pungency.band).toBe('extreme');
  });

  test('a real blend (ginger beer: gingerol + CO₂) lights two channels, not cooling', () => {
    const gingerBeer = computeChemesthesis({ gingerolPpm: 4000, co2GPerL: 5 });
    expect(gingerBeer.pungency.intensity).toBeGreaterThan(0);
    expect(gingerBeer.carbonation.intensity).toBeGreaterThan(0);
    expect(gingerBeer.cooling.intensity).toBe(0);
    expect(gingerBeer.flags).toHaveLength(0);
  });
});

describe('chemesthesisFromComposition (composition-driven)', () => {
  test('an inert composition fires no chemesthetic channel', () => {
    const r = chemesthesisFromComposition({ water: 80, sucrose: 20 });
    expect(r.pungency.intensity).toBe(0);
    expect(r.cooling.intensity).toBe(0);
    expect(r.flags.some(f => f.kind === 'no_chemesthetic_agonists')).toBe(true);
  });

  test('capsaicinoids in composition (mass %) bridge to ppm → Scoville', () => {
    // 0.05 mass % = 500 ppm → ~8 000 SHU (a hot chili), pungency only.
    const r = chemesthesisFromComposition({ water: 95, capsaicinoids: 0.05 });
    expect(r.pungency.scovilleSHU).toBeCloseTo(0.05 * 10_000 * 16, 0); // 8000 SHU
    expect(r.pungency.intensity).toBeGreaterThan(0);
    expect(r.cooling.intensity).toBe(0);
  });

  test('tannins/CO₂ use the g·L⁻¹ bridge; menthol cools', () => {
    const wine = chemesthesisFromComposition({ water: 88, ethanol: 12, tannins: 0.15 }); // 1.5 g/L
    expect(wine.astringency.intensity).toBeCloseTo(50, 0); // K = 1.5 g/L → mid-scale
    const soda = chemesthesisFromComposition({ water: 99, dissolvedCO2: 0.5 }); // 5 g/L
    expect(soda.carbonation.volumes).toBeCloseTo(5 / 1.96, 1);
    const mint = chemesthesisFromComposition({ water: 99, menthol: 0.01 }); // 100 ppm
    expect(mint.cooling.intensity).toBeCloseTo(50, 0);
  });
});
