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
  .onCreate(async (snap, context) => {
    const transaction = snap.data();
    const ingredientId = transaction.ingredientId;
    const amount = transaction.amount || 0;
    const type = transaction.type;
    const costPerUnit = transaction.costPerUnit || 0;

    if (!ingredientId || amount === 0 || type === 'transfer') return;

    const ingredientRef = db.collection('ingredients').doc(ingredientId);

    await db.runTransaction(async (t) => {
      const ingredientDoc = await t.get(ingredientRef);
      if (!ingredientDoc.exists) return;

      const ingredient = ingredientDoc.data()!;
      const currentStock = ingredient.stock || 0;
      const currentWAC = ingredient.weightedAverageCost || 0;
      
      const { newStock, newWac } = computeStockUpdate(type, amount, currentStock, currentWAC, costPerUnit);

      t.update(ingredientRef, {
        stock: newStock,
        weightedAverageCost: newWac,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Check shopping list
      const { shouldAdd, quantity: orderQty } = computeShoppingListQuantity(ingredient, newStock);
      
      if (shouldAdd) {
        const pendingQuery = await t.get(
          db.collection('shopping_list')
            .where('ingredientId', '==', ingredientId)
            .where('status', 'in', ['pending', 'ordered', 'purchased'])
        );

        if (pendingQuery.empty) {
          const shoppingListRef = db.collection('shopping_list').doc();
          t.set(shoppingListRef, {
            ingredientId,
            name: ingredient.name,
            quantity: orderQty,
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
      }
    });
  });
