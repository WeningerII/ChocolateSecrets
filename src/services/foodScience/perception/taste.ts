/**
 * Taste perception — the receptor-level layer of the deliciousness stack.
 *
 * Basic tastes are not a wall: each has a known receptor and a saturating
 * dose-response (Beidler 1954: R = Rmax·C/(C+K)), and the way tastes interact in
 * a mixture (suppression / enhancement) is well-characterized psychophysics
 * (Keast & Breslin 2003). This maps a composition to PERCEIVED taste intensities
 * (0–100) — the input a palatability/optimization layer ultimately targets.
 *
 * v1 covers the three tastes derivable from the current composition model:
 *   sweet  — sucrose-equivalents from the sugars/polyols (relative sweetness)
 *   salty  — sodium (as NaCl)
 *   sour   — pH proxy (titratable acidity is the better predictor — needs an
 *            acid inventory; flagged)
 * bitter and umami return null until the chemical inventory carries their
 * agonists (caffeine/theobromine/polyphenols; glutamate + 5′-nucleotides).
 *
 * Known simplifications: intensities use product mass % (the aqueous-phase
 * concentration and saliva dilution refine this); interaction coefficients are
 * calibrated to the documented directions, not fit to a panel.
 */
import type { Composition } from '../../../types';

/** Relative sweetness vs sucrose = 1.0 (standard values). */
const RELATIVE_SWEETNESS: Partial<Record<keyof Composition, number>> = {
  sucrose: 1.0, fructose: 1.5, glucose: 0.7, lactose: 0.4, maltose: 0.4, sorbitol: 0.6, glycerol: 0.6,
};

/** Beidler half-maximum stimuli, calibrated so a familiar reference ≈ 50/100. */
const K_SWEET_SEQ_PCT = 10;   // ~10 % sucrose-equivalent is "moderate"
const K_SALT_NACL_PCT = 1.0;  // ~1 % NaCl is "moderate"
/** Sodium → NaCl mass factor (most food sodium is NaCl). */
const SODIUM_TO_NACL = 2.54;
/** pH window for the sourness proxy. */
const SOUR_PH_FLAT = 4.5;     // at/above this, ~no sourness
const SOUR_PH_MAX = 2.5;      // at/below this, maximal sourness

export type TasteQuality = 'sweet' | 'salty' | 'sour' | 'bitter' | 'umami';

export type TasteFlag =
  | { kind: 'no_bitter_inventory' }
  | { kind: 'no_umami_inventory' }
  | { kind: 'sourness_from_ph_proxy' };

export interface TasteProfile {
  /** Perceived intensities 0–100 after mixture interactions; null = no data. */
  sweet: number;
  salty: number;
  sour: number;
  bitter: number | null;
  umami: number | null;
  flags: TasteFlag[];
}

const clamp = (x: number): number => Math.max(0, Math.min(100, x));

/** Saturating receptor response (Beidler). */
function beidler(stimulus: number, halfMax: number): number {
  return stimulus > 0 ? (100 * stimulus) / (stimulus + halfMax) : 0;
}

function sucroseEquivalentPct(c: Composition): number {
  let seq = 0;
  for (const sp of Object.keys(RELATIVE_SWEETNESS) as (keyof Composition)[]) {
    seq += (c[sp] ?? 0) * (RELATIVE_SWEETNESS[sp] ?? 0);
  }
  return seq;
}

function rawSourness(pH: number | null): number {
  if (pH === null) return 0;
  if (pH >= SOUR_PH_FLAT) return 0;
  if (pH <= SOUR_PH_MAX) return 100;
  return (100 * (SOUR_PH_FLAT - pH)) / (SOUR_PH_FLAT - SOUR_PH_MAX);
}

/**
 * Perceived taste profile from composition + pH. Returns pre-interaction stimuli
 * run through the documented mixture interactions.
 */
export function computeTasteProfile(composition: Composition, pH: number | null): TasteProfile {
  const flags: TasteFlag[] = [];

  const sweetRaw = beidler(sucroseEquivalentPct(composition), K_SWEET_SEQ_PCT);
  const saltRaw = beidler((composition.sodium ?? 0) * SODIUM_TO_NACL, K_SALT_NACL_PCT);
  const sourRaw = rawSourness(pH);
  if (pH !== null) flags.push({ kind: 'sourness_from_ph_proxy' });

  // Mixture interactions (Keast & Breslin 2003), scaled by the suppressor's
  // intensity: acids suppress sweetness; sugar suppresses sourness; a little salt
  // lifts sweetness; sourness mildly suppresses saltiness.
  const sweet = clamp(sweetRaw * (1 - 0.4 * (sourRaw / 100)) * (1 + 0.15 * (saltRaw / 100)));
  const sour = clamp(sourRaw * (1 - 0.3 * (sweetRaw / 100)));
  const salty = clamp(saltRaw * (1 - 0.2 * (sourRaw / 100)));

  flags.push({ kind: 'no_bitter_inventory' }, { kind: 'no_umami_inventory' });

  return { sweet, salty, sour, bitter: null, umami: null, flags };
}
