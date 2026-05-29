import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../../../firebase.config';

export function useFirestoreListener<T>(
  path: string,
  idKey: string = 'id',
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dbRef = ref(rtdb, path);

    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        const val = snapshot.val();
        if (!val) {
          setData([]);
        } else {
          const items = Object.entries(val).map(([key, data]) => ({
            ...(data as any),
            [idKey]: key,
          })) as T[];
          setData(items);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [path, idKey]);

  return { data, loading, error };
}
