// Storage inyectable: web usa localStorage, RN/Node usan memoria.
// Ningún acceso a localStorage fuera de estas funciones.
export type KeyValue = {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
};

const mem = new Map<string, string>();
const memory: KeyValue = {
  getItem: (k) => mem.get(k) ?? null,
  setItem: (k, v) => { mem.set(k, v); },
  removeItem: (k) => { mem.delete(k); },
};

let backend: KeyValue | null = null;
export const setStorage = (s: KeyValue) => { backend = s; };
export const storage = (): KeyValue => {
  if (backend) return backend;
  if (typeof localStorage !== 'undefined') return localStorage;
  return memory;
};

export const loadJSON = <T>(key: string, fallback: T): T => {
  try {
    const raw = storage().getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
};
export const saveJSON = (key: string, v: unknown) => storage().setItem(key, JSON.stringify(v));
