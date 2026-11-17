import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { flush, listPending, removePending, type PendingWrite } from '@/lib/queue';

// Mantiene el estado de la cola y la vacía al volver a la app, que es cuando
// más probable es que haya red otra vez.
export const useOfflineQueue = () => {
  const qc = useQueryClient();
  const [items, setItems] = useState<PendingWrite[]>([]);
  const [syncing, setSyncing] = useState(false);

  const reload = useCallback(async () => {
    setItems(await listPending());
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await flush();
      if (result.sent > 0) {
        void qc.invalidateQueries({ queryKey: ['tx'] });
        void qc.invalidateQueries({ queryKey: ['dashboard'] });
        void qc.invalidateQueries({ queryKey: ['accounts'] });
      }
      return result;
    } finally {
      setSyncing(false);
      await reload();
    }
  }, [qc, reload]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void sync();
      }
    });
    return () => sub.remove();
  }, [sync]);

  // Al volver de la captura la pantalla no se remonta: hay que releer la cola
  // cada vez que gana el foco o el contador queda viejo.
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return {
    pending: items.filter((i) => !i.failed).length,
    failed: items.filter((i) => i.failed).length,
    items,
    syncing,
    sync,
    reload,
    discard: async (key: string) => {
      await removePending(key);
      await reload();
    },
  };
};
