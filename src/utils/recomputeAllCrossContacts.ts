import { collection, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { Recipe, Ingredient, CrossContactRisk } from '../types';
import { computeCrossContactRisks } from './foodSafety';

export interface RecomputeCrossContactResult {
  /** Total recipes examined. */
  recipesScanned: number;
  /** Recipes whose cross-contact risk set actually changed and were written. */
  recipesUpdated: number;
}

/**
 * Order-insensitive equality of two cross-contact risk sets. The stored field may
 * still hold legacy string entries; those never key-match a structured risk, so a
 * recipe carrying them reads as "changed" and gets upgraded to structured risks.
 */
function risksEqual(existing: readonly (string | CrossContactRisk)[], next: readonly CrossContactRisk[]): boolean {
  if (existing.length !== next.length) return false;
  const key = (r: string | CrossContactRisk) =>
    typeof r === 'string' ? `str:${r}` : `${r.allergen}|${r.station ?? ''}`;
  const left = existing.map(key).sort();
  const right = next.map(key).sort();
  return left.every((v, i) => v === right[i]);
}

/**
 * Admin maintenance action: recompute `crossContactRisks` for EVERY recipe.
 *
 * Saving a single recipe only recomputes that recipe's risks, so when a recipe
 * gains an allergen the sibling recipes sharing its station keep stale risk sets
 * until each is individually re-saved (see docs/pending-features.md). This forces a
 * global pass against the current station/allergen graph. Only recipes whose risk
 * set actually changed are written, so reruns are cheap and don't churn `updatedAt`.
 */
export async function recomputeAllCrossContacts(): Promise<RecomputeCrossContactResult> {
  const [recipeSnap, ingredientSnap] = await Promise.all([
    getDocs(collection(db, 'recipes')),
    getDocs(collection(db, 'ingredients')),
  ]);

  const recipes = recipeSnap.docs.map((d) => d.data() as Recipe);
  const ingredients = ingredientSnap.docs.map((d) => d.data() as Ingredient);

  let batch = writeBatch(db);
  let batchCount = 0;
  let recipesUpdated = 0;

  for (const recipe of recipes) {
    if (!recipe.id) continue;
    const next = computeCrossContactRisks(recipe, recipes, ingredients);
    if (risksEqual(recipe.crossContactRisks ?? [], next)) continue;

    batch.update(doc(db, 'recipes', recipe.id), {
      crossContactRisks: next,
      updatedAt: serverTimestamp(),
    });
    recipesUpdated++;
    batchCount++;

    // Firestore caps a batch at 500 writes; commit and start a fresh batch at 400.
    // (The sibling migrations reuse a committed batch — a latent bug past 500 docs.)
    if (batchCount >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return { recipesScanned: recipes.length, recipesUpdated };
}
