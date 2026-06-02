import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { SourcingNote } from '../types';

export function useKeptSourcingNotes(ingredientId: string | undefined) {
  const [notes, setNotes] = useState<SourcingNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ingredientId) {
      setNotes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'sourcing_notes'),
      where('ingredientId', '==', ingredientId),
      orderBy('keptAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const result: SourcingNote[] = [];
      snap.forEach(d => result.push({ id: d.id, ...d.data() } as SourcingNote));
      setNotes(result);
      setLoading(false);
    }, (err) => {
      console.error('Failed to subscribe to sourcing notes', err);
      setLoading(false);
    });
    return unsub;
  }, [ingredientId]);

  return { notes, loading };
}
