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

// A QuerySnapshot stand-in whose forEach yields docs with the given ids,
// matching how resolveAdminUserIds consumes the users queries.
function usersSnap(ids: string[]) {
  return { forEach: (cb: (d: { id: string }) => void) => ids.forEach((id) => cb({ id })) };
}

// dailyExpenseCheck resolves admin recipients immediately after the
// expectations query (and before any per-expectation work) via a users query
// for role == 'admin' — plus a second query by email ONLY when the
// SUPER_ADMIN_EMAIL env is set (ADR-0007: no hardcoded fallback). Queue the
// result(s) so the shared getMock sequence stays aligned with the code's call
// order: pass emailIds only in tests that also set SUPER_ADMIN_EMAIL.
function queueAdmins(roleIds: string[], emailIds?: string[]) {
  getMock.mockResolvedValueOnce(usersSnap(roleIds));
  if (emailIds) {
    getMock.mockResolvedValueOnce(usersSnap(emailIds));
  }
}

describe('dailyExpenseCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T10:00:00Z'));
    delete process.env.SUPER_ADMIN_EMAIL;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.SUPER_ADMIN_EMAIL;
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
    queueAdmins(['admin1']);
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
    queueAdmins(['admin1']);
    // The query for looking up the satisfying bill
    getMock.mockResolvedValueOnce({
      empty: true, // No bill found in window
      docs: []
    });
    getMock.mockResolvedValueOnce({ docs: [] }); // due snap

    await (dailyExpenseCheck as any)();

    // Alert is addressed to a real admin (not 'system') and keyed per recipient.
    expect(docMock).toHaveBeenCalledWith('exp_2_missing_2026-05-05_admin1');
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'missing_bill',
      severity: 'warning',
      userId: 'admin1',
      expectationId: 'exp_2',
      vendorId: 'v1',
    }), { merge: true });

    expect(expDocRef.update).toHaveBeenCalled();
  });

  it('fans out a missing_bill alert to every admin recipient', async () => {
    const expDocRef = { update: vi.fn() };
    getMock.mockResolvedValueOnce({
      docs: [{
        id: 'exp_3',
        ref: expDocRef,
        data: () => ({
          vendorId: 'v1',
          isActive: true,
          nextExpectedDate: { toDate: () => new Date('2026-05-05T00:00:00Z') },
          tolerance: { graceDays: 5 }
        })
      }]
    });
    process.env.SUPER_ADMIN_EMAIL = 'Owner@Example.com'; // opt in to the email lookup
    queueAdmins(['admin1', 'admin2'], ['owner']); // role admins + super-admin email
    getMock.mockResolvedValueOnce({ empty: true, docs: [] }); // bill lookup
    getMock.mockResolvedValueOnce({ docs: [] }); // due snap

    await (dailyExpenseCheck as any)();

    expect(docMock).toHaveBeenCalledWith('exp_3_missing_2026-05-05_admin1');
    expect(docMock).toHaveBeenCalledWith('exp_3_missing_2026-05-05_admin2');
    expect(docMock).toHaveBeenCalledWith('exp_3_missing_2026-05-05_owner');

    const missingAlertUserIds = setMock.mock.calls
      .map(([data]) => data)
      .filter((data) => data?.type === 'missing_bill')
      .map((data) => data.userId)
      .sort();
    expect(missingAlertUserIds).toEqual(['admin1', 'admin2', 'owner']);
  });

  it('skips the missing_bill alert when there are no admin recipients', async () => {
    const expDocRef = { update: vi.fn() };
    getMock.mockResolvedValueOnce({
      docs: [{
        id: 'exp_4',
        ref: expDocRef,
        data: () => ({
          vendorId: 'v1',
          isActive: true,
          nextExpectedDate: { toDate: () => new Date('2026-05-05T00:00:00Z') },
          tolerance: { graceDays: 5 }
        })
      }]
    });
    queueAdmins([]); // no role admins, no SUPER_ADMIN_EMAIL -> nobody resolvable
    getMock.mockResolvedValueOnce({ empty: true, docs: [] }); // bill lookup
    getMock.mockResolvedValueOnce({ docs: [] }); // due snap

    await (dailyExpenseCheck as any)();

    expect(setMock).not.toHaveBeenCalled(); // nothing to address it to
    expect(expDocRef.update).toHaveBeenCalled(); // still marked as checked
  });

  it('creates due_soon alert for urgent bills', async () => {
    getMock.mockResolvedValueOnce({ docs: [] }); // expectations
    queueAdmins(['admin1']);
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

    expect(docMock).toHaveBeenCalledWith('bill_1_due_2026-05-16_userX');
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'due_soon',
      severity: 'urgent', // <= 1 day
      userId: 'userX'
    }), { merge: true });
  });

  it('creates due_soon alert for warning bills', async () => {
    getMock.mockResolvedValueOnce({ docs: [] }); // expectations
    queueAdmins(['admin1']);
    getMock.mockResolvedValueOnce({
      docs: [{
        id: 'bill_2',
        data: () => ({
          vendorId: 'v2',
          dueDate: { toDate: () => new Date('2026-05-18T10:00:00Z') }, // in 3 days
          totalAmount: 100,
          createdBy: 'userY'
        })
      }]
    });

    await (dailyExpenseCheck as any)();

    expect(docMock).toHaveBeenCalledWith('bill_2_due_2026-05-18_userY');
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'due_soon',
      severity: 'warning', // > 1 day
      userId: 'userY'
    }), { merge: true });
  });

  it('fans out a due_soon alert to admins when the bill has no creator', async () => {
    process.env.SUPER_ADMIN_EMAIL = 'owner@example.com'; // opt in to the email lookup
    getMock.mockResolvedValueOnce({ docs: [] }); // expectations
    queueAdmins(['admin1', 'admin2'], ['owner']);
    getMock.mockResolvedValueOnce({
      docs: [{
        id: 'bill_3',
        data: () => ({
          vendorId: 'v2',
          dueDate: { toDate: () => new Date('2026-05-17T10:00:00Z') }, // in 2 days
          totalAmount: 100,
          // no createdBy -> falls back to the back-office admins
        })
      }]
    });

    await (dailyExpenseCheck as any)();

    expect(docMock).toHaveBeenCalledWith('bill_3_due_2026-05-17_admin1');
    expect(docMock).toHaveBeenCalledWith('bill_3_due_2026-05-17_admin2');
    expect(docMock).toHaveBeenCalledWith('bill_3_due_2026-05-17_owner');
    const dueUserIds = setMock.mock.calls
      .map(([data]) => data)
      .filter((data) => data?.type === 'due_soon')
      .map((data) => data.userId)
      .sort();
    expect(dueUserIds).toEqual(['admin1', 'admin2', 'owner']);
  });
});
