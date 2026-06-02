import type { BreadWarning, BreadComposition, GlutenAssessment, DdtCalculation } from './types';
import type { BreadRecipeSubtype } from '../../../types';
import { BREAD_BANDS_BY_SUBTYPE, SALT_PCT_OPERATIONAL_RANGE, WATER_TEMP_SAFE_RANGE_C } from './constants';

interface WarningContext {
  subtype: BreadRecipeSubtype;
  comp: BreadComposition;
  gluten: GlutenAssessment;
  ddt: DdtCalculation;
}

export function deriveBreadWarnings(ctx: WarningContext): BreadWarning[] {
  const out: BreadWarning[] = [];
  const band = BREAD_BANDS_BY_SUBTYPE[ctx.subtype];

  // Hydration band
  if (ctx.comp.hydrationPct < band.hydrationPctRange[0]) {
    out.push({
      kind: 'hydration_low',
      hydration: ctx.comp.hydrationPct,
      minHydration: band.hydrationPctRange[0],
      subtype: ctx.subtype,
    });
  } else if (ctx.comp.hydrationPct > band.hydrationPctRange[1]) {
    out.push({
      kind: 'hydration_high',
      hydration: ctx.comp.hydrationPct,
      maxHydration: band.hydrationPctRange[1],
      subtype: ctx.subtype,
    });
  }

  // Salt — band-specific or fall back to operational range
  const saltMin = Math.min(band.saltPctRange[0], SALT_PCT_OPERATIONAL_RANGE[0]);
  const saltMax = Math.max(band.saltPctRange[1], SALT_PCT_OPERATIONAL_RANGE[1]);
  if (ctx.comp.saltPct < saltMin) {
    out.push({ kind: 'salt_low', salt: ctx.comp.saltPct, minSalt: saltMin });
  } else if (ctx.comp.saltPct > saltMax) {
    out.push({ kind: 'salt_high', salt: ctx.comp.saltPct, maxSalt: saltMax });
  }

  // Yeast band (instant-dry equivalent). Sourdough has [0,0] → only flag if
  // someone added instant yeast to a sourdough by accident.
  if (ctx.subtype === 'sourdough') {
    if (ctx.comp.instantYeastEquivalentPct > 0.05) {
      out.push({
        kind: 'yeast_outside_band',
        instantYeastEquivalentPct: ctx.comp.instantYeastEquivalentPct,
        range: [0, 0],
        subtype: ctx.subtype,
      });
    }
    // Sourdough without a starter is suspicious
    if (ctx.comp.starterPct < 5) {
      out.push({ kind: 'sourdough_no_starter', subtype: ctx.subtype });
    }
  } else {
    if (ctx.comp.instantYeastEquivalentPct < band.instantYeastPctRange[0] ||
        ctx.comp.instantYeastEquivalentPct > band.instantYeastPctRange[1]) {
      out.push({
        kind: 'yeast_outside_band',
        instantYeastEquivalentPct: ctx.comp.instantYeastEquivalentPct,
        range: band.instantYeastPctRange,
        subtype: ctx.subtype,
      });
    }
  }

  // Gluten matrix
  if (ctx.gluten.band === 'weak' && ctx.subtype !== 'pizza_dough') {
    // Pizza dough at moderate hydration with bread flour is borderline weak by
    // raw score but works fine with long ferment; suppress the warning there.
    out.push({ kind: 'gluten_weak', rawScore: ctx.gluten.rawScore });
  } else if (ctx.gluten.band === 'over_developed') {
    out.push({ kind: 'gluten_over_developed', rawScore: ctx.gluten.rawScore });
  }

  // Water temperature safety
  if (ctx.ddt.waterTempC > WATER_TEMP_SAFE_RANGE_C[1]) {
    out.push({ kind: 'water_temp_unsafe_high', waterTempC: ctx.ddt.waterTempC });
  } else if (ctx.ddt.waterTempC < WATER_TEMP_SAFE_RANGE_C[0]) {
    out.push({ kind: 'water_temp_unsafe_low', waterTempC: ctx.ddt.waterTempC });
  }

  // Lean subtype with high fat → likely miscategorized as enriched
  const leanSubtypes: BreadRecipeSubtype[] = ['standard_bread', 'ciabatta', 'baguette', 'sourdough'];
  if (leanSubtypes.includes(ctx.subtype) && ctx.comp.fatPct > 5) {
    out.push({ kind: 'enriched_recipe_in_lean_subtype', fatPct: ctx.comp.fatPct, subtype: ctx.subtype });
  }

  // Whole grain fraction band (only applies to subtypes that declare one)
  if (band.wholeGrainFractionRange) {
    if (ctx.comp.wholeGrainFraction < band.wholeGrainFractionRange[0] ||
        ctx.comp.wholeGrainFraction > band.wholeGrainFractionRange[1]) {
      out.push({
        kind: 'whole_grain_fraction_outside_band',
        fraction: ctx.comp.wholeGrainFraction,
        range: band.wholeGrainFractionRange,
        subtype: ctx.subtype,
      });
    }
  }

  return out;
}
