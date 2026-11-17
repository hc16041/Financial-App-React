import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError, apiGet, configureApi, getToken, setSessionTokens } from '@financial/core';

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
};

describe('sessionMaxMs: tope de 8 h', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('no intenta refrescar después de 8 h y limpia la sesión', async () => {
    const storage = createStorage();
    configureApi({
      storage,
      sessionMaxMs: 8 * 60 * 60 * 1000,
      onUnauthorized: () => {},
    });
    setSessionTokens('access-token', 'refresh-token');
    storage.setItem('fa_login_at', String(Date.now() - 8 * 60 * 60 * 1000 - 1000));

    let fetches = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        fetches += 1;
        return { status: 401, ok: false, json: async () => ({}) } as Response;
      }),
    );

    await expect(apiGet('/api/accounts')).rejects.toBeInstanceOf(ApiError);
    expect(fetches).toBe(1);
    expect(getToken()).toBeNull();
    expect(storage.getItem('fa_login_at')).toBeNull();
  });
});
