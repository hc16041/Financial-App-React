import { beforeEach, describe, expect, it, vi } from 'vitest';

// La cola decide si un gasto se pierde o se envía. Se prueban los cuatro
// desenlaces: se encola, se envía, se reintenta y se marca como fallido.

const store = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => { store.set(k, v); },
    removeItem: async (k: string) => { store.delete(k); },
  },
}));

const apiPost = vi.fn();
const apiPut = vi.fn();
const apiDel = vi.fn();

vi.mock('@financial/core', async () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, _code?: string, message = 'Error API') {
      super(message);
      this.status = status;
    }
  }
  return { ApiError, apiPost, apiPut, apiDel };
});

const load = async () => await import('@/lib/queue');

const entry = (key: string) => ({
  key,
  method: 'POST' as const,
  path: '/api/accounts/transactions',
  body: { amount: 5 },
  label: 'Gasto',
});

describe('cola offline', () => {
  beforeEach(() => {
    store.clear();
    apiPost.mockReset();
    apiPut.mockReset();
    apiDel.mockReset();
  });

  it('encola una escritura nueva', async () => {
    const q = await load();
    await q.enqueue(entry('k1'));

    const pending = await q.listPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].key).toBe('k1');
    expect(pending[0].attempts).toBe(0);
  });

  it('no encola dos veces la misma clave', async () => {
    const q = await load();
    await q.enqueue(entry('k1'));
    await q.enqueue(entry('k1'));

    expect(await q.listPending()).toHaveLength(1);
  });

  it('envía, borra de la cola y reporta lo enviado', async () => {
    const q = await load();
    apiPost.mockResolvedValue({});
    await q.enqueue(entry('k1'));

    const result = await q.flush();

    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(apiPost.mock.calls[0][2]).toEqual({ 'Idempotency-Key': 'k1' });
    expect(result).toEqual({ sent: 1, remaining: 0, failed: 0 });
    expect(await q.listPending()).toHaveLength(0);
  });

  it('un error de red deja el pendiente y corta el resto', async () => {
    const q = await load();
    apiPost.mockRejectedValue(new TypeError('Network request failed'));
    await q.enqueue(entry('k1'));
    await q.enqueue(entry('k2'));

    const result = await q.flush();

    expect(apiPost).toHaveBeenCalledTimes(1); // no sigue con k2
    expect(result.sent).toBe(0);
    expect(result.remaining).toBe(2);

    const pending = await q.listPending();
    expect(pending.find((p) => p.key === 'k1')?.attempts).toBe(1);
    expect(pending.find((p) => p.key === 'k1')?.failed).toBeUndefined();
    expect(pending.find((p) => p.key === 'k2')?.attempts).toBe(0);
  });

  it('un 4xx se marca como fallido y no se reintenta', async () => {
    const q = await load();
    const { ApiError } = await import('@financial/core');
    apiPost.mockRejectedValue(new ApiError(409, undefined, 'Saldo insuficiente'));
    await q.enqueue(entry('k1'));

    const result = await q.flush();

    expect(result.sent).toBe(0);
    expect(result.remaining).toBe(0);
    expect(result.failed).toBe(1);

    const pending = await q.listPending();
    expect(pending[0].failed).toBe('Saldo insuficiente');

    // Un segundo flush no vuelve a intentarlo.
    apiPost.mockClear();
    await q.flush();
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('descarta un fallido a pedido del usuario', async () => {
    const q = await load();
    const { ApiError } = await import('@financial/core');
    apiPost.mockRejectedValue(new ApiError(400, undefined, 'Monto inválido'));
    await q.enqueue(entry('k1'));
    await q.flush();

    await q.discard('k1');
    expect(await q.listPending()).toHaveLength(0);
  });

  it('con la cola vacía no llama a la API', async () => {
    const q = await load();
    const result = await q.flush();

    expect(result).toEqual({ sent: 0, remaining: 0, failed: 0 });
    expect(apiPost).not.toHaveBeenCalled();
  });
});
