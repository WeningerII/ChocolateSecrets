import type { ResolvedIngredient } from '../universal';
import type { AwResult, FatRegime } from '../universal';
import type {
  ConfectioneryWarning,
  CurdleAssessment,
  EthanolAssessment,
  PolymorphWindow,
  ChocolateClass,
} from './types';

interface WarningContext {
  aw: AwResult;
  fatRegime: FatRegime;
  resolved: ResolvedIngredient[];
  curdle: CurdleAssessment;
  ethanol: EthanolAssessment;
  polymorph: PolymorphWindow | null;
  mixedChocolateClasses: ChocolateClass[] | null;
}

export function deriveConfectioneryWarnings(ctx: WarningContext): ConfectioneryWarning[] {
  const out: ConfectioneryWarning[] = [];

  // Curdle
  if (ctx.curdle.level === 'high' && ctx.curdle.recommendedFoldTempCeilingC !== null) {
    const phReason = ctx.curdle.reasons.find(r => r.kind === 'ph_low');
    out.push({
      kind: 'curdle_risk_high',
      pH: phReason?.kind === 'ph_low' ? phReason.pH : 0,
      foldTempCeiling: ctx.curdle.recommendedFoldTempCeilingC,
    });
  } else if (ctx.curdle.level === 'medium' && ctx.curdle.recommendedFoldTempCeilingC !== null) {
    const phReason = ctx.curdle.reasons.find(r => r.kind === 'ph_low');
    out.push({
      kind: 'curdle_risk_medium',
      pH: phReason?.kind === 'ph_low' ? phReason.pH : 0,
      foldTempCeiling: ctx.curdle.recommendedFoldTempCeilingC,
    });
  }

  // Fat regime — confectionery wants 'firm-set' or 'standard'
  if (ctx.fatRegime.key === 'oil-in-water') {
    out.push({ kind: 'fat_regime_oil_in_water', fatPct: ctx.aw.fatPct });
  } else if (ctx.fatRegime.key === 'inversion-approaching') {
    out.push({ kind: 'fat_regime_inversion', fatPct: ctx.aw.fatPct });
  }

  // Confectionery without chocolate is allowed (caramel, fondant, marshmallow), but
  // we surface a soft signal — the chef may have miscategorized.
  const hasChocolate = ctx.resolved.some(r => typeof r.chocolateCocoaPercentage === 'number');
  if (!hasChocolate) {
    out.push({ kind: 'no_chocolate_in_confectionery' });
  }

  if (ctx.mixedChocolateClasses) {
    out.push({ kind: 'multiple_chocolate_classes', classes: ctx.mixedChocolateClasses });
  }

  // Ethanol — exceeds 12% post-retention is operational tolerance for fold-fold;
  // below that the long-shelf band check still applies.
  if (ctx.ethanol.abv !== null) {
    if (ctx.ethanol.postRetentionMassPct > 12) {
      out.push({ kind: 'ethanol_above_tolerance', abv: ctx.ethanol.abv });
    } else if (ctx.ethanol.postRetentionMassPct > 0 && ctx.ethanol.postRetentionMassPct < 4) {
      // Some ethanol present but below the long-shelf band — flag only if it's a
      // declared "boozy" recipe; we approximate with: any alcohol-spec'd ingredient.
      const hasAlcoholIngredient = ctx.resolved.some(r => r.alcoholAbv != null && r.alcoholAbv > 15);
      if (hasAlcoholIngredient) {
        out.push({ kind: 'ethanol_long_shelf_low', abv: ctx.ethanol.abv });
      }
    }
  }

  return out;
}
