// Única configuración del core para el móvil: base URL por entorno, token en
// SecureStore y manejo de 401 delegado a la app (el core no conoce el router).
import * as SecureStore from 'expo-secure-store';
import { configureApi, type KeyValue } from '@financial/core';

// shortcut: SecureStore no tiene borrado síncrono y el KeyValue del core es
// síncrono; se blanquea la clave y se trata '' como ausente. Si el token crece
// o se necesita borrado real, mover a un store async.
const BLANK = '';

const secureStore: KeyValue = {
  getItem: (k) => {
    try {
      const v = SecureStore.getItem(k);
      return v === BLANK ? null : v;
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    SecureStore.setItem(k, v);
  },
  removeItem: (k) => {
    SecureStore.setItem(k, BLANK);
  },
};

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5063';

// Mismo tope que la web: pasadas 8 h desde el login no se renueva el token y
// la app vuelve al login (biometría o contraseña).
const SESSION_MAX_MS = 8 * 60 * 60 * 1000;

export const configureMobileApi = (onUnauthorized: () => void) =>
  configureApi({
    baseUrl: API_URL,
    storage: secureStore,
    onUnauthorized,
    sessionMaxMs: SESSION_MAX_MS,
  });
