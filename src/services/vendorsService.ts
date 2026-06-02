import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, query, orderBy, getDocs, getDoc, where, serverTimestamp } from 'firebase/firestore';
import type { Vendor, ExpenseCategory } from '../types';

export interface VendorResolutionResult {
  status: 'resolved' | 'unresolved' | 'ambiguous';
  candidateVendorIds: string[];
  rawExtractedVendorName: string;
}

export async function resolveVendor(rawName: string, accountIdentifier?: string): Promise<VendorResolutionResult> {
  const resolve = httpsCallable(functions, 'resolveVendor');
  const response = await resolve({ rawName, accountIdentifier });
  return response.data as VendorResolutionResult;
}

export async function createVendor(vendor: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = collection(db, 'vendors');
  const now = serverTimestamp();
  const docRef = await addDoc(ref, {
    ...vendor,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateVendor(id: string, updates: Partial<Vendor>): Promise<void> {
  const ref = doc(db, 'vendors', id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function getVendor(id: string): Promise<Vendor | null> {
  const ref = doc(db, 'vendors', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as Vendor;
}

export async function getVendorsByIds(ids: string[]): Promise<Vendor[]> {
  if (ids.length === 0) return [];
  // Firestore `in` query is limited to 10. For now batching manually if needed, but candidates max 3.
  const chunks = [];
  for (let i = 0; i < ids.length; i += 10) {
    chunks.push(ids.slice(i, i + 10));
  }
  let vendors: Vendor[] = [];
  for (const chunk of chunks) {
    const q = query(collection(db, 'vendors'), where('__name__', 'in', chunk));
    const snap = await getDocs(q);
    vendors = vendors.concat(snap.docs.map(d => ({ ...d.data(), id: d.id } as Vendor)));
  }
  return vendors;
}

export async function listVendors(activeOnly?: boolean): Promise<Vendor[]> {
  let q = query(collection(db, 'vendors'), orderBy('name', 'asc'));
  if (activeOnly) {
    q = query(collection(db, 'vendors'), where('isActive', '==', true), orderBy('name', 'asc'));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as Vendor));
}

/// Also exposing expensecategories fetching here for convenience



export async function listExpenseCategories(): Promise<ExpenseCategory[]> {
  const q = query(collection(db, 'expenseCategories'), orderBy('glAccountCode', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as ExpenseCategory));
}
