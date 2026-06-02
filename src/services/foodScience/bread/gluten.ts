import type { GlutenAssessment } from './types';
import type { BakersIngredientLine } from './types';
import { FLOUR_PROTEIN_PCT, GLUTEN_BANDS } from './constants';

/**
 * Gluten matrix score = effective protein% × hydration% / 100.
 *
 * Effective protein% is the mass-weighted average across the flour blend.
 * The score ranges roughly 5–13 in normal bread doughs:
 *   - sandwich loaf at 11% protein × 65% hydration / 100 = 7.15 → developing
 *   - country bread at 12.5% × 70% / 100 = 8.75 → developing
 *   - ciabatta at 13% × 80% / 100 = 10.4 → strong
 *   - bagel at 13% × 55% / 100 = 7.15 → developing (low hydration compensates for high protein)
 *   - rye-heavy bread at 9.5% × 75% / 100 = 7.13 → developing (rye protein limits)
 *
 * The score is a heuristic. It doesn't account for fermentation time, mixing
 * intensity, or autolyse. It's a first-pass signal, not a final answer.
 */
export function assessGluten(
  flourLines: BakersIngredientLine[],
  hydrationPct: number
): GlutenAssessment {
  const flourEntries = flourLines.filter(l => l.role === 'flour');
  if (flourEntries.length === 0) {
    return { estimatedProteinPct: 0, rawScore: 0, band: 'weak' };
  }

  const totalFlourMass = flourEntries.reduce((s, l) => s + l.mass, 0);
  let weightedProtein = 0;
  for (const line of flourEntries) {
    const subtype = line.flourSubtype ?? 'specialty_flour';
    const proteinPct = FLOUR_PROTEIN_PCT[subtype] ?? FLOUR_PROTEIN_PCT.specialty_flour;
    weightedProtein += proteinPct * (line.mass / totalFlourMass);
  }

  const rawScore = (weightedProtein * hydrationPct) / 100;
  const matched = GLUTEN_BANDS.find(b => rawScore < b.max);
  return {
    estimatedProteinPct: weightedProtein,
    rawScore,
    band: matched?.band ?? 'over_developed',
  };
}
