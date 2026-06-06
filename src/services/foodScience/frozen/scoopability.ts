import type { ScoopabilityLevel } from './types';
/**
 * Hardening-factor heuristic. Operational rule from artisan gelato literature
 * (Frisinghelli et al. 2010; Liébana 2018). Combines total solids, fat, and
 * MSNF (which all stiffen the matrix at cabinet temperature) with PAC (which
 * keeps water unfrozen). Higher values = harder product at cabinet temp.
 *
 * The 30/PAC term is empirical: a PAC of 30 is the gelato sweet-spot, so we
 * normalize against it. Below 30 the system over-freezes (firmer); above 30
 * it under-freezes (softer).
 */
export function calculateHardeningFactor(
  totalSolidsPct: number,
  fatPct: number,
  msnfPct: number,
  pac: number
): number {
  if (pac <= 0) return 999;       // pathological — flag as brick
  return (totalSolidsPct * 0.4 + fatPct * 0.8 + msnfPct * 0.8) * (30 / pac);
}

/**
 * Scoopability index = pac − hardening × 0.6. Positive = softer, negative = harder.
 * Mapping calibrated to the brick/firm/standard/soft/too_soft scale.
 *
 * Boundaries:
 *   index < -10  → brick
 *   -10 to -2    → firm
 *   -2 to 5      → standard (the operational sweet spot)
 *   5 to 12      → soft
 *   > 12         → too_soft
 */
export function classifyScoopability(pac: number, hardeningFactor: number): ScoopabilityLevel {
  const idx = pac - hardeningFactor * 0.6;
  if (idx < -10) return 'brick';
  if (idx < -2)  return 'firm';
  if (idx < 5)   return 'standard';
  if (idx < 12)  return 'soft';
  return 'too_soft';
}

/**
 * Physics-based scoopability from ice-phase volume. Eating hardness tracks the
 * fraction of water frozen at serving temperature (computeFreezing); this maps
 * that fraction onto the same brick/firm/standard/soft/too_soft scale against a
 * per-subtype target band (TARGET_FROZEN_WATER_PCT_BY_SUBTYPE). Runs in parallel
 * to the hardening-factor heuristic; the target bands are provisional and should
 * be calibrated against known-good recipes before the heuristic is retired.
 */
export function classifyFrozenWaterScoopability(
  frozenWaterPct: number,
  target: [number, number]
): ScoopabilityLevel {
  const [lo, hi] = target;
  if (frozenWaterPct > hi + 10) return 'brick';
  if (frozenWaterPct > hi)      return 'firm';
  if (frozenWaterPct >= lo)     return 'standard';
  if (frozenWaterPct >= lo - 10) return 'soft';
  return 'too_soft';
}
