import { Ingredient, Lot, Recipe, PriceHistoryEntry } from '../types';
import { collection, query, where, getDocs, doc, serverTimestamp, Firestore, WriteBatch, Timestamp } from 'firebase/firestore';
import { parseFirestoreDate } from './date';
import { SafeBatch } from './firestore';

/**
 * Return the updated priceHistory array for an ingredient whose cost has changed.
 * If the new cost equals the current cost, returns the existing array unchanged.
 * If this is the first cost entry, seeds a new array.
 *
 * Does NOT write to Firestore — caller is responsible for including the returned
 * array in their ingredient update.
 */
export function appendPriceHistoryIfChanged(
  current: Ingredient | undefined,
  newCost: number,
  supplierName: string = '',
  supplierId?: string
): PriceHistoryEntry[] {
  const existing = current?.priceHistory || [];
  const oldCost = current?.costPerUnit ?? null;
  
  // Skip only when we have a prior cost AND it matches exactly
  if (oldCost !== null && oldCost === newCost) {
    return existing;
  }
  
  return [
    ...existing,
    {
      date: Timestamp.now(),
      costPerUnit: newCost,
      supplier: supplierName,
      ...(supplierId ? { supplierId } : {})
    },
  ];
}

/**
 * Default shelf life used when a recipe doesn't specify one. Conservative
 * 14 days — long enough for most produced items, short enough that the chef
 * will notice if it's wrong.
 */
export const DEFAULT_PRODUCED_LOT_SHELF_LIFE_DAYS = 14;

/**
 * Compute an expiresAt Timestamp for a newly-produced lot based on the
 * recipe's HACCP shelf-life data, or a conservative default if unspecified.
 *
 * Returns both the Timestamp and a boolean indicating whether the default
 * was used — callers can surface a warning to the chef if so.
 */
export function computeProducedLotExpiry(
  recipe: Recipe | undefined,
  producedAt: Date = new Date()
): { expiresAt: Timestamp; usedDefault: boolean } {
  const shelfLifeDays = recipe?.haccp?.shelfLifeDays;
  const usedDefault = !shelfLifeDays || shelfLifeDays <= 0;
  
  const days = usedDefault ? DEFAULT_PRODUCED_LOT_SHELF_LIFE_DAYS : shelfLifeDays;
  
  const expiryDate = new Date(producedAt);
  expiryDate.setDate(expiryDate.getDate() + days);
  
  return {
    expiresAt: Timestamp.fromDate(expiryDate),
    usedDefault,
  };
}

/**
 * Depletes stock from an array of lots using FEFO (First Expiring, First Out) logic.
 * If no expiration date is present, falls back to FIFO (First In, First Out) based on receivedAt.
 * 
 * @param lots The available lots for the ingredient
 * @param amountToConsume The total amount to consume
 * @returns An object containing the updated lots, any remaining unfulfilled amount, and the specific lots consumed.
 */
export function depleteStock(
  lots: Lot[], 
  amountToConsume: number
): { 
  updatedLots: Lot[], 
  modifiedLots: Lot[],
  remainingAmount: number, 
  consumedLots: { lotId: string, amount: number, costPerUnit: number }[] 
} {
  if (!lots || lots.length === 0) {
    return { updatedLots: [], modifiedLots: [], remainingAmount: amountToConsume, consumedLots: [] };
  }

  // Sort lots by expiration date (FEFO), then received date (FIFO)
  const sortedLots = lots.map(lot => ({ ...lot })).sort((a, b) => {
    const expA = a.expiresAt ? parseFirestoreDate(a.expiresAt).getTime() : Infinity;
    const expB = b.expiresAt ? parseFirestoreDate(b.expiresAt).getTime() : Infinity;
      
    if (expA !== expB) return expA - expB;

    const recA = a.receivedAt ? parseFirestoreDate(a.receivedAt).getTime() : 0;
    const recB = b.receivedAt ? parseFirestoreDate(b.receivedAt).getTime() : 0;
      
    return recA - recB;
  });

  let remainingToConsume = amountToConsume;
  const consumedLots: {lotId: string, amount: number, costPerUnit: number}[] = [];
  const updatedLots: Lot[] = [];
  const modifiedLots: Lot[] = [];

  for (const lot of sortedLots) {
    // If we've fulfilled the consumption, just keep the remaining lots as is
    if (remainingToConsume <= 0) {
      updatedLots.push(lot);
      continue;
    }

    if (lot.quantity > 0) {
      const consumeFromLot = Math.min(lot.quantity, remainingToConsume);
      lot.quantity -= consumeFromLot;
      remainingToConsume -= consumeFromLot;

      consumedLots.push({
        lotId: lot.id,
        amount: consumeFromLot,
        costPerUnit: lot.costPerUnit
      });
      
      modifiedLots.push(lot);
    }

    // Only keep the lot if it still has quantity remaining
    if (lot.quantity > 0) {
      updatedLots.push(lot);
    }
  }

  return {
    updatedLots,
    modifiedLots,
    remainingAmount: remainingToConsume,
    consumedLots
  };
}

