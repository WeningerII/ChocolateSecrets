import React from 'react';
import type { TFunction } from 'i18next';
import { Recipe, Ingredient } from '../../types';
import { RECIPE_TYPES } from '../../constants';
import { AlertCircle, FileText, Plus, Trash2, X, ChevronDown } from 'lucide-react';
import { TranslationTabs } from '../TranslationTabs';
import { RecipeCategoryPicker } from '../RecipeCategoryPicker';
import { EditorPhysicsRibbon } from '../EditorPhysicsRibbon';
import { EditorFrozenStrip } from '../EditorFrozenStrip';
import { EditorBreadStrip } from '../EditorBreadStrip';
import { RecipeWarningsList } from '../RecipeWarningsList';
import { inferRecipeCategories } from '../../utils/categoryInference';
import type { RecipePhysics } from '../../hooks/useRecipePhysics';
import type { Action } from './recipeEditor.types';
import { getProvenanceStyle, getFieldMeta } from './recipeReducer';
import { ProvenanceBadge, ConfidenceDot } from './editorShared';

interface OverviewTabProps {
  state: Partial<Recipe>;
  dispatch: React.Dispatch<Action>;
  t: TFunction<readonly ['recipes', 'enums', 'common', 'chemistry']>;
  ingredients: Ingredient[];
  physics: RecipePhysics | null;
  initialRecipe: Recipe | null;
  isMolded: boolean;
  showProductionDetails: boolean;
  setShowProductionDetails: React.Dispatch<React.SetStateAction<boolean>>;
  tagInput: string;
  setTagInput: React.Dispatch<React.SetStateAction<string>>;
  handleAddTag: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function OverviewTab({
  state,
  dispatch,
  t,
  ingredients,
  physics,
  initialRecipe,
  isMolded,
  showProductionDetails,
  setShowProductionDetails,
  tagInput,
  setTagInput,
  handleAddTag,
}: OverviewTabProps) {
  return (
    <>
      <div className="mb-6 space-y-4">
        <EditorPhysicsRibbon physics={physics} />
        {state.categories?.includes('frozen') && physics && <EditorFrozenStrip physics={physics} />}
        {state.categories?.includes('bread') && physics?.bread && <EditorBreadStrip bread={physics.bread} />}
        {physics?.warnings.length || physics?.confectionery?.warnings.length || physics?.frozen?.warnings.length || physics?.bread?.warnings.length ? (
          <RecipeWarningsList
            universal={physics.warnings}
            confectionery={physics.confectionery?.warnings}
            frozen={physics.frozen?.warnings}
            bread={physics.bread?.warnings}
          />
        ) : null}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1">
            <RecipeCategoryPicker
              selected={state.categories || []}
              onChange={(next) => dispatch({ type: 'UPDATE_FIELD', field: 'categories', value: next })}
              onAutoDetect={() => {
                const catalog = new Map(ingredients.map(i => [i.id, i]));
                const inferred = inferRecipeCategories(state as Recipe, catalog);
                dispatch({ type: 'UPDATE_FIELD', field: 'categories', value: inferred.categories });
                if (inferred.frozenSubtype) {
                  dispatch({ type: 'UPDATE_FIELD', field: 'frozenSubtype', value: inferred.frozenSubtype });
                }
              }}
            />
          </div>
          {state.categories?.includes('frozen') && (
            <div className="w-full sm:w-64">
              <label className="block text-sm font-medium text-slate-700 mb-1 ml-1" htmlFor="frozenSubtypePicker">
                {t('frozen.subtypeOverride', 'Frozen Subtype Override')}
              </label>
              <select
                id="frozenSubtypePicker"
                className="w-full border-slate-300 rounded-md shadow-sm focus:border-sky-500 focus:ring-sky-500 text-sm"
                value={state.frozenSubtype || ''}
                onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'frozenSubtype', value: e.target.value || undefined })}
              >
                <option value="">{t('frozen.autoDetect', 'Auto (Composition-Based)')}</option>
                <option value="gelato">Gelato</option>
                <option value="ice_cream">Ice Cream</option>
                <option value="sorbet">Sorbet</option>
                <option value="sherbet">Sherbet</option>
                <option value="frozen_yogurt">Frozen Yogurt</option>
                <option value="granita">Granita</option>
                <option value="semifreddo">Semifreddo</option>
              </select>
            </div>
          )}
          {state.categories?.includes('bread') && (
            <div className="w-full sm:w-64">
              <label className="block text-sm font-medium text-slate-700 mb-1 ml-1" htmlFor="breadSubtypePicker">
                {t('bread.subtypeOverride', 'Bread Subtype Override')}
              </label>
              <select
                id="breadSubtypePicker"
                className="w-full border-slate-300 rounded-md shadow-sm focus:border-sky-500 focus:ring-sky-500 text-sm"
                value={state.breadSubtype || ''}
                onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'breadSubtype', value: e.target.value || undefined })}
              >
                <option value="">{t('bread.autoDetect', 'Auto (Composition-Based)')}</option>
                <option value="standard_bread">{t('bread.recipeSubtype.standard_bread', 'Standard Bread')}</option>
                <option value="ciabatta">{t('bread.recipeSubtype.ciabatta', 'Ciabatta')}</option>
                <option value="baguette">{t('bread.recipeSubtype.baguette', 'Baguette')}</option>
                <option value="bagel">{t('bread.recipeSubtype.bagel', 'Bagel')}</option>
                <option value="pizza_dough">{t('bread.recipeSubtype.pizza_dough', 'Pizza Dough')}</option>
                <option value="brioche">{t('bread.recipeSubtype.brioche', 'Brioche')}</option>
                <option value="sourdough">{t('bread.recipeSubtype.sourdough', 'Sourdough')}</option>
                <option value="pan_loaf">{t('bread.recipeSubtype.pan_loaf', 'Pan Loaf')}</option>
                <option value="whole_wheat">{t('bread.recipeSubtype.whole_wheat', 'Whole Wheat')}</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {state.needsReview && (
        <div className="mb-6 p-4 bg-vanilla-cream border border-copper/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-copper shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-copper-dark">{t('recipes:editor.aiReviewTitle')}</h4>
            <p className="text-sm text-copper-dark mt-1">{state.aiExtractionNotes || t('recipes:editor.aiReviewMessage')}</p>
          </div>
        </div>
      )}
      {state.rawExtractionData && (
        <div className="mb-6 p-4 bg-cream border border-cocoa-100 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-cocoa-500" />
            <h4 className="text-sm font-semibold text-cocoa-900">{t('recipes:editor.aiNotes')}</h4>
          </div>
          <p className="text-sm text-cocoa-700 whitespace-pre-wrap font-mono text-xs bg-white p-3 rounded border border-cocoa-100 max-h-40 overflow-y-auto">
            {state.rawExtractionData}
          </p>
          <p className="text-[10px] text-cocoa-300 mt-2 italic">
            {t('recipes:editor.aiCategorizationNote')}
          </p>
        </div>
      )}
      {initialRecipe?.confidence?.overall !== undefined && (
        <div className="mb-6 flex items-center gap-2 px-4 py-2 bg-cream border border-cocoa-100 rounded-lg text-sm text-cocoa-700 max-w-fit">
          <span className="font-medium">{t('recipes:editor.aiConfidenceLabel')}</span>
          <ConfidenceDot confidence={initialRecipe.confidence.overall} label="Overall" />
          <span className="font-bold text-cocoa-900">{Math.round(initialRecipe.confidence.overall * 100)}%</span>
          {initialRecipe.lowConfidenceFields && initialRecipe.lowConfidenceFields.length > 0 && (
            <>
              <span className="text-cocoa-300 mx-1">|</span>
              <span className="text-raspberry font-medium">{t('recipes:editor.fieldsFlagged', { count: initialRecipe.lowConfidenceFields.length })}</span>
            </>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className={`relative ${getProvenanceStyle(getFieldMeta(state, 'name')?.provenance)}`}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-cocoa-700">{t('recipes:editor.recipeName')}</label>
              <ProvenanceBadge meta={getFieldMeta(state, 'name')} />
            </div>
            <TranslationTabs
              sourceValue={state.name || ''}
              sourceLanguage={state.nameI18n?.sourceLanguage}
              translations={state.nameTranslations || {}}
              onSourceChange={(value) => dispatch({ type: 'SET_FIELD', field: 'name', value })}
              onTranslationsChange={(translations) => dispatch({ type: 'SET_FIELD', field: 'nameTranslations', value: translations })}
              mode="input"
              placeholder={t('recipes:editor.recipeNamePlaceholder')}
            />
          </div>
          <div className={`relative ${getProvenanceStyle(getFieldMeta(state, 'type')?.provenance)}`}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-cocoa-700">{t('recipes:editor.type')}</label>
              <ProvenanceBadge meta={getFieldMeta(state, 'type')} />
            </div>
            <input
              list="recipe-type-list"
              value={state.type || 'standard'}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'type', value: e.target.value })}
              className="w-full px-3 py-2 border border-cocoa-300 rounded-lg focus:ring-2 focus:ring-copper"
              placeholder={t('recipes:editor.typePlaceholder')}
            />
            <datalist id="recipe-type-list">
              {RECIPE_TYPES.map(type => (
                <option key={type} value={type}>
                  {t(`enums:recipeTypes.${type}`)}
                </option>
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('recipes:editor.producesIngredient')}</label>
            <select
              value={state.outputIngredientId || ''}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'outputIngredientId', value: e.target.value })}
              className="w-full px-3 py-2 border border-cocoa-300 rounded-lg focus:ring-2 focus:ring-copper bg-white"
            >
              <option value="">{t('recipes:editor.noneFinalProduct')}</option>
              {ingredients.map(ing => (
                <option key={ing.id} value={ing.id}>{ing.name} ({t(`enums:units.${ing.unit}` as any, ing.unit)})</option>
              ))}
            </select>
            <p className="text-xs text-cocoa-500 mt-1">{t('recipes:editor.producesIngredientHelp')}</p>
          </div>
          {state.categories?.includes('bread') && (
            <div className="p-4 bg-cream rounded-lg border border-cocoa-100 flex flex-col gap-4">
              <h4 className="text-sm font-semibold text-cocoa-900">{t('bread.mixingParameters', 'Mixing & Environment')}</h4>
              <div>
                <label className="block text-xs font-medium text-cocoa-700 mb-1">{t('bread.mixingMethod', 'Mixing Method')}</label>
                <select
                  value={state.mixingParams?.mixingMethod || 'stand_mixer'}
                  onChange={(e) => dispatch({ type: 'SET_MIXING_PARAMS', field: 'mixingMethod', value: e.target.value })}
                  className="w-full px-3 py-1.5 border border-cocoa-300 rounded focus:ring-2 focus:ring-copper text-sm"
                >
                  <option value="hand">{t('bread.mix.hand', 'By Hand (0°F Friction)')}</option>
                  <option value="stand_mixer">{t('bread.mix.stand_mixer', 'Stand Mixer (10°F Friction)')}</option>
                  <option value="spiral_mixer">{t('bread.mix.spiral_mixer', 'Spiral Mixer (25°F Friction)')}</option>
                  <option value="no_knead">{t('bread.mix.no_knead', 'No-Knead / Fold (0°F Friction)')}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-cocoa-700 mb-1">{t('bread.roomTempC', 'Room Temp (°C)')}</label>
                  <input
                    type="number"
                    value={state.mixingParams?.roomTempC ?? 22}
                    onChange={(e) => dispatch({ type: 'SET_MIXING_PARAMS', field: 'roomTempC', value: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-cocoa-300 rounded focus:ring-2 focus:ring-copper text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-cocoa-700 mb-1">{t('bread.flourTempC', 'Flour Temp (°C)')}</label>
                  <input
                    type="number"
                    value={state.mixingParams?.flourTempC ?? 22}
                    onChange={(e) => dispatch({ type: 'SET_MIXING_PARAMS', field: 'flourTempC', value: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-cocoa-300 rounded focus:ring-2 focus:ring-copper text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-cocoa-700 mb-1">{t('bread.targetDdtC', 'Override Target DDT (°C)')}</label>
                  <input
                    type="number"
                    value={state.mixingParams?.desiredDoughTempC ?? ''}
                    onChange={(e) => dispatch({ type: 'SET_MIXING_PARAMS', field: 'desiredDoughTempC', value: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder={t('bread.ddtAuto', 'Auto')}
                    className="w-full px-3 py-1.5 border border-cocoa-300 rounded focus:ring-2 focus:ring-copper text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-cocoa-700 mb-1">{t('bread.frictionFactorOverride', 'Override Friction (°C)')}</label>
                  <input
                    type="number"
                    value={state.mixingParams?.frictionFactor ?? ''}
                    onChange={(e) => dispatch({ type: 'SET_MIXING_PARAMS', field: 'frictionFactor', value: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder={t('bread.ddtAuto', 'Auto')}
                    className="w-full px-3 py-1.5 border border-cocoa-300 rounded focus:ring-2 focus:ring-copper text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className={`relative ${getProvenanceStyle(getFieldMeta(state, 'description')?.provenance)}`}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-cocoa-700">{t('recipes:editor.description')}</label>
              <ProvenanceBadge meta={getFieldMeta(state, 'description')} />
            </div>
            <textarea
              value={state.description || ''}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'description', value: e.target.value })}
              className="w-full px-3 py-2 border border-cocoa-300 rounded-lg focus:ring-2 focus:ring-copper h-24"
            />
          </div>

          {/* Yield Equation */}
          <div>
            <h4 className="text-sm font-semibold text-cocoa-900 mb-2">{t('recipes:editor.productionYield')}</h4>
            <div className="space-y-4 p-4 border border-cocoa-100 rounded-lg bg-cream">
              <div>
                <label className="block text-xs font-medium text-cocoa-700 mb-1">{t('recipes:editor.totalBatchYield')}</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={state.yield?.totalYieldAmount || ''}
                    onChange={(e) => dispatch({ type: 'SET_YIELD', field: 'totalYieldAmount', value: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-cocoa-300 rounded focus:ring-2 focus:ring-copper text-sm"
                    placeholder={t('recipes:editor.amount')}
                  />
                  <input
                    type="text"
                    value={state.yield?.totalYieldUnit || ''}
                    onChange={(e) => dispatch({ type: 'SET_YIELD', field: 'totalYieldUnit', value: e.target.value })}
                    className="w-24 px-3 py-1.5 border border-cocoa-300 rounded focus:ring-2 focus:ring-copper text-sm"
                    placeholder={t('recipes:editor.unit')}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-cocoa-700 mb-1">{t('recipes:editor.portionSize')}</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={state.yield?.portionAmount || ''}
                    onChange={(e) => dispatch({ type: 'SET_YIELD', field: 'portionAmount', value: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-cocoa-300 rounded focus:ring-2 focus:ring-copper text-sm"
                    placeholder={t('recipes:editor.amount')}
                  />
                  <input
                    type="text"
                    value={state.yield?.portionUnit || ''}
                    onChange={(e) => dispatch({ type: 'SET_YIELD', field: 'portionUnit', value: e.target.value })}
                    className="w-24 px-3 py-1.5 border border-cocoa-300 rounded focus:ring-2 focus:ring-copper text-sm"
                    placeholder={t('recipes:editor.unit')}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-cocoa-700 mb-1">{t('recipes:editor.finalApplication')}</label>
                <textarea
                  value={state.yield?.portionApplication || ''}
                  onChange={(e) => dispatch({ type: 'SET_YIELD', field: 'portionApplication', value: e.target.value })}
                  className="w-full px-3 py-1.5 border border-cocoa-300 rounded focus:ring-2 focus:ring-copper h-16 text-sm"
                  placeholder={t('recipes:editor.finalApplicationPlaceholder')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-cocoa-100">
        <button
          type="button"
          onClick={() => setShowProductionDetails(!showProductionDetails)}
          className="text-sm font-medium text-cocoa-700 hover:text-cocoa-900 flex items-center gap-2 mb-2"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showProductionDetails ? 'rotate-180' : ''}`} />
          {showProductionDetails ? t('recipes:editor.hideProductionDetails') : t('recipes:editor.showProductionDetails')}
        </button>
      </div>

      {showProductionDetails && (
        <div className="space-y-6 mt-4">
          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('recipes:editor.tags')}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(state.tags || []).map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cocoa-100 text-cocoa-900 border border-cocoa-100">
                  {tag}
                  <button type="button" onClick={() => dispatch({ type: 'REMOVE_TAG', tag })} className="text-cocoa-300 hover:text-cocoa-700">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder={t('recipes:editor.typeTagPlaceholder')}
              className="w-full px-3 py-2 border border-cocoa-300 rounded-lg focus:ring-2 focus:ring-copper text-sm"
            />
          </div>

          {/* Financials Section */}
          <div className="pt-6 border-t border-cocoa-100">
            <h4 className="text-sm font-semibold text-cocoa-900 mb-4">{t('recipes:editor.financials')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('recipes:editor.retailPrice')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={state.retailPrice || ''}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'retailPrice', value: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-cocoa-300 rounded-lg focus:ring-2 focus:ring-copper"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('recipes:editor.targetMargin')}</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={state.targetMarginPercentage || ''}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'targetMarginPercentage', value: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-cocoa-300 rounded-lg focus:ring-2 focus:ring-copper"
                  placeholder="65"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('recipes:editor.laborTime')}</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={state.laborTimeMinutes || ''}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'laborTimeMinutes', value: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-cocoa-300 rounded-lg focus:ring-2 focus:ring-copper"
                  placeholder={t('recipes:editor.laborTimePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('recipes:editor.hourlyRate')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={state.hourlyRate || ''}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'hourlyRate', value: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-cocoa-300 rounded-lg focus:ring-2 focus:ring-copper"
                  placeholder={t('recipes:editor.hourlyRatePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('recipes:editor.overhead')}</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={state.overheadPercentage || ''}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'overheadPercentage', value: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-cocoa-300 rounded-lg focus:ring-2 focus:ring-copper"
                  placeholder={t('recipes:editor.overheadPlaceholder')}
                />
              </div>
            </div>
          </div>

          {/* Storage Section */}
          <div className="pt-6 border-t border-cocoa-100">
            <h4 className="text-sm font-semibold text-cocoa-900 mb-4">{t('recipes:editor.storage')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('recipes:editor.storageEnvironment')}</label>
                <select
                  value={(state as any).storageEnvironment || ''}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'storageEnvironment' as keyof Recipe, value: e.target.value })}
                  className="w-full px-3 py-2 border border-cocoa-300 rounded-lg focus:ring-2 focus:ring-copper bg-white"
                >
                  <option value="">{t('recipes:editor.selectEnvironment')}</option>
                  <option value="ambient">{t('recipes:editor.envAmbient')}</option>
                  <option value="refrigerated">{t('recipes:editor.envRefrigerated')}</option>
                  <option value="frozen">{t('recipes:editor.envFrozen')}</option>
                  <option value="dry_dark">{t('recipes:editor.envDryDark')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('recipes:editor.shelfLifeDays')}</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={(state as any).shelfLifeDays || ''}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'shelfLifeDays' as keyof Recipe, value: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-cocoa-300 rounded-lg focus:ring-2 focus:ring-copper"
                  placeholder={t('recipes:editor.shelfLifePlaceholder')}
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('recipes:editor.storageInstructions')}</label>
              <textarea
                value={(state as any).storageInstructions || ''}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'storageInstructions' as keyof Recipe, value: e.target.value })}
                className="w-full px-3 py-2 border border-cocoa-300 rounded-lg focus:ring-2 focus:ring-copper h-24"
                placeholder={t('recipes:editor.storageInstructionsPlaceholder')}
              />
            </div>
          </div>

          {/* Custom Fields Section */}
          <div className="pt-6 border-t border-cocoa-100">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-semibold text-cocoa-900">{t('recipes:editor.additionalDetails')}</h4>
              <button
                type="button"
                onClick={() => dispatch({ type: 'ADD_CUSTOM_FIELD' })}
                className="text-xs font-medium text-copper hover:text-copper-dark flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> {t('recipes:editor.addField')}
              </button>
            </div>
            {(!state.customFields || state.customFields.length === 0) ? (
              <p className="text-sm text-cocoa-500 italic">{t('recipes:editor.noAdditionalDetails')}</p>
            ) : (
              <div className="space-y-3">
                {state.customFields.map((field, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="w-1/3">
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => dispatch({ type: 'UPDATE_CUSTOM_FIELD', index: idx, field: 'name', value: e.target.value })}
                        className="w-full px-3 py-2 border border-cocoa-300 rounded-lg focus:ring-2 focus:ring-copper text-sm font-medium"
                        placeholder={t('recipes:editor.fieldNamePlaceholder')}
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => dispatch({ type: 'UPDATE_CUSTOM_FIELD', index: idx, field: 'value', value: e.target.value })}
                        className="w-full px-3 py-2 border border-cocoa-300 rounded-lg focus:ring-2 focus:ring-copper text-sm"
                        placeholder={t('recipes:editor.valuePlaceholder')}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'REMOVE_CUSTOM_FIELD', index: idx })}
                      className="p-2 text-cocoa-300 hover:text-red-600 mt-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isMolded && (
        <div className="mt-8 bg-cream p-6 rounded-xl border border-cocoa-100">
          <h4 className="font-semibold text-cocoa-900 mb-4">{t('recipes:editor.hardwareSpecs')}</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-cocoa-500 mb-1">{t('recipes:editor.moldId')}</label>
              <input type="text" value={state.hardware?.moldId || ''} onChange={(e) => dispatch({ type: 'SET_HARDWARE', field: 'moldId', value: e.target.value })} className="w-full px-3 py-2 border border-cocoa-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium text-cocoa-500 mb-1">{t('recipes:editor.shape')}</label>
              <input type="text" value={state.hardware?.shape || ''} onChange={(e) => dispatch({ type: 'SET_HARDWARE', field: 'shape', value: e.target.value })} className="w-full px-3 py-2 border border-cocoa-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium text-cocoa-500 mb-1">{t('recipes:editor.cavitiesMold')}</label>
              <input type="number" value={state.hardware?.cavitiesPerMold || 0} onChange={(e) => dispatch({ type: 'SET_HARDWARE', field: 'cavitiesPerMold', value: Number(e.target.value) })} className="w-full px-3 py-2 border border-cocoa-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium text-cocoa-500 mb-1">{t('recipes:editor.moldCount')}</label>
              <input type="number" value={state.hardware?.moldCount || 0} onChange={(e) => dispatch({ type: 'SET_HARDWARE', field: 'moldCount', value: Number(e.target.value) })} className="w-full px-3 py-2 border border-cocoa-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium text-cocoa-500 mb-1">{t('recipes:editor.gramCavity')}</label>
              <input type="number" step="0.1" value={state.hardware?.gramPerCavity || 0} onChange={(e) => dispatch({ type: 'SET_HARDWARE', field: 'gramPerCavity', value: Number(e.target.value) })} className="w-full px-3 py-2 border border-cocoa-300 rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
