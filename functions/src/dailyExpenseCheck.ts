import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

const RECHECK_SKIP_HOURS = 20;
const DUE_SOON_DAYS_AHEAD = 3;

export const dailyExpenseCheck = onSchedule(
  { schedule: 'every day 09:00', timeZone: 'America/Chicago', region: 'us-central1' },
  async () => {
    const db = getFirestore();
    const now = new Date();
    const cutoff = new Date(now.getTime() - RECHECK_SKIP_HOURS * 60 * 60 * 1000);
    
    // === Missing-bill check ===
    const expectationsSnap = await db.collection('recurringExpectations')
      .where('isActive', '==', true)
      .get();
    
    for (const expDoc of expectationsSnap.docs) {
      const exp = expDoc.data();
      const lastChecked = (exp.lastCheckedAt as Timestamp | undefined)?.toDate();
      if (lastChecked && lastChecked > cutoff) continue; // skip recently-checked
      
      const nextExpected = (exp.nextExpectedDate as Timestamp).toDate();
      const graceDays = exp.tolerance?.graceDays ?? 5;
      const graceCutoff = new Date(nextExpected.getTime() + graceDays * 24 * 60 * 60 * 1000);
      
      if (now > graceCutoff) {
        // Check if any bill from this vendor exists in the expected window
        const windowStart = new Date(nextExpected.getTime() - graceDays * 24 * 60 * 60 * 1000);
        const windowEnd = graceCutoff;
        
        const billsSnap = await db.collection('bills')
          .where('vendorId', '==', exp.vendorId)
          .where('billDate', '>=', Timestamp.fromDate(windowStart))
          .where('billDate', '<=', Timestamp.fromDate(windowEnd))
          .where('status', 'in', ['reviewed', 'scheduled', 'paid', 'partially_paid', 'reconciled'])
          .limit(1)
          .get();
        
        if (billsSnap.empty) {
          // Missing! Write alert (idempotent via id)
          const alertId = `${expDoc.id}_missing_${nextExpected.toISOString().slice(0, 10)}`;
          // Determine userId from the expectation's owner. For now, expectations
          // don't carry a userId field, so we read from the first vendor record
          // that has this expectation's vendor — see TODO below.
          const userId = 'system'; // TODO: resolve from vendor or restaurant context
          
          await db.collection('alerts').doc(alertId).set({
            userId,
            type: 'missing_bill',
            severity: 'warning',
            vendorId: exp.vendorId,
            expectationId: expDoc.id,
            titleKey: 'alerts:missingBill.title',
            bodyKey: 'alerts:missingBill.body',
            bodyParams: {
              expectedDate: nextExpected.toISOString().slice(0, 10),
              graceDays,
            },
            actionUrl: `/expenses?recurringExpectation=${expDoc.id}`,
            dismissedAt: null,
            createdAt: FieldValue.serverTimestamp(),
          }, { merge: true });
        }
      }
      
      // Mark the expectation as checked
      await expDoc.ref.update({
        lastCheckedAt: FieldValue.serverTimestamp(),
      });
    }
    
    // === Due-soon check ===
    const dueCutoff = new Date(now.getTime() + DUE_SOON_DAYS_AHEAD * 24 * 60 * 60 * 1000);
    const dueSnap = await db.collection('bills')
      .where('status', 'in', ['reviewed', 'scheduled'])
      .where('dueDate', '>=', Timestamp.fromDate(now))
      .where('dueDate', '<=', Timestamp.fromDate(dueCutoff))
      .get();
    
    for (const billDoc of dueSnap.docs) {
      const bill = billDoc.data();
      const dueDate = (bill.dueDate as Timestamp).toDate();
      const dateSlug = dueDate.toISOString().slice(0, 10);
      const alertId = `${billDoc.id}_due_${dateSlug}`;
      const userId = bill.createdBy || 'system';
      const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      
      await db.collection('alerts').doc(alertId).set({
        userId,
        type: 'due_soon',
        severity: daysUntil <= 1 ? 'urgent' : 'warning',
        billId: billDoc.id,
        vendorId: bill.vendorId,
        titleKey: 'alerts:dueSoon.title',
        bodyKey: 'alerts:dueSoon.body',
        bodyParams: {
          amount: `$${(bill.amountDue ?? bill.totalAmount).toFixed(2)}`,
          daysUntil,
        },
        actionUrl: `/expenses?reviewBill=${billDoc.id}`,
        dismissedAt: null,
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    
    logger.info('Daily expense check complete', {
      expectationsChecked: expectationsSnap.size,
      billsDueSoon: dueSnap.size,
    });
  }
);
