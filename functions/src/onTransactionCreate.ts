import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { computeWAC } from './utils/wac';

const db = admin.firestore();

export function computeStockUpdate(
  type: string,
  amount: number,
  currentStock: number,
  currentWAC: number,
  costPerUnit: number
): { newStock: number; newWac: number } {
  if (type === 'transfer') {
    return { newStock: currentStock, newWac: currentWAC };
  }
  const newStock = currentStock + amount;
  let newWac = currentWAC;
  if ((type === 'receive' || type === 'yield') && amount > 0) {
    newWac = computeWAC(currentStock, currentWAC, amount, costPerUnit);
  }
  return { newStock, newWac: newWac };
}

export function computeShoppingListQuantity(
  ingredient: { lowStockThreshold?: number, parLevel?: number, moq?: number },
  newStock: number
): { shouldAdd: boolean; quantity: number } {
  const lowStockThreshold = ingredient.lowStockThreshold || 0;
  if (newStock <= lowStockThreshold) {
    const targetStock = ingredient.parLevel && ingredient.parLevel > lowStockThreshold 
      ? ingredient.parLevel 
      : lowStockThreshold;
      
    let orderQty = Math.max(1, targetStock - newStock);
    if (ingredient.moq && ingredient.moq > 0) {
      orderQty = Math.max(orderQty, ingredient.moq);
    }
    return { shouldAdd: true, quantity: orderQty };
  }
  return { shouldAdd: false, quantity: 0 };
}

export const onTransactionCreate = functions.firestore
  .document('inventoryTransactions/{transactionId}')
  .onCreate(async (snap) => {
    const transaction = snap.data();
    const ingredientId = transaction.ingredientId;
    const amount = transaction.amount || 0;
    const type = transaction.type;
    const costPerUnit = transaction.costPerUnit || 0;

    if (!ingredientId || amount === 0 || type === 'transfer') return;

    const transactionRef = snap.ref;
    const ingredientRef = db.collection('ingredients').doc(ingredientId);

    await db.runTransaction(async (t) => {
      // --- Reads (Firestore requires ALL reads before ANY writes) ---

      // Idempotency guard: Cloud Functions deliver events at-least-once, so this
      // handler can fire more than once for the same transaction. Re-read the
      // source doc inside the Firestore transaction and bail if its inventory
      // effect was already applied, so a redelivery cannot double-count stock/WAC.
      const txnDoc = await t.get(transactionRef);
      if (!txnDoc.exists || txnDoc.get('inventoryApplied') === true) return;

      const ingredientDoc = await t.get(ingredientRef);
      const ingredient = ingredientDoc.exists ? ingredientDoc.data()! : null;

      let newStock = 0;
      let newWac = 0;
      let shoppingQuantity: number | null = null;
      if (ingredient) {
        const currentStock = ingredient.stock || 0;
        const currentWAC = ingredient.weightedAverageCost || 0;
        ({ newStock, newWac } = computeStockUpdate(type, amount, currentStock, currentWAC, costPerUnit));

        // The reorder check is a read, so it must happen here, before any write
        // below (a get() after a write throws READ_AFTER_WRITE).
        const { shouldAdd, quantity: orderQty } = computeShoppingListQuantity(ingredient, newStock);
        if (shouldAdd) {
          const pendingQuery = await t.get(
            db.collection('shopping_list')
              .where('ingredientId', '==', ingredientId)
              .where('status', 'in', ['pending', 'ordered', 'purchased'])
          );
          if (pendingQuery.empty) {
            shoppingQuantity = orderQty;
          }
        }
      }

      // --- Writes ---

      // Mark the source transaction as applied within the same atomic commit so
      // the guard above no-ops on any future redelivery of this event.
      t.update(transactionRef, {
        inventoryApplied: true,
        inventoryAppliedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      if (!ingredient) return;

      t.update(ingredientRef, {
        stock: newStock,
        weightedAverageCost: newWac,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      if (shoppingQuantity !== null) {
        const shoppingListRef = db.collection('shopping_list').doc();
        t.set(shoppingListRef, {
          ingredientId,
          name: ingredient.name,
          quantity: shoppingQuantity,
          unit: ingredient.orderUnit || ingredient.unit,
          status: 'pending',
          supplierId: ingredient.supplierId || null,
          moq: ingredient.moq || null,
          orderUnit: ingredient.orderUnit || null,
          costPerUnit: ingredient.costPerUnit || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });
  });
