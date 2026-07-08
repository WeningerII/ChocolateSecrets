import { FieldValue, Timestamp } from 'firebase/firestore';

// =====================================================================
// Alerts (Milestone P&L-E)
// =====================================================================

export type AlertType = 'missing_bill' | 'due_soon' | 'anomaly_amount';
export type AlertSeverity = 'info' | 'warning' | 'urgent';

export interface Alert {
  id?: string;
  userId: string;
  type: AlertType;
  severity: AlertSeverity;
  vendorId?: string;
  billId?: string;
  expectationId?: string;
  titleKey: string;          // i18n key, e.g. 'alerts:missingBill.title'
  bodyKey: string;           // i18n key
  bodyParams?: Record<string, string | number>;  // for interpolation
  actionUrl?: string;        // app-relative path the bell-icon click navigates to
  dismissedAt?: Timestamp | FieldValue | null;
  createdAt?: Timestamp | FieldValue;
}

export interface RecurringCadenceTolerance {
  amountToleranceBand: {
    low: number;
    high: number;
  };
  graceDays: number;
}

export interface RecurringExpectation {
  id?: string;
  vendorId: string;
  expenseCategoryId?: string;
  rrule: string;
  nextExpectedDate: Timestamp | FieldValue;
  expectedAmount: number;
  tolerance: RecurringCadenceTolerance;
  lastSatisfiedBillId?: string;
  isActive: boolean;
  notes?: string;
  lastCheckedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}
