// Estado del bloqueo biométrico. Vive en un store para que el layout y la
// pantalla de ajustes no tengan que pasarse props.
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'fa_bio_lock';

type LockState = {
  enabled: boolean;
  locked: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  unlock: () => void;
  lock: () => void;
};

export const useLock = create<LockState>((set, get) => ({
  enabled: false,
  locked: false,
  hydrated: false,

  hydrate: async () => {
    let enabled = false;
    try {
      enabled = (await AsyncStorage.getItem(KEY)) === '1';
    } catch {
      enabled = false;
    }
    // Con el bloqueo activo, arrancar la app siempre pide desbloqueo.
    set({ enabled, locked: enabled, hydrated: true });
  },

  enable: async () => {
    await AsyncStorage.setItem(KEY, '1');
    set({ enabled: true, locked: false });
  },

  disable: async () => {
    await AsyncStorage.setItem(KEY, '0');
    set({ enabled: false, locked: false });
  },

  unlock: () => set({ locked: false }),
  lock: () => { if (get().enabled) set({ locked: true }); },
}));
