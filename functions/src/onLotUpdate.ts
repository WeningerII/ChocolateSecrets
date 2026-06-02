import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

/**
 * Decide whether a lot should be archived: it just transitioned from a positive
 * quantity to depleted (<= 0). Pure and fully guarded so a missing before/after
 * snapshot or a non-numeric quantity can never throw inside the trigger.
 */
export function shouldArchiveLot(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): boolean {
  if (!before || !after) return false;
  const beforeQty = before.quantity;
  const afterQty = after.quantity;
  return typeof beforeQty === "number" && typeof afterQty === "number" &&
    beforeQty > 0 && afterQty <= 0;
}

export const onLotUpdate = onDocumentUpdated("lots/{lotId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log("No data associated with the event");
    return;
  }

  if (!shouldArchiveLot(snapshot.before.data(), snapshot.after.data())) {
    return;
  }

  const lotId = event.params.lotId;
  const db = admin.firestore();
  const lotRef = db.collection("lots").doc(lotId);
  const archivedRef = db.collection("archivedLots").doc(lotId);

  // Re-read inside a transaction rather than trusting the (possibly stale) event
  // payload: archive the lot's *current* state, no-op if it was already
  // archived/deleted (idempotent under at-least-once retries), and skip if the
  // quantity recovered before the trigger ran. Errors propagate so the platform
  // retries — safe because the operation is idempotent.
  await db.runTransaction(async (tx) => {
    const lotDoc = await tx.get(lotRef);
    if (!lotDoc.exists) return;
    const current = lotDoc.data()!;
    if (typeof current.quantity !== "number" || current.quantity > 0) return;
    tx.set(archivedRef, {
      ...current,
      archivedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.delete(lotRef);
  });

  console.log(`Successfully archived lot ${lotId}`);
});
