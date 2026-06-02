import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

export const onLotUpdate = onDocumentUpdated("lots/{lotId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log("No data associated with the event");
    return;
  }

  const beforeData = snapshot.before.data();
  const afterData = snapshot.after.data();

  // Check if quantity hit 0
  if (beforeData.quantity > 0 && afterData.quantity <= 0) {
    const lotId = event.params.lotId;
    const db = admin.firestore();

    try {
      const batch = db.batch();
      
      // Move to archivedLots
      const archivedRef = db.collection("archivedLots").doc(lotId);
      batch.set(archivedRef, {
        ...afterData,
        archivedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Delete from lots
      const lotRef = db.collection("lots").doc(lotId);
      batch.delete(lotRef);
      
      await batch.commit();
      console.log(`Successfully archived lot ${lotId}`);
    } catch (error) {
      console.error(`Error archiving lot ${lotId}:`, error);
    }
  }
});
