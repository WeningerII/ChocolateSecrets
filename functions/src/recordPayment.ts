import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue, Timestamp, DocumentReference, DocumentSnapshot } from 'firebase-admin/firestore';
import type { BillStatus, PaymentMethod } from './paymentTypes';

interface RecordPaymentInput {
  paymentDate: string;        // ISO 8601 YYYY-MM-DD
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  billAllocations: Array<{ billId: string; amount: number }>;
}

export interface RecordPaymentResult {
  paymentId: string;
  updatedBills: Array<{ billId: string; newPaidAmount: number; newStatus: BillStatus }>;
}

export const recordPayment = onCall(
  { region: 'us-central1', maxInstances: 10 },
  async (request): Promise<RecordPaymentResult> => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError('unauthenticated', 'Authentication required');
    const input = data as RecordPaymentInput;
    
    if (typeof input.amount !== 'number' || input.amount <= 0) {
      throw new HttpsError('invalid-argument', 'Payment amount must be positive');
    }
    if (!input.billAllocations || input.billAllocations.length === 0) {
      throw new HttpsError('invalid-argument', 'At least one bill allocation is required');
    }
    if (input.billAllocations.some((a: any) => a.amount <= 0)) {
      throw new HttpsError('invalid-argument', 'Allocation amounts must be positive');
    }
    const allocationSum = input.billAllocations.reduce((s: number, a: any) => s + a.amount, 0);
    if (Math.abs(allocationSum - input.amount) > 0.01) {
      throw new HttpsError('invalid-argument', `Allocation sum ${allocationSum.toFixed(2)} does not match payment amount ${input.amount.toFixed(2)}`);
    }
    if (!input.paymentDate || isNaN(new Date(input.paymentDate).getTime())) {
      throw new HttpsError('invalid-argument', 'Valid paymentDate required (YYYY-MM-DD)');
    }
    if (!['ach', 'card', 'check', 'wire', 'auto_debit', 'cash', 'other'].includes(input.method)) {
      throw new HttpsError('invalid-argument', `Invalid payment method: ${input.method}`);
    }
    
    const db = getFirestore();
    
    const result = await db.runTransaction(async (tx) => {
      const billRefs: Array<DocumentReference> = input.billAllocations.map(a => db.collection('bills').doc(a.billId));
      const billSnaps: Array<DocumentSnapshot> = await Promise.all(billRefs.map(ref => tx.get(ref)));
      
      let sharedVendorId: string | null = null;
      const updates: Array<{ billId: string; newPaidAmount: number; newStatus: BillStatus; ref: DocumentReference }> = [];
      
      for (let i = 0; i < billSnaps.length; i++) {
        const snap = billSnaps[i];
        const allocation = input.billAllocations[i];
        if (!snap.exists) {
          throw new HttpsError('not-found', `Bill ${allocation.billId} not found`);
        }
        const bill = snap.data()!;
        
        if (sharedVendorId === null) sharedVendorId = bill.vendorId;
        else if (bill.vendorId !== sharedVendorId) {
          throw new HttpsError('invalid-argument', 'All bills in a single payment must share the same vendor');
        }
        
        const acceptableStatuses: BillStatus[] = ['reviewed', 'scheduled', 'partially_paid'];
        if (!acceptableStatuses.includes(bill.status)) {
          throw new HttpsError('failed-precondition', `Bill ${allocation.billId} has status '${bill.status}'; payments only accepted on reviewed/scheduled/partially_paid`);
        }
        
        const prevPaidAmount = typeof bill.paidAmount === 'number' ? bill.paidAmount : 0;
        const newPaidAmount = prevPaidAmount + allocation.amount;
        const amountDue = typeof bill.amountDue === 'number' ? bill.amountDue : bill.totalAmount;

        if (newPaidAmount > amountDue + 0.01) {
          throw new HttpsError('invalid-argument',
            `Allocation of ${allocation.amount.toFixed(2)} would over-pay bill ${allocation.billId} (outstanding: ${(amountDue - prevPaidAmount).toFixed(2)})`);
        }

        let newStatus: BillStatus;
        if (newPaidAmount >= amountDue - 0.01) newStatus = 'paid';
        else if (newPaidAmount > 0) newStatus = 'partially_paid';
        else newStatus = bill.status as BillStatus;
        
        updates.push({ billId: allocation.billId, newPaidAmount, newStatus, ref: billRefs[i] });
      }
      
      const paymentRef = db.collection('payments').doc();
      const now = FieldValue.serverTimestamp();
      tx.set(paymentRef, {
        paymentDate: Timestamp.fromDate(new Date(input.paymentDate + 'T12:00:00Z')),
        amount: input.amount,
        method: input.method,
        reference: input.reference || null,
        notes: input.notes || null,
        billAllocations: input.billAllocations,
        createdBy: auth.uid,
        createdAt: now,
        updatedAt: now,
      });
      
      for (const upd of updates) {
        tx.update(upd.ref, {
          paidAmount: upd.newPaidAmount,
          status: upd.newStatus,
          updatedAt: now,
        });
      }
      
      return {
        paymentId: paymentRef.id,
        updatedBills: updates.map(u => ({
          billId: u.billId,
          newPaidAmount: u.newPaidAmount,
          newStatus: u.newStatus,
        })),
      };
    });
    
    logger.info('Payment recorded', { paymentId: result.paymentId, userId: auth.uid });
    return result;
  }
);
