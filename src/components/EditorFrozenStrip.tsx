import { useTranslation } from 'react-i18next';
import { Snowflake } from 'lucide-react';
import type { RecipePhysics } from '../hooks/useRecipePhysics';

interface EditorFrozenStripProps {
  physics: RecipePhysics;
}

export function EditorFrozenStrip({ physics }: EditorFrozenStripProps) {
  const { t } = useTranslation('chemistry');
  const d = physics.frozen?.derived;
  if (!d) return null;

  const { pac, pod, msnfPct, totalSolidsPct, fatPct } = d.composition;

  const getMetricColor = (val: number, range: [number, number]) => {
    if (val < range[0]) return 'text-amber-600';
    if (val > range[1]) return 'text-amber-600';
    return 'text-emerald-700';
  };

  return (
    <div className="bg-sky-50 border-b border-sky-100 flex items-center overflow-x-auto text-sm px-4 py-2 shrink-0">
      <div className="flex items-center gap-1.5 mr-6 shrink-0 text-sky-800 font-medium">
        <Snowflake className="w-4 h-4" />
        <span>{t('frozen.live_metrics', 'Frozen Metrics')}</span>
        <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">
          ({t(`frozen.subtypes.${d.recipeSubtype}`, d.recipeSubtype.replace('_', ' '))})
        </span>
      </div>

      <div className="flex gap-6 shrink-0">
        <div className="flex items-center gap-1.5" title={`Band: ${d.band.pacRange[0]}-${d.band.pacRange[1]}`}>
          <span className="text-slate-500">{t('frozen.pac', 'PAC')}:</span>
          <span className={`font-mono font-semibold ${getMetricColor(pac, d.band.pacRange)}`}>
            {pac.toFixed(1)}
          </span>
        </div>

        <div className="flex items-center gap-1.5" title={`Band: ${d.band.podRange[0]}-${d.band.podRange[1]}`}>
          <span className="text-slate-500">{t('frozen.pod', 'POD')}:</span>
          <span className={`font-mono font-semibold ${getMetricColor(pod, d.band.podRange)}`}>
            {pod.toFixed(1)}
          </span>
        </div>

        <div className="flex items-center gap-1.5" title={`Band: ${d.band.totalSolidsPctRange[0]}-${d.band.totalSolidsPctRange[1]}%`}>
          <span className="text-slate-500">{t('frozen.ts', 'TS')}:</span>
          <span className={`font-mono font-semibold ${getMetricColor(totalSolidsPct, d.band.totalSolidsPctRange)}`}>
            {totalSolidsPct.toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">{t('frozen.msnf', 'MSNF')}:</span>
          <span className="font-mono font-semibold text-slate-700">
            {msnfPct.toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center gap-1.5" title={`Band: ${d.band.fatPctRange[0]}-${d.band.fatPctRange[1]}%`}>
          <span className="text-slate-500">{t('frozen.fat', 'Fat')}:</span>
          <span className={`font-mono font-semibold ${getMetricColor(fatPct, d.band.fatPctRange)}`}>
            {fatPct.toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center gap-2 border-l border-sky-200 pl-6 cursor-help" title={t('frozen.scoopability_desc', 'Based on PAC and matrix hardening factor at freezing cabinet temperature')}>
          <span className="text-slate-500">{t('frozen.scoopability', 'Scoopability')}:</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${
              d.scoopability === 'standard' ? "bg-emerald-400" :
              (d.scoopability === 'firm' || d.scoopability === 'soft') ? "bg-amber-400" :
              (d.scoopability === 'brick' || d.scoopability === 'too_soft') ? "bg-red-500" :
              "bg-sky-400"
            }`} />
            <span className="font-medium text-slate-700">
              {t(`frozen.scoop_${d.scoopability}`, d.scoopability.replace('_', ' '))}
            </span>
          </div>
        </div>

        {d.initialFreezingPointC !== null && (
          <div className="flex items-center gap-1.5 border-l border-sky-200 pl-6" title={t('frozen.initialFreezingPoint', 'Initial freezing point')}>
            <span className="text-slate-500">{t('frozen.freezingPoint', 'Freezing pt')}:</span>
            <span className="font-mono font-semibold text-slate-700">{d.initialFreezingPointC.toFixed(1)}°C</span>
          </div>
        )}
      </div>
    </div>
  );
}
