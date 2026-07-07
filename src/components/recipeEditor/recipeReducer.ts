import type { Action } from './recipeEditor.types';
import type { Recipe, RecipeComponent, RecipeIngredient, DesignLayer, Provenance, FieldMeta, BillProvenance } from '../../types';

export function getProvenanceStyle(prov?: BillProvenance): string {
  if (!prov) return '';
  switch (prov) {
    case 'verbatim': return 'border-l-2 border-pistachio';
    case 'inferred_high': return 'border-l-2 border-copper';
    case 'inferred_low': return 'border-l-2 border-raspberry';
    case 'user_confirmed': return 'border-l-2 border-cocoa-300';
    case 'user_edited': return '';
  }
}

export function getFieldMeta(state: any, fieldPath: string): FieldMeta | undefined {
  return state.meta?.[fieldPath];
}

export function getConfidenceStyle(confidence?: number): string {
  if (confidence === undefined) return '';
  if (confidence >= 0.85) return 'border-l-4 border-emerald-400';
  if (confidence >= 0.7) return 'border-l-4 border-amber-400';
  return 'border-l-4 border-red-400';
}

export function getIngredientMinConfidence(ing: RecipeIngredient): number | undefined {
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

export function recipeReducer(state: Partial<Recipe>, action: Action): Partial<Recipe> { // i18n-ignore
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
