import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, OperationType, reportFirestoreError } from '../firebase';
import type { Alert } from '../types';

/**
 * Real-time subscription to the alerts addressed to a single user. Alerts are
 * read-gated by userId in firestore.rules, so this only ever yields the caller's
 * own alerts. Sorting and active/dismissed filtering are left to the caller (the
 * set per user is small), which keeps this to a single-field equality query — no
 * composite index required.
 */
export function subscribeToUserAlerts(
  uid: string,
  onData: (alerts: Alert[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(collection(db, 'alerts'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Alert))),
    (error) => {
      // Listener callbacks must not throw (see reportFirestoreError); surface the
      // failure to the caller so it can clear its loading state.
      reportFirestoreError(error, OperationType.LIST, 'alerts');
      onError?.(error);
    },
  );
}

/**
 * Marks an alert as dismissed. Only dismissedAt + updatedAt may change here — the
 * alerts update rule in firestore.rules enforces diff().hasOnly([...]) — so this
 * writes exactly those two fields.
 */
export async function dismissAlert(alertId: string): Promise<void> {
  await updateDoc(doc(db, 'alerts', alertId), {
    dismissedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
