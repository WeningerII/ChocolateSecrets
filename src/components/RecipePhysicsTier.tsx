import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { RecipePhysics } from '../hooks/useRecipePhysics';

interface RecipePhysicsTierProps {
  physics: RecipePhysics;
  expanded: boolean;
  onToggle: () => void;
}

export function RecipePhysicsTier({ physics, expanded, onToggle }: RecipePhysicsTierProps) {
  const { t } = useTranslation('chemistry');

  const aw = physics.aw.aw;
  const showPH = physics.pH !== null;

  const phBandClass = (() => {
    if (!physics.pH) return 'text-cocoa-500';
    const p = physics.pH.pH;
    if (p < 4.0) return 'text-copper-600';
    if (p < 4.6) return 'text-copper-500';
    return 'text-cocoa-700';
  })();

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="w-full flex flex-wrap items-center gap-x-6 gap-y-3 rounded-md bg-cream-100 px-5 py-4 border border-cream-200 hover:bg-cream-200 transition-colors text-left"
    >
      <PhysicsTile
        label={t('chemistry:tier.aw')}
        value={aw === null ? '—' : aw.toFixed(3)}
        caption={t(`chemistry:${physics.awBand.labelKey}` as any)}
        captionTone="band"
      />

      {showPH && (
        <PhysicsTile
          label={t('chemistry:tier.ph')}
          value={physics.pH!.pH.toFixed(2)}
          captionClass={phBandClass}
        />
      )}

      <PhysicsTile
        label={t('chemistry:tier.aqueousSugar')}
        value={`${Math.round(physics.aw.aqueousSugarPct)}%`}
      />

      <PhysicsTile
        label={t('chemistry:tier.freeWater')}
        value={`${Math.round(physics.aw.waterPct)}%`}
      />

      <PhysicsTile
        label={t('chemistry:tier.totalFat')}
        value={`${Math.round(physics.aw.fatPct)}%`}
        caption={t(`chemistry:${physics.fatRegime.labelKey}` as any)}
      />

      {physics.confectionery?.derived.snap && (
        <PhysicsTile
          label={t('chemistry:tier.snap')}
          value={t(`chemistry:tier.snapClass.${physics.confectionery.derived.snap.snapClass}` as any)}
          caption={t('chemistry:tier.snapSfc' as any, {
            pct: Math.round(physics.confectionery.derived.snap.sfcAtEatingTempPct),
            temp: Math.round(physics.confectionery.derived.snap.eatingTempC),
          })}
        />
      )}

      {physics.boiling.boilingPointC !== null && physics.boiling.elevationC >= 1 && (
        <PhysicsTile
          label={t('chemistry:tier.boilingPoint')}
          value={`${physics.boiling.boilingPointC.toFixed(1)}°C`}
          caption={physics.candyStage ? t(`chemistry:tier.candyStageVal.${physics.candyStage}` as any) : undefined}
        />
      )}

      {physics.osmolality.osmolalityOsmPerKg >= 1 && (
        <PhysicsTile
          label={t('chemistry:tier.osmolality')}
          value={physics.osmolality.osmolalityOsmPerKg.toFixed(1)}
          caption={t('chemistry:tier.osmPressure' as any, { atm: Math.round(physics.osmolality.osmoticPressureAtm) })}
        />
      )}

      {physics.proteinSet && (
        <PhysicsTile
          label={t('chemistry:tier.proteinSet')}
          value={`${Math.round(physics.proteinSet.setFraction * 100)}%`}
          caption={t(`chemistry:tier.proteinBand.${physics.proteinSet.band}` as any)}
        />
      )}

      <span className="ml-auto inline-flex items-center gap-1 text-xs text-cocoa-500">
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? t('chemistry:tier.hideCalculation') : t('chemistry:tier.showCalculation')}
      </span>
    </button>
  );
}

function PhysicsTile({
  label, value, caption, captionClass, captionTone,
}: {
  label: string;
  value: string;
  caption?: string;
  captionClass?: string;
  captionTone?: 'band';
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] uppercase tracking-wider text-cocoa-500 font-medium">{label}</p>
      <p className="font-mono text-base font-medium text-cocoa-900">{value}</p>
      {caption && (
        <p className={`text-[11px] italic ${captionClass ?? (captionTone === 'band' ? 'text-cocoa-600' : 'text-cocoa-500')}`}>
          {caption}
        </p>
      )}
    </div>
  );
}
