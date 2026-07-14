import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import type { Composition } from '../types';
import { compositionSum, isCompositionComplete, DEFAULT_COMPOSITION_BY_CATEGORY, COMPOSITION_SPECIES, COMPOSITION_DESCRIPTORS } from '../services/foodScience/universal/composition';
import { lookupUsdaSnapshot } from '../services/usdaFoodData';

interface CompositionEditorProps {
  ingredientName: string;
  category?: string;
  composition: Composition | undefined;
  onChange: (composition: Composition | undefined) => void;
  onUsdaMatch?: (fdcId: number) => void;
}

export function CompositionEditor({
  ingredientName, category, composition, onChange, onUsdaMatch,
}: CompositionEditorProps) {
  const { t } = useTranslation(['ingredients']);
  const [expanded, setExpanded] = useState(false);
  const [usdaResultMessage, setUsdaResultMessage] = useState<string | null>(null);

  const current: Composition = composition ?? {};
  const sum = compositionSum(current);
  const complete = isCompositionComplete(current);

  const handleField = (species: keyof Composition, value: string) => {
    const numeric = value === '' ? undefined : parseFloat(value);
    const next: Composition = { ...current };
    if (numeric === undefined || isNaN(numeric)) delete next[species];
    else next[species] = numeric;
    const isAllEmpty = Object.values(next).every(v => v === undefined);
    onChange(isAllEmpty ? undefined : next);
  };

  const handleCategoryDefault = () => {
    if (!category) return;
    const def = DEFAULT_COMPOSITION_BY_CATEGORY[category];
    if (def && Object.keys(def).length > 0) onChange({ ...def });
  };

  const handleUsdaLookup = () => {
    setUsdaResultMessage(null);
    const match = lookupUsdaSnapshot(ingredientName);
    if (match) {
      onChange({ ...match.composition });
      onUsdaMatch?.(match.fdcId);
      setUsdaResultMessage(t('ingredients:usdaFdcId.matched', { description: match.description, fdcId: match.fdcId }));
    } else {
      setUsdaResultMessage(t('ingredients:usdaNoMatch', 'No match found in USDA snapshot'));
    }
  };

  return (
    <div className="border border-cream-200 rounded-md">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-2.5 flex items-center justify-between bg-cream-50 hover:bg-cream-100 rounded-t-md text-sm font-medium text-cocoa-800 transition-colors"
      >
        <span className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {t('ingredients:composition.expander')}
        </span>
        <span className={`text-xs font-mono ${complete ? 'text-cocoa-500' : 'text-copper-600'}`}>
          {complete
            ? t('ingredients:composition.sumIndicator', { sum: sum.toFixed(1) })
            : t('ingredients:composition.sumIndicatorIncomplete', { sum: sum.toFixed(1) })}
        </span>
      </button>

      {expanded && (
        <div className="p-4 flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-x-4 gap-y-2">
            {COMPOSITION_SPECIES.map(species => (
              <label key={species} className="flex flex-col gap-0.5">
                <span className="text-[11px] uppercase tracking-wide text-cocoa-500">
                  {t(`ingredients:composition.species.${species}` as any)}
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={current[species] ?? ''}
                  onChange={e => handleField(species, e.target.value)}
                  placeholder="—"
                  className="font-mono text-sm border border-cream-300 rounded px-2 py-1 focus:outline-none focus:border-cocoa-400"
                />
              </label>
            ))}
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wide text-cocoa-400 mb-1">
              {t('ingredients:composition.subFractions')}
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2">
              {COMPOSITION_DESCRIPTORS.map(species => (
                <label key={species} className="flex flex-col gap-0.5">
                  <span className="text-[11px] uppercase tracking-wide text-cocoa-500">
                    {t(`ingredients:composition.species.${species}` as any)}
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={current[species] ?? ''}
                    onChange={e => handleField(species, e.target.value)}
                    placeholder="—"
                    className="font-mono text-sm border border-cream-300 rounded px-2 py-1 focus:outline-none focus:border-cocoa-400"
                  />
                </label>
              ))}
            </div>
            <p className="text-[11px] text-cocoa-400 italic mt-1">{t('ingredients:composition.subFractionsNote')}</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={handleCategoryDefault}
              disabled={!category || !DEFAULT_COMPOSITION_BY_CATEGORY[category] || Object.keys(DEFAULT_COMPOSITION_BY_CATEGORY[category] ?? {}).length === 0}
              className="text-xs px-3 py-1.5 border border-cream-300 rounded hover:bg-cream-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-cocoa-700"
            >
              {t('ingredients:composition.useCategoryDefault')}
            </button>
            <button
              type="button"
              onClick={handleUsdaLookup}
              disabled={!ingredientName.trim()}
              className="text-xs px-3 py-1.5 border border-cream-300 rounded hover:bg-cream-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-cocoa-700 inline-flex items-center gap-1.5"
            >
              <Search className="w-3 h-3" />
              {t('ingredients:composition.useUsdaSnapshot')}
            </button>
          </div>

          {usdaResultMessage && (
            <p className="text-xs text-cocoa-600 italic">{usdaResultMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}
