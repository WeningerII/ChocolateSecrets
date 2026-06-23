import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Beaker, Play, Square } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../contexts/ToastContext';
import { useFormulationOptimizer } from '../../hooks/useFormulationOptimizer';
import { deriveSearchSpace } from '../../services/foodScience/optimizer';
import { sanitizeData } from '../../utils/firestore';
import { CandidateCard } from '../../components/optimizer/CandidateCard';
import { SearchSpaceList } from '../../components/optimizer/SearchSpaceList';
import type { OptimizerInput, OptimizerCandidate, ObjectiveWeights, OptimizerObjective, OptimizerTargets } from '../../types';

const DEFAULT_OBJECTIVES: OptimizerObjective[] = [
  'aw_distance_to_target',
  'shelf_life_weeks',
  'cost_per_gram',
  'curdle_safety_margin',
  'fat_regime_distance',
  'warning_count',
  'palatability_balance',
];

// Frozen-dessert texture objectives — only shown/active for frozen recipes,
// since they depend on a serving temperature and a target frozen fraction.
const TEXTURE_OBJECTIVES: OptimizerObjective[] = [
  'ice_fraction_at_serving_distance',
  'recrystallization_margin',
];

export function Formulate() {
  const { t } = useTranslation('chemistry' as any);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { recipes, ingredients } = useData();

  const baseRecipeId = searchParams.get('baseRecipeId');
  const baseRecipe = baseRecipeId ? recipes.find(r => r.id === baseRecipeId) : null;

  const isFrozen = !!baseRecipe
    && ((baseRecipe.categories ?? []).includes('frozen') || baseRecipe.frozenSubtype != null);
  const objectives = isFrozen ? [...DEFAULT_OBJECTIVES, ...TEXTURE_OBJECTIVES] : DEFAULT_OBJECTIVES;

  const [targets, setTargets] = useState<OptimizerTargets>({
    awTarget: 0.85,
    shelfLifeWeeksMin: 6,
    costPerGramMaxUsd: 0.05,
    forbiddenFatRegimes: ['oil-in-water'],
    maxCurdleRisk: 'medium',
  });

  const [weights, setWeights] = useState<ObjectiveWeights>(
    DEFAULT_OBJECTIVES.reduce((acc, o) => { acc[o] = 1; return acc; }, {} as ObjectiveWeights)
  );

  // Once the base recipe resolves as frozen, seed the texture targets + weights
  // (guarded so re-runs don't clobber chef edits). Handles async recipe load.
  useEffect(() => {
    if (!isFrozen) return;
    setTargets(s => s.servingTempC == null ? { ...s, servingTempC: -13, frozenWaterTarget: 0.73 } : s);
    setWeights(w => w.ice_fraction_at_serving_distance == null
      ? { ...w, ice_fraction_at_serving_distance: 1, recrystallization_margin: 1 }
      : w);
  }, [isFrozen]);

  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const { toast: appToast } = useToast();
  const { status, progress, result, error, run, cancel } = useFormulationOptimizer();

  const dimensions = useMemo(() => {
    if (!baseRecipe) return [];
    return deriveSearchSpace({
      recipe: baseRecipe,
      catalog: ingredients,
      lockedIngredientIds: lockedIds,
      candidateAdditionIds: [],
    });
  }, [baseRecipe, ingredients, lockedIds]);

  const handleRun = () => {
    if (!baseRecipe) return;
    const input: OptimizerInput = {
      baseRecipe,
      ingredientCatalog: ingredients,
      recipesCatalog: recipes,
      targets,
      weights,
      lockedIngredientIds: lockedIds,
      candidateAdditionIds: [],
    };
    run(input);
  };

  const handleSaveAsNew = async (candidate: OptimizerCandidate) => {
    try {
      const newRecipeData = {
        ...candidate.recipe,
        name: `${baseRecipe?.name ?? 'Recipe'} — ${t('optimizer.candidate.variantSuffix' as any)}`,
        description: `${baseRecipe?.description ?? ''}\n\n${(t as any)('optimizer.candidate.derivedNote', { id: baseRecipe?.id ?? '' })}`,
      };
      delete (newRecipeData as { id?: string }).id;
      delete (newRecipeData as { createdAt?: unknown }).createdAt;
      delete (newRecipeData as { updatedAt?: unknown }).updatedAt;

      const sanitized = sanitizeData(newRecipeData);
      const newDoc = await addDoc(collection(db, 'recipes'), {
        ...sanitized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      appToast.success(t('optimizer.candidate.savedToast' as any));
      navigate(`/recipes/${newDoc.id}`);
    } catch (e) {
      console.error(e);
      appToast.error(t('optimizer.candidate.saveFailedToast' as any));
    }
  };

  if (!baseRecipe) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h2 className="font-serif text-2xl text-cocoa-900">{t('optimizer.noBaseRecipe' as any)}</h2>
        <p className="text-cocoa-600 mt-2">{t('optimizer.noBaseRecipeHelp' as any)}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <header className="flex items-center gap-3 mb-6">
        <Beaker className="w-6 h-6 text-cocoa-700" />
        <div>
          <h1 className="font-serif text-2xl text-cocoa-900">{t('optimizer.pageTitle' as any)}</h1>
          <p className="text-sm text-cocoa-600">
            {t('optimizer.basedOn' as any)} <span className="font-medium">{baseRecipe.name}</span>
          </p>
        </div>
      </header>

      {/* Targets */}
      <section className="mb-5">
        <h2 className="text-sm font-serif text-cocoa-800 mb-2">{t('optimizer.targets.header' as any)}</h2>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <NumericField
            label={t('optimizer.targets.awTarget' as any)}
            value={targets.awTarget ?? 0}
            min={0.50} max={0.99} step={0.01}
            onChange={v => setTargets(s => ({ ...s, awTarget: v }))}
          />
          <NumericField
            label={t('optimizer.targets.shelfLifeWeeksMin' as any)}
            value={targets.shelfLifeWeeksMin ?? 0}
            min={1} max={52} step={1}
            onChange={v => setTargets(s => ({ ...s, shelfLifeWeeksMin: v }))}
          />
          <NumericField
            label={t('optimizer.targets.costPerGramMaxUsd' as any)}
            value={targets.costPerGramMaxUsd ?? 0}
            min={0.001} max={1.00} step={0.001}
            onChange={v => setTargets(s => ({ ...s, costPerGramMaxUsd: v }))}
          />
          {isFrozen && (
            <>
              <NumericField
                label={t('optimizer.targets.servingTempC' as any)}
                value={targets.servingTempC ?? -13}
                min={-30} max={-4} step={0.5}
                onChange={v => setTargets(s => ({ ...s, servingTempC: v }))}
              />
              <NumericField
                label={t('optimizer.targets.frozenWaterTarget' as any)}
                value={targets.frozenWaterTarget ?? 0.73}
                min={0.30} max={0.95} step={0.01}
                onChange={v => setTargets(s => ({ ...s, frozenWaterTarget: v }))}
              />
            </>
          )}
        </div>
      </section>

      {/* Weights */}
      <section className="mb-5">
        <h2 className="text-sm font-serif text-cocoa-800 mb-2">{t('optimizer.weights.header' as any)}</h2>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {objectives.map(obj => (
            <div key={obj} className="flex items-center gap-2">
              <label className="flex-1 text-cocoa-700">{t(`optimizer.objectives.${obj}` as any)}</label>
              <input
                type="range"
                min={0} max={2} step={0.1}
                value={weights[obj] ?? 0}
                onChange={e => setWeights(w => ({ ...w, [obj]: parseFloat(e.target.value) }))}
                className="w-24"
              />
              <span className="font-mono w-8 text-right">{(weights[obj] ?? 0).toFixed(1)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Search space */}
      <section className="mb-5">
        <h2 className="text-sm font-serif text-cocoa-800 mb-2">{t('optimizer.searchSpace.title' as any)}</h2>
        <SearchSpaceList
          dimensions={dimensions}
          ingredientCatalog={ingredients}
          lockedIds={lockedIds}
          onToggleLock={(id) => setLockedIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])}
        />
      </section>

      {/* Run / cancel */}
      <div className="flex items-center gap-3 mb-5">
        {status !== 'running' ? (
          <button
            type="button"
            onClick={handleRun}
            disabled={dimensions.length === 0}
            className="bg-cocoa-700 text-cream px-4 py-2 rounded inline-flex items-center gap-2 hover:bg-cocoa-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="w-4 h-4" />
            {t('optimizer.run' as any)}
          </button>
        ) : (
          <button
            type="button"
            onClick={cancel}
            className="bg-copper-600 text-cream px-4 py-2 rounded inline-flex items-center gap-2 hover:bg-copper-700 transition-colors"
          >
            <Square className="w-4 h-4" />
            {t('optimizer.cancel' as any)}
          </button>
        )}
        {status === 'running' && progress && (
          <p className="text-xs text-cocoa-600">
            {(t as any)('optimizer.progressLabel', {
              gen: progress.generation,
              total: progress.totalGenerations,
              front: progress.paretoFrontSize,
            })}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-copper-900/10 border border-copper-900 text-copper-900 rounded p-3 text-sm mb-5">
          {error}
        </div>
      )}

      {/* Results */}
      {result && result.candidates.length > 0 && (
        <section>
          <h2 className="text-sm font-serif text-cocoa-800 mb-3">
            {(t as any)('optimizer.results.header', { count: result.candidates.length })}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.candidates.map(c => (
              <CandidateCard
                key={c.id}
                candidate={c}
                baseRecipe={baseRecipe}
                onSaveAsNewRecipe={handleSaveAsNew}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function NumericField({
  label, value, min, max, step, onChange,
}: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="flex-1 text-cocoa-700">{label}</label>
      <input
        type="number"
        value={value}
        min={min} max={max} step={step}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="font-mono w-24 px-2 py-1 border border-cream-300 rounded focus:outline-none focus:ring-1 focus:ring-cocoa-500"
      />
    </div>
  );
}

export default Formulate;
