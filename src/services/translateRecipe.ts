import { Recipe, RecipeComponent, RecipeStep, RecipeIngredient, SupportedLanguage, SUPPORTED_LANGUAGES, LocalizedString } from '../types';
import { queueTranslation } from './translationClient';

/**
 * A single field that needs translating. The path identifies the field's
 * location within the Recipe so we can write the result back to the right
 * place. The source language is the field's canonical-text language.
 */
interface TranslationTask {
  path: string;            // e.g. "name", "description", "components[0].steps[2].instruction"
  sourceText: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  /** Existing curated translations on this field, used to skip already-populated slots. */
  existingTranslations: Partial<Record<SupportedLanguage, string>>;
}

/**
 * Result of translating one field into one target language.
 */
interface TranslationFill {
  path: string;
  targetLanguage: SupportedLanguage;
  text: string;
  status: 'success' | 'cached' | 'error';
}

/**
 * Per-recipe proposal: a flat list of fills, plus the source-language
 * map (which fields had which source language). The apply step uses
 * the path to walk back into the recipe and write the translation
 * into the appropriate slot.
 */
export interface TranslationProposal {
  fills: TranslationFill[];
  /** How many fields had at least one missing translation. */
  fieldsTranslated: number;
  /** How many translation calls were issued (after de-duplication via cache). */
  callsIssued: number;
  /** How many translation attempts errored (will surface in the review modal). */
  errors: number;
}

/**
 * Resolves the source language for a translatable field. The Phase 2 schema
 * means I18n fields carry their own sourceLanguage. For legacy raw fields,
 * default to English (the historical assumption). Caller can override.
 */
function resolveSourceLanguage(
  i18n: LocalizedString | undefined,
  defaultLang: SupportedLanguage
): SupportedLanguage {
  return i18n?.sourceLanguage ?? defaultLang;
}

/**
 * Build the list of (field × target language) tasks to run.
 * Skips:
 *   - Empty source text (nothing to translate).
 *   - Target language matching the field's source language.
 *   - Targets that already have a curated translation in *I18n.translations.
 *
 * Default source language fallback: English for raw legacy fields.
 */
function collectTasks(recipe: Recipe): TranslationTask[] {
  const tasks: TranslationTask[] = [];

  function pushField(
    path: string,
    sourceText: string | undefined,
    i18n: LocalizedString | undefined,
    defaultSource: SupportedLanguage = 'en'
  ) {
    if (!sourceText || sourceText.trim().length === 0) return;
    const sourceLanguage = resolveSourceLanguage(i18n, defaultSource);
    const existingTranslations = i18n?.translations || {};
    for (const target of SUPPORTED_LANGUAGES) {
      if (target === sourceLanguage) continue;
      if (existingTranslations[target] && existingTranslations[target]!.length > 0) continue;
      tasks.push({
        path,
        sourceText,
        sourceLanguage,
        targetLanguage: target,
        existingTranslations,
      });
    }
  }

  // Recipe-level fields
  pushField('name', recipe.name, recipe.nameI18n);
  pushField('description', recipe.description, recipe.descriptionI18n);
  pushField('storageInstructions', recipe.storageInstructions, recipe.storageInstructionsI18n);
  pushField('shelfLife', recipe.shelfLife, recipe.shelfLifeI18n);

  // Component and step fields
  (recipe.components || []).forEach((comp, ci) => {
    pushField(`components[${ci}].name`, comp.name, comp.nameI18n);

    (comp.steps || []).forEach((step, si) => {
      pushField(`components[${ci}].steps[${si}].title`, step.title, step.titleI18n);
      pushField(`components[${ci}].steps[${si}].instruction`, step.instruction, step.instructionI18n);
      pushField(`components[${ci}].steps[${si}].warning`, step.warning, step.warningI18n);
      pushField(`components[${ci}].steps[${si}].ccpInstruction`, step.ccpInstruction, step.ccpInstructionI18n);
    });

    (comp.ingredients || []).forEach((ing, ii) => {
      pushField(`components[${ci}].ingredients[${ii}].state`, ing.state, ing.stateI18n);
      pushField(`components[${ci}].ingredients[${ii}].specification`, ing.specification, ing.specificationI18n);
    });
  });

  return tasks;
}

/**
 * Run every collected task through queueTranslation in parallel. The client
 * batches these into chunks server-side, so a single recipe with many
 * fields produces one or two server calls regardless of field count.
 *
 * Returns a proposal containing every fill (success or error). The caller
 * presents the proposal in a review modal before applying.
 */
export async function translateRecipe(recipe: Recipe): Promise<TranslationProposal> {
  const tasks = collectTasks(recipe);

  // Group tasks by path — for the fieldsTranslated count.
  const pathsTouched = new Set(tasks.map(t => t.path));

  // Fire all translation requests in parallel. queueTranslation handles
  // batching, caching, and the actual server call internally.
  const results = await Promise.all(
    tasks.map(async (task) => {
      const result = await queueTranslation(task.sourceText, task.sourceLanguage, task.targetLanguage);
      return {
        path: task.path,
        targetLanguage: task.targetLanguage,
        text: result.text,
        status: result.status,
      } as TranslationFill;
    })
  );

  // Drop entries where the translation came back identical to the source —
  // either Gemini decided not to translate (e.g., for brand names or
  // numbers) or the source was already in the target language despite
  // sourceLanguage tagging. Keeping these would clutter the proposal.
  const fills = results.filter((r) => {
    const task = tasks.find(t => t.path === r.path && t.targetLanguage === r.targetLanguage)!;
    if (r.status === 'error') return true;
    return r.text !== task.sourceText;
  });

  return {
    fills,
    fieldsTranslated: pathsTouched.size,
    callsIssued: results.filter(r => r.status !== 'cached').length,
    errors: results.filter(r => r.status === 'error').length,
  };
}

/**
 * Walk the dotted path back into the recipe and write the translation
 * into the appropriate *I18n.translations slot. Pure function — caller
 * is responsible for persisting via the existing save pipeline.
 *
 * Path forms:
 *   - "name"                                          → recipe.nameI18n
 *   - "description"                                   → recipe.descriptionI18n
 *   - "storageInstructions" / "shelfLife"             → recipe.storageInstructionsI18n / recipe.shelfLifeI18n
 *   - "components[0].name"                            → component.nameI18n
 *   - "components[0].steps[0].title"                  → step.titleI18n
 *   - "components[0].steps[0].instruction"            → step.instructionI18n
 *   - "components[0].steps[0].warning"                → step.warningI18n
 *   - "components[0].steps[0].ccpInstruction"         → step.ccpInstructionI18n
 *   - "components[0].ingredients[0].state"            → ingredient.stateI18n
 *   - "components[0].ingredients[0].specification"    → ingredient.specificationI18n
 *
 * If the *I18n field doesn't exist yet (legacy field with no I18n), this
 * function creates it with sourceLanguage='en' as the default. The save
 * pipeline (`attachRecipeLocalizedFields`) will overwrite the source if
 * the editor's UI language differs, but for translation-button writes
 * the I18n fields land before the save helper runs, so the saved doc
 * carries the correct shape.
 */
export function applyTranslationProposal(
  recipe: Recipe,
  proposal: TranslationProposal,
  acceptedPaths: Set<string>
): Recipe {
  const next: Recipe = JSON.parse(JSON.stringify(recipe)); // deep clone for safe in-place writes

  for (const fill of proposal.fills) {
    if (fill.status === 'error') continue;
    if (!acceptedPaths.has(fill.path)) continue;

    writeTranslation(next, fill.path, fill.targetLanguage, fill.text);
  }

  return next;
}

function writeTranslation(recipe: Recipe, path: string, lang: SupportedLanguage, translation: string): void {
  // Top-level recipe fields
  if (path === 'name') return writeI18nSlot(recipe, 'nameI18n', recipe.name, lang, translation);
  if (path === 'description') return writeI18nSlot(recipe, 'descriptionI18n', recipe.description, lang, translation);
  if (path === 'storageInstructions') return writeI18nSlot(recipe, 'storageInstructionsI18n', recipe.storageInstructions || '', lang, translation);
  if (path === 'shelfLife') return writeI18nSlot(recipe, 'shelfLifeI18n', recipe.shelfLife || '', lang, translation);

  // Path parsing for nested fields
  const compMatch = path.match(/^components\[(\d+)\]\.(.+)$/);
  if (!compMatch) return;
  const compIndex = Number(compMatch[1]);
  const subPath = compMatch[2];
  const comp = (recipe.components || [])[compIndex];
  if (!comp) return;

  if (subPath === 'name') return writeI18nSlot(comp, 'nameI18n', comp.name, lang, translation);

  const stepMatch = subPath.match(/^steps\[(\d+)\]\.(.+)$/);
  if (stepMatch) {
    const stepIndex = Number(stepMatch[1]);
    const stepField = stepMatch[2];
    const step = (comp.steps || [])[stepIndex];
    if (!step) return;
    if (stepField === 'title') return writeI18nSlot(step, 'titleI18n', step.title, lang, translation);
    if (stepField === 'instruction') return writeI18nSlot(step, 'instructionI18n', step.instruction, lang, translation);
    if (stepField === 'warning') return writeI18nSlot(step, 'warningI18n', step.warning || '', lang, translation);
    if (stepField === 'ccpInstruction') return writeI18nSlot(step, 'ccpInstructionI18n', step.ccpInstruction || '', lang, translation);
    return;
  }

  const ingMatch = subPath.match(/^ingredients\[(\d+)\]\.(.+)$/);
  if (ingMatch) {
    const ingIndex = Number(ingMatch[1]);
    const ingField = ingMatch[2];
    const ing = (comp.ingredients || [])[ingIndex];
    if (!ing) return;
    if (ingField === 'state') return writeI18nSlot(ing, 'stateI18n', ing.state || '', lang, translation);
    if (ingField === 'specification') return writeI18nSlot(ing, 'specificationI18n', ing.specification || '', lang, translation);
  }
}

function writeI18nSlot<T extends Record<string, any>>(
  obj: T,
  slotKey: keyof T,
  sourceText: string,
  lang: SupportedLanguage,
  translation: string
): void {
  const existing = obj[slotKey] as LocalizedString | undefined;
  if (existing) {
    existing.translations = { ...(existing.translations || {}), [lang]: translation };
  } else {
    // Create the I18n field on the fly. Default sourceLanguage='en' for
    // legacy raw fields that never went through wrapAsLocalizedForSave.
    (obj as any)[slotKey] = {
      source: sourceText,
      sourceLanguage: 'en',
      translations: { [lang]: translation },
    } as LocalizedString;
  }
}
