import { describe, test, expect, vi } from 'vitest';
import { updateLotQuantity } from './firestore';

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    doc: (_db: any, collectionPath: string, id: string) => ({ collectionPath, id }),
  };
});

describe('updateLotQuantity', () => {
  function makeFakeBatch() {
    const ops: Array<{ kind: string; data?: any }> = [];
    return {
      ops,
      update: (_ref: any, data: any) => { ops.push({ kind: 'update', data }); },
      set: (_ref: any, data: any) => { ops.push({ kind: 'set', data }); },
      delete: (_ref: any) => { ops.push({ kind: 'delete' }); },
    };
  }

  test('positive quantity is written through', () => {
    const batch = makeFakeBatch();
    updateLotQuantity(batch as any, {} as any, { id: 'lot1' }, 47.5);
    expect(batch.ops).toEqual([{ kind: 'update', data: { quantity: 47.5 } }]);
  });

  test('zero quantity is written as zero', () => {
    const batch = makeFakeBatch();
    updateLotQuantity(batch as any, {} as any, { id: 'lot1' }, 0);
    expect(batch.ops).toEqual([{ kind: 'update', data: { quantity: 0 } }]);
  });

  test('negative quantity is floored to zero (floating-point drift)', () => {
    const batch = makeFakeBatch();
    updateLotQuantity(batch as any, {} as any, { id: 'lot1' }, -0.0001);
    expect(batch.ops).toEqual([{ kind: 'update', data: { quantity: 0 } }]);
  });

  test('never calls set or delete (Cloud Function handles archival)', () => {
    const batch = makeFakeBatch();
    updateLotQuantity(batch as any, {} as any, { id: 'lot1' }, 0);
    const kinds = batch.ops.map(o => o.kind);
    expect(kinds).toEqual(['update']);
    expect(kinds).not.toContain('set');
    expect(kinds).not.toContain('delete');
  });
});
