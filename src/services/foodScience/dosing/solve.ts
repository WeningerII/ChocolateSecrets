/**
 * Dosing solver — the optimizer run backward for a single addition.
 *
 * The formulation optimizer searches a whole recipe; this answers the everyday
 * question instead: "I'm adding ONE thing — how much?" Fix the recipe, pick an
 * ingredient to add, and sweep the dose to find the amount that best meets a
 * flavor goal (maximize the palatability balance, or bring a chosen taste to a
 * target). Because the sweep is cheap it returns the whole dose→effect CURVE,
 * which is what makes the answer explainable rather than a black-box number.
 *
 * It reuses the same perception path the recipe pages and the optimizer use, so a
 * dose recommended here scores identically there: at each trial dose it appends a
 * synthetic leaf, re-aggregates composition, re-solves pH + titratable acidity,
 * and recomputes taste → palatability.
 *
 * HONEST LIMIT: this optimizes the MEASURABLE axes (taste balance, acidity). An
 * aroma-dominant addition — zest, an extract, a spice — is being dosed for its
 * acid/taste contribution only; its actual point (aroma) is not modeled, so the
 * number is a structural floor, not a flavor-harmony verdict. Such additions are
 * flagged so the recommendation is never oversold.
 */
import type { Composition, UniversalRole } from '../../../types';
import type { ResolvedIngredient } from '../universal';
import { aggregateComposition, calculateMixedPH, computeTitratableAcidity } from '../universal';
import { computeTasteProfile, computePalatability } from '../perception';

export type TunableTaste = 'sweet' | 'salty' | 'sour' | 'bitter';

export type DosingGoal =
  | { kind: 'maximize_palatability' }
  | { kind: 'target_taste'; quality: TunableTaste; target: number };

/** The ingredient being added (its resolved composition + how it behaves). */
export interface DosingAddition {
  name: string;
  composition: Composition;
  role?: UniversalRole;
  /** Buffer reference so the pH / titratable-acidity solver sees its acid. */
  bufferRef?: string;
}

export interface DosingOptions {
  /** Largest dose to consider (g). Default: 30 % of the base mass. */
  maxDoseG?: number;
  /** Number of dose steps across the range. Default 60. */
  steps?: number;
}

export interface DosingPoint {
  doseG: number;
  palatability: number;                 // balance 0–100
  taste: Record<TunableTaste, number>;  // perceived intensities 0–100
  /** The quantity being optimized (higher = better). */
  objective: number;
}

export type DosingFlag =
  | { kind: 'aroma_dominant_addition' }  // dosed for measurable taste only; aroma unmodeled
  | { kind: 'no_measurable_effect' }     // moving the dose barely changes the goal
  | { kind: 'optimum_at_zero' }          // best for the goal is to add nothing
  | { kind: 'optimum_at_max' };          // wants more than the search range allows

export interface DosingResult {
  /** Recommended amount to add (g) — the smallest dose that meets the goal best. */
  recommendedDoseG: number;
  /** State at the recommended dose. */
  achieved: DosingPoint;
  /** State at zero addition, for "before vs after". */
  baseline: DosingPoint;
  /** Full dose→effect curve (for a chart / explanation). */
  curve: DosingPoint[];
  /** Smallest dose at which a taste turns overpowering (>85), or null. */
  flavorCeilingG: number | null;
  flags: DosingFlag[];
}

/** A taste this loud reads as "too much of it" (matches the diagnostics threshold). */
const OVER_INTENSE = 85;
/** Below this objective spread across the whole sweep, the dose barely matters. */
const NEGLIGIBLE_SPREAD = 0.5;

function tasteValue(v: number | null | undefined): number {
  return v == null ? 0 : v;
}

/** Evaluate taste + palatability for the base leaves plus `doseG` of the addition. */
function evaluate(
  baseLeaves: ReadonlyArray<ResolvedIngredient>,
  addition: DosingAddition,
  doseG: number,
  goal: DosingGoal,
): DosingPoint {
  const leaves: ResolvedIngredient[] = doseG > 0
    ? [...baseLeaves, {
        ingredientId: '__dosing_addition__',
        name: addition.name,
        mass: doseG,
        composition: addition.composition,
        compositionSource: 'explicit',
        role: addition.role,
        bufferRef: addition.bufferRef,
      }]
    : [...baseLeaves];

  const mix = aggregateComposition(leaves);
  const ph = calculateMixedPH(leaves);
  const ta = computeTitratableAcidity(leaves);
  const taste = computeTasteProfile(mix, ph?.pH ?? null, { titratableAcidityEqPerL: ta?.eqPerLitre });
  const palatability = computePalatability(taste);

  const t: Record<TunableTaste, number> = {
    sweet: tasteValue(taste.sweet),
    salty: tasteValue(taste.salty),
    sour: tasteValue(taste.sour),
    bitter: tasteValue(taste.bitter),
  };

  const objective = goal.kind === 'maximize_palatability'
    ? palatability.balance
    : -Math.abs(t[goal.quality] - goal.target);   // closer to target ⇒ higher

  return { doseG, palatability: palatability.balance, taste: t, objective };
}

/**
 * Solve for how much of `addition` to add to `baseLeaves` to best meet `goal`.
 * `baseLeaves` are the recipe's resolved leaves (grams + composition + role).
 */
export function solveDose(
  baseLeaves: ReadonlyArray<ResolvedIngredient>,
  addition: DosingAddition,
  goal: DosingGoal,
  options: DosingOptions = {},
): DosingResult {
  const baseMass = baseLeaves.reduce((s, l) => s + (l.mass > 0 ? l.mass : 0), 0);
  const maxDoseG = options.maxDoseG ?? Math.max(1, baseMass * 0.3);
  const steps = Math.max(1, options.steps ?? 60);
  const stepG = maxDoseG / steps;

  const curve: DosingPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    curve.push(evaluate(baseLeaves, addition, i * stepG, goal));
  }

  const baseline = curve[0];

  // Best objective; on ties prefer the smaller dose (less is more).
  let best = curve[0];
  for (const p of curve) {
    if (p.objective > best.objective + 1e-9) best = p;
  }

  // Smallest dose at which any taste becomes overpowering.
  let flavorCeilingG: number | null = null;
  for (const p of curve) {
    if (p.doseG > 0 && Math.max(p.taste.sweet, p.taste.salty, p.taste.sour, p.taste.bitter) > OVER_INTENSE) {
      flavorCeilingG = p.doseG;
      break;
    }
  }

  const objectives = curve.map(p => p.objective);
  const spread = Math.max(...objectives) - Math.min(...objectives);

  const flags: DosingFlag[] = [];
  if (addition.role === 'flavor') flags.push({ kind: 'aroma_dominant_addition' });
  if (spread < NEGLIGIBLE_SPREAD) flags.push({ kind: 'no_measurable_effect' });
  if (best.doseG <= stepG / 2) flags.push({ kind: 'optimum_at_zero' });
  else if (best.doseG >= maxDoseG - stepG / 2) flags.push({ kind: 'optimum_at_max' });

  return { recommendedDoseG: best.doseG, achieved: best, baseline, curve, flavorCeilingG, flags };
}
