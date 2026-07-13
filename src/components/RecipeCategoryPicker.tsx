import { useTranslation } from 'react-i18next';
import { RECIPE_CATEGORIES, type RecipeCategory } from '../types';
import { Sparkles } from 'lucide-react';

interface RecipeCategoryPickerProps {
  selected: RecipeCategory[];
  onChange: (next: RecipeCategory[]) => void;
  onAutoDetect?: () => void;
}

export function RecipeCategoryPicker({ selected, onChange, onAutoDetect }: RecipeCategoryPickerProps) {
  const { t } = useTranslation('recipes');

  const toggle = (cat: RecipeCategory) => {
    if (selected.includes(cat)) onChange(selected.filter(c => c !== cat));
    else onChange([...selected, cat]);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs uppercase tracking-wide text-cocoa-500 font-medium">
        {t('recipes:category.label')}
      </span>
      {RECIPE_CATEGORIES.map(cat => {
        const active = selected.includes(cat);
        return (
          <button
            type="button"
            key={cat}
            onClick={() => toggle(cat)}
            className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
              active
                ? 'bg-cocoa-700 text-cream border-cocoa-700'
                : 'bg-cream-50 text-cocoa-600 border-cream-300 hover:bg-cream-100'
            }`}
          >
            {t(`category.${cat}` as any)}
          </button>
        );
      })}
      {onAutoDetect && (
        <button
          type="button"
          onClick={onAutoDetect}
          className="text-xs px-2.5 py-0.5 rounded-full border border-copper-300 text-copper-700 hover:bg-copper-50 inline-flex items-center gap-1 transition-colors"
        >
          <Sparkles className="w-3 h-3" />
          {t('recipes:category.autoDetect')}
        </button>
      )}
    </div>
  );
}
