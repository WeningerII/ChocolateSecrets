import { collection, getDocs, doc, writeBatch, serverTimestamp, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import { Recipe, RecipeComponent } from '../types';

const CURRENT_EXTRACTION_VERSION = 2;

/**
 * One-time migration: adds extractionVersion and default provenance metadata to existing recipes,
 * and safely lifts legacy ingredients array into a Base Component format.
 * Idempotent — only touches recipes that need version bumps or component lifts.
 */
export async function migrateRecipesToV2(): Promise<{ 
  migrated: number; 
  skipped: number;
  liftedLegacyIngredients: number;
}> {
  const snapshot = await getDocs(collection(db, 'recipes'));
  let migrated = 0;
  let skipped = 0;
  let liftedLegacyIngredients = 0;
  const batch = writeBatch(db);
  let batchCount = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as Recipe;
    const needsVersionBump = (data.extractionVersion || 0) < CURRENT_EXTRACTION_VERSION;
    const hasLegacyIngredients = data.ingredients && data.ingredients.length > 0;
    const hasNoComponents = !data.components || data.components.length === 0;
    const needsComponentLift = hasLegacyIngredients && hasNoComponents;

    if (!needsVersionBump && !needsComponentLift) {
      skipped++;
      continue;
    }

    const updatePayload: Record<string, any> = {
      migratedAt: serverTimestamp(),
    };

    if (needsVersionBump) {
      updatePayload.extractionVersion = CURRENT_EXTRACTION_VERSION;
    }

    if (needsComponentLift) {
      const baseComponent: RecipeComponent = {
        id: 'base-component',
        name: 'Base Recipe',
        type: 'base',
        percentageOfTotalWeight: 100,
        bufferPercentage: 0,
        ingredients: data.ingredients || [],
        instructions: [],
      };
      updatePayload.components = [baseComponent];
      updatePayload.ingredients = deleteField();  // remove legacy field from document
      liftedLegacyIngredients++;
    }

    // We do NOT set per-field meta here — that would be noisy. Fields without meta
    // are treated as user_confirmed by the UI, which is the correct default for legacy data.
    batch.update(doc(db, 'recipes', docSnap.id), updatePayload);
    migrated++;
    batchCount++;
    
    // Firestore batch limit is 500
    if (batchCount >= 400) {
      await batch.commit();
      batchCount = 0;
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
  }
  
  return { migrated, skipped, liftedLegacyIngredients };
}
