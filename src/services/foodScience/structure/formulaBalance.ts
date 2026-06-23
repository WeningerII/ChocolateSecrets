/**
 * Formula balance — "will this recipe come out dense / tough / greasy / sunken?"
 *
 * A cake batter is a tug-of-war between ingredients that BUILD structure
 * (tougheners: flour, eggs) and ingredients that WEAKEN it (tenderizers: sugar,
 * fat). When the tug-of-war is balanced the crumb is tender but stands up; when
 * it is lopsided the crumb fails in a predictable DIRECTION. Pastry science gives
 * documented weight-ratio rules for the balance — so a recipe typed straight out
 * of an arbitrary cookbook can be screened for a structural fault before it is
 * ever mixed.
 *
 * The classic high-ratio cake balancing rules (Figoni, "How Baking Works"):
 *   1. sugar ≥ flour      — the defining "high ratio"; too little sugar reads lean
 *                           and bread-like (dense, tough), far too much can't set.
 *   2. liquid ≥ sugar     — enough liquid to dissolve the sugar and hydrate the
 *                           flour ("liquid" includes eggs, which are ~75 % water);
 *                           too little gives a dry, tight, dense crumb.
 *   3. eggs ≥ fat         — egg protein carries the structure that fat tenderizes;
 *                           when fat outweighs it the crumb is greasy / over-tender
 *                           and can collapse.
 * plus a softer richness band (fat ≈ 0.3–0.6 × flour for butter cakes).
 *
 * Inputs are the resolved leaves' UniversalRole + mass — the functional class is
 * exactly what the rules are stated in. This is a CALIBRATED heuristic screen
 * (documented windows, directional prediction), not a crumb simulation: it flags
 * "this ratio predicts a denser crumb," not a measured specific volume.
 *
 * Scope: applies to a sweetened, fat-enriched flour batter (cake / quick-bread
 * shape). Eggless or gum-structured formulations rely on structure this model
 * does not see, so their faults are advisory. Faults carry stable `kind` codes;
 * the UI owns the wording.
 *
 * Source: Figoni, P. "How Baking Works", 3rd ed. — cake formula balancing.
 */
import type { UniversalRole } from '../../../types';

/** High-ratio cake balance windows (Figoni). Weight ratios. */
const SUGAR_FLOUR_MIN = 1.0;   // sugar ≥ flour (high-ratio rule)
const SUGAR_FLOUR_MAX = 1.6;   // far above and the batter is over-tender / sinks
const LIQUID_SUGAR_MIN = 1.0;  // total liquid (incl. eggs) ≥ sugar
const PROTEIN_FAT_MIN = 1.0;   // structural protein (eggs) ≥ fat
const FAT_FLOUR_MAX = 0.7;     // butter cakes typically 0.3–0.6 × flour

export type FormulaFaultKind =
  | 'sugar_below_flour'   // lean → denser, tougher, bread-like crumb
  | 'sugar_excess'        // over-tender; weak set, may sink / sugary crust
  | 'low_liquid'          // dry, tight, dense crumb; sugar may not dissolve
  | 'fat_exceeds_protein' // greasy / over-tender; structure can't hold, collapse risk
  | 'high_fat';           // very rich; tender to the point of fragile

export type FormulaFaultSeverity = 'info' | 'warn' | 'high';

export interface FormulaFault {
  kind: FormulaFaultKind;
  severity: FormulaFaultSeverity;
  /** The offending ratio's actual value. */
  ratio: number;
  /** The documented threshold it crosses (for an "X vs Y" readout). */
  threshold: number;
}

export type FormulaBalanceFlag =
  | { kind: 'not_cake_like' }                              // outside the model's scope
  | { kind: 'roles_incomplete'; taggedMassFraction: number }; // low role coverage → low confidence

export interface FormulaBalanceMasses {
  flour: number; sugar: number; fat: number; protein: number; liquid: number;
}

export interface FormulaBalanceRatios {
  sugarToFlour: number; liquidToSugar: number; proteinToFat: number; fatToFlour: number;
}

export interface FormulaBalanceResult {
  /** True only for a sweetened, fat-enriched flour batter (the model's scope). */
  applicable: boolean;
  /** Functional masses (grams) summed by role. */
  masses: FormulaBalanceMasses;
  ratios: FormulaBalanceRatios;
  faults: FormulaFault[];
  flags: FormulaBalanceFlag[];
}

/**
 * Screen a resolved recipe's role/mass ratios against the documented cake-balance
 * windows. Pass the fully-resolved leaves (cake + frosting together is fine — the
 * rules are about the whole sweetened batter).
 */
export function computeFormulaBalance(
  resolved: ReadonlyArray<{ mass: number; role?: UniversalRole }>,
): FormulaBalanceResult {
  let flour = 0, sugar = 0, fat = 0, protein = 0, addedLiquid = 0;
  let totalMass = 0, taggedMass = 0;

  for (const r of resolved) {
    if (r.mass <= 0) continue;
    totalMass += r.mass;
    if (r.role) taggedMass += r.mass;
    switch (r.role) {
      case 'flour_starch': flour += r.mass; break;
      case 'sweetener':    sugar += r.mass; break;
      case 'fat':          fat += r.mass; break;
      case 'protein':      protein += r.mass; break;  // eggs/dairy protein — the structural term
      case 'liquid':
      case 'water':        addedLiquid += r.mass; break;
    }
  }

  // Baker's "liquid" counts eggs: they are ~75 % water and behave as liquid in the
  // balance. (Valid while protein-role is eggs/dairy, the cake case.)
  const liquid = addedLiquid + protein;

  const masses: FormulaBalanceMasses = { flour, sugar, fat, protein, liquid };
  const ratios: FormulaBalanceRatios = {
    sugarToFlour: flour > 0 ? sugar / flour : 0,
    liquidToSugar: sugar > 0 ? liquid / sugar : 0,
    proteinToFat: fat > 0 ? protein / fat : Infinity,
    fatToFlour: flour > 0 ? fat / flour : 0,
  };

  const flags: FormulaBalanceFlag[] = [];

  // Scope gate: a sweetened, fat-enriched flour batter. Anything else (a frosting
  // with no flour, a syrup, a lean dough) is out of this model's documented range.
  if (!(flour > 0 && sugar > 0 && fat > 0)) {
    flags.push({ kind: 'not_cake_like' });
    return { applicable: false, masses, ratios, faults: [], flags };
  }

  // Low role coverage → the screen is partly guessing; surface reduced confidence.
  if (totalMass > 0 && taggedMass / totalMass < 0.6) {
    flags.push({ kind: 'roles_incomplete', taggedMassFraction: taggedMass / totalMass });
  }

  const faults: FormulaFault[] = [];

  // 1. Sugar vs flour (high-ratio rule).
  if (ratios.sugarToFlour < SUGAR_FLOUR_MIN) {
    faults.push({ kind: 'sugar_below_flour', severity: 'warn', ratio: ratios.sugarToFlour, threshold: SUGAR_FLOUR_MIN });
  } else if (ratios.sugarToFlour > SUGAR_FLOUR_MAX) {
    faults.push({ kind: 'sugar_excess', severity: 'warn', ratio: ratios.sugarToFlour, threshold: SUGAR_FLOUR_MAX });
  }

  // 2. Liquid vs sugar.
  if (ratios.liquidToSugar < LIQUID_SUGAR_MIN) {
    faults.push({ kind: 'low_liquid', severity: 'warn', ratio: ratios.liquidToSugar, threshold: LIQUID_SUGAR_MIN });
  }

  // 3. Structural protein (eggs) vs fat.
  if (ratios.proteinToFat < PROTEIN_FAT_MIN) {
    faults.push({ kind: 'fat_exceeds_protein', severity: 'high', ratio: ratios.proteinToFat, threshold: PROTEIN_FAT_MIN });
  }

  // 4. Richness band (softer; advisory).
  if (ratios.fatToFlour > FAT_FLOUR_MAX) {
    faults.push({ kind: 'high_fat', severity: 'info', ratio: ratios.fatToFlour, threshold: FAT_FLOUR_MAX });
  }

  return { applicable: true, masses, ratios, faults, flags };
}
