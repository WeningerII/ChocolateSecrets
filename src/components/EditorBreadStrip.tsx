import { useTranslation } from 'react-i18next';
import type { BreadEvaluation } from '../services/foodScience/bread';

interface EditorBreadStripProps {
  bread: BreadEvaluation;
}

export function EditorBreadStrip({ bread }: EditorBreadStripProps) {
  const { t } = useTranslation('chemistry');
  const c = bread.derived.composition;

  return (
    <div className="px-4 py-2.5 bg-cream-50 border border-cream-200 rounded-md flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
      <span className="text-[10px] uppercase tracking-wider text-cocoa-500">
        {t(`bread.recipeSubtype.${bread.derived.recipeSubtype}` as any)}
      </span>
      <Item label={t('chemistry:bread.tier.hydration')} value={`${c.hydrationPct.toFixed(1)}%`} />
      <Item label={t('chemistry:bread.tier.salt')} value={`${c.saltPct.toFixed(2)}%`} />
      <Item label={t('chemistry:bread.tier.yeast')} value={`${c.instantYeastEquivalentPct.toFixed(2)}%`} />
      <Item label={t('chemistry:bread.tier.glutenScore')} value={bread.derived.gluten.rawScore.toFixed(2)} />
      <Item label={t('chemistry:bread.tier.waterTemp')} value={`${bread.derived.ddt.waterTempC.toFixed(1)}°C`} />
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-cocoa-500">{label}</span>
      <span className="font-mono text-cocoa-900">{value}</span>
    </div>
  );
}
