import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getFirestoreMock, collectionMock, docMock, setMock, getMock } = vi.hoisted(() => {
  const setMock = vi.fn();
  const updateMock = vi.fn();
  const getMock = vi.fn();
  const limitMock = vi.fn(() => ({ get: getMock }));
  const orderByMock = vi.fn(() => ({ get: getMock, limit: limitMock }));
  const whereMock = vi.fn(() => ({ get: getMock, where: whereMock, orderBy: orderByMock, limit: limitMock }));
  const docMock = vi.fn(() => ({ set: setMock, update: updateMock }));
  const collectionMock = vi.fn(() => ({ doc: docMock, where: whereMock }));
  
  const getFirestoreMock = vi.fn(() => ({
    collection: collectionMock,
  }));
  return { getFirestoreMock, collectionMock, docMock, setMock, getMock };
});

vi.mock('firebase-admin/firestore', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    getFirestore: getFirestoreMock,
  };
});

vi.mock('firebase-functions/v2/firestore', () => ({
  onDocumentWritten: (_path: string, handler: any) => handler,
}));

import { onBillReviewed } from '../src/onBillReviewed';

describe('onBillReviewed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createEvent = (beforeStatus: string | undefined, afterStatus: string, afterData: any = {}) => ({
    params: { billId: 'bill_123' },
    data: {
      before: { data: () => (beforeStatus ? { status: beforeStatus } : undefined) },
      after: { data: () => ({ status: afterStatus, vendorId: 'v_1', billDate: { toDate: () => new Date('2026-05-15T10:00:00Z') }, totalAmount: 400.0, ...afterData }) }
    }
  });

  it('no-ops if not transitioning to reviewed', async () => {
    const event = createEvent('extracted', 'scheduled');
    await (onBillReviewed as any)(event);
    expect(collectionMock).not.toHaveBeenCalled();
  });

  it('no-ops if already reviewed', async () => {
    const event = createEvent('reviewed', 'reviewed');
    await (onBillReviewed as any)(event);
    expect(collectionMock).not.toHaveBeenCalled();
  });

  it('no-ops if bill deleted', async () => {
    const event = { params: { billId: 'b' }, data: { before: { data: () => ({ status: 'reviewed' }) }, after: { data: () => undefined } } };
    await (onBillReviewed as any)(event);
    expect(collectionMock).not.toHaveBeenCalled();
  });

  it('matches active expectation and updates nextExpectedDate, flags anomaly if amount out of band', async () => {
    // Setup expectationsSnap to return one active expectation
    const expDocRef = { update: vi.fn(), id: 'exp_1' };
    const expData = {
      vendorId: 'v_1',
      isActive: true,
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=15',
      nextExpectedDate: { toDate: () => new Date('2026-05-18T10:00:00Z') },
      expectedAmount: 400,
      tolerance: {
        graceDays: 5,
        amountToleranceBand: { low: 50, high: 50 }
      }
    };
    
    getMock.mockResolvedValueOnce({
      docs: [{ id: 'exp_1', data: () => expData, ref: expDocRef }]
    });

    const event = createEvent('extracted', 'reviewed', { totalAmount: 500 });
    await (onBillReviewed as any)(event);
    
    // Expectation matched (May 15th is within 5 days of May 18th)
    expect(expDocRef.update).toHaveBeenCalledWith(expect.objectContaining({
      lastSatisfiedBillId: 'bill_123'
    }));
    
    // Anomaly logic
    // Expected 400, high 50 -> max 450. Bill is 500 -> Anomaly High
    expect(setMock).toHaveBeenCalledWith({
      userId: 'system',
      type: 'anomaly_amount',
      severity: 'warning',
      vendorId: 'v_1',
      billId: 'bill_123',
      titleKey: 'alerts:anomaly.title',
      bodyKey: 'alerts:anomaly.body_expectation_band_high',
      bodyParams: {
        amount: '$500.00',
        low: '$350.00',
        high: '$450.00'
      },
      actionUrl: '/expenses?reviewBill=bill_123',
      dismissedAt: null,
      createdAt: expect.anything()
    }, { merge: true });
    
    expect(docMock).toHaveBeenCalledWith('bill_123_anomaly');
  });

  it('flags anomaly if rolling average exceeded when no expectation exists', async () => {
    // 1st getMock: expectations (empty)
    getMock.mockResolvedValueOnce({ docs: [] });
    // 2nd getMock: rolling average (6 prior bills)
    getMock.mockResolvedValueOnce({
      docs: [
        { id: 'b1', data: () => ({ totalAmount: 100 }) },
        { id: 'b2', data: () => ({ totalAmount: 110 }) },
        { id: 'b3', data: () => ({ totalAmount: 90 }) },
        { id: 'b4', data: () => ({ totalAmount: 105 }) },
        { id: 'b5', data: () => ({ totalAmount: 95 }) },
        { id: 'b6', data: () => ({ totalAmount: 100 }) },
      ]
    });

    // Mean is 100, Stddev ~ 7. Threshold is 2 -> ~ 86 to 114 range. Amount 200 is high anomaly
    const event = createEvent('extracted', 'reviewed', { totalAmount: 200 });
    await (onBillReviewed as any)(event);
    
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'anomaly_amount',
      severity: 'warning',
      bodyKey: 'alerts:anomaly.body_rolling_avg_high'
    }), { merge: true });
  });

  it('ignores anomaly if <3 prior bills', async () => {
     getMock.mockResolvedValueOnce({ docs: [] }); // expectations
     getMock.mockResolvedValueOnce({ docs: [{ id: 'b1', data: () => ({ totalAmount: 100 }) }] }); // bills
     
     const event = createEvent('extracted', 'reviewed', { totalAmount: 1000 });
     await (onBillReviewed as any)(event);
     
     expect(setMock).not.toHaveBeenCalled();
  });
});
