import { useTranslation } from 'react-i18next';
import type { BreadEvaluation } from '../services/foodScience/bread';

interface RecipeBreadTierProps {
  bread: BreadEvaluation;
}

export function RecipeBreadTier({ bread }: RecipeBreadTierProps) {
  const { t } = useTranslation('chemistry');
  const c = bread.derived.composition;
  const band = bread.derived.band;
  const ddt = bread.derived.ddt;

  const inBand = (v: number, range: [number, number]) => v >= range[0] && v <= range[1];

  return (
    <div className="rounded-md bg-cream-100 px-5 py-4 border border-cream-200 flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <p className="text-[11px] uppercase tracking-wider text-cocoa-500 font-medium">
          {t('chemistry:bread.tier.title')}
        </p>
        <p className="text-xs text-cocoa-700 font-medium">
          {t(`bread.recipeSubtype.${bread.derived.recipeSubtype}` as any)}
        </p>
        {bread.derived.recipeSubtypeProvenance !== 'declared' && (
          <p className="text-[10px] italic text-cocoa-500">
            {t(`bread.recipeSubtypeProvenance.${bread.derived.recipeSubtypeProvenance}` as any)}
          </p>
        )}
      </div>

      {/* Top row: bakers percentages */}
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Tile label={t('chemistry:bread.tier.totalFlour')} value={`${Math.round(c.totalFlourMass)} g`} />
        <Tile label={t('chemistry:bread.tier.hydration')} value={`${c.hydrationPct.toFixed(1)}%`} inBand={inBand(c.hydrationPct, band.hydrationPctRange)} />
        <Tile label={t('chemistry:bread.tier.salt')} value={`${c.saltPct.toFixed(2)}%`} inBand={inBand(c.saltPct, band.saltPctRange)} />
        <Tile label={t('chemistry:bread.tier.yeast')} value={`${c.instantYeastEquivalentPct.toFixed(2)}%`} inBand={
          bread.derived.recipeSubtype === 'sourdough'
            ? c.instantYeastEquivalentPct < 0.05
            : inBand(c.instantYeastEquivalentPct, band.instantYeastPctRange)
        } />
        {c.starterPct > 0 && (
          <Tile label={t('chemistry:bread.tier.starter')} value={`${c.starterPct.toFixed(1)}%`} />
        )}
        {c.wholeGrainFraction > 0 && (
          <Tile label={t('chemistry:bread.tier.wholeGrain')} value={`${(c.wholeGrainFraction * 100).toFixed(0)}%`} />
        )}
      </div>

      {/* Second row: gluten + DDT */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-cream-200 pt-3">
        <Tile label={t('chemistry:bread.tier.glutenScore')} value={`${bread.derived.gluten.rawScore.toFixed(2)} — ${t(`bread.gluten.${bread.derived.gluten.band}` as any)}`} />
        <Tile label={t('chemistry:bread.tier.ddt')} value={`${ddt.desiredDoughTempC}°C`} />
        <Tile label={t('chemistry:bread.tier.waterTemp')} value={`${ddt.waterTempC.toFixed(1)}°C`} />
        <Tile label={t('chemistry:bread.tier.frictionFactor')} value={`${ddt.frictionFactorC}°C`} />
      </div>
    </div>
  );
}

function Tile({ label, value, inBand }: { label: string; value: string; inBand?: boolean }) {
  const tone = inBand === undefined
    ? 'text-cocoa-900'
    : inBand
      ? 'text-cocoa-900'
      : 'text-copper-700';
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] uppercase tracking-wider text-cocoa-500 font-medium">{label}</p>
      <p className={`font-mono text-sm font-medium ${tone}`}>{value}</p>
    </div>
  );
}
