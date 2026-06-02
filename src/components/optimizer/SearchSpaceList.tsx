import { useTranslation } from 'react-i18next';
import { Lock, Unlock } from 'lucide-react';
import type { SearchDimension, Ingredient } from '../../types';

interface SearchSpaceListProps {
  dimensions: SearchDimension[];
  ingredientCatalog: Ingredient[];
  lockedIds: string[];
  onToggleLock: (ingredientId: string) => void;
}

export function SearchSpaceList({
  dimensions, ingredientCatalog, lockedIds, onToggleLock,
}: SearchSpaceListProps) {
  const { t } = useTranslation('chemistry' as any);
  const catalogById = new Map(ingredientCatalog.map(i => [i.id, i]));

  // Group dimensions by ingredient for display
  const byIngredient = new Map<string, SearchDimension[]>();
  for (const d of dimensions) {
    const id =
      d.kind === 'continuous_mass' ? d.ingredientId
      : d.kind === 'parametric_choice' ? d.ingredientId
      : d.kind === 'discrete_swap' ? d.candidateIngredientIds[0]
      : d.kind === 'continuous_pct_of_role' ? d.ingredientId
      : d.candidateIngredientIds[0];
    const list = byIngredient.get(id) ?? [];
    list.push(d);
    byIngredient.set(id, list);
  }

  return (
    <div className="border border-cream-200 rounded-md bg-cream-50 p-3">
      <p className="text-[10px] uppercase tracking-wider text-cocoa-500 mb-2">
        {t('optimizer.searchSpace.header' as any)} ({dimensions.length} {t('optimizer.searchSpace.dimensions' as any)})
      </p>
      {byIngredient.size === 0 ? (
        <p className="text-xs italic text-cocoa-500">{t('optimizer.searchSpace.empty' as any)}</p>
      ) : (
        <ul className="divide-y divide-cream-100">
          {Array.from(byIngredient.entries()).map(([id, dims]) => {
            const ing = catalogById.get(id);
            const locked = lockedIds.includes(id);
            return (
              <li key={id} className="py-1.5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-cocoa-800 font-medium">{ing?.name ?? id}</span>
                  <span className="text-cocoa-500 ml-2">
                    {dims.map(d => t(`optimizer.searchSpace.dimensionKind.${d.kind}` as any)).join(' as any, ')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleLock(id)}
                  className="p-1 hover:bg-cream-200 rounded transition-colors"
                  aria-label={locked ? t('optimizer.searchSpace.unlock' as any) : t('optimizer.searchSpace.lock' as any)}
                >
                  {locked
                    ? <Lock className="w-3 h-3 text-copper-600" />
                    : <Unlock className="w-3 h-3 text-cocoa-500" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
