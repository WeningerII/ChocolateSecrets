import { collection, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Ingredient } from '../types';
import { SafeBatch } from './firestore';

export interface ShoppingListAddOptions {
  /** If provided, operations are queued on this batch instead of committed immediately. */
  batch?: SafeBatch;
  /** If true, skip the dedup check. Default false. Use when the user explicitly chose to add (they know what they're doing). */
  skipDedupCheck?: boolean;
}

/**
 * Add an ingredient to the shopping list. Respects MoQ. Dedupes against
 * existing pending/ordered/purchased entries for the same ingredient unless
 * skipDedupCheck is set.
 * 
 * Returns true if an entry was added, false if it was skipped due to dedup.
 */
export async function addManualShoppingListItem(
  ingredient: Ingredient,
  requestedQuantity: number,
  options: ShoppingListAddOptions = {}
): Promise<boolean> {
  if (!options.skipDedupCheck) {
    const q = query(
      collection(db, 'shopping_list'),
      where('ingredientId', '==', ingredient.id),
      where('status', 'in', ['pending', 'ordered', 'purchased'])
    );
    const existing = await getDocs(q);
    if (!existing.empty) return false;
  }
  
  let orderQty = Math.max(1, requestedQuantity);
  if (ingredient.moq && ingredient.moq > 0) {
    orderQty = Math.max(orderQty, ingredient.moq);
  }
  
  const data = {
    ingredientId: ingredient.id,
    name: ingredient.name,
    quantity: orderQty,
    unit: ingredient.unit,
    status: 'pending' as const,
    supplierId: ingredient.supplierId || '',
    moq: ingredient.moq || 0,
    orderUnit: ingredient.orderUnit || '',
    costPerUnit: ingredient.costPerUnit || 0,
    createdAt: serverTimestamp(),
  };
  
  const newRef = doc(collection(db, 'shopping_list'));
  
  if (options.batch) {
    options.batch.set(newRef, data);
  } else {
    const standaloneBatch = new SafeBatch(db);
    standaloneBatch.set(newRef, data);
    await standaloneBatch.commit();
  }
  
  return true;
}
