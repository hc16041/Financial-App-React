// Único fetch contra .NET. Dinero siempre string, fechas ISO UTC.
// Sin DOM en import (RN-safe): storage solo dentro de funciones.
const BASE = (import.meta as any)?.env?.VITE_API_URL ?? 'http://localhost:5063';

const mem: Record<string, string> = {};
const store = () =>
  typeof sessionStorage !== 'undefined'
    ? sessionStorage
    : { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
export const setToken = (t: string | null) =>
  t ? store().setItem('fa_token', t) : store().removeItem('fa_token');
export const getToken = () => store().getItem('fa_token');

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
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401 && typeof location !== 'undefined' && !location.pathname.startsWith('/auth/')) {
    setToken(null);
    location.href = '/auth/login';
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body?.code, body?.message ?? body?.title ?? `HTTP ${res.status}`);
  return body as T;
}

export const apiGet = <T>(p: string) => req<T>(p);
export const apiPost = <T>(p: string, b: unknown) => req<T>(p, { method: 'POST', body: JSON.stringify(b) });
export const apiPut = <T>(p: string, b: unknown) => req<T>(p, { method: 'PUT', body: JSON.stringify(b) });
export const apiDel = <T>(p: string) => req<T>(p, { method: 'DELETE' });
