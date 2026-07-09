import { FieldValue, Timestamp } from 'firebase/firestore';

export interface PriceHistoryEntry {
  date: Timestamp | FieldValue;
  costPerUnit: number;
  supplier?: string;
  supplierId?: string;
}

export interface Location {
  id: string;
  name: string;
  type?: string;
  createdAt?: Timestamp | FieldValue;
}

export interface StockPosition {
  id: string;
  locationId: string;
  containerCount: number;
  unitsPerContainer: number;
  lotId?: string;
}

export interface Lot {
  id: string;
  ingredientId: string; // Links to raw ingredient OR prepped sub-recipe
  locationId?: string;   // Where is it physically?
  quantity: number;     // Current remaining amount
  initialQuantity: number;
  costPerUnit: number;  // For precise COGS
  receivedAt: Timestamp | FieldValue;
  expiresAt: Timestamp | FieldValue | null; // For FEFO
  lotNumber?: string;
  poNumber?: string;
  supplierId?: string;
  updatedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
}

export interface InventoryTransaction {
  id?: string;
  type: 'receive' | 'consume' | 'waste' | 'audit' | 'transfer' | 'audit_adjustment' | 'yield';
  ingredientId: string;
  amount: number; // positive or negative
  reason?: string;
  costPerUnit: number; // Snapshot of cost at the time
  date: Timestamp | FieldValue;
  userId: string;
  lotId?: string;
  lotNumber?: string; // Legacy support
  fromLocationId?: string; // For transfers
  toLocationId?: string;   // For transfers/receives
  referenceId?: string; // e.g., PrepList ID or Audit ID
  updatedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
}

export interface AuditItem {
  ingredientId: string;
  lotId: string;
  expectedQty: number; // Snapshot at start time
  actualQty: number | null;
  variance: number | null; // Stale start-time variance (can be omitted in newer versions but kept for backward compatibility)
  expectedQtyAtCompletion?: number; // Snapshot at completion time
  varianceAtCompletion?: number | null; // Actual variance computed at completion
}

export interface Audit {
  id: string;
  status: 'draft' | 'in_progress' | 'completed';
  startedAt: Timestamp | FieldValue;
  completedAt?: Timestamp | FieldValue;
  locationId?: string; // Optional: audit a specific room
  notes?: string;
  items: AuditItem[];
  updatedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
}
