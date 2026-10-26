// Cache mínimo de catálogos para poder capturar sin red.
// Solo se guardan cuentas y categorías: son lo único que el formulario necesita
// para construirse offline. Saldos y movimientos se quedan en memoria.
import AsyncStorage from '@react-native-async-storage/async-storage';

const prefix = 'fa_cache_';

export const saveCache = async (key: string, value: unknown): Promise<void> => {
  try {
    await AsyncStorage.setItem(prefix + key, JSON.stringify(value));
  } catch {
    // Sin cache la app sigue funcionando online; no vale romper por esto.
  }
};

export const readCache = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(prefix + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};
