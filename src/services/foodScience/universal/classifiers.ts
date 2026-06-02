import type { AwBand, FatRegime } from './types';

export function classifyAwBand(aw: number): AwBand {
  if (aw > 0.92) return { key: 'very-fragile', labelKey: 'chemistry:bands.aw.very-fragile', shelfLifeWeeksRange: [1, 2] };
  if (aw > 0.85) return { key: 'fragile', labelKey: 'chemistry:bands.aw.fragile', shelfLifeWeeksRange: [3, 4] };
  if (aw > 0.78) return { key: 'stabilized', labelKey: 'chemistry:bands.aw.stabilized', shelfLifeWeeksRange: [6, 8] };
  if (aw > 0.70) return { key: 'shelf-stable', labelKey: 'chemistry:bands.aw.shelf-stable', shelfLifeWeeksRange: [16, 26] };
  return { key: 'functionally-stable', labelKey: 'chemistry:bands.aw.functionally-stable', shelfLifeWeeksRange: [52, 999] };
}

/**
 * Fat-regime classifier. Universal because emulsion physics applies to mayo,
 * hollandaise, vinaigrettes, ganaches, fillings — anything with fat and water.
 */
export function classifyFatRegime(fatPct: number): FatRegime {
  if (fatPct > 38) return { key: 'firm-set', labelKey: 'chemistry:bands.fatRegime.firm-set' };
  if (fatPct >= 25) return { key: 'standard', labelKey: 'chemistry:bands.fatRegime.standard' };
  if (fatPct >= 22) return { key: 'inversion-approaching', labelKey: 'chemistry:bands.fatRegime.inversion-approaching' };
  return { key: 'oil-in-water', labelKey: 'chemistry:bands.fatRegime.oil-in-water' };
}
