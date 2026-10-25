// Único fetch contra .NET. Dinero siempre string, fechas ISO UTC.
// Portable: sin DOM, sin `location`, sin `import.meta`. La app configura
// baseUrl, storage y el callback de 401 al arrancar, así el mismo código corre
// en la web y en React Native.

import type { KeyValue } from './storage';

const mem = new Map<string, string>();
const memoryStore: KeyValue = {
  getItem: (k) => mem.get(k) ?? null,
  setItem: (k, v) => { mem.set(k, v); },
  removeItem: (k) => { mem.delete(k); },
};

// Por defecto sessionStorage (comportamiento histórico de la web); en RN la app
// inyecta SecureStore/AsyncStorage. Si no hay ninguno, memoria.
let sessionOverride: KeyValue | null = null;
export const sessionStore = (): KeyValue => {
  if (sessionOverride) return sessionOverride;
  if (typeof sessionStorage !== 'undefined') return sessionStorage;
  return memoryStore;
};

let baseUrl = 'http://localhost:5063';
let onUnauthorized: (() => void) | null = null;

export type ApiConfig = {
  baseUrl?: string;
  storage?: KeyValue;
  /** Qué hacer ante un 401. La web redirige al login; RN limpia la sesión. */
  onUnauthorized?: () => void;
};

export const configureApi = (config: ApiConfig) => {
  if (config.baseUrl) baseUrl = config.baseUrl.replace(/\/+$/, '');
  if (config.storage) sessionOverride = config.storage;
  if (config.onUnauthorized) onUnauthorized = config.onUnauthorized;
};

export const getBaseUrl = () => baseUrl;

export const setToken = (t: string | null) =>
  t ? sessionStore().setItem('fa_token', t) : sessionStore().removeItem('fa_token');
export const getToken = () => sessionStore().getItem('fa_token');

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, code?: string, message = 'Error API') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) onUnauthorized?.();
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body?.code, body?.message ?? body?.title ?? `HTTP ${res.status}`);
  return body as T;
}

export const apiGet = <T>(p: string) => req<T>(p);
export const apiPost = <T>(p: string, b: unknown) => req<T>(p, { method: 'POST', body: JSON.stringify(b) });
export const apiPut = <T>(p: string, b: unknown) => req<T>(p, { method: 'PUT', body: JSON.stringify(b) });
export const apiDel = <T>(p: string) => req<T>(p, { method: 'DELETE' });
