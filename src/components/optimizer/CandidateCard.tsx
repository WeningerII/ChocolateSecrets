import { useTranslation } from 'react-i18next';
import { ArrowRight, Plus, Minus, Repeat, Beaker } from 'lucide-react';
import type { OptimizerCandidate, Recipe } from '../../types';

interface CandidateCardProps {
  candidate: OptimizerCandidate;
  baseRecipe: Recipe;
  onSaveAsNewRecipe: (candidate: OptimizerCandidate) => void;
}

export function CandidateCard({ candidate, baseRecipe, onSaveAsNewRecipe }: CandidateCardProps) {
  const { t } = useTranslation('chemistry' as any);

  return (
    <div className="border border-cream-200 rounded-md bg-white p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-serif text-base text-cocoa-900">
            {t('optimizer.candidate.titlePrefix' as any)} {candidate.id.slice(0, 6)}
          </h3>
          <p className="text-[11px] text-cocoa-500 mt-0.5">
            {t('optimizer.candidate.closenessLabel' as any)}: {(candidate.topsisCloseness * 100).toFixed(0)}%
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSaveAsNewRecipe(candidate)}
          className="text-xs px-3 py-1.5 bg-cocoa-700 text-cream rounded hover:bg-cocoa-800 transition-colors inline-flex items-center gap-1.5"
        >
          <Beaker className="w-3 h-3" />
          {t('optimizer.candidate.saveAsNew' as any)}
        </button>
      </div>

      {/* Diff */}
      <div className="border-t border-cream-100 pt-2">
        <p className="text-[10px] uppercase tracking-wider text-cocoa-500 mb-1">
          {t('optimizer.candidate.diffHeader' as any)}
        </p>
        {candidate.diff.length === 0 ? (
          <p className="text-xs italic text-cocoa-400">{t('optimizer.candidate.noChange' as any)}</p>
        ) : (
          <ul className="space-y-1 text-xs text-cocoa-700">
            {candidate.diff.map((d, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {d.kind === 'mass_changed' && (
                  <>
                    {d.to > d.from ? <Plus className="w-3 h-3 text-cocoa-500" /> : <Minus className="w-3 h-3 text-cocoa-500" />}
                    <span>{d.ingredientName}: <span className="font-mono">{Math.round(d.from)}g <ArrowRight className="inline w-3 h-3" /> {Math.round(d.to)}g</span></span>
                  </>
                )}
                {d.kind === 'swapped' && (
                  <>
                    <Repeat className="w-3 h-3 text-cocoa-500" />
                    <span><span className="line-through text-cocoa-400">{d.from}</span> {' → '} <span className="font-medium">{d.to}</span></span>
                  </>
                )}
                {d.kind === 'added' && (
                  <>
                    <Plus className="w-3 h-3 text-cocoa-500" />
                    <span><span className="font-medium">{d.ingredientName}</span> <span className="font-mono">{Math.round(d.mass)}g</span></span>
                  </>
                )}
                {d.kind === 'removed' && (
                  <>
                    <Minus className="w-3 h-3 text-cocoa-500" />
                    <span className="line-through text-cocoa-400">{d.ingredientName} {Math.round(d.mass)}g</span>
                  </>
                )}
                {d.kind === 'cocoa_changed' && (
                  <>
                    <Repeat className="w-3 h-3 text-cocoa-500" />
                    <span>{t('optimizer.candidate.cocoaChange' as any)}: <span className="font-mono">{d.from}% <ArrowRight className="inline w-3 h-3" /> {d.to}%</span></span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Objectives strip */}
      <div className="border-t border-cream-100 pt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-cocoa-700">
        {(Object.entries(candidate.objectives) as Array<[keyof typeof candidate.objectives, number]>).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span>{t(`optimizer.objectives.${key}` as any)}</span>
            <span className="font-mono">{(value * 100).toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
