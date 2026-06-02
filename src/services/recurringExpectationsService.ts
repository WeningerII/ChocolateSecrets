import { db } from '../firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, query, orderBy, where, getDocs, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { nextOccurrence } from '../utils/rrule';
import type { RecurringExpectation } from '../types';

export async function createRecurringExpectation(
  exp: Omit<RecurringExpectation, 'id' | 'createdAt' | 'updatedAt' | 'lastCheckedAt' | 'nextExpectedDate'>
): Promise<string> {
  // Compute the initial nextExpectedDate from the RRULE
  const next = nextOccurrence(exp.rrule, new Date());
  if (!next) throw new Error('RRULE produces no future occurrences');
  
  const ref = collection(db, 'recurringExpectations');
  const docRef = await addDoc(ref, {
    ...exp,
    nextExpectedDate: Timestamp.fromDate(next),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateRecurringExpectation(
  id: string,
  updates: Partial<RecurringExpectation>
): Promise<void> {
  // If rrule is being updated, recompute nextExpectedDate
  if (updates.rrule) {
    const next = nextOccurrence(updates.rrule, new Date());
    if (!next) throw new Error('RRULE produces no future occurrences');
    updates = { ...updates, nextExpectedDate: Timestamp.fromDate(next) };
  }
  
  const ref = doc(db, 'recurringExpectations', id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  } as any);
}

export async function deleteRecurringExpectation(id: string): Promise<void> {
  await deleteDoc(doc(db, 'recurringExpectations', id));
}

export async function listRecurringExpectations(activeOnly = false): Promise<RecurringExpectation[]> {
  let q = query(collection(db, 'recurringExpectations'), orderBy('createdAt', 'desc'));
  if (activeOnly) {
    q = query(collection(db, 'recurringExpectations'), where('isActive', '==', true), orderBy('createdAt', 'desc'));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as RecurringExpectation));
}

export async function listRecurringExpectationsForVendor(vendorId: string): Promise<RecurringExpectation[]> {
  const q = query(
    collection(db, 'recurringExpectations'),
    where('vendorId', '==', vendorId),
    where('isActive', '==', true)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as RecurringExpectation));
}

export async function getRecurringExpectation(id: string): Promise<RecurringExpectation | null> {
  const ref = doc(db, 'recurringExpectations', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as RecurringExpectation;
}
