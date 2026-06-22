import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Recipe, Ingredient } from '../types';
import { planCrossContactRecompute } from './foodSafety';

/**
 * Admin maintenance action: recompute cross-contact allergen risks across every
 * recipe and persist the ones that changed.
 *
 * Cross-contact risk is relational — a recipe's risks depend on the allergens of
 * OTHER recipes sharing its station — but saving one recipe only refreshes that
 * recipe. After bulk imports or station re-mappings, siblings can hold stale
 * risks. This re-derives all recipes against the current catalog in one pass.
 *
 * Mirrors migrateRecipesToV2: client-side, batched under the 500-write Firestore
 * limit, and idempotent (a catalog already in sync updates nothing).
 */
export async function recomputeAllCrossContactRisks(): Promise<{
  scanned: number;
  updated: number;
  unchanged: number;
}> {
  const [recipeSnap, ingredientSnap] = await Promise.all([
    getDocs(collection(db, 'recipes')),
    getDocs(collection(db, 'ingredients')),
  ]);

  const allRecipes = recipeSnap.docs.map(d => ({ ...d.data(), id: d.id } as Recipe));
  const ingredients = ingredientSnap.docs.map(d => ({ ...d.data(), id: d.id } as Ingredient));

  const changes = planCrossContactRecompute(allRecipes, ingredients);

  let batch = writeBatch(db);
  let batchCount = 0;
  for (const { recipeId, crossContactRisks } of changes) {
    batch.update(doc(db, 'recipes', recipeId), { crossContactRisks });
    batchCount++;
    // Firestore batch limit is 500; commit and start a fresh batch before then.
    if (batchCount >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
    }
  }
  if (batchCount > 0) {
    await batch.commit();
  }

  return {
    scanned: allRecipes.length,
    updated: changes.length,
    unchanged: allRecipes.length - changes.length,
  };
}
