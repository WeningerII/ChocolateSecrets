import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Recipe, Ingredient, Language } from '../types';
import { recipeContributions } from '../utils/recipeContributions';
import { formatCurrency } from '../utils/formatters';
import { LocalizedField } from './LocalizedField';

interface RecipeCostDriversProps {
  recipe: Recipe;
  ingredients: Ingredient[];
  recipes: Recipe[];
  language: Language;
}

/**
 * "What drives this cost?" — top ingredients by share of total recipe cost,
 * computed as a rollup over the same resolved leaf vector the rest of the recipe
 * view uses. Sub-recipe costs are attributed to the underlying raw ingredient.
 */
export function RecipeCostDrivers({ recipe, ingredients, recipes, language }: RecipeCostDriversProps) {
  const { t } = useTranslation('chemistry');
  const report = useMemo(
    () => recipeContributions(recipe, ingredients, recipes, 1),
    [recipe, ingredients, recipes],
  );

  if (report.totalCostUsd <= 0) return null;
  const drivers = report.ingredients.filter((i) => (i.costUsd ?? 0) > 0).slice(0, 6);
  if (drivers.length === 0) return null;

  const ingMap = new Map(ingredients.map((i) => [i.id, i]));

  return (
    <div className="rounded-md bg-cream-50 px-5 py-4 border border-cream-200">
      <p className="text-[11px] uppercase tracking-wide text-cocoa-500 font-medium mb-3">
        {t('chemistry:contribution.costDrivers', 'Cost drivers')}
      </p>
      <div className="space-y-2">
        {drivers.map((d) => {
          const pct = Math.round((d.costShare ?? 0) * 100);
          const localized = ingMap.get(d.ingredientId)?.nameI18n;
          return (
            <div key={d.ingredientId} className="flex items-center gap-3">
              <div className="w-28 sm:w-36 shrink-0 text-sm text-cocoa-800 truncate">
                {localized ? <LocalizedField field={localized} /> : d.name}
              </div>
              <div className="flex-1 h-2 rounded-full bg-cream-200 overflow-hidden">
                <div className="h-full bg-amber-600" style={{ width: `${pct}%` }} />
              </div>
              <div className="w-10 text-right text-xs font-mono text-cocoa-500">{pct}%</div>
              <div className="w-16 text-right text-sm font-mono text-cocoa-900">
                {formatCurrency(d.costUsd!, language)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
