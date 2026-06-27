import React, { useReducer, useState, useEffect } from 'react';
import { Recipe, RecipeComponent, RecipeIngredient, HardwareSpec, DesignLayer, Ingredient, RecipeType, RecipeStep, YieldEquation, Provenance, FieldMeta, BillProvenance } from '../types';
import { RECIPE_TYPES, COMPONENT_TYPES, ACTION_TYPES } from '../constants';
import { Plus, Trash2, X, AlertCircle, Calculator, Palette, ListTree, Info, GripVertical, Thermometer, Snowflake, Scissors, Settings, RefreshCw, Package, FileText, ChevronDown, Loader2, Wrench } from 'lucide-react';
import { TranslationTabs } from './TranslationTabs';
import { RoleBadge } from './RoleBadge';
import { inferRoleTag } from '../services/foodScience/roles';
import { calculateRecipeCost } from '../utils/recipeMath';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import { formatCurrency } from '../utils/formatters';
import { suggestEquipmentForStep, mergeEquipment } from '../services/culinaryTools';
import { computeCrossContactRisks } from '../utils/foodSafety';
import { useRecipePhysics } from '../hooks/useRecipePhysics';
import { RecipeCategoryPicker } from './RecipeCategoryPicker';
import { EditorPhysicsRibbon } from './EditorPhysicsRibbon';
import { EditorFrozenStrip } from './EditorFrozenStrip';
import { EditorBreadStrip } from './EditorBreadStrip';
import { RecipeWarningsList } from './RecipeWarningsList';
import { inferRecipeCategories } from '../utils/categoryInference';
import { deriveRecipeDietaryFlags } from '../utils/dietary';

function getProvenanceStyle(prov?: BillProvenance): string {
  if (!prov) return '';
  switch (prov) {
    case 'verbatim': return 'border-l-2 border-pistachio';
    case 'inferred_high': return 'border-l-2 border-copper';
    case 'inferred_low': return 'border-l-2 border-raspberry';
    case 'user_confirmed': return 'border-l-2 border-cocoa-300';
    case 'user_edited': return '';
  }
}

function ProvenanceBadge({ meta }: { meta?: FieldMeta }) {
  const { t } = useTranslation(['recipes']);
  if (!meta?.provenance) return null;
  const label: Record<Provenance, string> = {
    verbatim: t('recipes:editor.provenance.fromCard'),
    inferred_high: t('recipes:editor.provenance.inferred'),
    inferred_low: t('recipes:editor.provenance.guess'),
    user_confirmed: t('recipes:editor.provenance.confirmed'),
    user_edited: t('recipes:editor.provenance.edited'),
  };
  const color: Record<Provenance, string> = {
    verbatim: 'text-pistachio',
    inferred_high: 'text-copper',
    inferred_low: 'text-raspberry',
    user_confirmed: 'text-cocoa-500',
    user_edited: 'text-cocoa-300',
  };
  return (
    <span 
      className={`text-[10px] font-medium uppercase tracking-wide ${color[meta.provenance]}`}
      title={meta.source ? `Source: ${meta.source}` : undefined}
    >
      {label[meta.provenance]}
    </span>
  );
}

function getFieldMeta(state: any, fieldPath: string): FieldMeta | undefined {
  return state.meta?.[fieldPath];
}

function getConfidenceStyle(confidence?: number): string {
  if (confidence === undefined) return '';
  if (confidence >= 0.85) return 'border-l-4 border-emerald-400';
  if (confidence >= 0.7) return 'border-l-4 border-amber-400';
  return 'border-l-4 border-red-400';
}

function ConfidenceDot({ confidence, label }: { confidence?: number; label?: string }) {
  if (confidence === undefined) return null;
  const color = confidence >= 0.85 ? 'bg-emerald-500' : confidence >= 0.7 ? 'bg-vanilla-cream0' : 'bg-red-500';
  const title = `${label || 'AI confidence'}: ${Math.round(confidence * 100)}%`;
  return <span className={`inline-block w-2 h-2 rounded-full ${color} ml-1.5 align-middle`} title={title} />;
}

function getIngredientMinConfidence(ing: RecipeIngredient): number | undefined {
  if (!ing.confidence) return undefined;
  const scores = [
    ing.confidence.name,
    ing.confidence.quantity,
    ing.confidence.unit,
    ing.confidence.specification
  ].filter((v): v is number => typeof v === 'number');
  if (scores.length === 0) return undefined;
  return Math.min(...scores);
}

interface RecipeEditorProps {
  initialRecipe: Recipe | null;
  ingredients: Ingredient[];
  recipes: Recipe[];
  onSave: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

type Action = 
  | { type: 'SET_FIELD', field: keyof Recipe, value: unknown }
  | { type: 'UPDATE_FIELD', field: keyof Recipe, value: unknown }
  | { type: 'SET_FIELD_META', fieldPath: string, meta: FieldMeta }
  | { type: 'SET_HARDWARE', field: keyof HardwareSpec, value: unknown }
  | { type: 'ADD_CUSTOM_FIELD' }
  | { type: 'UPDATE_CUSTOM_FIELD', index: number, field: 'name' | 'value', value: string }
  | { type: 'REMOVE_CUSTOM_FIELD', index: number }
  | { type: 'ADD_TAG', tag: string }
  | { type: 'REMOVE_TAG', tag: string }
  | { type: 'ADD_COMPONENT', t: any }
  | { type: 'REMOVE_COMPONENT', index: number }
  | { type: 'UPDATE_COMPONENT', index: number, field: keyof RecipeComponent, value: unknown }
  | { type: 'ADD_INGREDIENT', componentIndex: number }
  | { type: 'REMOVE_INGREDIENT', componentIndex: number, ingredientIndex: number }
  | { type: 'UPDATE_INGREDIENT', componentIndex: number, ingredientIndex: number, field: keyof RecipeIngredient | string, value: unknown }
  | { type: 'ADD_DESIGN_LAYER', t: any }
  | { type: 'REMOVE_DESIGN_LAYER', index: number }
  | { type: 'UPDATE_DESIGN_LAYER', index: number, field: keyof DesignLayer, value: unknown }
  | { type: 'REORDER_COMPONENTS', startIndex: number, endIndex: number }
  | { type: 'REORDER_DESIGN_LAYERS', startIndex: number, endIndex: number }
  | { type: 'ADD_STEP', componentIndex: number }
  | { type: 'REMOVE_STEP', componentIndex: number, stepIndex: number }
  | { type: 'UPDATE_STEP', componentIndex: number, stepIndex: number, field: keyof RecipeStep, value: unknown }
  | { type: 'REORDER_STEPS', componentIndex: number, startIndex: number, endIndex: number }
  | { type: 'SET_YIELD', field: keyof YieldEquation, value: unknown }
  | { type: 'SET_MIXING_PARAMS', field: string, value: unknown };

function recipeReducer(state: Partial<Recipe>, action: Action): Partial<Recipe> { // i18n-ignore
  switch (action.type) {
    case 'SET_FIELD': {
      const existingMeta = state.meta?.[String(action.field)];
      const newMeta = { 
        ...(state.meta || {}), 
        [action.field]: {
          ...existingMeta,
          provenance: 'user_edited' as Provenance,
          inferredAt: new Date().toISOString(),
        }
      };
      return { ...state, [action.field]: action.value, meta: newMeta };
    }
    case 'UPDATE_FIELD': {
      return { ...state, [action.field]: action.value };
    }
    case 'SET_FIELD_META': {
      const newMeta = { ...(state.meta || {}) };
      newMeta[action.fieldPath] = action.meta;
      return { ...state, meta: newMeta };
    }
    case 'SET_HARDWARE':
      return { 
        ...state, 
        hardware: { ...(state.hardware || { moldId: '', shape: '', cavitiesPerMold: 0, moldCount: 0, gramPerCavity: 0 }), [action.field]: action.value } 
      };
    case 'ADD_CUSTOM_FIELD':
      return { ...state, customFields: [...(state.customFields || []), { name: '', value: '' }] };
    case 'UPDATE_CUSTOM_FIELD': {
      const updatedFields = [...(state.customFields || [])];
      updatedFields[action.index] = { ...updatedFields[action.index], [action.field]: action.value };
      return { ...state, customFields: updatedFields };
    }
    case 'REMOVE_CUSTOM_FIELD':
      return { ...state, customFields: (state.customFields || []).filter((_, i) => i !== action.index) };
    case 'ADD_TAG': {
      const tags = state.tags || [];
      if (!tags.includes(action.tag)) {
        return { ...state, tags: [...tags, action.tag] };
      }
      return state;
    }
    case 'REMOVE_TAG':
      return { ...state, tags: (state.tags || []).filter(t => t !== action.tag) };
    case 'ADD_COMPONENT':
      const newComponent: RecipeComponent = {
        id: crypto.randomUUID(),
        name: action.t('recipes:editor.newComponent'),
        type: 'filling',
        percentageOfTotalWeight: 10,
        bufferPercentage: 5,
        ingredients: [],
        instructions: []
      };
      return { ...state, components: [...(state.components || []), newComponent] };
    case 'REMOVE_COMPONENT':
      return { ...state, components: (state.components || []).filter((_, i) => i !== action.index) };
    case 'UPDATE_COMPONENT':
      const updatedComponents = [...(state.components || [])];
      updatedComponents[action.index] = { ...updatedComponents[action.index], [action.field]: action.value };
      return { ...state, components: updatedComponents };
    case 'ADD_INGREDIENT':
      const compsAddIng = [...(state.components || [])];
      compsAddIng[action.componentIndex].ingredients.push({ type: 'ingredient', ingredientId: '', quantity: 1, unit: 'g', isDiscrete: false });
      return { ...state, components: compsAddIng };
    case 'REMOVE_INGREDIENT':
      const compsRemIng = [...(state.components || [])];
      compsRemIng[action.componentIndex].ingredients = compsRemIng[action.componentIndex].ingredients.filter((_, i) => i !== action.ingredientIndex);
      return { ...state, components: compsRemIng };
    case 'UPDATE_INGREDIENT':
      const compsUpdIng = [...(state.components || [])];
      compsUpdIng[action.componentIndex].ingredients[action.ingredientIndex] = { 
        ...compsUpdIng[action.componentIndex].ingredients[action.ingredientIndex], 
        [action.field]: action.value 
      };
      return { ...state, components: compsUpdIng };
    case 'ADD_DESIGN_LAYER':
      const newLayer: DesignLayer = {
        order: (state.design || []).length + 1,
        technique: '',
        colors: ['#ffffff'],
        tool: '',
        notes: ''
      };
      return { ...state, design: [...(state.design || []), newLayer] };
    case 'REMOVE_DESIGN_LAYER':
      return { ...state, design: (state.design || []).filter((_, i) => i !== action.index) };
    case 'UPDATE_DESIGN_LAYER':
      const updatedDesign = [...(state.design || [])];
      updatedDesign[action.index] = { ...updatedDesign[action.index], [action.field]: action.value };
      return { ...state, design: updatedDesign };
    case 'REORDER_COMPONENTS': {
      const result = Array.from(state.components || []);
      const [removed] = result.splice(action.startIndex, 1);
      result.splice(action.endIndex, 0, removed);
      return { ...state, components: result };
    }
    case 'REORDER_DESIGN_LAYERS': {
      const result = Array.from(state.design || []);
      const [removed] = result.splice(action.startIndex, 1);
      result.splice(action.endIndex, 0, removed);
      const reorderedDesign = result.map((layer, idx) => ({ ...layer, order: idx + 1 }));
      return { ...state, design: reorderedDesign };
    }
    case 'ADD_STEP': {
      const comps = [...(state.components || [])];
      const steps = [...(comps[action.componentIndex].steps || [])];
      steps.push({
        id: crypto.randomUUID(),
        order: steps.length + 1,
        title: '',
        actionType: 'other',
        equipment: [],
        instruction: ''
      });
      comps[action.componentIndex] = { ...comps[action.componentIndex], steps };
      return { ...state, components: comps };
    }
    case 'REMOVE_STEP': {
      const comps = [...(state.components || [])];
      let steps = [...(comps[action.componentIndex].steps || [])];
      steps = steps.filter((_, i) => i !== action.stepIndex);
      comps[action.componentIndex] = { ...comps[action.componentIndex], steps };
      return { ...state, components: comps };
    }
    case 'UPDATE_STEP': {
      const comps = [...(state.components || [])];
      const steps = [...(comps[action.componentIndex].steps || [])];
      steps[action.stepIndex] = { ...steps[action.stepIndex], [action.field]: action.value };
      comps[action.componentIndex] = { ...comps[action.componentIndex], steps };
      return { ...state, components: comps };
    }
    case 'REORDER_STEPS': {
      const comps = [...(state.components || [])];
      const steps = Array.from(comps[action.componentIndex].steps || []);
      const [removed] = steps.splice(action.startIndex, 1);
      steps.splice(action.endIndex, 0, removed);
      comps[action.componentIndex] = { ...comps[action.componentIndex], steps };
      return { ...state, components: comps };
    }
    case 'SET_YIELD': {
      return {
        ...state,
        yield: { ...(state.yield || { totalYieldAmount: 0, totalYieldUnit: 'g', portionAmount: 0, portionUnit: 'g', portionApplication: '' }), [action.field]: action.value }
      };
    }
    case 'SET_MIXING_PARAMS': {
      return {
        ...state,
        mixingParams: { ...(state.mixingParams || {}), [action.field]: action.value }
      };
    }
    default:
      return state;
  }
}

const getActionIcon = (actionType: string) => {
  switch (actionType) {
    case 'heat': return <Thermometer className="w-4 h-4 text-orange-500" />;
    case 'cool': return <Snowflake className="w-4 h-4 text-blue-500" />;
    case 'chop': return <Scissors className="w-4 h-4 text-cocoa-500" />;
    case 'grind': return <Settings className="w-4 h-4 text-cocoa-500" />;
    case 'mix': return <RefreshCw className="w-4 h-4 text-emerald-500" />;
    case 'jar': return <Package className="w-4 h-4 text-copper" />;
    default: return <FileText className="w-4 h-4 text-cocoa-300" />;
  }
};

export function hydrateTranslationsFromLegacy(recipe: Recipe | null): Partial<Recipe> | null {
  if (!recipe) return null;
  const hydrated: Partial<Recipe> = { ...recipe };

  // Recipe name
  if (recipe.nameSpanish && !recipe.nameTranslations?.es) {
    hydrated.nameTranslations = { ...(recipe.nameTranslations || {}), es: recipe.nameSpanish };
  }

  // Per-step instructions
  if (recipe.components && recipe.components.length > 0) {
    hydrated.components = recipe.components.map(comp => ({
      ...comp,
      steps: (comp.steps || []).map(step => {
        if (step.instructionSpanish && !step.instructionTranslations?.es) {
          return {
            ...step,
            instructionTranslations: { ...(step.instructionTranslations || {}), es: step.instructionSpanish },
          };
        }
        return step;
      }),
    }));
  }

  return hydrated;
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
            </div>

            {/* DESIGN TAB */}
            <div className={activeTab === 'design' ? 'block' : 'hidden'}>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-cocoa-900 text-lg">{t('recipes:editor.designLayers')}</h4>
                <button type="button" onClick={() => dispatch({ type: 'ADD_DESIGN_LAYER', t })} className="text-sm text-copper-dark font-medium hover:text-copper-dark flex items-center gap-1">
                  <Plus className="w-4 h-4" /> {t('recipes:editor.addLayer')}
                </button>
              </div>
              <div className="space-y-4">
                {(state.design || []).map((layer, idx) => (
                  <div 
                    key={idx} 
                    draggable
                    onDragStart={(e) => {
                      // e.dataTransfer.effectAllowed = 'move'; // Optional
                      setDraggedDesignIndex(idx);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedDesignIndex === null || draggedDesignIndex === idx) return;
                      dispatch({ type: 'REORDER_DESIGN_LAYERS', startIndex: draggedDesignIndex, endIndex: idx });
                      setDraggedDesignIndex(idx);
                    }}
                    onDragEnd={() => setDraggedDesignIndex(null)}
                    className={`flex gap-4 items-start bg-white p-4 rounded-xl border border-cocoa-100 shadow-sm transition-all ${draggedDesignIndex === idx ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-2 shrink-0 mt-1">
                      <div className="cursor-grab active:cursor-grabbing p-1 text-cocoa-300 hover:text-cocoa-700">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col items-center justify-center w-8 h-8 bg-cocoa-100 rounded-full text-cocoa-500 font-bold">
                        {idx + 1}
                      </div>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs text-cocoa-500 mb-1">{t('recipes:editor.technique')}</label>
                        <input type="text" placeholder={t('recipes:editor.techniquePlaceholder')} value={layer.technique} onChange={(e) => dispatch({ type: 'UPDATE_DESIGN_LAYER', index: idx, field: 'technique', value: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-cocoa-500 mb-1">{t('recipes:editor.colors')}</label>
                        <input type="text" placeholder={t('recipes:editor.colorsPlaceholder')} value={layer.colors.join(', ')} onChange={(e) => dispatch({ type: 'UPDATE_DESIGN_LAYER', index: idx, field: 'colors', value: e.target.value.split(',').map(c => c.trim()) })} className="w-full px-2 py-1 border rounded text-sm" />
                        {layer.colors.filter(c => c).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {layer.colors.filter(c => c).map((color, cIdx) => (
                              <div key={cIdx} className="flex items-center gap-1 bg-cream px-1.5 py-0.5 rounded border border-cocoa-100">
                                <div 
                                  className="w-2.5 h-2.5 rounded-full border border-cocoa-300" 
                                  style={{ backgroundColor: color.toLowerCase().replace(/\s+/g, '') }}
                                  title={color}
                                />
                                <span className="text-[10px] text-cocoa-700">{color}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-cocoa-500 mb-1">{t('recipes:editor.tool')}</label>
                        <input type="text" placeholder={t('recipes:editor.toolPlaceholder')} value={layer.tool} onChange={(e) => dispatch({ type: 'UPDATE_DESIGN_LAYER', index: idx, field: 'tool', value: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-cocoa-500 mb-1">{t('recipes:editor.notes')}</label>
                        <input type="text" placeholder={t('recipes:editor.notesPlaceholder')} value={layer.notes} onChange={(e) => dispatch({ type: 'UPDATE_DESIGN_LAYER', index: idx, field: 'notes', value: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
                      </div>
                    </div>
                    <button type="button" onClick={() => dispatch({ type: 'REMOVE_DESIGN_LAYER', index: idx })} className="text-cocoa-300 hover:text-red-600 mt-6">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                {(state.design || []).length === 0 && (
                  <div className="text-sm text-cocoa-500 italic p-8 bg-cream rounded-xl text-center border border-cocoa-100 border-dashed">
                    {t('recipes:editor.noDesignLayers')}
                  </div>
                )}
              </div>
            </div>

            {/* COMPONENTS TAB */}
            <div className={activeTab === 'components' ? 'block' : 'hidden'}>
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
