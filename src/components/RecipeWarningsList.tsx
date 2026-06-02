import { useTranslation } from 'react-i18next';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { PhysicsWarning } from '../hooks/useRecipePhysics';
import type { ConfectioneryWarning } from '../services/foodScience/confectionery';
import type { FrozenWarning } from '../services/foodScience/frozen/types';
import type { BreadWarning } from '../services/foodScience/bread';

interface RecipeWarningsListProps {
  universal: PhysicsWarning[];
  confectionery?: ConfectioneryWarning[];
  frozen?: FrozenWarning[];
  bread?: BreadWarning[];
}

type Severity = 'info' | 'warn' | 'critical';

interface DisplayWarning {
  severity: Severity;
  text: string;
}

export function RecipeWarningsList({ universal, confectionery = [], frozen = [], bread = [] }: RecipeWarningsListProps) {
  const { t } = useTranslation('chemistry');

  const items: DisplayWarning[] = [];

  for (const w of universal) {
    switch (w.kind) {
      case 'composition_incomplete':
        items.push({ severity: 'info', text: t('warnings.composition_incomplete' as any, { count: w.ingredientCount }) });
        break;
      case 'no_water':
        items.push({ severity: 'info', text: t('warnings.no_water' as any) });
        break;
      case 'extreme_saturation':
        items.push({ severity: 'warn', text: t('warnings.extreme_saturation' as any, { aqueousSugarPct: Math.round(w.aqueousSugarPct ?? 0) }) });
        break;
      case 'declared_diverges':
        items.push({ severity: 'warn', text: t('warnings.declared_diverges' as any, { declaredDays: w.declaredDays, predictedWeeks: w.predictedWeeks }) });
        break;
      case 'bread_no_flour':
        items.push({ severity: 'critical', text: t('bread.warnings.no_flour_present' as any) });
        break;
    }
  }

  for (const w of confectionery) {
    switch (w.kind) {
      case 'curdle_risk_medium':
        items.push({ severity: 'warn', text: t('confectionery.warnings.curdle_risk_medium' as any, { pH: w.pH.toFixed(2), foldTempCeiling: w.foldTempCeiling }) });
        break;
      case 'curdle_risk_high':
        items.push({ severity: 'critical', text: t('confectionery.warnings.curdle_risk_high' as any, { pH: w.pH.toFixed(2), foldTempCeiling: w.foldTempCeiling }) });
        break;
      case 'fat_regime_inversion':
        items.push({ severity: 'warn', text: t('confectionery.warnings.fat_regime_inversion' as any, { fatPct: Math.round(w.fatPct) }) });
        break;
      case 'fat_regime_oil_in_water':
        items.push({ severity: 'critical', text: t('confectionery.warnings.fat_regime_oil_in_water' as any, { fatPct: Math.round(w.fatPct) }) });
        break;
      case 'no_chocolate_in_confectionery':
        items.push({ severity: 'info', text: t('confectionery.warnings.no_chocolate_in_confectionery' as any) });
        break;
      case 'multiple_chocolate_classes':
        items.push({ severity: 'info', text: t('confectionery.warnings.multiple_chocolate_classes' as any, { classes: w.classes.join(', ') }) });
        break;
      case 'ethanol_above_tolerance':
        items.push({ severity: 'warn', text: t('confectionery.warnings.ethanol_above_tolerance' as any, { abv: Math.round(w.abv) }) });
        break;
      case 'ethanol_long_shelf_low':
        items.push({ severity: 'info', text: t('confectionery.warnings.ethanol_long_shelf_low' as any, { abv: Math.round(w.abv) }) });
        break;
      case 'sorbet_detected_in_confectionery':
        items.push({ severity: 'warn', text: t('confectionery.warnings.sorbet_detected_in_confectionery' as any) });
        break;
      case 'inclusion_oversized_for_truffle':
        items.push({ severity: 'info', text: t('confectionery.warnings.inclusion_oversized_for_truffle' as any) });
        break;
    }
  }

  for (const w of frozen) {
    switch (w.kind) {
      case 'total_solids_low':
        items.push({ severity: 'warn', text: t('frozen.warnings.total_solids_low' as any, { ts: w.ts.toFixed(1), minTs: w.minTs, subtype: t(`frozen.subtypes.${w.subtype}` as any) }) });
        break;
      case 'total_solids_high':
        items.push({ severity: 'warn', text: t('frozen.warnings.total_solids_high' as any, { ts: w.ts.toFixed(1), maxTs: w.maxTs, subtype: t(`frozen.subtypes.${w.subtype}` as any) }) });
        break;
      case 'fat_out_of_band':
        items.push({ severity: 'info', text: t('frozen.warnings.fat_out_of_band' as any, { fat: w.fat.toFixed(1), min: w.range[0], max: w.range[1], subtype: t(`frozen.subtypes.${w.subtype}` as any) }) });
        break;
      case 'msnf_out_of_band':
        items.push({ severity: 'info', text: t('frozen.warnings.msnf_out_of_band' as any, { msnf: w.msnf.toFixed(1), min: w.range[0], max: w.range[1], subtype: t(`frozen.subtypes.${w.subtype}` as any) }) });
        break;
      case 'pac_low':
      case 'pac_high':
        // Not displayed directly, scoopability covers this mostly
        break;
      case 'pod_out_of_band':
        items.push({ severity: 'info', text: t('frozen.warnings.pod_out_of_band' as any, { pod: w.pod.toFixed(1), min: w.range[0], max: w.range[1], subtype: t(`frozen.subtypes.${w.subtype}` as any) }) });
        break;
      case 'sandiness_risk':
        items.push({ severity: 'warn', text: t('frozen.warnings.sandiness_risk' as any, { pct: w.lactoseInWaterPct.toFixed(1) }) });
        break;
      case 'sorbet_dairy_present':
        items.push({ severity: 'warn', text: t('frozen.warnings.sorbet_dairy_present' as any, { msnf: w.msnf.toFixed(1) }) });
        break;
      case 'gelato_no_milk_powder':
        items.push({ severity: 'info', text: t('frozen.warnings.gelato_no_milk_powder' as any) });
        break;
      case 'scoopability_brick':
        items.push({ severity: 'critical', text: t('frozen.warnings.scoopability_brick' as any) });
        break;
      case 'scoopability_too_soft':
        items.push({ severity: 'critical', text: t('frozen.warnings.scoopability_soup' as any) });
        break;
    }
  }

  for (const w of bread) {
    switch (w.kind) {
      case 'no_flour_present':
        items.push({ severity: 'critical', text: t('bread.warnings.no_flour_present' as any) });
        break;
      case 'hydration_low':
        items.push({ severity: 'warn', text: t('bread.warnings.hydration_low' as any, {
          hydration: w.hydration.toFixed(1), minHydration: w.minHydration,
          subtype: t(`bread.recipeSubtype.${w.subtype}` as any),
        }) });
        break;
      case 'hydration_high':
        items.push({ severity: 'warn', text: t('bread.warnings.hydration_high' as any, {
          hydration: w.hydration.toFixed(1), maxHydration: w.maxHydration,
          subtype: t(`bread.recipeSubtype.${w.subtype}` as any),
        }) });
        break;
      case 'salt_low':
        items.push({ severity: 'warn', text: t('bread.warnings.salt_low' as any, {
          salt: w.salt.toFixed(2), minSalt: w.minSalt,
        }) });
        break;
      case 'salt_high':
        items.push({ severity: 'warn', text: t('bread.warnings.salt_high' as any, {
          salt: w.salt.toFixed(2), maxSalt: w.maxSalt,
        }) });
        break;
      case 'yeast_outside_band':
        items.push({ severity: 'warn', text: t('bread.warnings.yeast_outside_band' as any, {
          yeast: w.instantYeastEquivalentPct.toFixed(2),
          min: w.range[0], max: w.range[1],
          subtype: t(`bread.recipeSubtype.${w.subtype}` as any),
        }) });
        break;
      case 'gluten_weak':
        items.push({ severity: 'info', text: t('bread.warnings.gluten_weak' as any, { rawScore: w.rawScore.toFixed(2) }) });
        break;
      case 'gluten_over_developed':
        items.push({ severity: 'info', text: t('bread.warnings.gluten_over_developed' as any, { rawScore: w.rawScore.toFixed(2) }) });
        break;
      case 'water_temp_unsafe_high':
        items.push({ severity: 'critical', text: t('bread.warnings.water_temp_unsafe_high' as any, { waterTempC: w.waterTempC.toFixed(1) }) });
        break;
      case 'water_temp_unsafe_low':
        items.push({ severity: 'critical', text: t('bread.warnings.water_temp_unsafe_low' as any, { waterTempC: w.waterTempC.toFixed(1) }) });
        break;
      case 'sourdough_no_starter':
        items.push({ severity: 'warn', text: t('bread.warnings.sourdough_no_starter' as any) });
        break;
      case 'enriched_recipe_in_lean_subtype':
        items.push({ severity: 'info', text: t('bread.warnings.enriched_recipe_in_lean_subtype' as any, {
          fatPct: w.fatPct.toFixed(1), subtype: t(`bread.recipeSubtype.${w.subtype}` as any),
        }) });
        break;
      case 'whole_grain_fraction_outside_band':
        items.push({ severity: 'info', text: t('bread.warnings.whole_grain_fraction_outside_band' as any, {
          fraction: (w.fraction * 100).toFixed(0),
          min: w.range[0] * 100, max: w.range[1] * 100,
          subtype: t(`bread.recipeSubtype.${w.subtype}` as any),
        }) });
        break;
    }
  }

  if (items.length === 0) return null;

  // Sort: critical first, then warn, then info
  const order = { critical: 0, warn: 1, info: 2 };
  items.sort((a, b) => order[a.severity] - order[b.severity]);

  return (
    <div className="rounded-md border border-cream-200 bg-cream-50 px-4 py-3 flex flex-col gap-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2 text-sm">
          {item.severity === 'critical' && <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-raspberry" />}
          {item.severity === 'warn' && <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-copper-600" />}
          {item.severity === 'info' && <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-cocoa-500" />}
          <p className={`leading-snug ${
            item.severity === 'critical' ? 'text-raspberry'
            : item.severity === 'warn' ? 'text-copper-800'
            : 'text-cocoa-700'
          }`}>
            {item.text}
          </p>
        </div>
      ))}
    </div>
  );
}
