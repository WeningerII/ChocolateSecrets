import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import type { Payment, BillStatus } from '../types';

interface RecordPaymentInput {
  paymentDate: string;
  amount: number;
  method: string;
  reference?: string;
  notes?: string;
  billAllocations: Array<{ billId: string; amount: number }>;
}

interface RecordPaymentResult {
  paymentId: string;
  updatedBills: Array<{ billId: string; newPaidAmount: number; newStatus: BillStatus }>;
}

export async function recordPayment(input: RecordPaymentInput): Promise<RecordPaymentResult> {
  const call = httpsCallable(functions, 'recordPayment');
  const response = await call(input);
  return response.data as RecordPaymentResult;
}

export async function listRecentPayments(limitCount: number = 50): Promise<Payment[]> {
  const ref = collection(db, 'payments');
  const q = query(ref, orderBy('paymentDate', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as Payment));
}

export async function listPaymentsForBill(billId: string): Promise<Payment[]> {
  // Firestore can't query "array-contains-object-where-field". We query all
  // recent payments and filter client-side. Acceptable because per-bill
  // payment counts are small (typically 1, occasionally 2-3 for partial pays).
  // If this becomes a hotspot, add a denormalized `billIds: string[]` field
  // to Payment and use array-contains.
  const recent = await listRecentPayments(200);
  return recent.filter(p => p.billAllocations.some(a => a.billId === billId));
}
