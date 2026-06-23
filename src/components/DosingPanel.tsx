import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Recipe, Ingredient } from '../types';
import { resolveRecipeLeaves } from '../utils/resolveRecipeLeaves';
import { resolveComposition } from '../services/foodScience/universal';
import { solveDose, type DosingGoal, type TunableTaste, type DosingAddition } from '../services/foodScience/dosing';

interface DosingPanelProps {
  recipe: Recipe;
  ingredients: Ingredient[];
  recipes: Recipe[];
}

const TASTES: TunableTaste[] = ['sweet', 'salty', 'sour', 'bitter'];

/**
 * "Tune an addition" — the dosing solver as an interactive panel. Pick an
 * ingredient to add to this recipe and a goal; it solves for how much and shows
 * the dose→effect curve. Honest about aroma-dominant additions.
 */
export function DosingPanel({ recipe, ingredients, recipes }: DosingPanelProps) {
  const { t } = useTranslation('chemistry');
  const [additionId, setAdditionId] = useState('');
  const [mode, setMode] = useState<'balance' | 'target'>('balance');
  const [quality, setQuality] = useState<TunableTaste>('sour');
  const [target, setTarget] = useState(40);

  const baseLeaves = useMemo(
    () => resolveRecipeLeaves(recipe, ingredients, recipes, 1).resolved,
    [recipe, ingredients, recipes],
  );

  const sortedIngredients = useMemo(
    () => [...ingredients].sort((a, b) => a.name.localeCompare(b.name)),
    [ingredients],
  );

  const result = useMemo(() => {
    const ing = ingredients.find(i => i.id === additionId);
    if (!ing || baseLeaves.length === 0) return null;
    const addition: DosingAddition = {
      name: ing.name,
      composition: resolveComposition(ing).composition,
      bufferRef: ing.bufferRef,
      role: ing.category === 'Spices & Extracts' ? 'flavor' : undefined,
    };
    const goal: DosingGoal = mode === 'balance'
      ? { kind: 'maximize_palatability' }
      : { kind: 'target_taste', quality, target };
    return solveDose(baseLeaves, addition, goal);
  }, [additionId, ingredients, baseLeaves, mode, quality, target]);

  const maxDose = result ? result.curve[result.curve.length - 1].doseG : 1;

  return (
    <div className="rounded-md bg-cream-50 px-5 py-5 mt-2 border border-cream-200 text-sm text-cocoa-700">
      <h4 className="font-serif text-[12px] uppercase tracking-wider text-cocoa-500 font-medium">
        {t('chemistry:dosing.title')}
      </h4>
      <p className="text-[11px] text-cocoa-500 mt-1 mb-3">{t('chemistry:dosing.intro')}</p>

      {/* Controls */}
      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-cocoa-600">{t('chemistry:dosing.pickIngredient')}</span>
          <select
            value={additionId}
            onChange={e => setAdditionId(e.target.value)}
            className="px-2 py-1 border border-cream-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-cocoa-500"
          >
            <option value="">{t('chemistry:dosing.pickPlaceholder')}</option>
            {sortedIngredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-cocoa-600">{t('chemistry:dosing.goal')}</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setMode('balance')}
              className={`flex-1 px-2 py-1 rounded border ${mode === 'balance' ? 'bg-cocoa-600 text-white border-cocoa-600' : 'bg-white border-cream-300 text-cocoa-700'}`}
            >{t('chemistry:dosing.goalBalance')}</button>
            <button
              type="button"
              onClick={() => setMode('target')}
              className={`flex-1 px-2 py-1 rounded border ${mode === 'target' ? 'bg-cocoa-600 text-white border-cocoa-600' : 'bg-white border-cream-300 text-cocoa-700'}`}
            >{t('chemistry:dosing.goalTarget')}</button>
          </div>
        </div>
      </div>

      {mode === 'target' && (
        <div className="grid sm:grid-cols-2 gap-3 text-xs mt-3">
          <label className="flex flex-col gap-1">
            <span className="text-cocoa-600">{t('chemistry:dosing.targetTaste')}</span>
            <select
              value={quality}
              onChange={e => setQuality(e.target.value as TunableTaste)}
              className="px-2 py-1 border border-cream-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-cocoa-500"
            >
              {TASTES.map(q => <option key={q} value={q}>{t(`chemistry:detail.taste.quality.${q}` as any)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-cocoa-600">{t('chemistry:dosing.targetValue' as any, { value: target })}</span>
            <input
              type="range" min={0} max={100} step={1}
              value={target}
              onChange={e => setTarget(parseInt(e.target.value, 10))}
              className="w-full"
            />
          </label>
        </div>
      )}

      {/* Result */}
      {!result ? (
        <p className="text-xs text-cocoa-500 mt-4">{t('chemistry:dosing.empty')}</p>
      ) : (
        <div className="mt-4">
          <div className="flex items-baseline gap-2">
            <span className="text-cocoa-500 text-xs">{t('chemistry:dosing.recommended')}</span>
            <span className="font-serif text-xl text-cocoa-900">{result.recommendedDoseG.toFixed(1)}</span>
            <span className="text-cocoa-500 text-xs">{t('chemistry:dosing.grams')}</span>
          </div>
          <p className="text-xs text-cocoa-600 mt-1">
            {t('chemistry:dosing.balanceBeforeAfter' as any, {
              before: Math.round(result.baseline.palatability),
              after: Math.round(result.achieved.palatability),
            })}
          </p>

          {/* Dose → palatability curve */}
          <div className="mt-3">
            <div className="flex items-end gap-px h-16">
              {result.curve.map((p, i) => {
                const isPick = Math.abs(p.doseG - result.recommendedDoseG) < (maxDose / result.curve.length) / 2 + 1e-9;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-t ${isPick ? 'bg-cocoa-600' : 'bg-cocoa-300'}`}
                    style={{ height: `${Math.max(2, p.palatability)}%` }}
                    title={`${p.doseG.toFixed(1)} g · ${Math.round(p.palatability)}`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-cocoa-400 mt-1">
              <span>0 {t('chemistry:dosing.grams')}</span>
              <span>{t('chemistry:dosing.curveLabel')}</span>
              <span>{maxDose.toFixed(0)} {t('chemistry:dosing.grams')}</span>
            </div>
          </div>

          {result.flavorCeilingG !== null && (
            <p className="text-[11px] text-amber-600 mt-2">
              {t('chemistry:dosing.ceiling' as any, { dose: result.flavorCeilingG.toFixed(1) })}
            </p>
          )}

          <ul className="mt-2 space-y-1">
            {result.flags.map(f => (
              <li key={f.kind} className="text-[11px] text-cocoa-500 leading-relaxed">
                {t(`chemistry:dosing.flag.${f.kind}` as any)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
