import { collection, doc, DocumentReference, Firestore } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Generate a unique document reference for a collection. Returns the auto-ID
 * from Firestore, which is globally unique by construction (no collision risk).
 * 
 * Use this whenever you need an ID for a new document. Never use Math.random().
 */
export function newDocRef(collectionPath: string, database: Firestore = db): DocumentReference {
  return doc(collection(database, collectionPath));
}

/**
 * Format a Firestore auto-ID into a human-readable identifier with a prefix.
 * 
 * The suffix is the first 8 chars of the Firestore ID (base62), which is
 * collision-resistant at ~218 trillion possibilities for that substring.
 * Example: formatIdentifier('PO', someDocRef) => 'PO-Abc123Xy'
 */
export function formatIdentifier(prefix: string, ref: DocumentReference): string {
  return `${prefix}-${ref.id.slice(0, 8)}`;
}

/**
 * Format a lot number from a production run ID and ingredient ID.
 * Uniqueness: (runId, ingredientId) is unique by construction — each run
 * produces each ingredient at most once — so no random component needed.
 */
export function lotNumberForProduction(runId: string, ingredientId: string): string {
  return `PR-${runId.slice(0, 6)}-${ingredientId.slice(0, 6)}`;
}

/**
 * Format a lot number for received goods against a PO.
 * Uniqueness: PO + ingredient + ISO date is sufficient for the vast majority
 * of receives. If you genuinely have multiple receives of the same ingredient
 * against the same PO on the same day, append the lot's Firestore doc ID suffix.
 */
export function lotNumberForPurchaseReceive(
  poNumber: string,
  ingredientId: string,
  receivedAt: Date = new Date()
): string {
  const dateStr = receivedAt.toISOString().split('T')[0].replace(/-/g, '');
  return `${poNumber}-${ingredientId.slice(0, 4)}-${dateStr}`;
}
