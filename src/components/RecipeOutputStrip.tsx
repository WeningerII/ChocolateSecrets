import { useTranslation } from 'react-i18next';
import type { Recipe, Ingredient } from '../types';
import type { RecipePhysics } from '../hooks/useRecipePhysics';
import { LocalizedField } from './LocalizedField';

interface RecipeOutputStripProps {
  recipe: Recipe;
  ingredients: Ingredient[];
  physics: RecipePhysics;
}

export function RecipeOutputStrip({ recipe, ingredients, physics }: RecipeOutputStripProps) {
  const { t } = useTranslation('chemistry');
  const ingredientMap = new Map(ingredients.map(i => [i.id, i]));

  // Aggregate amounts by ingredient (combine duplicates across components)
  const aggregated = new Map<string, { name: string; mass: number; localized?: Ingredient['nameI18n'] }>();
  for (const component of recipe.components ?? []) {
    for (const ri of component.ingredients ?? []) {
      const key = ri.ingredientId || ri.recipeId;
      if (!key) continue;
      const mass = physics.computedAmounts.get(key) ?? 0;
      if (mass <= 0) continue;
      const ing = ri.ingredientId ? ingredientMap.get(ri.ingredientId) : undefined;
      const name = ing?.name ?? 'Unknown';
      const localized = ing?.nameI18n;
      const existing = aggregated.get(name);
      if (existing) existing.mass += mass;
      else aggregated.set(name, { name, mass, localized });
    }
  }

  const items = Array.from(aggregated.values()).sort((a, b) => b.mass - a.mass);

  const yieldCount = recipe.hardware?.gramPerCavity
    ? Math.max(1, Math.round(physics.totalMass / recipe.hardware.gramPerCavity))
    : null;

  const weeks = physics.shelfLife.weeks;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-md bg-cream-50 px-5 py-4 border border-cream-200">
      {items.map((it, idx) => (
        <div key={it.name + idx} className="flex flex-col">
          <p className="text-[11px] uppercase tracking-wide text-cocoa-500 font-medium">
            {it.localized
              ? <LocalizedField field={it.localized} />
              : it.name}
          </p>
          <p className="font-mono text-base text-cocoa-900">
            {Math.round(it.mass)} g
          </p>
        </div>
      ))}
      <div className="ml-auto flex items-baseline gap-6">
        <div className="flex flex-col">
          <p className="text-[11px] uppercase tracking-wide text-cocoa-500 font-medium">
            {t('chemistry:strip.totalMass')}
          </p>
          <p className="font-mono text-base text-cocoa-900">{Math.round(physics.totalMass)} g</p>
        </div>
        {yieldCount !== null && (
          <div className="flex flex-col">
            <p className="text-[11px] uppercase tracking-wide text-cocoa-500 font-medium">
              {t('chemistry:strip.yield')}
            </p>
            <p className="font-mono text-base text-cocoa-900">{yieldCount}</p>
          </div>
        )}
        <div className="flex flex-col">
          <p className="text-[11px] uppercase tracking-wide text-cocoa-500 font-medium">
            {t('chemistry:strip.shelfLife')}
          </p>
          <p className="font-mono text-base text-cocoa-900">
            {t('chemistry:shelfLife.weeksOther' as any, { count: weeks })}
          </p>
        </div>
      </div>
    </div>
  );
}
