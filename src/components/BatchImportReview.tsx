import React, { useState, useEffect } from 'react';
import { ExtractedRecipe, ExtractedRecipeIngredient } from '../services/geminiService';
import { Ingredient } from '../types';
import { INGREDIENT_CATEGORIES, IngredientCategory, CANONICAL_UNITS } from '../constants';
import { findBestIngredientMatch } from '../utils/search';
import { AlertCircle, Loader2, CheckCircle2, Info, ChevronDown, ChevronUp, Layers, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface NewIngredientDraft {
  originalName: string;
  name: string;
  unit: string;
  category: string;
  stock: number;
  lowStockThreshold: number;
  isDiscrete: boolean;
}

interface BatchImportReviewProps {
  extractedRecipes: ExtractedRecipe[];
  existingIngredients: Ingredient[];
  onConfirm: (newIngredients: NewIngredientDraft[], recipes: ExtractedRecipe[]) => Promise<void>;
  onCancel: () => void;
}

export default function BatchImportReview({ extractedRecipes, existingIngredients, onConfirm, onCancel }: BatchImportReviewProps) {
  const { t } = useTranslation(['batch', 'common']);
  const [unresolvedIngredients, setUnresolvedIngredients] = useState<NewIngredientDraft[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkUnit, setBulkUnit] = useState('');

  const allCategories = Array.from(new Set([
    ...INGREDIENT_CATEGORIES,
    ...existingIngredients.map(i => i.category).filter(Boolean)
  ])).sort();

  useEffect(() => {
    const processExtractedData = () => {
      const uniqueNewIngredients = new Map<string, NewIngredientDraft>();

      extractedRecipes.forEach(recipe => {
        // Process components
        if (recipe.components) {
          recipe.components.forEach(comp => {
            comp.ingredients.forEach(extIng => {
              processIngredient(extIng, uniqueNewIngredients);
            });
          });
        }
        
        // Process top-level ingredients
        if (recipe.ingredients) {
          recipe.ingredients.forEach(extIng => {
            processIngredient(extIng, uniqueNewIngredients);
          });
        }
      });

      setUnresolvedIngredients(Array.from(uniqueNewIngredients.values()));
      setIsProcessing(false);
    };

    const processIngredient = (extIng: ExtractedRecipeIngredient, uniqueNewIngredients: Map<string, NewIngredientDraft>) => {
      const bestMatch = findBestIngredientMatch(extIng.name, existingIngredients);
      
      // If match confidence is high (> 0.9) or AI says it's a match, skip adding to unresolved
      const isHighConfidenceMatch = (bestMatch && bestMatch.score > 0.9) || (extIng.matchConfidence && extIng.matchConfidence > 0.95);
      
      if (!isHighConfidenceMatch && !uniqueNewIngredients.has(extIng.name.toLowerCase())) {
        const suggestedCategory = extIng.category || 'Uncategorized';

        uniqueNewIngredients.set(extIng.name.toLowerCase(), {
          originalName: extIng.name,
          name: extIng.name,
          unit: extIng.unit || 'g',
          category: suggestedCategory,
          stock: 0,
          lowStockThreshold: 0,
          isDiscrete: extIng.isDiscrete || false
        });
      }
    };

    processExtractedData();
  }, [extractedRecipes, existingIngredients]);

  const updateDraft = (index: number, field: keyof NewIngredientDraft, value: string | number | boolean) => {
    const updated = [...unresolvedIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setUnresolvedIngredients(updated);
  };

  const applyBulkActions = () => {
    setUnresolvedIngredients(prev => prev.map(ing => ({
      ...ing,
      category: bulkCategory || ing.category,
      unit: bulkUnit || ing.unit
    })));
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      await onConfirm(unresolvedIngredients, extractedRecipes);
    } finally {
      setIsSaving(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-2xl flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-4" />
          <p className="text-stone-600 font-medium">{t('batch:processing')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-stone-200 flex items-start gap-4 bg-amber-50 rounded-t-2xl">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-amber-900">{t('batch:review')}</h3>
            <p className="text-sm text-amber-700">
              {t('batch:extracted', { count: extractedRecipes.length })} 
              {unresolvedIngredients.length > 0 
                ? ` ${t('batch:newIngredients', { count: unresolvedIngredients.length })}` 
                : ` ${t('batch:allMatched')}`}
            </p>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-stone-50">
          {unresolvedIngredients.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                <div className="flex items-center gap-2 text-stone-800 font-semibold">
                  <Package className="w-5 h-5 text-amber-600" />
                  {t('batch:newIngredientsTitle')}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">{t('batch:bulkActions')}:</span>
                  <select 
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    className="text-xs px-2 py-1 border border-stone-300 rounded bg-stone-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">{t('batch:setCategory')}</option>
                    {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <select 
                    value={bulkUnit}
                    onChange={(e) => setBulkUnit(e.target.value)}
                    className="text-xs px-2 py-1 border border-stone-300 rounded bg-stone-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">{t('batch:setUnit')}</option>
                    {CANONICAL_UNITS.map(u => <option key={u} value={u}>{t(`enums:units.${u}` as any, u)}</option>)}
                  </select>
                  <button 
                    onClick={applyBulkActions}
                    className="text-xs bg-stone-800 text-white px-3 py-1 rounded hover:bg-stone-900 transition-colors"
                  >
                    {t('batch:apply')}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {unresolvedIngredients.map((ing, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border border-stone-200 rounded-xl bg-white shadow-sm items-start transition-all hover:border-amber-200">
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">{t('batch:name')}</label>
                      <input 
                        type="text" 
                        value={ing.name} 
                        onChange={(e) => updateDraft(idx, 'name', e.target.value)} 
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm" 
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">{t('batch:unit')}</label>
                      <select 
                        value={ing.unit} 
                        onChange={(e) => updateDraft(idx, 'unit', e.target.value)} 
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm" 
                      >
                        {CANONICAL_UNITS.map(u => <option key={u} value={u}>{t(`enums:units.${u}` as any, u)}</option>)}
                        {!CANONICAL_UNITS.includes(ing.unit as any) && <option value={ing.unit}>{ing.unit}</option>}
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">{t('batch:category')}</label>
                      <select 
                        value={ing.category} 
                        onChange={(e) => updateDraft(idx, 'category', e.target.value)} 
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
                      >
                        {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">{t('batch:initialStock')}</label>
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        value={ing.stock} 
                        onChange={(e) => updateDraft(idx, 'stock', Number(e.target.value))} 
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm" 
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center h-full pt-5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={ing.isDiscrete}
                          onChange={(e) => updateDraft(idx, 'isDiscrete', e.target.checked)}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-xs font-medium text-stone-600">{t('batch:discreteItem')}</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <datalist id="batch-category-list">
            {allCategories.map(cat => (
              <option key={cat} value={cat} />
            ))}
          </datalist>

          <div className="space-y-4">
            <h4 className="font-semibold text-stone-800">{t('batch:recipesToImport')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {extractedRecipes.map((recipe, idx) => (
                <div key={idx} className={`p-4 border rounded-xl shadow-sm ${recipe.needsReview ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-bold text-stone-900">{recipe.name}</h5>
                      <p className="text-sm text-stone-500 mb-2">{recipe.type}</p>
                    </div>
                    {recipe.needsReview && (
                      <div title="Needs Review">
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                      </div>
                    )}
                  </div>
                  {recipe.needsReview && recipe.aiExtractionNotes && (
                    <p className="text-xs text-amber-700 mb-2">{recipe.aiExtractionNotes}</p>
                  )}
                  {recipe.rawExtractionData && (
                    <div className="mt-2 p-2 bg-stone-100 rounded border border-stone-200">
                      <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">{t('batch:rawExtractionData')}</p>
                      <p className="text-[10px] text-stone-600 line-clamp-3">{recipe.rawExtractionData}</p>
                    </div>
                  )}
                  <div className="text-xs text-stone-600 mt-2">
                    {(recipe.components?.length || 0) + (recipe.ingredients?.length ? 1 : 0)} {t('batch:components')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-stone-200 flex justify-end gap-3 shrink-0 bg-white rounded-b-2xl">
          <button 
            onClick={onCancel} 
            className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-xl transition-colors"
            disabled={isSaving}
          >
            {t('batch:cancel')}
          </button>
          <button 
            onClick={handleConfirm} 
            disabled={isSaving}
            className="px-6 py-2 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('batch:saveAll')}
          </button>
        </div>
      </div>
    </div>
  );
}
