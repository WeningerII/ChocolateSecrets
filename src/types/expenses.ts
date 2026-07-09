import { FieldValue, Timestamp } from 'firebase/firestore';
import type { FieldMeta } from './common';

// =====================================================================
// Expenses domain (Milestone P&L-A — data model only)
// =====================================================================

export type ExpenseCategoryParent = 'operating' | 'non_operating' | 'cogs';

export interface ExpenseCategory {
  id?: string;
  name: string;
  parent: ExpenseCategoryParent;
  glAccountCode: string;
  description?: string;
  isActive: boolean;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export type PaymentMethod = 'ach' | 'card' | 'check' | 'wire' | 'auto_debit' | 'cash' | 'other';

export interface VendorContact {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface Vendor {
  id?: string;
  name: string;
  expenseCategoryId: string;
  accountIdentifier?: string;
  address?: string;
  website?: string;
  phone?: string;
  defaultPaymentMethod?: PaymentMethod;
  contacts?: VendorContact[];
  linkedSupplierId?: string;
  tags?: string[];
  notes?: string;
  isActive: boolean;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export interface BillLineItem {
  description: string;
  amount: number;
  quantity?: number;
  unitPrice?: number;
  categoryHintId?: string;
}

export interface BillTaxLine {
  description: string;
  amount: number;
  rate?: number;
}

export type BillStatus = 'extracted' | 'reviewed' | 'scheduled' | 'paid' | 'partially_paid' | 'reconciled' | 'disputed' | 'void';

export interface BillPaymentInstruction {
  method: PaymentMethod;
  addressOrAccount: string;
  dueIfPaidBy?: Timestamp | FieldValue;
}

export interface BillVendorResolution {
  status: 'resolved' | 'unresolved' | 'ambiguous';
  candidateVendorIds: string[];
  rawExtractedVendorName: string;
}

export interface Bill {
  id?: string;
  vendorId?: string | null;
  expenseCategoryId?: string | null;
  billDate: Timestamp | FieldValue;
  dueDate?: Timestamp | FieldValue;
  periodStart?: Timestamp | FieldValue;
  periodEnd?: Timestamp | FieldValue;
  invoiceNumber?: string;
  accountNumber?: string;
  extractedVendorName?: string;
  totalAmount: number;
  amountDue?: number;
  paidAmount?: number;
  currency?: string;
  lineItems: BillLineItem[];
  taxes?: BillTaxLine[];
  paymentInstructions?: BillPaymentInstruction;
  status: BillStatus;
  notes?: string;
  imageStoragePath?: string;
  extractedJson?: string;
  fieldMeta?: Record<string, FieldMeta>;
  vendorResolution?: BillVendorResolution;
  recurringExpectationId?: string;
  tags?: string[];
  createdBy?: string;          // Firebase auth uid of the user who saved this bill
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export interface BillAllocation {
  billId: string;
  amount: number;
}

export interface Payment {
  id?: string;
  paymentDate: Timestamp | FieldValue;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  billAllocations: BillAllocation[];
  notes?: string;
  createdBy?: string;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}
