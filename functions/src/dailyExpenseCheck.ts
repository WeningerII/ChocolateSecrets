import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { resolveAdminUserIds } from './utils/adminRecipients';

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

    // Missing-bill alerts have no owning user on the expectation or vendor, so
    // resolve the back-office recipients (all admins) once for the whole sweep.
    const adminUserIds = await resolveAdminUserIds(db);

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
          // Missing! Recurring expectations (and vendors) carry no owning user,
          // so this alert has no single addressee. Fan it out to the back-office:
          // one copy per admin (mirrors firestore.rules isAdmin()). The
          // per-recipient doc id keeps each admin's copy idempotent across daily
          // runs and independently dismissible.
          const dateSlug = nextExpected.toISOString().slice(0, 10);
          if (adminUserIds.length === 0) {
            logger.warn('Missing-bill alert has no admin recipients; skipping', {
              expectationId: expDoc.id,
              vendorId: exp.vendorId,
            });
          } else {
            await Promise.all(adminUserIds.map((uid) =>
              db.collection('alerts').doc(`${expDoc.id}_missing_${dateSlug}_${uid}`).set({
                userId: uid,
                type: 'missing_bill',
                severity: 'warning',
                vendorId: exp.vendorId,
                expectationId: expDoc.id,
                titleKey: 'alerts:missingBill.title',
                bodyKey: 'alerts:missingBill.body',
                bodyParams: {
                  expectedDate: dateSlug,
                  graceDays,
                },
                actionUrl: `/expenses?recurringExpectation=${expDoc.id}`,
                dismissedAt: null,
                createdAt: FieldValue.serverTimestamp(),
              }, { merge: true })
            ));
          }
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
      const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      // Address the reminder to the bill's creator; if it has none, reuse the
      // back-office admins resolved above so it stays visible (alerts are
      // read-gated by userId in firestore.rules).
      const recipientUserIds = bill.createdBy ? [bill.createdBy] : adminUserIds;
      if (recipientUserIds.length === 0) {
        logger.warn('Due-soon alert has no recipients; skipping', { billId: billDoc.id });
        continue;
      }
      
      await Promise.all(recipientUserIds.map((uid) =>
        db.collection('alerts').doc(`${billDoc.id}_due_${dateSlug}_${uid}`).set({
          userId: uid,
          type: 'due_soon',
          severity: daysUntil <= 1 ? 'urgent' : 'warning',
          billId: billDoc.id,
          vendorId: bill.vendorId,
          titleKey: 'alerts:dueSoon.title',
          bodyKey: 'alerts:dueSoon.body',
          bodyParams: {
            amount: `$${(bill.amountDue ?? bill.totalAmount).toFixed(2)}`,
            count: daysUntil,
          },
          actionUrl: `/expenses?reviewBill=${billDoc.id}`,
          dismissedAt: null,
          createdAt: FieldValue.serverTimestamp(),
        }, { merge: true })
      ));
    }
    
    logger.info('Daily expense check complete', {
      expectationsChecked: expectationsSnap.size,
      missingBillRecipients: adminUserIds.length,
      billsDueSoon: dueSnap.size,
    });
  }
);
