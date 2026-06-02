import {
  Recipe,
  RecipeComponent,
  RecipeStep,
  RecipeIngredient,
  Ingredient,
  Supplier,
  LocalizedString,
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
} from '../types';

/**
 * Type guard for LocalizedString.
 */
export function isLocalizedString(v: unknown): v is LocalizedString {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.source === 'string' &&
    typeof obj.sourceLanguage === 'string' &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(obj.sourceLanguage)
  );
}

/**
 * Resolve a displayable string for a given language from a field that may be
 * either the new LocalizedString shape, the legacy raw string, or undefined.
 *
 * Priority:
 *   1. LocalizedString with matching source language → return source
 *   2. LocalizedString with curated translation in target language → return that
 *   3. LocalizedString with neither → return source (best effort)
 *   4. Legacy raw string → return as-is
 *   5. Undefined/null → return empty string
 *
 * Phase 3 introduces a `<LocalizedField>` component built on this helper that
 * additionally falls back to runtime translation (the translateBatch function
 * from Phase 1) when no curated translation exists.
 */
export function getLocalizedText(
  field: LocalizedString | string | undefined | null,
  language: SupportedLanguage
): string {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  if (field.sourceLanguage === language) return field.source;
  return field.translations?.[language] ?? field.source;
}

/**
 * Wrap a freshly-edited string into a LocalizedString, preserving any
 * curated translations already present on the existing field.
 *
 * Semantics:
 * - If there's no existing field, the new text is the source in the UI language.
 * - If the existing field's source language matches the UI language, we treat
 *   the edit as updating the source. Other-language translations are preserved.
 * - If the existing field's source language differs, we treat the edit as
 *   updating the UI-language translation slot. The source stays untouched.
 *
 * This means a Spanish-speaking user editing a recipe whose canonical source
 * is English produces a Spanish translation, not a new source — which is
 * what they intend, given they are editing what they SEE on screen.
 */
export function wrapAsLocalizedForSave(
  newText: string,
  existing: LocalizedString | undefined,
  uiLanguage: SupportedLanguage
): LocalizedString {
  if (!existing) {
    return { source: newText, sourceLanguage: uiLanguage };
  }
  if (existing.sourceLanguage === uiLanguage) {
    return {
      source: newText,
      sourceLanguage: existing.sourceLanguage,
      ...(existing.translations ? { translations: existing.translations } : {}),
    };
  }
  return {
    ...existing,
    translations: {
      ...existing.translations,
      [uiLanguage]: newText,
    },
  };
}

/**
 * Merge a `Partial<Record<SupportedLanguage, string>>` translations map
 * into the `translations` map of a LocalizedString. Skips empty entries
 * and entries whose language matches the field's sourceLanguage.
 *
 * Generalizes `mergeParallelTranslation` for the editor's tabbed UI which
 * can contribute translations in any non-source language.
 */
function mergeTranslationsMap(
  field: LocalizedString | undefined,
  translationsMap: Partial<Record<SupportedLanguage, string>> | undefined
): LocalizedString | undefined {
  if (!field) return field;
  if (!translationsMap) return field;

  const merged = { ...(field.translations || {}) };
  let didChange = false;

  for (const lang of Object.keys(translationsMap) as SupportedLanguage[]) {
    if (lang === field.sourceLanguage) continue;
    const text = translationsMap[lang];
    if (!text || text.length === 0) continue;
    merged[lang] = text;
    didChange = true;
  }

  if (!didChange) return field;
  return { ...field, translations: merged };
}

/**
 * Merge a legacy parallel-language string (e.g., `nameSpanish`,
 * `instructionSpanish`) into the `translations` map of a LocalizedString.
 *
 * No-op when:
 *   - The field is undefined.
 *   - The parallel text is empty.
 *   - The parallel language matches the field's sourceLanguage (then the
 *     parallel is redundant — the source already holds that language).
 */
function mergeParallelTranslation(
  field: LocalizedString | undefined,
  parallelLanguage: SupportedLanguage,
  parallelText: string | undefined
): LocalizedString | undefined {
  if (!field) return field;
  if (!parallelText || parallelText.length === 0) return field;
  if (field.sourceLanguage === parallelLanguage) return field;
  return {
    ...field,
    translations: {
      ...field.translations,
      [parallelLanguage]: parallelText,
    },
  };
}

/**
 * Walk a Recipe object and attach every I18n field, preserving translations
 * from the matching previous version of the recipe. Components, steps, and
 * ingredients are matched by `id`.
 *
 * Use this in the save path of RecipeEditor and any other writer that
 * persists a recipe document.
 */
export function attachRecipeLocalizedFields(
  recipe: Recipe,
  original: Recipe | undefined,
  uiLanguage: SupportedLanguage
): Recipe {
  return {
    ...recipe,
    nameI18n: mergeTranslationsMap(
      mergeParallelTranslation(
        wrapAsLocalizedForSave(recipe.name || '', original?.nameI18n, uiLanguage),
        'es',
        recipe.nameSpanish
      ),
      recipe.nameTranslations
    )!,
    descriptionI18n: recipe.description
      ? wrapAsLocalizedForSave(recipe.description, original?.descriptionI18n, uiLanguage)
      : undefined,
    storageInstructionsI18n: recipe.storageInstructions
      ? wrapAsLocalizedForSave(recipe.storageInstructions, original?.storageInstructionsI18n, uiLanguage)
      : undefined,
    shelfLifeI18n: recipe.shelfLife
      ? wrapAsLocalizedForSave(recipe.shelfLife, original?.shelfLifeI18n, uiLanguage)
      : undefined,
    aiExtractionNotesI18n: recipe.aiExtractionNotes
      ? wrapAsLocalizedForSave(recipe.aiExtractionNotes, original?.aiExtractionNotesI18n, uiLanguage)
      : undefined,
    components: (recipe.components || []).map(comp => attachComponentLocalizedFields(comp, findById(original?.components, comp.id), uiLanguage)),
  };
}

function attachComponentLocalizedFields(
  component: RecipeComponent,
  original: RecipeComponent | undefined,
  uiLanguage: SupportedLanguage
): RecipeComponent {
  return {
    ...component,
    nameI18n: wrapAsLocalizedForSave(component.name || '', original?.nameI18n, uiLanguage),
    steps: (component.steps || []).map(step => attachStepLocalizedFields(step, findById(original?.steps, step.id), uiLanguage)),
    ingredients: (component.ingredients || []).map((ing, idx) => {
      const origIng = original?.ingredients?.[idx]; // Recipe ingredients have no id, match by index
      return attachRecipeIngredientLocalizedFields(ing, origIng, uiLanguage);
    }),
  };
}

function attachStepLocalizedFields(
  step: RecipeStep,
  original: RecipeStep | undefined,
  uiLanguage: SupportedLanguage
): RecipeStep {
  return {
    ...step,
    titleI18n: step.title ? wrapAsLocalizedForSave(step.title, original?.titleI18n, uiLanguage) : undefined,
    instructionI18n: step.instruction
      ? mergeTranslationsMap(
          mergeParallelTranslation(
            wrapAsLocalizedForSave(step.instruction, original?.instructionI18n, uiLanguage),
            'es',
            step.instructionSpanish
          ),
          step.instructionTranslations
        )
      : undefined,
    warningI18n: step.warning ? wrapAsLocalizedForSave(step.warning, original?.warningI18n, uiLanguage) : undefined,
    ccpInstructionI18n: step.ccpInstruction ? wrapAsLocalizedForSave(step.ccpInstruction, original?.ccpInstructionI18n, uiLanguage) : undefined,
  };
}

function attachRecipeIngredientLocalizedFields(
  ingredient: RecipeIngredient,
  original: RecipeIngredient | undefined,
  uiLanguage: SupportedLanguage
): RecipeIngredient {
  return {
    ...ingredient,
    stateI18n: ingredient.state ? wrapAsLocalizedForSave(ingredient.state, original?.stateI18n, uiLanguage) : undefined,
    specificationI18n: ingredient.specification ? wrapAsLocalizedForSave(ingredient.specification, original?.specificationI18n, uiLanguage) : undefined,
  };
}

/**
 * Walk an Ingredient (top-level collection) and attach I18n fields.
 */
export function attachIngredientLocalizedFields(
  ingredient: Ingredient,
  original: Ingredient | undefined,
  uiLanguage: SupportedLanguage
): Ingredient {
  return {
    ...ingredient,
    nameI18n: mergeParallelTranslation(
      wrapAsLocalizedForSave(ingredient.name || '', original?.nameI18n, uiLanguage),
      'es',
      ingredient.nameSpanish
    )!,
    brandI18n: ingredient.brand
      ? wrapAsLocalizedForSave(ingredient.brand, original?.brandI18n, uiLanguage)
      : undefined,
  };
}

/**
 * Walk a Supplier and attach I18n fields. No-op if the supplier has no
 * notes field defined in the schema.
 */
export function attachSupplierLocalizedFields(
  supplier: Supplier,
  original: Supplier | undefined,
  uiLanguage: SupportedLanguage
): Supplier {
  // If the Supplier interface doesn't have a `notes` field, this becomes a no-op.
  const notes = (supplier as Supplier & { notes?: string }).notes;
  if (notes === undefined) return supplier;
  return {
    ...supplier,
    notesI18n: notes ? wrapAsLocalizedForSave(notes, original?.notesI18n, uiLanguage) : undefined,
  };
}

function findById<T extends { id?: string }>(
  list: T[] | undefined,
  id: string | undefined
): T | undefined {
  if (!list || !id) return undefined;
  return list.find(item => item.id === id);
}

/**
 * Strip undefined fields from an object, recursively. Firestore rejects
 * `undefined` values in writes; this is the standard sanitizer.
 */
export function stripUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(stripUndefined) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v === undefined) continue;
    out[k] = stripUndefined(v);
  }
  return out as T;
}
