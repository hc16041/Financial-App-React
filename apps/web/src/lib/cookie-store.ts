import type { KeyValue } from '@financial/core';

// Cookie de sesión (sin Expires/Max-Age): se comparte entre pestañas y el
// navegador la borra al cerrarse/ reiniciarse. No se usa HttpOnly porque el
// cliente la lee para mandar el JWT como Bearer.
const encode = (value: string) => encodeURIComponent(value);
const decode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const secure = () =>
  typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';

const read = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split('; ')) {
    if (part.startsWith(prefix)) return decode(part.slice(prefix.length));
  }
  return null;
};

const write = (name: string, value: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encode(value)}; Path=/; SameSite=Lax${secure()}`;
};

const erase = (name: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Path=/; SameSite=Lax; Max-Age=0${secure()}`;
};

// Canal de aviso para otras pestañas: las cookies no disparan `storage`.
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('fa-auth') : null;
const notify = () => channel?.postMessage('changed');

export const cookieStore: KeyValue = {
  getItem: read,
  setItem: (name, value) => {
    write(name, value);
    notify();
  },
  removeItem: (name) => {
    erase(name);
    notify();
  },
};

export const onAuthChange = (callback: () => void) => {
  if (!channel) return () => {};
  const handler = () => callback();
  channel.addEventListener('message', handler);
  return () => channel.removeEventListener('message', handler);
};
