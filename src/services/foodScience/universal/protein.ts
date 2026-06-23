/**
 * Protein thermal coagulation / denaturation — the set transitions behind cooked
 * egg, custard, dairy and meat texture. Heating unfolds proteins past an onset
 * temperature; they aggregate into a set network, firm up, and above an upper
 * bound OVER-coagulate (egg curdles and weeps, meat toughens and squeezes out
 * water). The dominant variable is peak temperature — denaturation is fast once
 * the threshold is passed; low-temperature time dependence (sous vide) is future
 * work and pairs naturally with the doneness core-temperature march.
 *
 * Calibrated thresholds per protein class; universal across egg/dairy/meat.
 * Sources: protein denaturation temperatures (McGee, On Food and Cooking;
 * Belitz, Food Chemistry).
 */
export type ProteinType = 'generic' | 'egg_white' | 'egg_yolk' | 'whey' | 'collagen';

interface ProteinProfile {
  /** Denaturation onset, set, firm and over-coagulation temperatures (°C). */
  onset: number;
  set: number;
  firm: number;
  overset: number;
}

const PROTEIN_PROFILES: Record<ProteinType, ProteinProfile> = {
  generic: { onset: 60, set: 70, firm: 78, overset: 90 },
  egg_white: { onset: 62, set: 65, firm: 70, overset: 82 },
  egg_yolk: { onset: 65, set: 70, firm: 75, overset: 85 },
  whey: { onset: 70, set: 78, firm: 85, overset: 95 },
  collagen: { onset: 60, set: 68, firm: 80, overset: 100 },
};

export type ProteinSetBand = 'raw' | 'setting' | 'set' | 'firm' | 'overset';

export interface ProteinSetResult {
  /** Fraction set, 0..1 (linear from onset to firm). */
  setFraction: number;
  band: ProteinSetBand;
  proteinType: ProteinType;
}

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/** Assess protein set from the peak temperature the protein reached. */
export function computeProteinSet(peakTempC: number, proteinType: ProteinType = 'generic'): ProteinSetResult {
  const p = PROTEIN_PROFILES[proteinType];
  const setFraction = clamp01((peakTempC - p.onset) / (p.firm - p.onset));

  let band: ProteinSetBand;
  if (peakTempC < p.onset) band = 'raw';
  else if (peakTempC < p.set) band = 'setting';
  else if (peakTempC < p.firm) band = 'set';
  else if (peakTempC < p.overset) band = 'firm';
  else band = 'overset';

  return { setFraction, band, proteinType };
}
