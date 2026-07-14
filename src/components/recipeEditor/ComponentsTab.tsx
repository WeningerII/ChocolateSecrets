import React from 'react';
import type { TFunction } from 'i18next';
import { Recipe, Ingredient } from '../../types';
import { COMPONENT_TYPES, ACTION_TYPES } from '../../constants';
import { Plus, Trash2, X, GripVertical, ChevronDown } from 'lucide-react';
import { TranslationTabs } from '../TranslationTabs';
import { RoleBadge } from '../RoleBadge';
import { inferRoleTag } from '../../services/foodScience/roles';
import type { RecipePhysics } from '../../hooks/useRecipePhysics';
import type { Action } from './recipeEditor.types';
import { getConfidenceStyle, getProvenanceStyle, getIngredientMinConfidence } from './recipeReducer';
import { ProvenanceBadge, ConfidenceDot, getActionIcon } from './editorShared';

interface ComponentsTabProps {
  state: Partial<Recipe>;
  dispatch: React.Dispatch<Action>;
  t: TFunction<readonly ['recipes', 'enums', 'common', 'chemistry']>;
  ingredients: Ingredient[];
  recipes: Recipe[];
  physics: RecipePhysics | null;
  initialRecipe: Recipe | null;
  editorMode: 'simple' | 'complex';
  expandedIngredients: Set<string>;
  toggleIngredientExpansion: (compIndex: number, ingIndex: number) => void;
  draggedComponentIndex: number | null;
  setDraggedComponentIndex: React.Dispatch<React.SetStateAction<number | null>>;
  draggedInstructionIndex: { compIndex: number, instIndex: number } | null;
  setDraggedInstructionIndex: React.Dispatch<React.SetStateAction<{ compIndex: number, instIndex: number } | null>>;
}

export function ComponentsTab({
  state,
  dispatch,
  t,
  ingredients,
  recipes,
  physics,
  initialRecipe,
  editorMode,
  expandedIngredients,
  toggleIngredientExpansion,
  draggedComponentIndex,
  setDraggedComponentIndex,
  draggedInstructionIndex,
  setDraggedInstructionIndex,
}: ComponentsTabProps) {
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold text-cocoa-900 text-lg">{editorMode === 'simple' ? t('recipes:editor.ingredientsAndSteps') : t('recipes:editor.components')}</h4>
        {editorMode === 'complex' && (
          <button type="button" onClick={() => dispatch({ type: 'ADD_COMPONENT', t })} className="text-sm text-copper-dark font-medium hover:text-copper-dark flex items-center gap-1">
            <Plus className="w-4 h-4" /> {t('recipes:editor.addComponent')}
          </button>
        )}
      </div>

      <div className="space-y-6">
        {(state.components || []).map((comp, compIndex) => (
          <div
            key={comp.id || compIndex}
            draggable
            onDragStart={(e) => {
              // Stop propagation so we don't drag parent components if nested (not currently nested, but good practice)
              e.stopPropagation();
              setDraggedComponentIndex(compIndex);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (draggedComponentIndex === null || draggedComponentIndex === compIndex) return;
              dispatch({ type: 'REORDER_COMPONENTS', startIndex: draggedComponentIndex, endIndex: compIndex });
              setDraggedComponentIndex(compIndex);
            }}
            onDragEnd={() => setDraggedComponentIndex(null)}
            className={`border border-cocoa-100 rounded-xl overflow-hidden shadow-sm transition-all ${draggedComponentIndex === compIndex ? 'opacity-50' : ''}`}
          >
            {editorMode === 'complex' && (
              <div className="bg-cocoa-100 px-4 py-3 flex flex-wrap gap-4 items-center justify-between border-b border-cocoa-100">
                <div className="cursor-grab active:cursor-grabbing p-1 -ml-2 text-cocoa-300 hover:text-cocoa-700">
                  <GripVertical className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <input type="text" placeholder={t('recipes:editor.componentNamePlaceholder')} value={comp.name} onChange={(e) => dispatch({ type: 'UPDATE_COMPONENT', index: compIndex, field: 'name', value: e.target.value })} className="w-full px-2 py-1 border border-cocoa-300 rounded font-medium" />
                </div>
                <div className="w-32">
                  <input
                    list="component-type-list"
                    value={comp.type}
                    onChange={(e) => dispatch({ type: 'UPDATE_COMPONENT', index: compIndex, field: 'type', value: e.target.value })}
                    className="w-full px-2 py-1 border border-cocoa-300 rounded text-sm"
                    placeholder={t('recipes:editor.typePlaceholder')}
                  />
                  <datalist id="component-type-list">
                    {COMPONENT_TYPES.map(type => (
                      <option key={type} value={type}>
                        {t(`enums:componentTypes.${type}`)}
                      </option>
                    ))}
                  </datalist>
                </div>
                <div className="w-24 flex items-center gap-1">
                  <input type="number" placeholder={t('recipes:editor.percentagePlaceholder')} value={comp.percentageOfTotalWeight || ''} onChange={(e) => dispatch({ type: 'UPDATE_COMPONENT', index: compIndex, field: 'percentageOfTotalWeight', value: Number(e.target.value) })} className="w-full px-2 py-1 border border-cocoa-300 rounded text-sm" />
                  <span className="text-xs text-cocoa-500">%</span>
                </div>
                <div className="w-24 flex items-center gap-1">
                  <input type="number" placeholder={t('recipes:editor.wastePlaceholder')} value={comp.bufferPercentage || ''} onChange={(e) => dispatch({ type: 'UPDATE_COMPONENT', index: compIndex, field: 'bufferPercentage', value: Number(e.target.value) })} className="w-full px-2 py-1 border border-cocoa-300 rounded text-sm" />
                  <span className="text-xs text-cocoa-500">{t('recipes:editor.waste')}</span>
                </div>
                <button type="button" onClick={() => dispatch({ type: 'REMOVE_COMPONENT', index: compIndex })} className="text-cocoa-300 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="p-4 bg-white">
              <div className="space-y-2">
                {comp.ingredients.map((ing, ingIndex) => (
                  <div key={ingIndex} className="flex flex-col gap-2 p-3 bg-cream rounded-lg border border-cocoa-100">
                    <div className="flex gap-2 items-center">
                      <div className="w-24">
                        <select
                          value={ing.type || 'ingredient'}
                          onChange={(e) => dispatch({ type: 'UPDATE_INGREDIENT', componentIndex: compIndex, ingredientIndex: ingIndex, field: 'type', value: e.target.value })}
                          className="w-full px-2 py-1 border border-cocoa-300 rounded text-sm bg-cocoa-100"
                        >
                          <option value="ingredient">{t('recipes:editor.ingredient')}</option>
                          <option value="recipe">{t('recipes:editor.subRecipe')}</option>
                        </select>
                      </div>
                      <div className={`flex-1 ${getConfidenceStyle(ing.confidence?.name)} ${getProvenanceStyle(ing.meta?.name?.provenance)} relative`}>
                        <ProvenanceBadge meta={ing.meta?.name} />
                        {(!ing.type || ing.type === 'ingredient') ? (
                          <div className="relative">
                            <input
                              type="text"
                              value={ing.name !== undefined ? ing.name : (ingredients.find(i => i.id === ing.ingredientId)?.name || '')}
                              onChange={(e) => {
                                dispatch({ type: 'UPDATE_INGREDIENT', componentIndex: compIndex, ingredientIndex: ingIndex, field: 'name', value: e.target.value });
                                dispatch({ type: 'UPDATE_INGREDIENT', componentIndex: compIndex, ingredientIndex: ingIndex, field: 'ingredientId', value: '' }); // Clear ID when typing
                                dispatch({ type: 'UPDATE_INGREDIENT', componentIndex: compIndex, ingredientIndex: ingIndex, field: 'showIngredientSuggestions', value: true });
                              }}
                              onFocus={() => dispatch({ type: 'UPDATE_INGREDIENT', componentIndex: compIndex, ingredientIndex: ingIndex, field: 'showIngredientSuggestions', value: true })}
                              onBlur={() => setTimeout(() => dispatch({ type: 'UPDATE_INGREDIENT', componentIndex: compIndex, ingredientIndex: ingIndex, field: 'showIngredientSuggestions', value: false }), 200)}
                              placeholder={t('common:typeToSearchOrCreate')}
                              className="w-full px-2 py-1 border border-cocoa-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-copper"
                            />
                            {ing.showIngredientSuggestions && (ing.name !== undefined ? ing.name : (ingredients.find(i => i.id === ing.ingredientId)?.name || '')) && (
                              <div className="absolute z-20 mt-1 w-full bg-white border border-cocoa-100 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {ingredients.filter(i => i.name.toLowerCase().includes((ing.name !== undefined ? ing.name : (ingredients.find(i => i.id === ing.ingredientId)?.name || '')).toLowerCase().trim())).map(option => (
                                  <button
                                    key={option.id}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      dispatch({ type: 'UPDATE_INGREDIENT', componentIndex: compIndex, ingredientIndex: ingIndex, field: 'ingredientId', value: option.id });
                                      dispatch({ type: 'UPDATE_INGREDIENT', componentIndex: compIndex, ingredientIndex: ingIndex, field: 'name', value: option.name });
                                      dispatch({ type: 'UPDATE_INGREDIENT', componentIndex: compIndex, ingredientIndex: ingIndex, field: 'unit', value: option.unit });
                                      const newRole = inferRoleTag(option);
                                      dispatch({ type: 'UPDATE_INGREDIENT', componentIndex: compIndex, ingredientIndex: ingIndex, field: 'role', value: newRole });
                                      dispatch({ type: 'UPDATE_INGREDIENT', componentIndex: compIndex, ingredientIndex: ingIndex, field: 'showIngredientSuggestions', value: false });
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-vanilla-cream transition-colors"
                                  >
                                    {option.name} ({t(`enums:units.${option.unit}` as any, option.unit)})
                                  </button>
                                ))}
                                {ingredients.filter(i => i.name.toLowerCase().includes((ing.name !== undefined ? ing.name : (ingredients.find(i => i.id === ing.ingredientId)?.name || '')).toLowerCase().trim())).length === 0 && (ing.name !== undefined ? ing.name : (ingredients.find(i => i.id === ing.ingredientId)?.name || '')).trim() && (
                                  <div className="px-3 py-2 text-sm text-copper-dark bg-vanilla-cream font-medium">
                                    "{(ing.name !== undefined ? ing.name : (ingredients.find(i => i.id === ing.ingredientId)?.name || '')).trim()}" {t('common:willBeCreatedAsNew')}
                                  </div>
                                )}
                                {ingredients.filter(i => i.name.toLowerCase().includes((ing.name !== undefined ? ing.name : (ingredients.find(i => i.id === ing.ingredientId)?.name || '')).toLowerCase().trim())).length > 0 && !ingredients.find(i => i.name.toLowerCase() === (ing.name !== undefined ? ing.name : (ingredients.find(i => i.id === ing.ingredientId)?.name || '')).trim().toLowerCase()) && (ing.name !== undefined ? ing.name : (ingredients.find(i => i.id === ing.ingredientId)?.name || '')).trim() && (
                                  <div className="px-3 py-2 text-xs text-cocoa-500 border-t border-cocoa-100">
                                    {t('common:orCreateNew')} "{(ing.name !== undefined ? ing.name : (ingredients.find(i => i.id === ing.ingredientId)?.name || '')).trim()}"
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="mt-1 flex items-center gap-2">
                              <RoleBadge
                                tag={ing.role}
                                onChange={(role) => dispatch({ type: 'UPDATE_INGREDIENT', componentIndex: compIndex, ingredientIndex: ingIndex, field: 'role', value: role })}
                                onAutoDetect={() => {
                                  const matchingIng = ingredients.find(i => i.id === ing.ingredientId);
                                  if (matchingIng) {
                                    const role = inferRoleTag(matchingIng);
                                    dispatch({ type: 'UPDATE_INGREDIENT', componentIndex: compIndex, ingredientIndex: ingIndex, field: 'role', value: role });
                                  }
                                }}
                              />
                              {state.categories?.includes('confectionery') && ing.ingredientId && physics?.confectionery?.derived.subtypes[ing.ingredientId] && (
                                <span className="ml-2 text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded bg-copper-50 text-copper-700 border border-copper-200">
                                  {t(`chemistry:confectionery.subtype.${physics.confectionery.derived.subtypes[ing.ingredientId]}`)}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                                <select value={ing.recipeId || ''} onChange={(e) => {
                            const selectedId = e.target.value;
                            const selectedRecipe = recipes.find(r => r.id === selectedId);
                            dispatch({ type: 'UPDATE_INGREDIENT', componentIndex: compIndex, ingredientIndex: ingIndex, field: 'recipeId', value: selectedId });
                            if (selectedRecipe && selectedRecipe.yield) {
                              dispatch({ type: 'UPDATE_INGREDIENT', componentIndex: compIndex, ingredientIndex: ingIndex, field: 'unit', value: selectedRecipe.yield.totalYieldUnit });
                            }
                          }} className="w-full px-2 py-1 border border-cocoa-300 rounded text-sm">
                            <option value="">{t('recipes:editor.selectSubRecipe')}</option>
                            {recipes.filter(r => r.id !== state.id).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                        )}
                      </div>
                      <div className={`w-20 ${getConfidenceStyle(ing.confidence?.quantity)} ${getProvenanceStyle(ing.meta?.quantity?.provenance)} relative`}>
                        <div className="absolute -top-4 right-0 z-10"><ProvenanceBadge meta={ing.meta?.quantity} /></div>
                        <input type="number" min="0" step="0.01" value={ing.quantity || ''} onChange={(e) => dispatch({ type: 'UPDATE_INGREDIENT', componentIndex: compIndex, ingredientIndex: ingIndex, field: 'quantity', value: Number(e.target.value) })} className="w-full px-2 py-1 border border-cocoa-300 rounded text-sm" placeholder={t('recipes:editor.qtyPlaceholder')} />
                      </div>
                      <div className="w-20">
                        <input type="text" value={ing.unit || ''} onChange={(e) => dispatch({ type: 'UPDATE_INGREDIENT', componentIndex: compIndex, ingredientIndex: ingIndex, field: 'unit', value: e.target.value })} className="w-full px-2 py-1 border border-cocoa-300 rounded text-sm" placeholder={t('recipes:editor.unitPlaceholder')} />
                      </div>
                      {getIngredientMinConfidence(ing) !== undefined && (
                        <div className="flex items-center px-1">
                          <ConfidenceDot
                            confidence={getIngredientMinConfidence(ing)}
                            label={t('recipes:editor.rowConfidence')}
                          />
                        </div>
                      )}
                      <button type="button" onClick={() => dispatch({ type: 'REMOVE_INGREDIENT', componentIndex: compIndex, ingredientIndex: ingIndex })} className="text-cocoa-300 hover:text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleIngredientExpansion(compIndex, ingIndex)}
                      className="text-xs text-cocoa-500 hover:text-cocoa-700 flex items-center gap-1 self-start px-1"
                    >
                      <ChevronDown className={`w-3 h-3 transition-transform ${expandedIngredients.has(`${compIndex}-${ingIndex}`) ? 'rotate-180' : ''}`} />
                      {expandedIngredients.has(`${compIndex}-${ingIndex}`) ? t('recipes:editor.hideDetails') : t('recipes:editor.showDetails')}
                    </button>

                    {expandedIngredients.has(`${compIndex}-${ingIndex}`) && (
                      <>
                        <div className="flex gap-2 items-center pl-2 border-l-2 border-cocoa-100 ml-2">
                          <input type="text" value={ing.state || ''} onChange={(e) => dispatch({ type: 'UPDATE_INGREDIENT', componentIndex: compIndex, ingredientIndex: ingIndex, field: 'state', value: e.target.value })} className="flex-1 px-2 py-1 border border-cocoa-300 rounded text-xs bg-white" placeholder={t('recipes:editor.stateNotesPlaceholder')} />
                          <input type="text" value={ing.convertedQuantities || ''} onChange={(e) => dispatch({ type: 'UPDATE_INGREDIENT', componentIndex: compIndex, ingredientIndex: ingIndex, field: 'convertedQuantities', value: e.target.value })} className="flex-1 px-2 py-1 border border-cocoa-300 rounded text-xs bg-white" placeholder={t('recipes:editor.convertedPlaceholder')} />
                        </div>
                        <div className="pl-2 ml-2">
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-cocoa-700">
                            <input
                              type="checkbox"
                              checked={ing.isDiscrete || false}
                              onChange={(e) => dispatch({ type: 'UPDATE_INGREDIENT', componentIndex: compIndex, ingredientIndex: ingIndex, field: 'isDiscrete', value: e.target.checked })}
                              className="rounded text-copper"
                            />
                            <span>{t('recipes:editor.discreteItem')}</span>
                          </label>
                        </div>
                        {ing.originalString && (
                          <div className="pl-2 ml-2 text-xs text-cocoa-500 italic">
                            {t('recipes:editor.originalText', { text: ing.originalString })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => dispatch({ type: 'ADD_INGREDIENT', componentIndex: compIndex })} className="text-xs text-copper-dark font-medium hover:text-copper-dark mt-3 flex items-center gap-1">
                <Plus className="w-3 h-3" /> {t('recipes:editor.addIngredient')}
              </button>

              <div className="mt-4 pt-4 border-t border-cocoa-100">
                <label className="block text-xs font-medium text-cocoa-500 mb-2">{t('recipes:editor.sop')}</label>
                <div className="space-y-3">
                  {(comp.steps || []).map((step, stepIndex) => (
                    <div
                      key={step.id || stepIndex}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        setDraggedInstructionIndex({ compIndex, instIndex: stepIndex });
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!draggedInstructionIndex || draggedInstructionIndex.compIndex !== compIndex || draggedInstructionIndex.instIndex === stepIndex) return;
                        dispatch({ type: 'REORDER_STEPS', componentIndex: compIndex, startIndex: draggedInstructionIndex.instIndex, endIndex: stepIndex });
                        setDraggedInstructionIndex({ compIndex, instIndex: stepIndex });
                      }}
                      onDragEnd={() => setDraggedInstructionIndex(null)}
                      className={`flex gap-3 items-start bg-cream p-3 rounded-lg border border-cocoa-100 transition-all ${draggedInstructionIndex?.compIndex === compIndex && draggedInstructionIndex?.instIndex === stepIndex ? 'opacity-50' : ''}`}
                    >
                      <div className="cursor-grab active:cursor-grabbing p-1 mt-1 text-cocoa-300 hover:text-cocoa-700">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col items-center gap-2 shrink-0 mt-1">
                        <div className="flex items-center justify-center w-6 h-6 bg-white border border-cocoa-100 rounded-full text-cocoa-500 font-bold text-xs">
                          {stepIndex + 1}
                        </div>
                        <div title={step.actionType}>
                          {getActionIcon(step.actionType)}
                        </div>
                      </div>
                      <div className={`flex-1 space-y-2 ${getConfidenceStyle(step.confidence?.instruction)}`}>
                        <div className="flex gap-2">
                            <input
                              type="text"
                              value={step.title}
                              onChange={(e) => dispatch({ type: 'UPDATE_STEP', componentIndex: compIndex, stepIndex, field: 'title', value: e.target.value })}
                              className="flex-1 px-2 py-1 border border-cocoa-300 rounded text-sm font-medium"
                              placeholder={t('recipes:editor.stepTitlePlaceholder')}
                            />
                            <input
                              list="action-type-list"
                              value={step.actionType}
                              onChange={(e) => dispatch({ type: 'UPDATE_STEP', componentIndex: compIndex, stepIndex, field: 'actionType', value: e.target.value })}
                              className="w-32 px-2 py-1 border border-cocoa-300 rounded text-sm bg-white"
                              placeholder={t('recipes:editor.action')}
                            />
                          <datalist id="action-type-list">
                            {ACTION_TYPES.map(type => (
                              <option key={type} value={type}>
                                {t(`enums:actionTypes.${type}`)}
                              </option>
                            ))}
                          </datalist>
                        </div>
                        <TranslationTabs
                          sourceValue={step.instruction || ''}
                          sourceLanguage={step.instructionI18n?.sourceLanguage}
                          translations={step.instructionTranslations || {}}
                          onSourceChange={(value) => dispatch({ type: 'UPDATE_STEP', componentIndex: compIndex, stepIndex, field: 'instruction', value })}
                          onTranslationsChange={(translations) => dispatch({ type: 'UPDATE_STEP', componentIndex: compIndex, stepIndex, field: 'instructionTranslations', value: translations })}
                          mode="textarea"
                          placeholder={t('recipes:editor.instructionPlaceholder')}
                          inputClassName="w-full px-3 py-2 border border-cocoa-300 rounded text-sm focus:ring-2 focus:ring-copper"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={step.equipment?.join(', ') || ''}
                            onChange={(e) => dispatch({ type: 'UPDATE_STEP', componentIndex: compIndex, stepIndex, field: 'equipment', value: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                            className="flex-1 px-2 py-1 border border-cocoa-300 rounded text-xs bg-white"
                            placeholder={t('recipes:editor.equipmentPlaceholder')}
                          />
                          <input
                            type="text"
                            value={step.warning || ''}
                            onChange={(e) => dispatch({ type: 'UPDATE_STEP', componentIndex: compIndex, stepIndex, field: 'warning', value: e.target.value })}
                            className="flex-1 px-2 py-1 border border-red-200 bg-red-50 text-red-800 rounded text-xs placeholder:text-red-300"
                            placeholder={t('recipes:editor.criticalWarningPlaceholder')}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'REMOVE_STEP', componentIndex: compIndex, stepIndex })}
                        className="text-cocoa-300 hover:text-red-600 pt-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'ADD_STEP', componentIndex: compIndex })}
                    className="text-xs text-copper-dark font-medium hover:text-copper-dark flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> {t('recipes:editor.addStep')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {(state.components || []).length === 0 && (
          <div className="text-sm text-cocoa-500 italic p-8 bg-cream rounded-xl text-center border border-cocoa-100 border-dashed">
            {t('recipes:editor.noComponents')}
          </div>
        )}
        {initialRecipe?.ocrTranscript && initialRecipe?.lowConfidenceFields && initialRecipe.lowConfidenceFields.length > 0 && (
          <details className="mt-4 p-3 bg-vanilla-cream border border-copper/30 rounded-lg">
            <summary className="cursor-pointer text-sm font-medium text-amber-900">
              {t('recipes:editor.flaggedBanner', { count: initialRecipe.lowConfidenceFields.length })}
            </summary>
            <pre className="mt-3 p-3 bg-white border border-amber-100 rounded text-xs text-cocoa-700 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">{initialRecipe.ocrTranscript}</pre>
            <div className="mt-2 text-xs text-copper-dark">
              {t('recipes:editor.flaggedFieldsList', { fields: initialRecipe.lowConfidenceFields.join(', ') })}
            </div>
          </details>
        )}
      </div>
    </>
  );
}
