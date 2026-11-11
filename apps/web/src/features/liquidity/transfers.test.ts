import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  transferSchema,
  transferBody,
  createTransfer,
  listTransfers,
  deleteTransfer,
  type TransferForm,
} from '@financial/core';

type Call = { url: string; init?: RequestInit };
let calls: Call[] = [];

const stub = (body: unknown = {}) => {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return { status: 200, ok: true, json: async () => body } as Response;
    }),
  );
};

const last = () => calls[calls.length - 1];
const body = (i = calls.length - 1) => JSON.parse(String(calls[i].init?.body)) as Record<string, unknown>;
const url = (i = calls.length - 1) => new URL(calls[i].url, 'http://localhost');

const form = (over: Partial<TransferForm> = {}): TransferForm => ({
  fromAccountId: '1',
  toAccountId: '2',
  amount: '100.00',
  date: '2026-11-10',
  ...over,
});

const ok = (f: TransferForm) => transferSchema.safeParse(f).success;

describe('transferencias de liquidez: contrato del API', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('acepta cuenta a cuenta', () => {
    expect(ok(form())).toBe(true);
  });

  it('acepta cuenta a tarjeta y tarjeta a cuenta', () => {
    expect(ok(form({ toAccountId: undefined, toCreditCardId: '7' }))).toBe(true);
    expect(
      ok(form({ fromAccountId: undefined, fromCreditCardId: '3', toAccountId: '2' })),
    ).toBe(true);
  });

  it('rechaza dos orígenes o ningún origen', () => {
    expect(ok(form({ fromCreditCardId: '9' }))).toBe(false);
    expect(ok(form({ fromAccountId: undefined }))).toBe(false);
  });

  it('rechaza dos destinos o ningún destino', () => {
    expect(ok(form({ toCreditCardId: '9' }))).toBe(false);
    expect(ok(form({ toAccountId: undefined }))).toBe(false);
  });

  it('rechaza origen igual a destino', () => {
    expect(ok(form({ toAccountId: '1' }))).toBe(false);
    expect(
      ok(form({ fromAccountId: undefined, fromCreditCardId: '3', toAccountId: undefined, toCreditCardId: '3' })),
    ).toBe(false);
  });

  it('rechaza montos inválidos', () => {
    expect(ok(form({ amount: '10,00' }))).toBe(false);
    expect(ok(form({ amount: '-1' }))).toBe(false);
  });

  it('convierte el formulario al cuerpo numérico del API', () => {
    expect(transferBody(form())).toEqual({
      fromAccountId: 1,
      fromCreditCardId: null,
      toAccountId: 2,
      toCreditCardId: null,
      amount: 100,
      feeAmount: 0,
      date: '2026-11-10',
      note: '',
    });
    expect(transferBody(form({ feeAmount: '5.50' })).feeAmount).toBe(5.5);
  });

  it('crea la transferencia en /api/transfers', async () => {
    stub({ id: 1 });
    await createTransfer(form());

    expect(last().url).toContain('/api/transfers');
    expect(last().init?.method).toBe('POST');
    expect(body()).toMatchObject({ fromAccountId: 1, toAccountId: 2, amount: 100 });
  });

  it('lista y elimina transferencias', async () => {
    stub([]);
    await listTransfers();
    expect(last().url).toContain('/api/transfers');
    expect(last().init?.method).toBeUndefined();

    stub({ deleted: true });
    await deleteTransfer(7);
    expect(url().pathname).toBe('/api/transfers/7');
    expect(last().init?.method).toBe('DELETE');
  });
});
