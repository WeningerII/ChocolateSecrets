import { httpsCallable } from 'firebase/functions';
import { functions, db, auth } from '../firebase';
import { collection, doc, addDoc, updateDoc, query, orderBy, limit, getDocs, getDoc, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { Bill, BillStatus, FieldMeta } from '../types';

export interface ExtractedBillResult {
  extraction: {
    billDate: { _seconds: number; _nanoseconds: number } | null;
    dueDate: { _seconds: number; _nanoseconds: number } | null;
    periodStart: { _seconds: number; _nanoseconds: number } | null;
    periodEnd: { _seconds: number; _nanoseconds: number } | null;
    vendorName: string;
    vendorAddress: string | null;
    accountNumber: string | null;
    invoiceNumber: string | null;
    totalAmount: number;
    amountDue: number;
    currency: string;
    lineItems: Array<{ description: string; amount: number; quantity: number | null; unitPrice: number | null }>;
    taxes: Array<{ description: string; amount: number; rate: number | null }>;
    paymentInstructions: { method: string; addressOrAccount: string; dueIfPaidBy: { _seconds: number; _nanoseconds: number } | null } | null;
    suggestedCategoryHint: string | null;
    fieldMeta: Record<string, FieldMeta>;
  };
  vendorResolution: {
    status: 'resolved' | 'unresolved' | 'ambiguous';
    candidateVendorIds: string[];
    rawExtractedVendorName: string;
  };
  modelUsed: string;
}

export async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  if (file.type === 'application/pdf') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const b64 = result.split(',')[1];
        if (b64.length > 12_000_000) {
          reject(new Error('expenses:upload.errorPdfTooLarge'));
        } else {
          resolve({ base64: b64, mimeType: file.type });
        }
      };
      reader.onerror = () => reject(new Error('expenses:upload.errorUnsupportedType'));
      reader.readAsDataURL(file);
    });
  } else if (file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const maxDim = 2400;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round(height * (maxDim / width));
              width = maxDim;
            } else {
              width = Math.round(width * (maxDim / height));
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('failed to get 2d context'));
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          const b64 = compressed.split(',')[1];
          resolve({ base64: b64, mimeType: 'image/jpeg' });
        };
        img.onerror = () => reject(new Error('expenses:upload.errorUnsupportedType'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('expenses:upload.errorUnsupportedType'));
      reader.readAsDataURL(file);
    });
  }
  throw new Error('expenses:upload.errorUnsupportedType');
}

export async function extractBill(base64: string, mimeType: string): Promise<ExtractedBillResult> {
  const extract = httpsCallable(functions, 'extractBill');
  const response = await extract({ base64Data: base64, mimeType });
  return response.data as ExtractedBillResult;
}

export async function createBill(bill: Omit<Bill, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<string> {
  const ref = collection(db, 'bills');
  const now = serverTimestamp();
  const uid = auth.currentUser?.uid;
  const docRef = await addDoc(ref, {
    ...bill,
    createdBy: uid || undefined,    // undefined gets stripped by Firestore SDK; rule allows the field but doesn't require it
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateBill(id: string, updates: Partial<Bill>): Promise<void> {
  const ref = doc(db, 'bills', id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function listRecentBills(limitCount: number = 50): Promise<Bill[]> {
  const ref = collection(db, 'bills');
  const q = query(ref, orderBy('billDate', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as Bill));
}

export async function getBillsByIds(ids: string[]): Promise<Bill[]> {
  if (ids.length === 0) return [];
  const bills: Bill[] = [];
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    const q = query(collection(db, 'bills'), where('__name__', 'in', chunk));
    const snap = await getDocs(q);
    snap.docs.forEach(doc => {
      bills.push({ ...doc.data(), id: doc.id } as Bill);
    });
  }
  return bills;
}

export async function getBill(id: string): Promise<Bill | null> {
  const ref = doc(db, 'bills', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as Bill;
}
