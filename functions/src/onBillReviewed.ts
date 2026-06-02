import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { nextOccurrence } from './utils/rrule';

const SATISFACTION_WINDOW_DAYS_FALLBACK = 5;  // when expectation has no graceDays
const ANOMALY_MIN_HISTORY = 3;                // need 3 prior bills before flagging
const ANOMALY_LOOKBACK_BILLS = 6;
const ANOMALY_STDDEV_THRESHOLD = 2;            // outside 2σ → anomaly

export const onBillReviewed = onDocumentWritten('bills/{billId}', async (event) => {
  const billId = event.params.billId;
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  
  if (!after) return; // deletion
  
  // Detect the transition to 'reviewed'
  const wasReviewed = before?.status === 'reviewed';
  const isReviewed = after.status === 'reviewed';
  const justBecameReviewed = !wasReviewed && isReviewed;
  if (!justBecameReviewed) return;
  
  const db = getFirestore();
  const vendorId = after.vendorId;
  if (!vendorId) {
    logger.warn('Bill became reviewed without vendorId', { billId });
    return;
  }
  
  // Determine the user the alerts will belong to. Bill itself doesn't carry
  // userId. For now, use the vendor's recording user via a query; if that's
  // unreliable, use a single restaurant-default user from a config doc. For
  // this milestone, fall back to the bill's createdBy if present, else the
  // expectation's owner. Document this trade-off in the function.
  const userId = after.createdBy || 'system';
  
  // === Satisfaction matching ===
  // Find active recurring expectations for this vendor
  const expectationsSnap = await db.collection('recurringExpectations')
    .where('vendorId', '==', vendorId)
    .where('isActive', '==', true)
    .get();
  
  const billDate = (after.billDate as Timestamp).toDate();
  
  for (const expDoc of expectationsSnap.docs) {
    const exp = expDoc.data();
    const nextDate = (exp.nextExpectedDate as Timestamp).toDate();
    const graceDays = exp.tolerance?.graceDays ?? SATISFACTION_WINDOW_DAYS_FALLBACK;
    const windowMs = graceDays * 24 * 60 * 60 * 1000;
    const distance = Math.abs(billDate.getTime() - nextDate.getTime());
    
    if (distance <= windowMs) {
      // This bill satisfies the expectation. Recompute next expected date
      // from today (not from billDate — see architectural decision 6).
      const newNext = nextOccurrence(exp.rrule, new Date());
      if (!newNext) {
        logger.warn('RRULE returned no next occurrence', {
          expectationId: expDoc.id,
          rrule: exp.rrule,
        });
        continue;
      }
      await expDoc.ref.update({
        lastSatisfiedBillId: billId,
        nextExpectedDate: Timestamp.fromDate(newNext),
        updatedAt: FieldValue.serverTimestamp(),
      });
      logger.info('Expectation satisfied', {
        expectationId: expDoc.id,
        billId,
        newNextExpectedDate: newNext.toISOString(),
      });
    }
  }
  
  // === Anomaly detection ===
  const billAmount = after.totalAmount as number;
  
  // Re-fetch expectations (they may have been mutated above)
  const activeExpectations = expectationsSnap.docs.map(d => d.data());
  const expectationForVendor = activeExpectations.find(e => e.isActive);
  
  if (expectationForVendor) {
    // Use the expectation's tolerance band
    const lowBound = expectationForVendor.expectedAmount - expectationForVendor.tolerance.amountToleranceBand.low;
    const highBound = expectationForVendor.expectedAmount + expectationForVendor.tolerance.amountToleranceBand.high;
    
    if (billAmount < lowBound || billAmount > highBound) {
      await writeAnomalyAlert(db, {
        billId,
        userId,
        vendorId,
        amount: billAmount,
        lowBound,
        highBound,
        source: 'expectation_band',
      });
    }
  } else {
    // No expectation; use rolling-average band
    const priorBillsSnap = await db.collection('bills')
      .where('vendorId', '==', vendorId)
      .where('status', 'in', ['reviewed', 'scheduled', 'paid', 'partially_paid', 'reconciled'])
      .orderBy('billDate', 'desc')
      .limit(ANOMALY_LOOKBACK_BILLS + 1)  // +1 to skip the current bill
      .get();
    
    const priorAmounts = priorBillsSnap.docs
      .filter(d => d.id !== billId)
      .map(d => d.data().totalAmount as number)
      .filter(a => typeof a === 'number');
    
    if (priorAmounts.length >= ANOMALY_MIN_HISTORY) {
      const mean = priorAmounts.reduce((s, a) => s + a, 0) / priorAmounts.length;
      const variance = priorAmounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / priorAmounts.length;
      const stddev = Math.sqrt(variance);
      const lowBound = mean - ANOMALY_STDDEV_THRESHOLD * stddev;
      const highBound = mean + ANOMALY_STDDEV_THRESHOLD * stddev;
      
      if (billAmount < lowBound || billAmount > highBound) {
        await writeAnomalyAlert(db, {
          billId,
          userId,
          vendorId,
          amount: billAmount,
          lowBound,
          highBound,
          source: 'rolling_avg',
        });
      }
    }
  }
});

async function writeAnomalyAlert(db: FirebaseFirestore.Firestore, params: {
  billId: string;
  userId: string;
  vendorId: string;
  amount: number;
  lowBound: number;
  highBound: number;
  source: 'expectation_band' | 'rolling_avg';
}) {
  const alertId = `${params.billId}_anomaly`;
  const direction = params.amount > params.highBound ? 'high' : 'low';
  await db.collection('alerts').doc(alertId).set({
    userId: params.userId,
    type: 'anomaly_amount',
    severity: direction === 'high' ? 'warning' : 'info',
    vendorId: params.vendorId,
    billId: params.billId,
    titleKey: 'alerts:anomaly.title',
    bodyKey: `alerts:anomaly.body_${params.source}_${direction}`,
    bodyParams: {
      amount: `$${params.amount.toFixed(2)}`,
      low: `$${params.lowBound.toFixed(2)}`,
      high: `$${params.highBound.toFixed(2)}`,
    },
    actionUrl: `/expenses?reviewBill=${params.billId}`,
    dismissedAt: null,
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}
