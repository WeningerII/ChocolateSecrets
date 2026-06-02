import type { ResolvedIngredient } from '../universal';
import type { EthanolAssessment } from './types';

/**
 * USDA Table 18 / Augustin et al. 1992: ethanol retention in confectionery
 * (no-heat fold) ≈ 90%. We hardcode the constant here; the universal kernel
 * already applies it inside Norrish (composition.ts), but for the warnings
 * layer we need the post-retention mass percentage explicitly.
 */
export const ETHANOL_RETENTION = 0.90;

/**
 * Wybauw long-shelf bonbon literature: ethanol-by-final-mass in the 4–6% range
 * lifts shelf life materially without organoleptic dominance. Below 4% the
 * microbial bonus is small; above 6% the alcohol becomes audible on the palate
 * (and exceeds many municipal alcohol-percentage labeling thresholds for
 * "non-alcoholic confection").
 */
export const LONG_SHELF_ETHANOL_BAND: [number, number] = [4, 6];

export function assessEthanol(resolved: ResolvedIngredient[]): EthanolAssessment {
  const totalMass = resolved.reduce((s, r) => s + r.mass, 0);
  if (totalMass === 0) {
    return { abv: null, retentionApplied: ETHANOL_RETENTION, postRetentionMassPct: 0, inLongShelfBand: false };
  }

  // Ethanol from alcoholSpec-tagged ingredients: ABV (vol%) × density 0.789 ≈ mass%
  // For composition-based ethanol (e.g., extracts with explicit ethanol composition),
  // the kernel already accounts for it via the composition field — we read both.
  const ALCOHOL_DENSITY = 0.789; // g/mL for pure ethanol at 20°C

  // We want the mass% of ethanol after 10% volatility loss.
  let ethanolMass = 0;
  for (const r of resolved) {
    // Composition-declared ethanol (e.g., vanilla extract at ~40% ethanol)
    if (r.composition.ethanol) {
      ethanolMass += (r.composition.ethanol / 100) * r.mass;
    }
    // alcoholSpec-derived ethanol — only counts when the ingredient does NOT
    // already carry a composition.ethanol (avoid double-counting).
    if (r.alcoholAbv != null && (!r.composition.ethanol || r.composition.ethanol === 0)) {
      // ABV is volume percent; assume the alcohol ingredient density ≈ 1.0 for water-based
      // spirits/liqueurs. ABV × 0.789 / 1.0 ≈ mass% ethanol.
      const massFraction = (r.alcoholAbv / 100) * ALCOHOL_DENSITY;
      ethanolMass += massFraction * r.mass;
    }
  }

  const postRetention = (ethanolMass * ETHANOL_RETENTION) / totalMass * 100;
  // ABV-equivalent of the final recipe (for display). Reverse the mass→volume
  // approximation: post-retention mass% ÷ 0.789 ≈ volume%.
  const finalAbv = postRetention / ALCOHOL_DENSITY;

  return {
    abv: ethanolMass > 0 ? finalAbv : null,
    retentionApplied: ETHANOL_RETENTION,
    postRetentionMassPct: postRetention,
    inLongShelfBand: postRetention >= LONG_SHELF_ETHANOL_BAND[0] && postRetention <= LONG_SHELF_ETHANOL_BAND[1],
  };
}
