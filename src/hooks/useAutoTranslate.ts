import { useEffect, useRef } from 'react';
import { Recipe, SupportedLanguage, SUPPORTED_LANGUAGES, LocalizedString } from '../types';
import { translateRecipe, applyTranslationProposal } from '../services/translateRecipe';
import { attachRecipeLocalizedFields, stripUndefined } from '../utils/localized';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Module-level guard so we don't re-run on every re-render and don't
 * race two simultaneous viewers of the same recipe.
 */
const inFlight = new Set<string>();
const completed = new Set<string>();

/**
 * Return true if the recipe has at least one translatable field that
 * is missing a curated translation in at least one non-source language.
 * Cheap structural check — no network calls.
 */
function hasMissingTranslations(recipe: Recipe): boolean {
  const checkField = (text: string | undefined, i18n: LocalizedString | undefined): boolean => {
    if (!text || text.trim().length === 0) return false;
    const sourceLang = i18n?.sourceLanguage ?? 'en';
    const translations = i18n?.translations || {};
    for (const target of SUPPORTED_LANGUAGES) {
      if (target === sourceLang) continue;
      if (!translations[target] || translations[target]!.length === 0) return true;
    }
    return false;
  };

  if (checkField(recipe.name, recipe.nameI18n)) return true;
  if (checkField(recipe.description, recipe.descriptionI18n)) return true;
  if (checkField(recipe.storageInstructions, recipe.storageInstructionsI18n)) return true;
  if (checkField(recipe.shelfLife, recipe.shelfLifeI18n)) return true;

  for (const comp of recipe.components || []) {
    if (checkField(comp.name, comp.nameI18n)) return true;
    for (const step of comp.steps || []) {
      if (checkField(step.title, step.titleI18n)) return true;
      if (checkField(step.instruction, step.instructionI18n)) return true;
      if (checkField(step.warning, step.warningI18n)) return true;
      if (checkField(step.ccpInstruction, step.ccpInstructionI18n)) return true;
    }
    for (const ing of comp.ingredients || []) {
      if (checkField(ing.state, ing.stateI18n)) return true;
      if (checkField(ing.specification, ing.specificationI18n)) return true;
    }
  }
  return false;
}

/**
 * On mount and whenever `recipe` changes, check if the recipe needs
 * translation. If so, call `translateRecipe`, apply the proposal,
 * write the result back to Firestore. Errors are swallowed silently —
 * the page continues to render with whatever curated translations
 * exist plus the runtime fallback for the rest.
 *
 * Designed to run exactly once per recipe per browser session. The
 * module-level `completed` set prevents re-runs on tab navigation
 * back to the same recipe. The `inFlight` set prevents two simultaneous
 * runs (e.g., parent re-renders during the async work).
 */
export function useAutoTranslate(recipe: Recipe | null): void {
  const triggeredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!recipe || !recipe.id) return;
    if (triggeredRef.current === recipe.id) return;
    if (completed.has(recipe.id)) return;
    if (inFlight.has(recipe.id)) return;
    if (!hasMissingTranslations(recipe)) {
      completed.add(recipe.id);
      return;
    }

    triggeredRef.current = recipe.id;
    inFlight.add(recipe.id);

    (async () => {
      try {
        const proposal = await translateRecipe(recipe);
        if (proposal.fills.length === 0) {
          completed.add(recipe.id!);
          return;
        }

        const acceptedPaths = new Set<string>();
        for (const fill of proposal.fills) {
          if (fill.status !== 'error') acceptedPaths.add(fill.path);
        }
        if (acceptedPaths.size === 0) {
          completed.add(recipe.id!);
          return;
        }

        const updated = applyTranslationProposal(recipe, proposal, acceptedPaths);
        const sourceLang = (recipe.nameI18n?.sourceLanguage ?? 'en') as SupportedLanguage;
        const withLocalized = attachRecipeLocalizedFields(updated, recipe, sourceLang);
        const sanitized = stripUndefined(withLocalized);

        await updateDoc(doc(db, 'recipes', recipe.id!), {
          ...sanitized,
          updatedAt: serverTimestamp(),
        });

        completed.add(recipe.id!);
      } catch (err) {
        // Silent failure. The page still renders. The next view of this
        // recipe will retry (we don't put failed recipes in `completed`).
        console.warn('[useAutoTranslate] translation failed for recipe', recipe.id, err);
      } finally {
        inFlight.delete(recipe.id!);
      }
    })();
  }, [recipe]);
}
