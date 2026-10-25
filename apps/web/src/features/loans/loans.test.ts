import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loanSchema,
  loanPaymentSchema,
  createLoan,
  updateLoan,
  payLoan,
  deleteLoan,
  getProjection,
  type LoanForm,
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

const form = (over: Partial<LoanForm> = {}): LoanForm => ({
  name: 'Crédito cooperativa',
  principal: '1000.00',
  startDate: '2026-10-24',
  ...over,
});

describe('préstamos: contrato del API', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('el formulario exige nombre y monto válido, y acepta opcionales vacíos', () => {
    expect(loanSchema.safeParse(form({ name: '' })).success).toBe(false);
    expect(loanSchema.safeParse(form({ principal: 'abc' })).success).toBe(false);
    expect(loanSchema.safeParse(form()).success).toBe(true);
    expect(loanSchema.safeParse(form({ lender: '', interestRate: '', installmentAmount: '', termMonths: '', dueDay: '' })).success).toBe(true);
  });

  it('rechaza una tasa fuera de 0..100', () => {
    const r = loanSchema.safeParse(form({ interestRate: '101' }));
    expect(r.success).toBe(false);
    expect(r.success === false && r.error.issues[0].message).toBe('err.rate');
  });

  it('crea con números y null en los opcionales vacíos; el saldo cae al monto original', async () => {
    stub({ id: 1 });
    await createLoan(form({ lender: '', interestRate: '', installmentAmount: '', termMonths: '', dueDay: '' }));
    expect(last().url).toContain('/api/loans');
    expect(last().init?.method).toBe('POST');
    expect(body()).toEqual({
      name: 'Crédito cooperativa',
      lender: null,
      principal: 1000,
      balance: 1000,
      interestRate: null,
      installmentAmount: null,
      termMonths: null,
      startDate: '2026-10-24',
      dueDay: null,
    });
  });

  it('respeta el saldo actual cuando viene informado', async () => {
    stub({ id: 1 });
    await createLoan(form({ balance: '750.50', interestRate: '12', installmentAmount: '100.00', termMonths: '12', dueDay: '5' }));
    expect(body()).toMatchObject({ balance: 750.5, interestRate: 12, installmentAmount: 100, termMonths: 12, dueDay: 5 });
  });

  it('actualiza por PUT /api/loans/{id}', async () => {
    stub({ id: 7 });
    await updateLoan(7, form({ name: 'Renombrado' }));
    expect(last().url).toContain('/api/loans/7');
    expect(last().init?.method).toBe('PUT');
    expect(body()).toMatchObject({ name: 'Renombrado' });
  });

  // El capital es inmutable y el saldo solo baja con abonos: mandarlos en el PUT
  // sería un no-op silencioso, porque el backend los ignora.
  it('no manda principal ni balance al actualizar', async () => {
    stub({ id: 7 });
    await updateLoan(7, form({ name: 'Renombrado', balance: '500.00' }));
    const sent = body() as Record<string, unknown>;
    expect(sent).not.toHaveProperty('principal');
    expect(sent).not.toHaveProperty('balance');
  });

  it('abona por POST /api/loans/{id}/payment con número, no string', async () => {
    stub({ id: 7 });
    await payLoan(7, { amount: '250.00', accountId: 3, date: '2026-10-24' });
    expect(last().url).toContain('/api/loans/7/payment');
    expect(last().init?.method).toBe('POST');
    expect(body()).toEqual({ amount: 250, accountId: 3, date: '2026-10-24' });
  });

  it('el abono exige monto, cuenta y fecha', () => {
    expect(loanPaymentSchema.safeParse({ amount: '250.00', accountId: 1, date: '2026-10-24' }).success).toBe(true);
    expect(loanPaymentSchema.safeParse({ amount: 'x', accountId: 1, date: '2026-10-24' }).success).toBe(false);
    expect(loanPaymentSchema.safeParse({ amount: '1.00', accountId: 0, date: '2026-10-24' }).success).toBe(false);
    expect(loanPaymentSchema.safeParse({ amount: '1.00', accountId: 1, date: '' }).success).toBe(false);
  });

  it('elimina por DELETE /api/loans/{id}', async () => {
    stub();
    await deleteLoan(9);
    expect(last().url).toContain('/api/loans/9');
    expect(last().init?.method).toBe('DELETE');
  });

  it('proyecta sin extras sin query string', async () => {
    stub({ feasible: true });
    await getProjection(7);
    expect(url().pathname).toBe('/api/loans/7/projection');
    expect(url().search).toBe('');
  });

  it('proyecta con los tres extras en la query string', async () => {
    stub({ feasible: true });
    await getProjection(7, { extraMonthly: '100.00', extraOnce: '500.00', extraOnceMonth: 3 });
    const u = url();
    expect(u.pathname).toBe('/api/loans/7/projection');
    expect(u.searchParams.get('extraMonthly')).toBe('100');
    expect(u.searchParams.get('extraOnce')).toBe('500');
    expect(u.searchParams.get('extraOnceMonth')).toBe('3');
  });

  it('no manda el mes del abono único si no hay abono único', async () => {
    stub({ feasible: true });
    await getProjection(7, { extraMonthly: '50', extraOnceMonth: 3 });
    const u = url();
    expect(u.searchParams.get('extraMonthly')).toBe('50');
    expect(u.searchParams.has('extraOnce')).toBe(false);
    expect(u.searchParams.has('extraOnceMonth')).toBe(false);
  });
});
