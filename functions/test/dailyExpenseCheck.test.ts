import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { getFirestoreMock, docMock, setMock, getMock, whereMock } = vi.hoisted(() => {
  const setMock = vi.fn();
  const updateMock = vi.fn();
  const getMock = vi.fn();
  const limitMock = vi.fn(() => ({ get: getMock }));
  const whereMock = vi.fn(() => ({ get: getMock, where: whereMock, limit: limitMock }));
  const docMock = vi.fn(() => ({ set: setMock, update: updateMock }));
  const collectionMock = vi.fn(() => ({ doc: docMock, where: whereMock }));
  
  const getFirestoreMock = vi.fn(() => ({
    collection: collectionMock,
  }));
  return { getFirestoreMock, collectionMock, docMock, setMock, getMock, whereMock };
});

vi.mock('firebase-admin/firestore', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    getFirestore: getFirestoreMock,
  };
});

vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: (_opts: any, handler: any) => handler,
}));

import { dailyExpenseCheck } from '../src/dailyExpenseCheck';

describe('dailyExpenseCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('skips expectations recently checked', async () => {
    getMock.mockResolvedValueOnce({
      docs: [{
        id: 'exp_1',
        data: () => ({
          lastCheckedAt: { toDate: () => new Date('2026-05-15T09:00:00Z') } // checked 1h ago
        })
      }]
    });
    getMock.mockResolvedValueOnce({ docs: [] }); // due snap

    await (dailyExpenseCheck as any)();

    expect(whereMock).toHaveBeenCalledWith('isActive', '==', true);
    expect(setMock).not.toHaveBeenCalled(); // no alert
  });

  it('creates missing_bill alert if expectation is outside grace window without satisfying bill', async () => {
    const expDocRef = { update: vi.fn() };
    getMock.mockResolvedValueOnce({
      docs: [{
        id: 'exp_2',
        ref: expDocRef,
        data: () => ({
          vendorId: 'v1',
          isActive: true,
          nextExpectedDate: { toDate: () => new Date('2026-05-05T00:00:00Z') }, // 10 days ago
          tolerance: { graceDays: 5 }
        })
      }]
    });
    // The query for looking up the satisfying bill
    getMock.mockResolvedValueOnce({
      empty: true, // No bill found in window
      docs: []
    });
    getMock.mockResolvedValueOnce({ docs: [] }); // due snap

    await (dailyExpenseCheck as any)();

    expect(docMock).toHaveBeenCalledWith('exp_2_missing_2026-05-05');
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'missing_bill',
      severity: 'warning'
    }), { merge: true });
    
    expect(expDocRef.update).toHaveBeenCalled();
  });

  it('creates due_soon alert for urgent bills', async () => {
    getMock.mockResolvedValueOnce({ docs: [] }); // expectations
    getMock.mockResolvedValueOnce({
      docs: [{
        id: 'bill_1',
        data: () => ({
          vendorId: 'v2',
          dueDate: { toDate: () => new Date('2026-05-16T10:00:00Z') }, // tomorrow
          totalAmount: 100,
          createdBy: 'userX'
        })
      }]
    });

    await (dailyExpenseCheck as any)();

    expect(docMock).toHaveBeenCalledWith('bill_1_due_2026-05-16');
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'due_soon',
      severity: 'urgent', // <= 1 day
      userId: 'userX'
    }), { merge: true });
  });
  
  it('creates due_soon alert for warning bills', async () => {
    getMock.mockResolvedValueOnce({ docs: [] }); // expectations
    getMock.mockResolvedValueOnce({
      docs: [{
        id: 'bill_2',
        data: () => ({
          vendorId: 'v2',
          dueDate: { toDate: () => new Date('2026-05-18T10:00:00Z') }, // in 3 days
          totalAmount: 100,
        })
      }]
    });

    await (dailyExpenseCheck as any)();

    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'due_soon',
      severity: 'warning' // > 1 day
    }), { merge: true });
  });
});
