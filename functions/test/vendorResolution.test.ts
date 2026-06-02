import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runVendorResolution } from '../src/vendorResolution';
import { getFirestore } from 'firebase-admin/firestore';

// Mock getFirestore
vi.mock('firebase-admin/firestore', () => {
  return {
    getFirestore: vi.fn(),
  };
});

describe('vendorResolution', () => {
  let mockGet: any;

  beforeEach(() => {
    mockGet = vi.fn();
    vi.mocked(getFirestore).mockReturnValue({
      collection: () => ({
        where: () => ({
          get: mockGet,
        }),
      }),
    } as any);
  });

  it('matches exactly by accountIdentifier', async () => {
    mockGet.mockResolvedValue({
      docs: [
        { id: 'v1', data: () => ({ name: 'Acme Corp', accountIdentifier: '123' }) },
      ],
    });

    const result = await runVendorResolution({ rawName: 'Acme', accountIdentifier: '123' });
    expect(result.status).toBe('resolved');
    expect(result.candidateVendorIds).toEqual(['v1']);
  });

  it('resolves strong name match', async () => {
    mockGet.mockResolvedValue({
      docs: [
        { id: 'v1', data: () => ({ name: 'Atmos Energy Corp' }) },
      ],
    });

    const result = await runVendorResolution({ rawName: 'ATMOS ENERGY, INC.' });
    expect(result.status).toBe('resolved');
    expect(result.candidateVendorIds).toEqual(['v1']);
  });

  it('returns unresolved for empty collection', async () => {
    mockGet.mockResolvedValue({ docs: [] });

    const result = await runVendorResolution({ rawName: 'Acme Corp' });
    expect(result.status).toBe('unresolved');
    expect(result.candidateVendorIds).toEqual([]);
  });

  it('returns ambiguous for medium name match', async () => {
    mockGet.mockResolvedValue({
      docs: [
        { id: 'v1', data: () => ({ name: 'Verizon Wireless' }) },
        { id: 'v2', data: () => ({ name: 'Verizon Business' }) },
      ],
    });

    // "Verizon" will match 1 of 2 tokens = 0.5 < AMBIGUOUS_FLOOR ? Wait, 
    // Jaccard similarity:
    // A: 'verizon' (1 set)
    // B: 'verizon', 'wireless' (2 set)
    // Intersection: 1
    // Union: 2
    // Score: 0.5. But AMBIGUOUS_FLOOR is 0.65!
    // So "Verizon" vs "Verizon Wireless" is < 0.65.
    // Let's use a closer name.
    
    // "City of Austin" vs "City of Austin Utilities"
    // "city austin" vs "city austin utilities" -> int 2, union 3 -> 0.666 >= 0.65
    mockGet.mockResolvedValue({
      docs: [
        { id: 'v1', data: () => ({ name: 'City of Austin Utilities' }) },
        { id: 'v2', data: () => ({ name: 'City of Austin Water' }) },
      ],
    });

    const result = await runVendorResolution({ rawName: 'City of Austin' });
    expect(result.status).toBe('ambiguous');
    // Top candidates max 3
    expect(result.candidateVendorIds.length).toBeGreaterThan(0);
  });

  it('returns unresolved for weak name match', async () => {
    mockGet.mockResolvedValue({
      docs: [
        { id: 'v1', data: () => ({ name: 'Atmos Energy Corp' }) },
      ],
    });

    const result = await runVendorResolution({ rawName: 'Comcast' });
    expect(result.status).toBe('unresolved');
    expect(result.candidateVendorIds.length).toBe(0);
  });

  it('empty rawName returns unresolved when no accountIdentifier is matched', async () => {
    mockGet.mockResolvedValue({
      docs: [
        { id: 'v1', data: () => ({ name: 'Atmos Energy Corp' }) },
      ],
    });

    const result = await runVendorResolution({ rawName: '' });
    expect(result.status).toBe('unresolved');
  });

  it('account match wins over name match', async () => {
    mockGet.mockResolvedValue({
      docs: [
        { id: 'v1', data: () => ({ name: 'Atmos Energy Corp', accountIdentifier: '555' }) },
        { id: 'v2', data: () => ({ name: 'Acme Corp', accountIdentifier: '123' }) }, // Account match
      ],
    });

    const result = await runVendorResolution({ rawName: 'Atmos Energy Corp', accountIdentifier: '123' });
    expect(result.status).toBe('resolved');
    expect(result.candidateVendorIds).toEqual(['v2']);
  });

  it('queries only active vendors', async () => {
    const whereSpy = vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue({ docs: [] }) });
    vi.mocked(getFirestore).mockReturnValue({
      collection: () => ({ where: whereSpy }),
    } as any);

    await runVendorResolution({ rawName: 'Anything' });
    expect(whereSpy).toHaveBeenCalledWith('isActive', '==', true);
  });
});
