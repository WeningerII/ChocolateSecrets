import type { Recipe, RecipeComponent, RecipeIngredient, HardwareSpec, DesignLayer, RecipeStep, YieldEquation, FieldMeta } from '../../types';

export type Action =
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
