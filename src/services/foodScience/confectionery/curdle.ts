import type { Ingredient } from '../../../types';
import type { ResolvedIngredient } from '../universal';
import type { CurdleAssessment } from './types';

/**
 * Curdle risk assessment for confectionery emulsions where cream meets acid.
 *
 * Mechanism: casein's isoelectric point is pH 4.6. Below that, casein micelles
 * destabilize; the closer the system gets to 4.6 from above and the higher the
 * cream-to-acid ratio (more casein to destabilize), the higher the curdle risk
 * during the fold step. Higher fold temperatures accelerate aggregation.
 *
 * Returns a level and a recommended fold-temperature ceiling. Caller decides
 * how to surface the recommendation.
 *
 * Calibration:
 *   - Classic raspberry-cream ganache (raspberry puree pH 3.4, cream-heavy):
 *     pH ~3.7 in the mixed system → 'high' risk → ceiling 30°C
 *   - White chocolate passion fruit (puree pH 2.9, balanced cream/sugar):
 *     pH ~3.7 → 'high' risk → ceiling 30°C
 *   - Belgian coffee ganache (cream + 25% coffee liqueur, no fruit acid):
 *     pH ~5.5 → 'none'
 */
export function assessCurdleRisk(
  pH: number | null,
  resolved: ResolvedIngredient[],
  catalog?: Map<string, Ingredient>
): CurdleAssessment {
  const reasons: CurdleAssessment['reasons'] = [];

  // Cream mass = sum of mass for liquid-role ingredients with bufferRef='cream'
  // Or fallback to robust name-based detection using catalog for other at-risk dairy
  const creamMass = resolved.reduce((sum, r) => {
    let isAtRiskDairy = false;
    if (r.role === 'liquid' || r.role === 'fat' || r.role === 'protein') {
      if (r.bufferRef === 'cream') isAtRiskDairy = true;
      else if (catalog) {
        const ing = catalog.get(r.ingredientId);
        if (ing && /\b(cream|crema|mascarpone|ricotta|cream cheese|creme fraiche|crème fraîche|fromage blanc|sour cream)\b/i.test(ing.name)) {
          isAtRiskDairy = true;
        }
      }
    }
    return sum + (isAtRiskDairy ? r.mass : 0);
  }, 0);

  // Acid mass = sum of mass for any ingredient whose bufferRef is in the acidic family
  const acidMass = resolved
    .filter(r => r.bufferRef && /^puree\.|^vinegar\.|^juice\.|honey/.test(r.bufferRef))
    .reduce((sum, r) => sum + r.mass, 0);

  if (creamMass === 0) reasons.push({ kind: 'no_cream_present' });
  if (acidMass === 0) reasons.push({ kind: 'no_acid_present' });

  // No cream OR no acid → no curdle interaction
  if (creamMass === 0 || acidMass === 0) {
    return { level: 'none', reasons, recommendedFoldTempCeilingC: null };
  }

  if (pH === null) {
    return { level: 'none', reasons, recommendedFoldTempCeilingC: null };
  }

  reasons.push({ kind: 'ph_low', pH });
  reasons.push({ kind: 'cream_acid_ratio', creamMass, acidMass });

  // Risk by pH bands. Casein iEP 4.6.
  let level: CurdleAssessment['level'] = 'none';
  let ceiling: number | null = null;

  if (pH < 3.5) {
    level = 'high'; ceiling = 28;
  } else if (pH < 4.0) {
    level = 'high'; ceiling = 30;
  } else if (pH < 4.4) {
    level = 'medium'; ceiling = 32;
  } else if (pH < 4.8) {
    // pH 4.4–4.8 is the sensitized range — boost level if cream is the larger fraction
    const ratio = creamMass / (creamMass + acidMass);
    level = ratio > 0.5 ? 'medium' : 'low';
    ceiling = 35;
  } else if (pH < 5.5) {
    level = 'low'; ceiling = 38;
  } else {
    level = 'none'; ceiling = null;
  }

  return { level, reasons, recommendedFoldTempCeilingC: ceiling };
}
