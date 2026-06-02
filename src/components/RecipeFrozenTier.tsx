import { useTranslation } from 'react-i18next';
import { Leaf, Snowflake, Droplet, Layers, Thermometer } from 'lucide-react';
import type { RecipePhysics } from '../hooks/useRecipePhysics';

interface RecipeFrozenTierProps {
  physics: RecipePhysics;
}

export function RecipeFrozenTier({ physics }: RecipeFrozenTierProps) {
  const { t } = useTranslation('chemistry');
  const d = physics.frozen?.derived;
  if (!d) return null;

  const { pac, pod, msnfPct, totalSolidsPct } = d.composition;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-8 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Snowflake className="w-5 h-5 text-sky-600" />
        <h3 className="font-semibold text-slate-800 text-lg">
          {t('frozen.tier_title', 'Frozen Profile')}
        </h3>
        <span className="text-xs font-medium bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full uppercase tracking-wider ml-2">
          {t(`frozen.subtypes.${d.recipeSubtype}`, d.recipeSubtype.replace('_', ' '))}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded p-4 border border-slate-100 shadow-sm flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 mb-1 text-slate-500" title={t('frozen.pac_tooltip', 'Anti-freezing Power')}>
            <Thermometer className="w-4 h-4" />
            <span className="text-sm font-medium uppercase tracking-wide">
              {t('frozen.pac', 'PAC')}
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-700">
            {pac.toFixed(1)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {t('frozen.pac_unit', 'g sucrose eq')}
          </div>
        </div>

        <div className="bg-white rounded p-4 border border-slate-100 shadow-sm flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 mb-1 text-slate-500" title={t('frozen.pod_tooltip', 'Sweetening Power')}>
            <Leaf className="w-4 h-4" />
            <span className="text-sm font-medium uppercase tracking-wide">
              {t('frozen.pod', 'POD')}
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-700">
            {pod.toFixed(1)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {t('frozen.pod_unit', '% relative to sucrose')}
          </div>
        </div>

        <div className="bg-white rounded p-4 border border-slate-100 shadow-sm flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 mb-1 text-slate-500" title={t('frozen.msnf_tooltip', 'Milk Solids Non-Fat')}>
            <Droplet className="w-4 h-4" />
            <span className="text-sm font-medium uppercase tracking-wide">
              {t('frozen.msnf', 'MSNF')}
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-700">
            {msnfPct.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {t('frozen.dairy_solids', 'Dairy bulk')}
          </div>
        </div>

        <div className="bg-white rounded p-4 border border-slate-100 shadow-sm flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 mb-1 text-slate-500" title={t('frozen.ts_tooltip', 'Total Solids')}>
            <Layers className="w-4 h-4" />
            <span className="text-sm font-medium uppercase tracking-wide">
              {t('frozen.ts', 'TS')}
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-700">
            {totalSolidsPct.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {t('frozen.dry_matter', 'Dry matter')}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 bg-white border border-slate-100 shadow-sm p-4 rounded flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">
              {t('frozen.scoopability', 'Scoopability')}
            </span>
            <span className="text-sm font-semibold text-slate-700">
              {t(`frozen.scoop_${d.scoopability}`, d.scoopability.replace('_', ' '))}
            </span>
          </div>
          <div className={`w-3 h-3 rounded-full ${
            d.scoopability === 'standard' ? "bg-emerald-400" :
            (d.scoopability === 'firm' || d.scoopability === 'soft') ? "bg-amber-400" :
            (d.scoopability === 'brick' || d.scoopability === 'too_soft') ? "bg-red-500" :
            "bg-sky-400"
          }`} />
        </div>
        
        {/* Recommended serving temp heuristic: -1 * PAC / 2 - a couple degrees roughly */}
        <div className="flex-1 bg-white border border-slate-100 shadow-sm p-4 rounded flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">
              {t('frozen.serving_temp', 'Rec. Serving Temp')}
            </span>
            <span className="text-sm font-semibold text-slate-700">
              {d.recipeSubtype === 'gelato' ? '-11°C to -15°C' : 
               d.recipeSubtype === 'ice_cream' ? '-14°C to -18°C' : 
               d.recipeSubtype === 'sorbet' ? '-12°C to -16°C' :
               d.recipeSubtype === 'granita' ? '-4°C to -8°C' :
               '-12°C to -18°C'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
