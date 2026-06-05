import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { subscribeToUserAlerts } from '../services/alertsService';
import type { Alert } from '../types';

/**
 * Subscribes to the signed-in user's alerts in real time. Mirrors useUserRole:
 * re-subscribes on auth changes and tears the listener down on sign-out/unmount.
 * Intended to be used once (e.g. in Layout) and shared with presentational
 * consumers, so the app holds a single alerts listener.
 */
export function useAlerts(): { alerts: Alert[]; loading: boolean } {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubAlerts: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubAlerts) { unsubAlerts(); unsubAlerts = null; }

      if (!user) {
        setAlerts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      unsubAlerts = subscribeToUserAlerts(
        user.uid,
        (next) => { setAlerts(next); setLoading(false); },
        () => { setAlerts([]); setLoading(false); },
      );
    });

    return () => {
      unsubAuth();
      if (unsubAlerts) unsubAlerts();
    };
  }, []);

  return { alerts, loading };
}
