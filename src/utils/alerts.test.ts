import { describe, it, expect } from 'vitest';
import { selectActiveAlerts, alertCreatedMillis } from './alerts';
import type { Alert } from '../types';

// Minimal Timestamp-like stand-in: the code only ever calls toMillis().
const ts = (ms: number) => ({ toMillis: () => ms }) as unknown as Alert['createdAt'];

function makeAlert(over: Partial<Alert>): Alert {
  return {
    userId: 'u1',
    type: 'due_soon',
    severity: 'warning',
    titleKey: 'alerts:dueSoon.title',
    bodyKey: 'alerts:dueSoon.body',
    ...over,
  } as Alert;
}

describe('selectActiveAlerts', () => {
  it('drops dismissed alerts', () => {
    const alerts = [
      makeAlert({ id: 'dismissed', dismissedAt: ts(100), createdAt: ts(99) }),
      makeAlert({ id: 'active', dismissedAt: null, createdAt: ts(50) }),
    ];
    expect(selectActiveAlerts(alerts).map((a) => a.id)).toEqual(['active']);
  });

  it('sorts active alerts newest first', () => {
    const alerts = [
      makeAlert({ id: 'old', createdAt: ts(10) }),
      makeAlert({ id: 'new', createdAt: ts(30) }),
      makeAlert({ id: 'mid', createdAt: ts(20) }),
    ];
    expect(selectActiveAlerts(alerts).map((a) => a.id)).toEqual(['new', 'mid', 'old']);
  });

  it('treats a missing/pending createdAt as oldest', () => {
    const alerts = [
      makeAlert({ id: 'pending' }), // serverTimestamp not yet resolved -> no toMillis
      makeAlert({ id: 'real', createdAt: ts(5) }),
    ];
    expect(selectActiveAlerts(alerts).map((a) => a.id)).toEqual(['real', 'pending']);
  });

  it('does not mutate the input array', () => {
    const alerts = [
      makeAlert({ id: 'x', createdAt: ts(1) }),
      makeAlert({ id: 'y', createdAt: ts(2) }),
    ];
    const snapshot = [...alerts];
    selectActiveAlerts(alerts);
    expect(alerts).toEqual(snapshot);
  });
});

describe('alertCreatedMillis', () => {
  it('returns 0 when createdAt is absent', () => {
    expect(alertCreatedMillis(makeAlert({}))).toBe(0);
  });
});
