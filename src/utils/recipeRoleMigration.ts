import { collection, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { Recipe, Ingredient } from '../types';
import { inferRoleTag } from '../services/foodScience/roles';

export async function migrateRecipeRoles() {
  const result = {
    recipesUpdated: 0,
    ingredientsTagged: 0,
    ambiguousOrLowConfidence: 0,
  };

  // Build ingredient dictionary for reference
  const ingredientSnap = await getDocs(collection(db, 'ingredients'));
  const catalog = new Map<string, Ingredient>();
  ingredientSnap.forEach((d) => {
    const ing = d.data() as Ingredient;
    if (ing.id) catalog.set(ing.id, ing);
  });

  const recipeSnap = await getDocs(collection(db, 'recipes'));
  const batch = writeBatch(db);
  let batchCount = 0;

  for (const rDoc of recipeSnap.docs) {
    const recipe = rDoc.data() as Recipe;
    let recipeChanged = false;

    if (recipe.components) {
      for (const component of recipe.components) {
        if (component.ingredients) {
          for (const ri of component.ingredients) {
            // Already tagged or a sub-recipe? Skip it.
            if (ri.role || ri.recipeId) continue;

            const baseIng = ri.ingredientId ? catalog.get(ri.ingredientId) : undefined;
            if (!baseIng) continue;

            const newRole = inferRoleTag(baseIng);
            if (newRole) {
              ri.role = newRole;
              recipeChanged = true;
              result.ingredientsTagged++;
            } else {
              result.ambiguousOrLowConfidence++;
            }
          }
        }
      }
    }

    if (recipeChanged) {
      recipe.updatedAt = serverTimestamp() as any;
      batch.update(doc(db, 'recipes', recipe.id), {
        components: recipe.components,
        updatedAt: recipe.updatedAt,
      });
      result.recipesUpdated++;
      batchCount++;

      if (batchCount >= 400) {
        await batch.commit();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return result;
}
