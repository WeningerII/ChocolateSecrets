import { FieldValue, Timestamp } from 'firebase/firestore';
import type { LocalizedString } from './i18n';
import type { CustomField } from './common';

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  leadTimeDays?: number;
  minimumOrderValue?: number;
  tags?: string[];
  customFields?: CustomField[];
  notes?: string;
  notesI18n?: LocalizedString;
  updatedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
}

export interface PurchaseOrderItem {
  ingredientId: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number;
  name?: string; // For UI convenience
  unit?: string; // For UI convenience
}

export interface PurchaseOrder {
  id?: string;
  poNumber: string;
  supplierId: string;
  status: 'draft' | 'sent' | 'partially_received' | 'fulfilled' | 'received' | 'cancelled';
  items: PurchaseOrderItem[];
  totalAmount: number;
  notes?: string;
  receivedAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
}

export interface ShoppingListItem {
  id?: string;
  ingredientId: string;
  name: string;
  quantity: number;
  unit?: string;
  status: 'pending' | 'purchased' | 'ordered' | 'received' | 'cancelled';
  supplierId?: string;
  moq?: number;
  orderUnit?: string;
  costPerUnit?: number;
  updatedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
}

/**
 * A persisted sourcing observation — a SourcingCandidate the chef chose to Keep.
 * Lives in the /sourcing_notes collection, queryable by ingredientId.
 */
export type SourcingCandidate = Omit<SourcingNote, 'id' | 'ingredientId' | 'restaurantId' | 'keptAt' | 'keptBy' | 'promotedToSupplierId' | 'updatedAt' | 'createdAt'>;

export interface SourcingNote {
  id: string;
  name: string;
  address?: string;
  website?: string;
  phone?: string;
  priceUsd?: number;
  priceUnit?: string;
  observedAt?: string;
  sourceUrl?: string;
  sourceDomain?: string;
  notes?: string;
  ingredientId: string;
  restaurantId: string;           // 'default' for now; future multi-restaurant support
  keptAt: Timestamp | FieldValue;  // Firestore Timestamp (serverTimestamp on write)
  keptBy: string;                  // user uid
  promotedToSupplierId?: string;   // set once the note has been turned into a supplier record
  updatedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
}
