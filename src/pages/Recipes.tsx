import React, { useState, useRef } from 'react';
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { Recipe, RecipeComponent } from '../types';
import { Plus, UploadCloud, Loader2 } from 'lucide-react';
import { extractRecipe_fullPipeline, ExtractedRecipe } from '../services/geminiService';
import { findBestIngredientMatch, isFuzzyMatch } from '../utils/search';
import { LocalizedField } from '../components/LocalizedField';
import { useRestaurantSettings } from '../hooks/useRestaurantSettings';
import { prepareFileForUpload } from '../utils/image';
import { deriveAllergens, ALLERGEN_LABELS, AllergenKey, AllergenFlag } from '../services/culinaryTools';

import { useNavigate, Link } from 'react-router-dom';
import BatchImportReview, { NewIngredientDraft } from '../components/BatchImportReview';
import ConfirmModal from '../components/ConfirmModal';
import { useTranslation, Trans } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import { SafeBatch, withTimestamps } from '../utils/firestore';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';

import { calculateRecipeCost, getRecipeAllergens } from '../utils/recipeMath';
import { migrateRecipesToV2 } from '../utils/recipeMigration';
import { computeCrossContactRisks } from '../utils/foodSafety';
import { attachRecipeLocalizedFields, stripUndefined } from '../utils/localized';
import { SupportedLanguage } from '../types';

const getActionEmoji = (actionType: string) => {
  switch (actionType) {
    case 'heat': return '🔥';
    case 'cool': return '❄️';
    case 'chop': return '✂️';
    case 'grind': return '⚙️';
    case 'mix': return '🔄';
    case 'jar': return '📦';
    default: return '📝';
  }
};

export default function Recipes() {
  const { t, i18n } = useTranslation(['recipes', 'common', 'auth', 'batch', 'enums']);
  const language = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { recipes, ingredients, loading, getIngredient } = useData();
  const { restaurant } = useRestaurantSettings();
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [extractionStage, setExtractionStage] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrateModalOpen, setMigrateModalOpen] = useState(false);

  const handleMigrate = async () => {
    setMigrateModalOpen(false);
    setMigrating(true);
    try {
      const result = await migrateRecipesToV2();
      toast.success(t('recipes:devActions.migratedToast', { migrated: result.migrated, skipped: result.skipped }));
    } catch (e) {
      toast.error(t('recipes:devActions.migrationFailedToast'));
      console.error(e);
    }
    setMigrating(false);
  };
  
  const [extractionHint, setExtractionHint] = useState('');
  
  const [extractedRecipes, setExtractedRecipes] = useState<ExtractedRecipe[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [similarRecipeModal, setSimilarRecipeModal] = useState<{
    isOpen: boolean;
    extractedRecipe: ExtractedRecipe | null;
    matchingRecipe: Recipe | null;
  }>({ isOpen: false, extractedRecipe: null, matchingRecipe: null });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isAlert?: boolean;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: t('recipes:deleteTitle'),
      message: t('recipes:deleteMessage'),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'recipes', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `recipes/${id}`);
        }
      }
    });
  };

  const processFiles = async (files: FileList | File[]) => {
    setUploading(true);
    setUploadCount(files.length);
    try {
      const imagePayloads: { base64: string; mimeType: string }[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageData = await prepareFileForUpload(file, 1024);
        imagePayloads.push(imageData);
      }

      const existingIngredientNames = ingredients.map(i => i.name);
      
      const result = await extractRecipe_fullPipeline(
        imagePayloads,
        existingIngredientNames,
        extractionHint,
        (stage, message) => {
          setExtractionStage(message);
          console.debug(`[extraction ${stage}]`, message);
        }
      );
      const extracted = result.recipes;
      
      if (extracted.length > 0) {
        setExtractedRecipes(extracted);
      } else {
        toast.error(t('recipes:noRecipesFoundMessage'));
      }
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message.includes('429')) {
        toast.error(t('recipes:quotaExceededMessage'));
      } else {
        toast.error(err instanceof Error ? err.message : t('recipes:errorAnalyzeMessage'));
      }
    } finally {
      setUploading(false);
      setExtractionStage('');
      setUploadCount(0);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    processFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!e.dataTransfer.files?.length) return;
    await processFiles(e.dataTransfer.files);
  };

  const handleConfirmBatchImport = async (newIngredients: NewIngredientDraft[], recipesToImport: ExtractedRecipe[]) => {
    if (!auth.currentUser) {
      toast.error(t('auth:pleaseSignIn'));
      return;
    }

    try {
      const batch = new SafeBatch(db);
      const ingredientNameMap = new Map<string, string>(); // lowercase name -> new ID

      // 1. Add new ingredients to batch
      for (const draft of newIngredients) {
        const newIngRef = doc(collection(db, 'ingredients'));
        batch.set(newIngRef, withTimestamps({
          name: draft.name || '',
          unit: draft.unit || 'g',
          stock: Number(draft.stock) || 0,
          lowStockThreshold: Number(draft.lowStockThreshold) || 0,
          category: draft.category || 'Uncategorized',
          isDiscrete: !!draft.isDiscrete,
          priceHistory: []
        }, true));
        ingredientNameMap.set(draft.originalName.toLowerCase(), newIngRef.id);
      }

      // Track which existing ingredients we've already queued for update to avoid duplicate batch ops
      const updatedExistingIds = new Set<string>();

      // Helper to resolve ingredient ID and discrete flag
        const resolveIngredient = (extName: string, originalDiscrete: boolean, extUnit: string) => {
          const lowerName = extName.toLowerCase();
          let id = '';
          let isDiscrete = originalDiscrete;
          let unit = extUnit;

          // Check if it was a newly created ingredient draft
          const draft = newIngredients.find(d => d.originalName.toLowerCase() === lowerName);
          if (draft) {
            isDiscrete = draft.isDiscrete;
            unit = draft.unit;
          }

          if (ingredientNameMap.has(lowerName)) {
            id = ingredientNameMap.get(lowerName)!;
          } else {
            // Use the new multi-stage matching utility
            const bestMatch = findBestIngredientMatch(extName, ingredients);
            if (bestMatch) {
              id = bestMatch.id;
              const existing = getIngredient(id);
              
              if (existing && !draft && !updatedExistingIds.has(id)) {
                const needsUpdate = (unit && unit !== existing.unit) || 
                                   (isDiscrete !== existing.isDiscrete);
                
                if (needsUpdate) {
                  batch.update(doc(db, 'ingredients', id), withTimestamps({
                    unit: unit || existing.unit,
                    isDiscrete: isDiscrete
                  }));
                  updatedExistingIds.add(id);
                }
              }
            }
          }
          
          return { id, isDiscrete, unit };
        };

      // 2. Add recipes to batch
      for (const extRecipe of recipesToImport) {
        const existingMatch = recipes.find(existing => 
          isFuzzyMatch(existing.name, extRecipe.name || '', 0.88)
        );
        
        if (existingMatch && extRecipe.confidence?.name && extRecipe.confidence.name >= 0.85) {
          // High confidence name + similar existing recipe = ask user
          setSimilarRecipeModal({
            isOpen: true,
            extractedRecipe: extRecipe,
            matchingRecipe: existingMatch
          });
          continue; // skip auto-save, let user decide
        }

        const recipeRef = doc(collection(db, 'recipes'));
        
        const components: RecipeComponent[] = (extRecipe.components || []).map(comp => ({
          id: crypto.randomUUID(),
          name: comp.name || '',
          type: comp.type || 'component',
          percentageOfTotalWeight: Number(comp.percentageOfTotalWeight) || 0,
          bufferPercentage: Number(comp.bufferPercentage) || 0,
          steps: comp.steps?.map((step, idx) => {
            const actionType = step.actionType || 'other';
            return {
              id: crypto.randomUUID(),
              order: idx + 1,
              title: step.title || '',
              actionType: actionType,
              equipment: step.equipment || [],
              icon: step.icon || '',
              parameters: step.parameters || null,
              isCCP: !!step.isCCP,
              ccpInstruction: step.ccpInstruction || '',
              warning: step.warning || '',
              instruction: step.instruction || '',
              instructionSpanish: step.instructionSpanish || '',
              confidence: step.confidence || undefined
            };
          }) || [],
          ingredients: comp.ingredients.map(ing => {
            const resolved = resolveIngredient(ing.name, !!ing.isDiscrete, ing.unit || 'g');
            return {
              ingredientId: resolved.id,
              quantity: Number(ing.quantity) || 0,
              unit: resolved.unit,
              specification: ing.specification || '',
              secondaryQuantity: ing.secondaryQuantity ? Number(ing.secondaryQuantity) : undefined,
              secondaryUnit: ing.secondaryUnit || '',
              density: ing.density ? Number(ing.density) : undefined,
              wasteFactor: ing.wasteFactor ? Number(ing.wasteFactor) : undefined,
              isDiscrete: !!resolved.isDiscrete,
              state: ing.state || '',
              originalState: ing.originalState || '',
              convertedQuantities: ing.convertedQuantities || '',
              originalString: ing.originalString || '',
              confidence: ing.confidence || undefined
            };
          })
        }));

        // Fallback for top-level ingredients if no components were extracted
        if (components.length === 0 && extRecipe.ingredients && extRecipe.ingredients.length > 0) {
          components.push({
            id: crypto.randomUUID(),
            name: 'Main',
            type: 'component',
            percentageOfTotalWeight: 100,
            bufferPercentage: 0,
            steps: [],
            ingredients: extRecipe.ingredients.map(ing => {
              const resolved = resolveIngredient(ing.name, !!ing.isDiscrete, ing.unit || 'g');
              return {
                ingredientId: resolved.id,
                quantity: Number(ing.quantity) || 0,
                unit: resolved.unit,
                specification: ing.specification || '',
                secondaryQuantity: ing.secondaryQuantity ? Number(ing.secondaryQuantity) : undefined,
                secondaryUnit: ing.secondaryUnit || '',
                density: ing.density ? Number(ing.density) : undefined,
                wasteFactor: ing.wasteFactor ? Number(ing.wasteFactor) : undefined,
                isDiscrete: !!resolved.isDiscrete,
                state: ing.state || '',
                originalState: ing.originalState || '',
                convertedQuantities: ing.convertedQuantities || '',
                originalString: ing.originalString || '',
                confidence: ing.confidence || undefined
              };
            })
          });
        }

        const newRecipeData = withTimestamps({
          name: extRecipe.name || 'Unknown Recipe',
          nameSpanish: extRecipe.nameSpanish || '',
          description: extRecipe.description || '',
          type: extRecipe.type || 'standard',
          hardware: extRecipe.hardware || null,
          equipment: extRecipe.equipment || [],
          storageInstructions: extRecipe.storageInstructions || '',
          storageEnvironment: extRecipe.storageEnvironment || 'ambient',
          shelfLife: extRecipe.shelfLife || '',
          globalDisclaimers: extRecipe.globalDisclaimers || [],
          allergens: extRecipe.allergens || [],
          packagingOptions: extRecipe.packagingOptions?.map(opt => ({
            id: crypto.randomUUID(),
            ...opt
          })) || [],
          sensoryProfile: extRecipe.sensoryProfile || null,
          reconstitutionInstructions: extRecipe.reconstitutionInstructions || '',
          design: extRecipe.design || [],
          yield: extRecipe.yield || null,
          components: components,
          tags: extRecipe.tags || [],
          customFields: extRecipe.customFields || [],
          needsReview: !!extRecipe.needsReview,
          aiExtractionNotes: extRecipe.aiExtractionNotes || '',
          rawExtractionData: extRecipe.rawExtractionData || '',
          confidence: extRecipe.confidence || undefined,
          ocrTranscript: extRecipe.ocrTranscript || undefined,
          lowConfidenceFields: extRecipe.lowConfidenceFields || undefined,
          // Reason-pass enrichment that the Recipe model supports (was computed then
          // dropped on import). Tempering curve / yield estimate / step-equipment have
          // no Recipe-level home and are intentionally not mapped here.
          stationTag: (extRecipe as any).stationTag || undefined,
          enrobing: (extRecipe as any).enrobing || undefined
        }, true);
        const uiLanguage = (i18n.language.split('-')[0] as SupportedLanguage);
        const localized = attachRecipeLocalizedFields(
          newRecipeData as unknown as Recipe,
          undefined, // new record, no original
          uiLanguage
        );
        batch.set(recipeRef, stripUndefined(localized));
      }

      await batch.commit();
      setExtractedRecipes(null);
      toast.success(t('batch:importSuccess', { count: recipesToImport.length }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'batch_import');
    }
  };

  if (loading) return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-stone-200 rounded w-3/4"></div><div className="space-y-2"><div className="h-4 bg-stone-200 rounded"></div><div className="h-4 bg-stone-200 rounded w-5/6"></div></div></div></div>;

  const emptyRecipes = recipes.filter(r => !r.components || r.components.length === 0 || r.components.every(c => !c.ingredients || c.ingredients.length === 0));

  return (
    <div 
      className={`space-y-8 relative ${isDragging ? 'bg-amber-50 rounded-2xl p-4 -m-4 border-2 border-dashed border-amber-400' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >

      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-amber-50/80 rounded-2xl backdrop-blur-sm">
          <div className="text-center">
            <UploadCloud className="w-16 h-16 text-amber-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-amber-900">{t('recipes:dropImages')}</h3>
            <p className="text-amber-700 mt-2">{t('recipes:extracting')}</p>
          </div>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h2 className="font-display text-4xl font-semibold tracking-tight text-cocoa-900">{t('nav:recipes')}</h2>
          <p className="text-cocoa-500 mt-1 text-base">{t('recipes:subtitle')}</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative group">
            <input
              type="text"
              value={extractionHint}
              onChange={(e) => setExtractionHint(e.target.value)}
              placeholder={t('recipes:extractionHintPlaceholder')}
              className="bg-white border border-stone-200 px-4 py-2 rounded-xl text-sm w-64 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
            />
            <div className="absolute left-0 -bottom-10 hidden group-hover:block bg-stone-800 text-white text-[10px] p-2 rounded shadow-lg z-20 w-64">
              {t('recipes:extractionHintTooltip')}
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept="image/*,application/pdf"
            multiple
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-cocoa-100 hover:bg-cocoa-300 text-cocoa-700 px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
            {uploading 
              ? (extractionStage ? extractionStage : `${t('recipes:analyzing')} ${uploadCount} ${uploadCount !== 1 ? t('recipes:files') : t('recipes:file')}...`)
              : t('recipes:upload')}
          </button>
          {import.meta.env.MODE === 'development' && (
            <button
              onClick={() => setMigrateModalOpen(true)}
              disabled={migrating}
              className="text-xs text-cocoa-500 hover:text-cocoa-900 px-2 py-1"
              title={t('recipes:devActions.migrateTooltip')}
            >
              {migrating ? t('recipes:devActions.migrating') : t('recipes:devActions.migrate')}
            </button>
          )}
          <Link
            to="/recipes/audit"
            className="text-xs text-cocoa-500 hover:text-cocoa-900 px-2 py-1"
            title={t('recipes:devActions.auditTooltip')}
          >
            {t('recipes:devActions.auditLink')}
          </Link>
          <button
            onClick={() => navigate('/recipes/new/edit')}
            className="bg-copper hover:bg-copper-dark text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('recipes:addRecipe')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {recipes.map((recipe) => {
          const cost = calculateRecipeCost(recipe, ingredients, recipes).cost;
          const retailPrice = recipe.retailPrice || 0;
          const margin = retailPrice > 0 ? ((retailPrice - cost) / retailPrice) * 100 : 0;
          const targetMargin = recipe.targetMarginPercentage || 65;
          const isMarginGood = margin >= targetMargin;
          const allergens = getRecipeAllergens(recipe, recipes, ingredients);

          const aggregatedAllergens: AllergenFlag[] = (() => {
            const ingredientNames: string[] = [];
            for (const comp of recipe.components || []) {
              for (const ing of comp.ingredients) {
                const resolved = ingredients.find(i => i.id === ing.ingredientId);
                const name = resolved?.name || (ing as any).name;
                if (name) ingredientNames.push(name);
              }
            }
            const derived = deriveAllergens(ingredientNames);
            const merged = new Map<AllergenKey, AllergenFlag>();
            for (const flag of derived) merged.set(flag.allergen, flag);
            for (const key of (restaurant?.standingAllergenDisclaimer || [])) {
              const k = key as AllergenKey;
              if (!merged.has(k)) {
                merged.set(k, { allergen: k, certainty: 'may_contain', source: 'kitchen cross-contact disclaimer' });
              }
            }
            return Array.from(merged.values());
          })();

          return (
          <Link 
            key={recipe.id} 
            to={`/recipes/${recipe.id}`}
            className="bg-white rounded-2xl shadow-sm border border-cocoa-100 overflow-hidden flex flex-col hover:shadow-md hover:border-cocoa-300 transition-all group"
          >
            <div className="p-6 flex-1">
              {/* Header: name + margin health dot */}
              <div className="flex justify-between items-start gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-xl font-semibold text-cocoa-900 leading-snug break-words line-clamp-3">
                    <LocalizedField
                      field={recipe.nameI18n}
                      legacyText={recipe.name}
                      placeholder={t('recipes:editor.unnamed') || 'Unnamed Recipe'}
                    />
                  </h3>
                </div>
                <div 
                  className={`shrink-0 w-3 h-3 rounded-full mt-2 ${
                    retailPrice === 0 ? 'bg-cocoa-100' : 
                    isMarginGood ? 'bg-pistachio' : 
                    'bg-raspberry'
                  }`}
                  title={retailPrice === 0 ? t('recipes:noPriceSet') : `${t('recipes:margin')}: ${margin.toFixed(1)}%`}
                />
              </div>
              
              {/* Type + allergens as subtle metadata */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-block px-2 py-0.5 text-xs text-cocoa-500 lowercase tracking-wide">
                  {recipe.type 
                    ? (i18n.exists(`enums:recipeTypes.${recipe.type}`) 
                        ? t(`enums:recipeTypes.${recipe.type}` as any) 
                        : <LocalizedField legacyText={recipe.type} />)
                    : t('enums:recipeTypes.standard')}
                </span>
                {aggregatedAllergens.length > 0 && (
                  <span
                    className="inline-block px-2 py-0.5 bg-raspberry/10 text-raspberry text-xs rounded-md font-medium"
                    title={aggregatedAllergens.map(a => `${a.certainty === 'contains' ? '' : t('recipes:mayContain') + ' '}${t(`enums:allergens.${a.allergen}` as any, ALLERGEN_LABELS[a.allergen])}`).join('; ')}
                  >
                    {aggregatedAllergens.filter(a => a.certainty === 'contains').map(a => t(`enums:allergens.${a.allergen}` as any, ALLERGEN_LABELS[a.allergen])).join(', ') || t('recipes:mayContainAllergens')}
                  </span>
                )}
              </div>
              
              {/* Description — truncated, lower hierarchy */}
              {(recipe.descriptionI18n || recipe.description) && (
                <LocalizedField
                  as="p"
                  className="text-sm text-cocoa-500 line-clamp-4 mb-4"
                  field={recipe.descriptionI18n}
                  legacyText={recipe.description}
                />
              )}
              
              {/* Minimal metadata footer */}
              <div className="flex items-center gap-3 text-xs text-cocoa-500 mt-auto pt-3 border-t border-cocoa-100">
                <span>{t('recipes:ingredientCount', { count: (recipe.components || []).reduce((sum, c) => sum + c.ingredients.length, 0) })}</span>
                {recipe.yield && (
                  <>
                    <span className="text-cocoa-300">·</span>
                    <span>{t('recipes:yields')} {recipe.yield.totalYieldAmount} {t(`enums:units.${recipe.yield.totalYieldUnit}` as any, recipe.yield.totalYieldUnit)}</span>
                  </>
                )}
              </div>
            </div>
          </Link>
          );
        })}
        {recipes.length === 0 && (
          <div className="col-span-full p-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200 border-dashed">
            {t('recipes:noRecipes')}
          </div>
        )}
      </div>

      {extractedRecipes && (
        <BatchImportReview
          extractedRecipes={extractedRecipes}
          existingIngredients={ingredients}
          onConfirm={handleConfirmBatchImport}
          onCancel={() => setExtractedRecipes(null)}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isAlert={confirmModal.isAlert}
        isDestructive={confirmModal.isDestructive}
      />

      {similarRecipeModal.isOpen && similarRecipeModal.extractedRecipe && similarRecipeModal.matchingRecipe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 bg-amber-50">
              <h3 className="text-lg font-semibold text-amber-900">{t('recipes:similarRecipe.found')}</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-stone-700">
                <Trans 
                  i18nKey={"recipes:similarRecipe.body" as any} 
                  t={t}
                  values={{ extracted: similarRecipeModal.extractedRecipe.name, existing: similarRecipeModal.matchingRecipe.name }}
                  components={{ 1: <strong />, 2: <strong /> }}
                />
              </p>
              <p className="text-sm text-stone-500">{t('recipes:similarRecipe.whatToDo')}</p>
            </div>
            <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex flex-col gap-2">
              <button
                onClick={() => {
                  // Create as new anyway
                  const extracted = similarRecipeModal.extractedRecipe!;
                  
                  const baseRecipe = {
                    name: extracted.name,
                    description: extracted.description || '',
                    type: extracted.type || 'standard',
                    components: extracted.components || [],
                    yield: extracted.yield || null,
                    confidence: extracted.confidence || null,
                    ocrTranscript: extracted.ocrTranscript || null,
                    lowConfidenceFields: extracted.lowConfidenceFields || null,
                    stationTag: extracted.stationTag || undefined,
                  } as Recipe;
                  
                  const crossContactRisks = computeCrossContactRisks(baseRecipe, recipes, ingredients);
                  const uiLanguage = (i18n.language.split('-')[0] as SupportedLanguage);
                  const localized = attachRecipeLocalizedFields(
                    { ...baseRecipe, crossContactRisks },
                    undefined,
                    uiLanguage
                  );
                  
                  addDoc(collection(db, 'recipes'), stripUndefined({
                    ...localized,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                  }));
                  setSimilarRecipeModal({ isOpen: false, extractedRecipe: null, matchingRecipe: null });
                  toast.success(t('recipes:similarRecipe.createdAsNewToast'));
                }}
                className="w-full px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-xl transition-colors"
              >
                {t('recipes:similarRecipe.createAsNew')}
              </button>
              <button
                onClick={() => {
                  toast.info(t('recipes:similarRecipe.skippedOpeningToast'));
                  setSimilarRecipeModal({ isOpen: false, extractedRecipe: null, matchingRecipe: null });
                }}
                className="w-full px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-medium rounded-xl transition-colors"
              >
                {t('recipes:similarRecipe.skipKeepExisting')}
              </button>
              <button
                onClick={() => setSimilarRecipeModal({ isOpen: false, extractedRecipe: null, matchingRecipe: null })}
                className="w-full px-4 py-2 text-stone-500 hover:text-stone-700 text-sm font-medium"
              >
                {t('common:cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={migrateModalOpen}
        onClose={() => setMigrateModalOpen(false)}
        onConfirm={handleMigrate}
        title={t('recipes:devActions.migrate')}
        message={t('recipes:devActions.migrateConfirm')}
        confirmText={t('common:confirm')}
        cancelText={t('common:cancel')}
      />
    </div>
  );
}
