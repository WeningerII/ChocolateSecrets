import {
  WriteBatch,
  writeBatch,
  Firestore,
  DocumentReference,
  serverTimestamp,
  Timestamp,
  FieldValue,
  doc,
  type DocumentData,
  type WithFieldValue
} from 'firebase/firestore';

/**
 * Recursively removes undefined values from an object.
 * Also ensures numbers are valid and converts common types.
 */
export function sanitizeData<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    if (typeof obj === 'number' && isNaN(obj)) return 0 as T;
    return obj;
  }

  if (obj instanceof Timestamp || obj instanceof FieldValue || obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeData(item)) as T;
  }

  const source = obj as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};
  for (const key in source) {
    if (source[key] !== undefined) {
      sanitized[key] = sanitizeData(source[key]);
    }
  }
  return sanitized as T;
}

/**
 * A wrapper for Firestore WriteBatch that automatically handles the 500-operation limit
 * by chunking operations into multiple batches during commit.
 */
export class SafeBatch {
  private operations: Array<{
    type: 'set' | 'update' | 'delete';
    ref: DocumentReference;
    data?: DocumentData;
    options?: { merge?: boolean };
  }> = [];
  private db: Firestore;
  private readonly LIMIT = 450;

  constructor(db: Firestore) {
    this.db = db;
  }

  set(ref: DocumentReference, data: WithFieldValue<DocumentData>, options?: { merge?: boolean }) {
    this.operations.push({ type: 'set', ref, data: sanitizeData(data), options });
  }

  update(ref: DocumentReference, data: DocumentData) {
    this.operations.push({ type: 'update', ref, data: sanitizeData(data) });
  }

  delete(ref: DocumentReference) {
    this.operations.push({ type: 'delete', ref });
  }

  async commit() {
    if (this.operations.length === 0) return;

    // Chunk operations into groups of LIMIT
    for (let i = 0; i < this.operations.length; i += this.LIMIT) {
      const chunk = this.operations.slice(i, i + this.LIMIT);
      const batch = writeBatch(this.db);

      for (const op of chunk) {
        switch (op.type) {
          case 'set':
            if (op.options?.merge) {
              batch.set(op.ref, op.data, { merge: true });
            } else {
              batch.set(op.ref, op.data);
            }
            break;
          case 'update':
            batch.update(op.ref, op.data);
            break;
          case 'delete':
            batch.delete(op.ref);
            break;
        }
      }

      await batch.commit();
    }

    this.operations = [];
  }
}

/**
 * Helper to add standard timestamps to data
 */
export function withTimestamps<T extends object>(
  data: T,
  isNew: boolean = false
): T & { updatedAt: FieldValue; createdAt?: FieldValue } {
  const now = serverTimestamp();
  return {
    ...data,
    updatedAt: now,
    ...(isNew ? { createdAt: now } : {})
  };
}

/**
 * Helper to update lot quantity and archive it if depleted.
 */
export function updateLotQuantity(
  batch: SafeBatch | WriteBatch,
  db: Firestore,
  lot: { id: string },
  newQuantity: number
) {
  const safeQty = Math.max(0, newQuantity);
  batch.update(doc(db, 'lots', lot.id), { quantity: safeQty });
}
