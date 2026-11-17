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
let sessionMaxMs = 0;

export type ApiConfig = {
  baseUrl?: string;
  storage?: KeyValue;
  /** Qué hacer ante un 401. La web redirige al login; RN limpia la sesión. */
  onUnauthorized?: () => void;
  /** Duración máxima de la sesión desde el login; 0 = sin tope. */
  sessionMaxMs?: number;
};

export const configureApi = (config: ApiConfig) => {
  if (config.baseUrl) baseUrl = config.baseUrl.replace(/\/+$/, '');
  if (config.storage) sessionOverride = config.storage;
  if (config.onUnauthorized) onUnauthorized = config.onUnauthorized;
  if (config.sessionMaxMs !== undefined) sessionMaxMs = config.sessionMaxMs;
};

export const getBaseUrl = () => baseUrl;

const TOKEN_KEY = 'fa_token';
const REFRESH_KEY = 'fa_refresh';
const LOGIN_AT_KEY = 'fa_login_at';

export const setToken = (t: string | null) =>
  t ? sessionStore().setItem(TOKEN_KEY, t) : sessionStore().removeItem(TOKEN_KEY);
export const getToken = () => sessionStore().getItem(TOKEN_KEY);

export const setRefreshToken = (t: string | null) =>
  t ? sessionStore().setItem(REFRESH_KEY, t) : sessionStore().removeItem(REFRESH_KEY);
export const getRefreshToken = () => sessionStore().getItem(REFRESH_KEY);

export const setSessionTokens = (token: string | null, refreshToken: string | null) => {
  setToken(token);
  setRefreshToken(refreshToken);
  // El inicio de sesión se marca solo cuando aparece un token y no había uno:
  // un refresh no reinicia la ventana de 8 h.
  if (token && !sessionStore().getItem(LOGIN_AT_KEY)) {
    sessionStore().setItem(LOGIN_AT_KEY, String(Date.now()));
  }
  if (!token) {
    sessionStore().removeItem(LOGIN_AT_KEY);
  }
};

export const clearSession = () => setSessionTokens(null, null);

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, code?: string, message = 'Error API') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type RefreshPair = { token: string; refreshToken: string };

let refreshPromise: Promise<string | null> | null = null;

function isAuthCredentialPath(path: string) {
  return /\/api\/Auth\/(refresh|login|register|biometric-login|forgot-password|reset-password)$/i.test(path);
}

async function doRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  if (sessionMaxMs > 0) {
    const started = Number(sessionStore().getItem(LOGIN_AT_KEY) ?? 0);
    if (started > 0 && Date.now() - started >= sessionMaxMs) {
      clearSession();
      return null;
    }
  }
  try {
    const res = await fetch(`${baseUrl}/api/Auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const pair = (await res.json()) as Partial<RefreshPair>;
    if (!pair.token || !pair.refreshToken) return null;
    setSessionTokens(pair.token, pair.refreshToken);
    return pair.token;
  } catch {
    return null;
  }
}

async function refreshOnce(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function unauthorized(): never {
  clearSession();
  onUnauthorized?.();
  throw new ApiError(401, undefined, 'No autorizado');
}

async function req<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const token = getToken();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    if (!retried && !isAuthCredentialPath(path) && getRefreshToken()) {
      const next = await refreshOnce();
      if (next) return req<T>(path, init, true);
    }
    if (isAuthCredentialPath(path) && path.toLowerCase().endsWith('/refresh')) {
      unauthorized();
    }
    // Login/register/otros auth devuelven 401 por credenciales: propaga el error
    // sin borrar sesión activa; el caller decide. Para rutas protegidas sin
    // refresh válido, cierra sesión.
    if (!isAuthCredentialPath(path)) unauthorized();
  }

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // ProblemDetails: el texto útil viaja en `detail`; `title` es genérico.
    const msg = body?.detail ?? body?.message ?? body?.title ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, body?.code, msg);
  }
  return body as T;
}

export const apiGet = <T>(p: string, headers?: Record<string, string>) => req<T>(p, { headers });
export const apiPost = <T>(p: string, b: unknown, headers?: Record<string, string>) =>
  req<T>(p, { method: 'POST', body: JSON.stringify(b), headers });
export const apiPut = <T>(p: string, b: unknown, headers?: Record<string, string>) =>
  req<T>(p, { method: 'PUT', body: JSON.stringify(b), headers });
export const apiDel = <T>(p: string, headers?: Record<string, string>) =>
  req<T>(p, { method: 'DELETE', headers });
