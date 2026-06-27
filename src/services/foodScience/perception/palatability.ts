/**
 * Palatability — population-level sensory balance, the OPTIMIZABLE proxy for
 * liking. This is the dimension an optimizer targets ("make this ratio taste
 * better"); it is deliberately NOT a prediction of any individual's hedonic
 * liking, which carries irreducible personal/cultural/contextual variance (the
 * wall). Only the population-level structure is modeled here:
 *
 *   - each taste has an inverted-U acceptability (a "bliss point" — Moskowitz):
 *     too little is bland, too much is cloying/harsh;
 *   - aversive tastes (sour, bitter) are tolerated only when balanced by
 *     sweetness — an unbalanced dominant aversive is penalized;
 *   - a balanced multi-taste profile reads richer than a one-note one.
 *
 * Returns a 0–100 balance score. The bliss points and weights are TUNABLE
 * anchors (documented, not panel-fit) — the heuristic is meant to be iterated on,
 * and to become the objective the recipe optimizer maximizes.
 *
 * Sources: Moskowitz bliss-point / inverted-U acceptability; sensory-balance
 * heuristics (sweet–sour, salt–umami complementarity).
 */
import type { TasteProfile } from './taste';

/** Preferred intensity (peak) and tolerance width per taste, on the 0–100 scale. */
const BLISS = {
  sweet: { peak: 55, width: 35 },
  salty: { peak: 40, width: 28 },
  sour: { peak: 18, width: 22 },
  bitter: { peak: 12, width: 20 },
  umami: { peak: 55, width: 25 },
} as const;

type BlissTaste = keyof typeof BLISS;

/** Below this intensity a taste is not a "player" in the balance. */
const NOTABLE_INTENSITY = 8;

export type PalatabilityFlag =
  | { kind: 'flat_profile' }
  | { kind: 'dominant_aversive'; taste: 'sour' | 'bitter' };

export interface PalatabilityResult {
  /** Population-level sensory balance, 0–100 (the optimization target). */
  balance: number;
  /** Per-taste acceptability (0–1) for the present tastes — for explanation. */
  acceptability: Partial<Record<BlissTaste, number>>;
  flags: PalatabilityFlag[];
}

const clamp = (x: number): number => Math.max(0, Math.min(100, x));

/** Inverted-U acceptability: 1 at the bliss point, falling off both ways. */
function invertedU(intensity: number, peak: number, width: number): number {
  const z = (intensity - peak) / width;
  return Math.exp(-0.5 * z * z);
}

export function computePalatability(taste: TasteProfile): PalatabilityResult {
  const flags: PalatabilityFlag[] = [];
  const acceptability: Partial<Record<BlissTaste, number>> = {};
  const notable: BlissTaste[] = [];

  for (const q of Object.keys(BLISS) as BlissTaste[]) {
    const v = taste[q];
    if (v === null || v === undefined) continue;
    acceptability[q] = invertedU(v, BLISS[q].peak, BLISS[q].width);
    if (v > NOTABLE_INTENSITY) notable.push(q);
  }

  if (notable.length === 0) {
    flags.push({ kind: 'flat_profile' });
    return { balance: 0, acceptability, flags };
  }

  // Base = mean acceptability of the tastes actually in play.
  let score = (notable.reduce((s, q) => s + (acceptability[q] ?? 0), 0) / notable.length) * 100;

  if (notable.length <= 1) score *= 0.75;                 // one-note
  else if (notable.length >= 3) score = Math.min(100, score * 1.1); // complexity

  // An unbalanced dominant aversive (high sour/bitter, little sweetness to round it).
  for (const q of ['sour', 'bitter'] as const) {
    const v = taste[q];
    if (v !== null && v !== undefined && v > 60 && (taste.sweet ?? 0) < v - 25) {
      score *= 0.7;
      flags.push({ kind: 'dominant_aversive', taste: q });
    }
  }

  return { balance: clamp(score), acceptability, flags };
}
