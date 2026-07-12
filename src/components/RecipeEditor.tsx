import React, { useReducer, useState, useEffect } from 'react';
import { Recipe, Ingredient } from '../types';
import { X, AlertCircle, Calculator, Palette, ListTree, Info, Loader2, Wrench } from 'lucide-react';
import { calculateRecipeCost } from '../utils/recipeMath';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import { formatCurrency } from '../utils/formatters';
import { suggestEquipmentForStep, mergeEquipment } from '../services/culinaryTools';
import { computeCrossContactRisks } from '../utils/foodSafety';
import { useRecipePhysics } from '../hooks/useRecipePhysics';
import { deriveRecipeDietaryFlags } from '../utils/dietary';
import {
  recipeReducer,
  hydrateTranslationsFromLegacy,
} from './recipeEditor/recipeReducer';
import { OverviewTab } from './recipeEditor/OverviewTab';
import { DesignTab } from './recipeEditor/DesignTab';
import { ComponentsTab } from './recipeEditor/ComponentsTab';

// Re-export barrel: keeps `import { hydrateTranslationsFromLegacy } from './RecipeEditor'` resolving unchanged.
export { hydrateTranslationsFromLegacy } from './recipeEditor/recipeReducer';

interface RecipeEditorProps {
  initialRecipe: Recipe | null;
  ingredients: Ingredient[];
  recipes: Recipe[];
  onSave: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

export default function RecipeEditor({ initialRecipe, ingredients, recipes, onSave, onCancel }: RecipeEditorProps) {
  const { t, i18n } = useTranslation(['recipes', 'enums', 'common', 'chemistry']);
  const language = useLanguage();
  const initialState: Partial<Recipe> = hydrateTranslationsFromLegacy(initialRecipe) || {
    name: '',
    description: '',
    type: 'standard',
    components: [],
    design: [],
    tags: [],
    customFields: [],
    hardware: { moldId: '', shape: '', cavitiesPerMold: 0, moldCount: 0, gramPerCavity: 0 }
  };

  const [state, dispatch] = useReducer(recipeReducer, initialState);
  const [showProductionDetails, setShowProductionDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'design' | 'components'>('overview');
  const [editorMode, setEditorMode] = useState<'simple' | 'complex'>(() => {
    const comps = initialRecipe?.components || [];
    if (comps.length === 0) return 'simple';
    if (comps.length === 1 && comps[0].percentageOfTotalWeight === 100) return 'simple';
    return 'complex';
  });

  const [expandedIngredients, setExpandedIngredients] = useState<Set<string>>(new Set());

  const toggleIngredientExpansion = (compIndex: number, ingIndex: number) => {
    const key = `${compIndex}-${ingIndex}`;
    setExpandedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    const toExpand = new Set<string>();
    (state.components || []).forEach((comp, cIdx) => {
      comp.ingredients.forEach((ing, iIdx) => {
        if (ing.state || ing.convertedQuantities || ing.isDiscrete || ing.originalString) {
          toExpand.add(`${cIdx}-${iIdx}`);
        }
      });
    });
    setExpandedIngredients(toExpand);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (editorMode === 'simple' && (state.components || []).length === 0) {
      dispatch({ type: 'ADD_COMPONENT', t });
    }
  }, [editorMode]);

  useEffect(() => {
    if (editorMode === 'simple' && (state.components || []).length === 1) {
      const comp = state.components![0];
      if (comp.percentageOfTotalWeight !== 100) {
        dispatch({ type: 'UPDATE_COMPONENT', index: 0, field: 'percentageOfTotalWeight', value: 100 });
      }
    }
  }, [editorMode, state.components?.length]);

  const [targetBatchWeight, setTargetBatchWeight] = useState<number>(1000);

  const [draggedComponentIndex, setDraggedComponentIndex] = useState<number | null>(null);
  const [draggedDesignIndex, setDraggedDesignIndex] = useState<number | null>(null);
  const [draggedInstructionIndex, setDraggedInstructionIndex] = useState<{compIndex: number, instIndex: number} | null>(null);

  const [tagInput, setTagInput] = useState('');

  const [validationIssues, setValidationIssues] = useState<Array<{severity: string; field: string; message: string; suggestedValue?: any}>>([]);
  const [showProvenanceLegend, setShowProvenanceLegend] = useState(false);

  useEffect(() => {
    // Load validation issues stored by the Recipes page during extraction
    try {
      const stored = sessionStorage.getItem('extractionValidationIssues');
      if (stored && initialRecipe) {
        const entries: Array<[number, any[]]> = JSON.parse(stored);
        // For now, apply the first recipe's issues — we'd need a better keying strategy for multi-recipe extractions
        if (entries.length > 0 && entries[0][1]) {
          setValidationIssues(entries[0][1]);
        }
      }
    } catch {}
  }, [initialRecipe]);

  const [dismissedIssues, setDismissedIssues] = useState<Set<number>>(new Set());
  const [equipmentFilled, setEquipmentFilled] = useState(false);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      dispatch({ type: 'ADD_TAG', tag: tagInput.trim() });
      setTagInput('');
    }
  };

  const handleFillEquipment = () => {
    const updatedComponents = (state.components || []).map(comp => ({
      ...comp,
      steps: (comp.steps || []).map(step => {
        const suggestions = suggestEquipmentForStep({
          actionType: step.actionType,
          title: step.title,
          parameters: step.parameters,
        });
        if (suggestions.length === 0) return step;
        const merged = mergeEquipment(step.equipment || [], suggestions);
        // If nothing changed (all suggestions already present), skip the update
        if (merged.length === (step.equipment || []).length) return step;
        return { ...step, equipment: merged };
      }),
    }));
    dispatch({ type: 'SET_FIELD', field: 'components', value: updatedComponents });
    setEquipmentFilled(true);
    setTimeout(() => setEquipmentFilled(false), 2500); // transient confirmation
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    const finalState = { ...state };
    finalState.name = finalState.name?.trim() || 'Untitled Recipe';
    finalState.type = finalState.type || 'standard';
    
    // Strip UI-only state from ingredients
    if (finalState.components) {
      finalState.components = finalState.components.map(comp => ({
        ...comp,
        ingredients: (comp.ingredients || []).map(ing => {
          const { name, showIngredientSuggestions, ...rest } = ing;
          return rest;
        })
      }));
    }

    // Cross-contact risks derivation at save time
    const crossContactRisks = computeCrossContactRisks(
      finalState as Recipe,
      recipes,
      ingredients
    );
    finalState.crossContactRisks = crossContactRisks;

    const resolved = (finalState.components ?? []).flatMap(c => c.ingredients ?? []);
    const lactosePcts = resolved.map(i => {
      const ing = ingredients.find(catIng => catIng.id === i.ingredientId);
      return ing?.composition?.lactose ?? 0;
    });
    const masses = resolved.map(i => i.quantity ?? 0);
    const totalServings = Math.max(1, finalState.yield?.totalYieldAmount ?? 1);
    finalState.dietary = deriveRecipeDietaryFlags(lactosePcts, masses, totalServings);
    
    setIsSaving(true);
    try {
      await onSave(finalState as Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>);
      setIsSaving(false);
    } catch (e) {
      setIsSaving(false);
    }
  };

  const totalPercentage = (state.components || []).reduce((sum, comp) => sum + (comp.percentageOfTotalWeight || 0), 0);
  const isMolded = state.type === 'molded_praline' || state.type === 'bonbon' || state.type === 'bar';

  const calculateComponentWeight = (percentage: number) => {
    if (isMolded && state.hardware) {
      const totalYieldWeight = state.hardware.cavitiesPerMold * state.hardware.moldCount * state.hardware.gramPerCavity;
      return totalYieldWeight * (percentage / 100);
    }
    return targetBatchWeight * (percentage / 100);
  };

  const physics = useRecipePhysics(state as Recipe, ingredients, recipes, 1);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[95vh] flex flex-col">
        <div className="px-6 py-4 border-b border-cocoa-100 flex justify-between items-center shrink-0 bg-white z-10 sticky top-0 rounded-t-2xl">
          <h3 className="font-display text-2xl font-semibold text-cocoa-900">
            {initialRecipe ? t('recipes:editor.editRecipe') : t('recipes:editor.addRecipe')}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowProvenanceLegend(!showProvenanceLegend)}
              className="text-cocoa-500 hover:text-cocoa-900 p-1"
              title={t('recipes:editor.provenance.legend')}
            >
              <Info className="w-4 h-4" />
            </button>
            <button onClick={onCancel} className="text-cocoa-300 hover:text-cocoa-700">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {validationIssues.filter((_, i) => !dismissedIssues.has(i)).length > 0 && (
          <div className="px-6 py-3 bg-vanilla-cream border-b border-copper/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-copper-dark shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-cocoa-900 mb-1">
                  {t('recipes:editor.validation.title', { count: validationIssues.filter((_, i) => !dismissedIssues.has(i)).length })}
                </h4>
                <ul className="space-y-1">
                  {validationIssues.map((issue, idx) => !dismissedIssues.has(idx) && (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className={`inline-block w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        issue.severity === 'error' ? 'bg-raspberry' :
                        issue.severity === 'warning' ? 'bg-copper' : 'bg-cocoa-300'
                      }`} />
                      <span className="flex-1 text-cocoa-700">
                        <span className="font-medium text-cocoa-900">{issue.field}:</span> {issue.message}
                        {issue.suggestedValue && (
                          <span className="text-cocoa-500 italic"> (suggested: {String(issue.suggestedValue)})</span>
                        )}
                      </span>
                      <button
                        onClick={() => setDismissedIssues(prev => new Set(prev).add(idx))}
                        className="text-cocoa-300 hover:text-cocoa-700 text-xs"
                        title={t('recipes:editor.validation.dismiss')}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {showProvenanceLegend && (
          <div className="px-6 py-4 bg-cream border-b border-cocoa-100">
            <h4 className="text-sm font-semibold text-cocoa-900 mb-3">{t('recipes:editor.provenance.legendTitle')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-pistachio shrink-0" />
                <span className="font-medium text-pistachio">{t('recipes:editor.provenance.fromCard')}</span>
                <span className="text-cocoa-500">{t('recipes:editor.provenance.fromCardDescription')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-copper shrink-0" />
                <span className="font-medium text-copper">{t('recipes:editor.provenance.inferred')}</span>
                <span className="text-cocoa-500">{t('recipes:editor.provenance.inferredDescription')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-raspberry shrink-0" />
                <span className="font-medium text-raspberry">{t('recipes:editor.provenance.guess')}</span>
                <span className="text-cocoa-500">{t('recipes:editor.provenance.guessDescription')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-cocoa-300 shrink-0" />
                <span className="font-medium text-cocoa-700">{t('recipes:editor.provenance.confirmedEdited')}</span>
                <span className="text-cocoa-500">{t('recipes:editor.provenance.confirmedDescription')}</span>
              </div>
            </div>
            <button
              onClick={() => setShowProvenanceLegend(false)}
              className="mt-3 text-xs text-cocoa-500 hover:text-cocoa-900 underline"
            >
              {t('recipes:editor.provenance.close')}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-cocoa-100 px-6 shrink-0 bg-cream sticky top-[61px] z-10 items-center">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 font-medium text-sm border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'overview' ? 'border-copper text-copper-dark' : 'border-transparent text-cocoa-500 hover:text-cocoa-700'}`}
          >
            <Info className="w-4 h-4" /> {t('recipes:editor.overview')}
          </button>
          {isMolded && (
            <button
              type="button"
              onClick={() => setActiveTab('design')}
              className={`px-4 py-3 font-medium text-sm border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'design' ? 'border-copper text-copper-dark' : 'border-transparent text-cocoa-500 hover:text-cocoa-700'}`}
            >
              <Palette className="w-4 h-4" /> {t('recipes:editor.design')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('components')}
            className={`px-4 py-3 font-medium text-sm border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'components' ? 'border-copper text-copper-dark' : 'border-transparent text-cocoa-500 hover:text-cocoa-700'}`}
          >
            <ListTree className="w-4 h-4" /> {editorMode === 'simple' ? t('recipes:editor.ingredientsAndSteps') : t('recipes:editor.components')}
          </button>
          
          <div className="ml-auto pr-2">
            <button
              type="button"
              onClick={() => setEditorMode(editorMode === 'simple' ? 'complex' : 'simple')}
              className="text-xs text-cocoa-500 hover:text-cocoa-700 px-2 py-1 rounded hover:bg-cocoa-100 transition-colors"
              title={editorMode === 'simple' ? t('recipes:editor.showAdvanced') : t('recipes:editor.showSimple')}
            >
              {editorMode === 'simple' ? t('recipes:editor.advancedMode') : t('recipes:editor.simpleMode')}
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <form id="recipe-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* OVERVIEW TAB */}
            <div className={activeTab === 'overview' ? 'block' : 'hidden'}>
              <OverviewTab
                state={state}
                dispatch={dispatch}
                t={t}
                ingredients={ingredients}
                physics={physics}
                initialRecipe={initialRecipe}
                isMolded={isMolded}
                showProductionDetails={showProductionDetails}
                setShowProductionDetails={setShowProductionDetails}
                tagInput={tagInput}
                setTagInput={setTagInput}
                handleAddTag={handleAddTag}
              />
            </div>

            {/* DESIGN TAB */}
            <div className={activeTab === 'design' ? 'block' : 'hidden'}>
              <DesignTab
                state={state}
                dispatch={dispatch}
                t={t}
                draggedDesignIndex={draggedDesignIndex}
                setDraggedDesignIndex={setDraggedDesignIndex}
              />
            </div>

            {/* COMPONENTS TAB */}
            <div className={activeTab === 'components' ? 'block' : 'hidden'}>
              <ComponentsTab
                state={state}
                dispatch={dispatch}
                t={t}
                ingredients={ingredients}
                recipes={recipes}
                physics={physics}
                initialRecipe={initialRecipe}
                editorMode={editorMode}
                expandedIngredients={expandedIngredients}
                toggleIngredientExpansion={toggleIngredientExpansion}
                draggedComponentIndex={draggedComponentIndex}
                setDraggedComponentIndex={setDraggedComponentIndex}
                draggedInstructionIndex={draggedInstructionIndex}
                setDraggedInstructionIndex={setDraggedInstructionIndex}
              />
            </div>
          </form>
        </div>
        
        {/* Live Math Readout Footer */}
        <div className="border-t border-cocoa-100 bg-cream rounded-b-2xl shrink-0">
          <div className="px-6 py-3 border-b border-cocoa-100 flex flex-wrap items-center justify-between gap-4 bg-white">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-cocoa-700">
                <Calculator className="w-5 h-5 text-copper" />
                <span className="font-medium text-sm">{t('recipes:editor.liveCalculator')}</span>
              </div>
              {!isMolded && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-cocoa-500">{t('recipes:editor.targetBatch')}</span>
                  <input 
                    type="number" 
                    value={targetBatchWeight} 
                    onChange={(e) => setTargetBatchWeight(Number(e.target.value))}
                    className="w-20 px-2 py-1 text-sm border border-cocoa-300 rounded"
                  />
                  <span className="text-xs text-cocoa-500">{t(`enums:units.g` as any, 'g')}</span>
                </div>
              )}
              {isMolded && state.hardware && (
                <div className="text-xs text-cocoa-700 bg-cocoa-100 px-3 py-1.5 rounded-lg border border-cocoa-100">
                  {t('recipes:editor.yield')} <span className="font-bold">{state.hardware.cavitiesPerMold * state.hardware.moldCount}</span> {t('recipes:editor.pcs')} 
                  @ <span className="font-bold">{state.hardware.gramPerCavity}</span>{t(`enums:units.g` as any, 'g')} 
                  = <span className="font-bold text-copper-dark">{state.hardware.cavitiesPerMold * state.hardware.moldCount * state.hardware.gramPerCavity}</span>{t(`enums:units.g` as any, 'g')} {t('recipes:editor.total')}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-cocoa-700 bg-cocoa-100 px-3 py-1.5 rounded-lg border border-cocoa-100">
                <span className="text-xs text-cocoa-500">{t('recipes:editor.estCost')}</span>
                <span className="font-bold text-cocoa-900">{formatCurrency(calculateRecipeCost(state as Recipe, ingredients, recipes).cost, language)}</span>
              </div>
              <div className={`font-medium ${totalPercentage === 100 ? 'text-green-600' : 'text-copper'}`}>
                {t('recipes:editor.totalPercentage', { total: totalPercentage })}
              </div>
              {(state.components || []).map((comp, idx) => (
                <div key={idx} className="text-cocoa-500 text-xs flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-stone-300"></span>
                  {comp.name || t('recipes:editor.unnamed')}: <span className="font-medium text-cocoa-700">{calculateComponentWeight(comp.percentageOfTotalWeight).toFixed(1)}{t(`enums:units.g` as any, 'g')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-cocoa-100 flex justify-between items-center shrink-0 bg-cream rounded-b-2xl sticky bottom-0 z-10">
          <div className="flex items-center gap-4">
            <div className="text-sm text-cocoa-500">
              {t('recipes:editor.totalPercentageLabel')}: <span className={`font-bold ${totalPercentage === 100 ? 'text-emerald-600' : 'text-copper'}`}>{totalPercentage}%</span>
            </div>
            {editorMode === 'complex' && (
              <button
                type="button"
                onClick={handleFillEquipment}
                className="inline-flex items-center gap-2 text-sm text-cocoa-500 hover:text-cocoa-900 px-3 py-1.5 rounded-lg hover:bg-cocoa-100 transition-colors"
                title={t('recipes:suggestEquipmentTooltip')}
              >
                <Wrench className="w-4 h-4" />
                {equipmentFilled ? t('recipes:equipmentFilled') : t('recipes:suggestEquipment')}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-cocoa-700 font-medium hover:text-cocoa-900"
            >
              {t('common:cancel')}
            </button>
            <button
              type="submit"
              form="recipe-form"
              disabled={isSaving}
              className="bg-copper hover:bg-copper-dark text-white px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed min-w-[140px] justify-center"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('recipes:editor.saving')}
                </>
              ) : (
                initialRecipe ? t('recipes:editor.updateRecipe') : t('recipes:editor.saveRecipe')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
