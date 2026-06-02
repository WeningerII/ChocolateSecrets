import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/DataContext';
import { Recipe, FieldMeta, Provenance } from '../types';
import { ArrowLeft, AlertCircle } from 'lucide-react';

type ProvenanceHealth = {
  verbatim: number;
  inferred_high: number;
  inferred_low: number;
  user_confirmed: number;
  user_edited: number;
  total: number;
};

export function analyzeRecipe(recipe: Recipe): ProvenanceHealth {
  const health: ProvenanceHealth = {
    verbatim: 0, inferred_high: 0, inferred_low: 0,
    user_confirmed: 0, user_edited: 0, total: 0,
  };
  
  const walk = (meta?: Record<string, FieldMeta>) => {
    if (!meta) return;
    for (const key of Object.keys(meta)) {
      const p = meta[key].provenance;
      if (p) {
        health[p]++;
        health.total++;
      }
    }
  };
  
  walk(recipe.meta);
  for (const comp of recipe.components || []) {
    for (const ing of comp.ingredients) {
      walk((ing as any).meta);
    }
    for (const step of comp.steps || []) {
      walk((step as any).meta);
    }
  }
  
  return health;
}

function dominantProvenance(health: ProvenanceHealth): Provenance | 'untagged' {
  if (health.total === 0) return 'untagged';
  const entries: Array<[Provenance, number]> = [
    ['verbatim', health.verbatim],
    ['inferred_high', health.inferred_high],
    ['inferred_low', health.inferred_low],
    ['user_confirmed', health.user_confirmed],
    ['user_edited', health.user_edited],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

export default function RecipeAudit() {
  const { t } = useTranslation(['recipes']);
  const { recipes, loading } = useData();
  
  const analyses = React.useMemo(() => 
    recipes.map(r => ({ recipe: r, health: analyzeRecipe(r) })),
    [recipes]
  );
  
  const stats = React.useMemo(() => {
    const s = {
      totalRecipes: recipes.length,
      extracted: 0, // extractionVersion >= 2
      hasLowConfidenceFields: 0,
      untagged: 0,
    };
    for (const { recipe, health } of analyses) {
      if ((recipe.extractionVersion || 0) >= 2) s.extracted++;
      if (health.inferred_low > 0) s.hasLowConfidenceFields++;
      if (health.total === 0) s.untagged++;
    }
    return s;
  }, [analyses, recipes]);
  
  if (loading) return <div className="p-8 text-center text-cocoa-500">{t('recipes:audit.loading')}</div>;
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <Link to="/recipes" className="inline-flex items-center gap-2 text-cocoa-500 hover:text-cocoa-900 text-sm mb-4">
        <ArrowLeft className="w-4 h-4" /> {t('recipes:backToList')}
      </Link>
      
      <h1 className="font-display text-4xl font-semibold text-cocoa-900 mb-2">{t('recipes:audit.title')}</h1>
      <p className="text-cocoa-500 mb-8">{t('recipes:audit.subtitle', { count: stats.totalRecipes })}</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-cocoa-100">
          <p className="text-xs text-cocoa-500">{t('recipes:audit.totalRecipes')}</p>
          <p className="font-display text-2xl font-semibold text-cocoa-900 mt-1">{stats.totalRecipes}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-cocoa-100">
          <p className="text-xs text-cocoa-500">{t('recipes:audit.aiExtracted')}</p>
          <p className="font-display text-2xl font-semibold text-pistachio mt-1">{stats.extracted}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-cocoa-100">
          <p className="text-xs text-cocoa-500">{t('recipes:audit.hasLowConfidence')}</p>
          <p className="font-display text-2xl font-semibold text-raspberry mt-1">{stats.hasLowConfidenceFields}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-cocoa-100">
          <p className="text-xs text-cocoa-500">{t('recipes:audit.untaggedLegacy')}</p>
          <p className="font-display text-2xl font-semibold text-cocoa-500 mt-1">{stats.untagged}</p>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl border border-cocoa-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-parchment">
            <tr>
              <th className="text-left px-4 py-3 font-display font-medium text-sm text-cocoa-700">{t('recipes:audit.recipeColumn')}</th>
              <th className="text-left px-4 py-3 font-display font-medium text-sm text-cocoa-700">{t('recipes:audit.versionColumn')}</th>
              <th className="text-left px-4 py-3 font-display font-medium text-sm text-cocoa-700">{t('recipes:audit.provenanceHealthColumn')}</th>
              <th className="text-left px-4 py-3 font-display font-medium text-sm text-cocoa-700">{t('recipes:audit.issuesColumn')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cocoa-100">
            {analyses.map(({ recipe, health }) => {
              const dominant = dominantProvenance(health);
              return (
                <tr key={recipe.id} className="hover:bg-cream">
                  <td className="px-4 py-3">
                    <Link to={`/recipes/${recipe.id}`} className="text-cocoa-900 hover:text-copper-dark font-medium">
                      {recipe.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-cocoa-500">
                    v{recipe.extractionVersion || 1}
                  </td>
                  <td className="px-4 py-3">
                    {health.total === 0 ? (
                      <span className="text-xs text-cocoa-300 italic">{t('recipes:audit.untagged')}</span>
                    ) : (
                      <div className="flex items-center gap-1 text-xs">
                        {health.verbatim > 0 && <span className="text-pistachio">{health.verbatim}V</span>}
                        {health.inferred_high > 0 && <span className="text-copper">{health.inferred_high}I</span>}
                        {health.inferred_low > 0 && <span className="text-raspberry">{health.inferred_low}?</span>}
                        {health.user_confirmed > 0 && <span className="text-cocoa-500">{health.user_confirmed}✓</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {health.inferred_low > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-raspberry">
                        <AlertCircle className="w-3 h-3" />
                        {t('recipes:audit.fieldsNeedReview', { count: health.inferred_low })}
                      </span>
                    ) : (
                      <span className="text-xs text-cocoa-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
