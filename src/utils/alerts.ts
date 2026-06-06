import type { Alert } from '../types';

/**
 * Epoch millis for an alert's createdAt, tolerant of an absent or still-pending
 * server timestamp (which has no toMillis until the write resolves).
 */
export function alertCreatedMillis(a: Alert): number {
  const ts = a.createdAt as { toMillis?: () => number } | undefined;
  return ts && typeof ts.toMillis === 'function' ? ts.toMillis() : 0;
}

/**
 * The alerts a user should see in the bell: non-dismissed, newest first. Pure
 * and non-mutating (filter produces a fresh array before the sort).
 */
export function selectActiveAlerts(alerts: Alert[]): Alert[] {
  return alerts
    .filter((a) => !a.dismissedAt)
    .sort((a, b) => alertCreatedMillis(b) - alertCreatedMillis(a));
}
