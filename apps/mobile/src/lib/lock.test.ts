import { beforeEach, describe, expect, it, vi } from 'vitest';

// El estado de bloqueo decide si la app muestra datos financieros o no.
// Un error acá es una fuga de información en pantalla.

const store = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => { store.set(k, v); },
    removeItem: async (k: string) => { store.delete(k); },
  },
}));

const load = async () => {
  vi.resetModules();
  return await import('@/lib/lock');
};

describe('bloqueo biométrico', () => {
  beforeEach(() => store.clear());

  it('arranca desbloqueado si la preferencia está apagada', async () => {
    const { useLock } = await load();
    await useLock.getState().hydrate();

    expect(useLock.getState().enabled).toBe(false);
    expect(useLock.getState().locked).toBe(false);
    expect(useLock.getState().hydrated).toBe(true);
  });

  it('arranca bloqueado si la preferencia está encendida', async () => {
    store.set('fa_bio_lock', '1');
    const { useLock } = await load();
    await useLock.getState().hydrate();

    expect(useLock.getState().enabled).toBe(true);
    expect(useLock.getState().locked).toBe(true);
  });

  it('activar persiste y deja la sesión abierta', async () => {
    const { useLock } = await load();
    await useLock.getState().hydrate();
    await useLock.getState().enable();

    expect(useLock.getState().enabled).toBe(true);
    expect(useLock.getState().locked).toBe(false);
    expect(store.get('fa_bio_lock')).toBe('1');
  });

  it('desactivar persiste y no vuelve a bloquear', async () => {
    store.set('fa_bio_lock', '1');
    const { useLock } = await load();
    await useLock.getState().hydrate();
    await useLock.getState().disable();

    expect(useLock.getState().enabled).toBe(false);
    expect(useLock.getState().locked).toBe(false);
    expect(store.get('fa_bio_lock')).toBe('0');
  });

  it('lock() no hace nada si el bloqueo está apagado', async () => {
    const { useLock } = await load();
    await useLock.getState().hydrate();
    useLock.getState().lock();

    expect(useLock.getState().locked).toBe(false);
  });

  it('lock() bloquea cuando está activo y unlock() libera', async () => {
    store.set('fa_bio_lock', '1');
    const { useLock } = await load();
    await useLock.getState().hydrate();
    useLock.getState().unlock();
    expect(useLock.getState().locked).toBe(false);

    useLock.getState().lock();
    expect(useLock.getState().locked).toBe(true);
  });
});
