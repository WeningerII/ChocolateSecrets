import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';

export type UserRole = 'admin' | 'staff' | null;

export function useUserRole(): { role: UserRole; loading: boolean } {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubRole: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubRole) { unsubRole(); unsubRole = null; }
      
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }
      
      unsubRole = onSnapshot(
        doc(db, 'users', user.uid),
        (snap) => {
          if (snap.exists()) {
            setRole((snap.data().role as UserRole) || 'staff');
          } else {
            setRole('staff'); // default for users without a role doc yet
          }
          setLoading(false);
        },
        (err) => {
          console.error('[useUserRole] role subscription failed:', err);
          setRole('staff'); // fail closed
          setLoading(false);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubRole) unsubRole();
    };
  }, []);

  return { role, loading };
}
