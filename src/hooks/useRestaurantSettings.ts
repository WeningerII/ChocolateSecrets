import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Restaurant } from '../types';
import { RESTAURANT_ID } from '../constants/tenant';

export function useRestaurantSettings() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'restaurants', RESTAURANT_ID), (snap) => {
      if (snap.exists()) {
        setRestaurant({ id: snap.id, ...snap.data() } as Restaurant);
      } else {
        setRestaurant(null);
      }
      setLoading(false);
    }, (err) => {
      console.error('Restaurant settings load failed', err);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { restaurant, loading };
}
