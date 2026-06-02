import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getFirestoreMock, runTransactionMock, collectionMock } = vi.hoisted(() => {
  const runTransactionMock = vi.fn();
  const collectionMock = vi.fn();
  const getFirestoreMock = vi.fn(() => ({
    runTransaction: runTransactionMock,
    collection: collectionMock,
  }));
  return { getFirestoreMock, runTransactionMock, collectionMock };
});

vi.mock('firebase-admin/firestore', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    getFirestore: getFirestoreMock,
  };
});

vi.mock('firebase-functions/v2/https', () => ({
  onCall: (_opts: any, handler: any) => handler,
  HttpsError: class extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));

vi.mock('firebase-functions/v2', () => ({
  logger: { info: vi.fn(), error: vi.fn() }
}));

import { recordPayment } from '../src/recordPayment';

describe('recordPayment', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws unauthenticated if no auth', async () => {
    await expect((recordPayment as any)({ auth: undefined, data: {} }))
      .rejects.toThrow('Authentication required');
  });

  it('throws invalid-argument if amount mismatch (>1 cent)', async () => {
    await expect((recordPayment as any)({
      auth: { uid: 'u1' },
      data: {
        paymentDate: '2023-01-01',
        amount: 100,
        method: 'wire',
        billAllocations: [
          { billId: 'b1', amount: 90 }
        ]
      }
    })).rejects.toThrow(/Allocation sum 90.00 does not match payment amount 100.00/);
  });

  it('succeeds with amount mismatch (≤1 cent) due to floating point tolerance', async () => {
    runTransactionMock.mockImplementationOnce(async (cb) => {
      const txMock = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ vendorId: 'v1', status: 'reviewed', amountDue: 100, paidAmount: 0 })
        }),
        set: vi.fn(),
        update: vi.fn()
      };
      return await cb(txMock);
    });

    collectionMock.mockReturnValue({
      doc: vi.fn((id) => (id ? { id } : { id: 'new-pay-123' }))
    });

    const result = await (recordPayment as any)({
      auth: { uid: 'u1' },
      data: {
        paymentDate: '2023-01-01',
        amount: 100.004,
        method: 'ach',
        billAllocations: [
          { billId: 'b1', amount: 100 }
        ]
      }
    });

    expect(result.paymentId).toBe('new-pay-123');
  });

  it('throws invalid-argument for negative allocation amount', async () => {
    await expect((recordPayment as any)({
      auth: { uid: 'u1' },
      data: {
        paymentDate: '2023-01-01',
        amount: -50,
        method: 'wire',
        billAllocations: [
          { billId: 'b1', amount: -50 }
        ]
      }
    })).rejects.toThrow('Payment amount must be positive');
  });

  it('throws invalid-argument for negative allocation amounts within positive payment', async () => {
     await expect((recordPayment as any)({
      auth: { uid: 'u1' },
      data: {
        paymentDate: '2023-01-01',
        amount: 50,
        method: 'wire',
        billAllocations: [
          { billId: 'b1', amount: 100 },
          { billId: 'b2', amount: -50 }
        ]
      }
    })).rejects.toThrow('Allocation amounts must be positive');
  });

  it('throws invalid-argument for empty allocations array', async () => {
    await expect((recordPayment as any)({
      auth: { uid: 'u1' },
      data: {
        paymentDate: '2023-01-01',
        amount: 100,
        method: 'wire',
        billAllocations: []
      }
    })).rejects.toThrow('At least one bill allocation is required');
  });

  it('throws invalid-argument for cross-vendor allocations', async () => {
    runTransactionMock.mockImplementationOnce(async (cb) => {
      const txMock = {
        get: vi.fn().mockImplementation((ref) => {
          if (ref.id === 'b1') {
            return Promise.resolve({ exists: true, data: () => ({ vendorId: 'v1', status: 'reviewed', amountDue: 50, paidAmount: 0 }) });
          } else {
            return Promise.resolve({ exists: true, data: () => ({ vendorId: 'v2', status: 'reviewed', amountDue: 50, paidAmount: 0 }) });
          }
        }),
        set: vi.fn(),
        update: vi.fn()
      };
      return await cb(txMock);
    });

    await expect((recordPayment as any)({
      auth: { uid: 'u1' },
      data: {
        paymentDate: '2023-01-01',
        amount: 100,
        method: 'card',
        billAllocations: [
          { billId: 'b1', amount: 50 },
          { billId: 'b2', amount: 50 }
        ]
      }
    })).rejects.toThrow('All bills in a single payment must share the same vendor');
  });

  it('fails if bill status is extracted', async () => {
    runTransactionMock.mockImplementationOnce(async (cb) => {
      const txMock = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ vendorId: 'v1', status: 'extracted' })
        }),
        set: vi.fn(),
        update: vi.fn()
      };
      return await cb(txMock);
    });

    collectionMock.mockReturnValue({
      doc: vi.fn((id) => (id ? { id } : { id: 'new-pay-123' }))
    });

    await expect((recordPayment as any)({
      auth: { uid: 'u1' },
      data: {
        paymentDate: '2023-01-01',
        amount: 50,
        method: 'card',
        billAllocations: [
          { billId: 'b1', amount: 50 }
        ]
      }
    })).rejects.toThrow(/payments only accepted on reviewed\/scheduled\/partially_paid/);
  });

  it('fails if bill status is paid', async () => {
    runTransactionMock.mockImplementationOnce(async (cb) => {
      const txMock = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ vendorId: 'v1', status: 'paid' })
        })
      };
      return await cb(txMock);
    });

    await expect((recordPayment as any)({
      auth: { uid: 'u1' },
      data: {
        paymentDate: '2023-01-01',
        amount: 50,
        method: 'card',
        billAllocations: [{ billId: 'b1', amount: 50 }]
      }
    })).rejects.toThrow(/payments only accepted on/);
  });

  it('fails if bill status is void', async () => {
    runTransactionMock.mockImplementationOnce(async (cb) => {
      const txMock = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ vendorId: 'v1', status: 'void' })
        })
      };
      return await cb(txMock);
    });

    await expect((recordPayment as any)({
      auth: { uid: 'u1' },
      data: {
        paymentDate: '2023-01-01',
        amount: 50,
        method: 'card',
        billAllocations: [{ billId: 'b1', amount: 50 }]
      }
    })).rejects.toThrow(/payments only accepted on/);
  });

  it('throws invalid-argument on over-allocation beyond 1¢ tolerance', async () => {
    runTransactionMock.mockImplementationOnce(async (cb) => {
      const txMock = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ vendorId: 'v1', status: 'reviewed', amountDue: 100, paidAmount: 0 })
        }),
        set: vi.fn(),
        update: vi.fn()
      };
      return await cb(txMock);
    });

    await expect((recordPayment as any)({
      auth: { uid: 'u1' },
      data: {
        paymentDate: '2023-01-01',
        amount: 101, // > 100 + 0.01
        method: 'ach',
        billAllocations: [
          { billId: 'b1', amount: 101 }
        ]
      }
    })).rejects.toThrow('would over-pay bill b1');
  });

  it('succeeds with over-allocation within 1¢ tolerance', async () => {
    runTransactionMock.mockImplementationOnce(async (cb) => {
      const txMock = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ vendorId: 'v1', status: 'reviewed', amountDue: 100, paidAmount: 0 })
        }),
        set: vi.fn(),
        update: vi.fn()
      };
      return await cb(txMock);
    });

    collectionMock.mockReturnValue({
      doc: vi.fn((id) => (id ? { id } : { id: 'new-pay-125' }))
    });

    const result = await (recordPayment as any)({
      auth: { uid: 'u1' },
      data: {
        paymentDate: '2023-01-01',
        amount: 100.005,
        method: 'ach',
        billAllocations: [
          { billId: 'b1', amount: 100.005 }
        ]
      }
    });

    expect(result.updatedBills[0]).toEqual({
      billId: 'b1',
      newPaidAmount: 100.005,
      newStatus: 'paid'
    });
  });

  it('fails if bill status is disputed', async () => {
    runTransactionMock.mockImplementationOnce(async (cb) => {
      const txMock = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ vendorId: 'v1', status: 'disputed' })
        })
      };
      return await cb(txMock);
    });

    await expect((recordPayment as any)({
      auth: { uid: 'u1' },
      data: {
        paymentDate: '2023-01-01',
        amount: 50,
        method: 'card',
        billAllocations: [{ billId: 'b1', amount: 50 }]
      }
    })).rejects.toThrow(/payments only accepted on/);
  });

  it('fails if bill status is reconciled', async () => {
    runTransactionMock.mockImplementationOnce(async (cb) => {
      const txMock = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ vendorId: 'v1', status: 'reconciled' })
        })
      };
      return await cb(txMock);
    });

    await expect((recordPayment as any)({
      auth: { uid: 'u1' },
      data: {
        paymentDate: '2023-01-01',
        amount: 50,
        method: 'card',
        billAllocations: [{ billId: 'b1', amount: 50 }]
      }
    })).rejects.toThrow(/payments only accepted on/);
  });

  it('fails if bill id is missing (not found)', async () => {
    runTransactionMock.mockImplementationOnce(async (cb) => {
      const txMock = {
        get: vi.fn().mockResolvedValue({ exists: false, data: () => null })
      };
      return await cb(txMock);
    });

    await expect((recordPayment as any)({
      auth: { uid: 'u1' },
      data: {
        paymentDate: '2023-01-01',
        amount: 50,
        method: 'card',
        billAllocations: [{ billId: 'b1', amount: 50 }]
      }
    })).rejects.toThrow('Bill b1 not found');
  });
  
  it('succeeds and updates bill to partially_paid on partial payment', async () => {
    runTransactionMock.mockImplementationOnce(async (cb) => {
      const txMock = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ vendorId: 'v1', status: 'reviewed', amountDue: 100, paidAmount: 0 })
        }),
        set: vi.fn(),
        update: vi.fn()
      };
      return await cb(txMock);
    });

    collectionMock.mockReturnValue({
      doc: vi.fn((id) => (id ? { id } : { id: 'new-pay-123' }))
    });

    const result = await (recordPayment as any)({
      auth: { uid: 'u1' },
      data: {
        paymentDate: '2023-01-01',
        amount: 40,
        method: 'ach',
        billAllocations: [
          { billId: 'b1', amount: 40 }
        ]
      }
    });

    expect(result.updatedBills[0]).toEqual({
      billId: 'b1',
      newPaidAmount: 40,
      newStatus: 'partially_paid'
    });
  });

  it('succeeds and updates bill to paid on cumulative partial payments crossing threshold', async () => {
    runTransactionMock.mockImplementationOnce(async (cb) => {
      const txMock = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ vendorId: 'v1', status: 'partially_paid', amountDue: 100, paidAmount: 40 })
        }),
        set: vi.fn(),
        update: vi.fn()
      };
      return await cb(txMock);
    });

    collectionMock.mockReturnValue({
      doc: vi.fn((id) => (id ? { id } : { id: 'new-pay-124' }))
    });

    const result = await (recordPayment as any)({
      auth: { uid: 'u1' },
      data: {
        paymentDate: '2023-01-15',
        amount: 60,
        method: 'ach',
        billAllocations: [
          { billId: 'b1', amount: 60 }
        ]
      }
    });

    expect(result.updatedBills[0]).toEqual({
      billId: 'b1',
      newPaidAmount: 100,
      newStatus: 'paid'
    });
  });

  it('succeeds and updates bill to paid', async () => {
    runTransactionMock.mockImplementationOnce(async (cb) => {
      const txMock = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ vendorId: 'v1', status: 'reviewed', amountDue: 100, paidAmount: 0 })
        }),
        set: vi.fn(),
        update: vi.fn()
      };
      return await cb(txMock);
    });

    collectionMock.mockReturnValue({
      doc: vi.fn((id) => (id ? { id } : { id: 'new-pay-123' }))
    });

    const result = await (recordPayment as any)({
      auth: { uid: 'u1' },
      data: {
        paymentDate: '2023-01-01',
        amount: 100,
        method: 'ach',
        billAllocations: [
          { billId: 'b1', amount: 100 }
        ]
      }
    });

    expect(result.paymentId).toBe('new-pay-123');
    expect(result.updatedBills[0]).toEqual({
      billId: 'b1',
      newPaidAmount: 100,
      newStatus: 'paid'
    });
  });
});
