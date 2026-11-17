// Cola de escrituras pendientes para cuando no hay red.
//
// Diseño: cada entrada lleva su propio Idempotency-Key. El backend deduplica por
// (usuario, clave), así que reintentar N veces aplica el cambio una sola vez.
// Un error de red se reintenta; un 4xx es definitivo y se marca como fallido
// para que el usuario decida, en vez de reintentar en bucle algo que nunca va a
// funcionar.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError, apiPost, apiPut, apiDel } from '@financial/core';

const KEY = 'fa_pending_writes';

export type PendingWrite = {
  key: string;
  method: 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  createdAt: string;
  attempts: number;
  /** Último error definitivo (4xx). Si existe, no se reintenta. */
  failed?: string;
  label: string;
};

const read = async (): Promise<PendingWrite[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingWrite[]) : [];
  } catch {
    return [];
  }
};

const write = async (items: PendingWrite[]): Promise<void> => {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
};

export const listPending = () => read();

export const enqueue = async (item: Omit<PendingWrite, 'createdAt' | 'attempts'>): Promise<void> => {
  const items = await read();
  // La misma clave no se encola dos veces.
  if (items.some((i) => i.key === item.key)) return;
  items.push({ ...item, createdAt: new Date().toISOString(), attempts: 0 });
  await write(items);
};

export const removePending = async (key: string): Promise<void> => {
  const items = await read();
  await write(items.filter((i) => i.key !== key));
};

const send = (item: PendingWrite) => {
  const headers = { 'Idempotency-Key': item.key };
  if (item.method === 'POST') return apiPost(item.path, item.body ?? {}, headers);
  if (item.method === 'PUT') return apiPut(item.path, item.body ?? {}, headers);
  return apiDel(item.path, headers);
};

export type FlushResult = { sent: number; remaining: number; failed: number };

/** Intenta enviar todo lo pendiente. Devuelve el estado después del intento. */
export const flush = async (): Promise<FlushResult> => {
  const items = await read();
  if (items.length === 0) return { sent: 0, remaining: 0, failed: 0 };

  let sent = 0;

  for (const item of items) {
    if (item.failed) continue;

    try {
      await send(item);
      await removePending(item.key);
      sent++;
    } catch (e) {
      if (e instanceof ApiError) {
        // El servidor respondió: reintentar no va a cambiarlo.
        const current = await read();
        await write(
          current.map((i) =>
            i.key === item.key ? { ...i, attempts: i.attempts + 1, failed: e.message } : i,
          ),
        );
      } else {
        // Sin red: se queda en la cola y se reintenta después.
        const current = await read();
        await write(
          current.map((i) => (i.key === item.key ? { ...i, attempts: i.attempts + 1 } : i)),
        );
        break;
      }
    }
  }

  const after = await read();
  return {
    sent,
    remaining: after.filter((i) => !i.failed).length,
    failed: after.filter((i) => i.failed).length,
  };
};

/** Descarta una entrada fallida que el usuario decidió no reintentar. */
export const discard = (key: string) => removePending(key);
