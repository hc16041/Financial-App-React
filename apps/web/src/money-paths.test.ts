import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  budgetSchema,
  createBudget,
  updateBudget,
  pct,
  stateOf,
  type Budget,
  txSchema,
  createTx,
  listTx,
  goalSchema,
  createGoal,
  updateGoal,
  depositGoal,
  createRecurring,
  toggleRecurring,
  payRecurring,
  investmentSchema,
  updateSavingTx, deleteSavingTx, updateCard, deleteCard, updateRecurring, deleteRecurring,
  type PersonalTxForm,
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

describe('presupuestos: consumido siempre derivado', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('el schema no acepta spent (lo calcula el backend)', () => {
    expect(Object.keys(budgetSchema.shape)).toEqual(['categoryId', 'month', 'year', 'limit']);
  });

  it('crea sin spent y con limite numerico', async () => {
    stub({ id: 1 });
    await createBudget({ categoryId: 3, month: 10, year: 2026, limit: '500.00' });
    expect(last().url).toContain('/api/budgets');
    expect(last().init?.method).toBe('POST');
    expect(body()).toEqual({ categoryId: 3, month: 10, year: 2026, limit: 500 });
    expect(body()).not.toHaveProperty('spent');
  });

  it('actualiza solo el limite', async () => {
    stub({ id: 7 });
    await updateBudget(7, '250.50');
    expect(last().url).toContain('/api/budgets/7');
    expect(last().init?.method).toBe('PUT');
    expect(body()).toEqual({ id: 7, limit: 250.5 });
  });

  it('rechaza limites invalidos antes de llamar al API', async () => {
    stub();
    expect(() => createBudget({ categoryId: 1, month: 1, year: 2026, limit: 'abc' })).toThrow();
    expect(() => createBudget({ categoryId: 1, month: 13, year: 2026, limit: '10.00' })).toThrow();
    expect(calls).toHaveLength(0);
  });

  it('marca ok/warn/over en los bordes de 80 y 100', () => {
    const b = (limit: number | string, spent: number | string): Budget => ({
      id: 1,
      categoryId: 1,
      month: 10,
      year: 2026,
      limit,
      spent,
    });
    expect(pct(b(500, 100))).toBe(20);
    expect(stateOf(b(500, 100))).toBe('ok');
    expect(stateOf(b(500, 399.99))).toBe('ok');
    expect(stateOf(b(500, 400))).toBe('warn');
    expect(stateOf(b(500, 499))).toBe('warn');
    expect(stateOf(b(500, 500))).toBe('over');
    expect(stateOf(b(500, 900))).toBe('over');
  });

  it('no divide por cero si el limite es 0', () => {
    const b = { id: 1, categoryId: 1, month: 1, year: 2026, limit: 0, spent: 50 } as Budget;
    expect(Number.isFinite(pct(b))).toBe(true);
    expect(stateOf(b)).toBe('over');
  });
});

describe('movimientos de cuenta', () => {
  beforeEach(() => vi.unstubAllGlobals());

  const form = (over: Partial<PersonalTxForm> = {}): PersonalTxForm => ({
    accountId: 1,
    categoryId: 2,
    type: 2,
    amount: '25.50',
    date: '2026-10-02',
    note: 'cafe',
    ...over,
  });

  it('envia monto numerico y categoria nula por defecto', async () => {
    stub({ id: 1 });
    await createTx(form({ categoryId: null, note: undefined }));
    expect(last().url).toContain('/api/accounts/transactions');
    expect(body()).toEqual({
      accountId: 1,
      creditCardId: null,
      categoryId: null,
      type: 2,
      amount: 25.5,
      date: '2026-10-02',
      note: '',
    });
  });

  it('con tarjeta manda la tarjeta y no la cuenta', async () => {
    stub({ id: 2 });
    await createTx(form({ accountId: null, creditCardId: 3 }));
    expect(body()).toEqual({
      accountId: null,
      creditCardId: 3,
      categoryId: 2,
      type: 2,
      amount: 25.5,
      date: '2026-10-02',
      note: 'cafe',
    });
  });

  it('rechaza un movimiento sin origen o con los dos', () => {
    expect(() => createTx(form({ accountId: null, creditCardId: null }))).toThrow();
    expect(() => createTx(form({ accountId: 1, creditCardId: 3 }))).toThrow();
  });

  it('exige cuenta, monto y fecha', async () => {
    stub();
    expect(() => createTx(form({ accountId: 0 }))).toThrow();
    expect(() => createTx(form({ amount: '' }))).toThrow();
    expect(() => createTx(form({ date: '' }))).toThrow();
    expect(calls).toHaveLength(0);
  });

  it('arma el querystring de filtros y omite vacios', async () => {
    stub([]);
    await listTx();
    expect(last().url).toContain('/api/accounts/transactions');
    expect(last().url).not.toContain('?');

    await listTx({ accountId: 1, categoryId: 2, from: '2026-10-01', to: '2026-10-31' });
    expect(last().url).toBe('http://localhost:5063/api/accounts/transactions?accountId=1&categoryId=2&from=2026-10-01&to=2026-10-31');

    await listTx({ accountId: undefined, from: '2026-10-01', to: '' });
    expect(last().url).toBe('http://localhost:5063/api/accounts/transactions?from=2026-10-01');
  });
});

describe('metas y recurrentes: dinero sale de una cuenta real', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('aporta a la meta con cuenta y monto numerico', async () => {
    stub({ id: 3 });
    await depositGoal(3, '100.25', 1);
    expect(last().url).toContain('/api/goals/3/deposit');
    expect(last().init?.method).toBe('POST');
    expect(body()).toEqual({ amount: 100.25, accountId: 1 });
  });

  it('paga el recurrente y avanza NextDue en el backend', async () => {
    stub({ id: 2 });
    await payRecurring(2, 5);
    expect(last().url).toContain('/api/goals/recurring/2/pay');
    expect(last().init?.method).toBe('POST');
    expect(body()).toEqual({ accountId: 5 });
  });

  it('alterna el recurrente con body vacio (apiPut exige body)', async () => {
    stub({ id: 2 });
    await toggleRecurring(2);
    expect(last().url).toContain('/api/goals/recurring/2/toggle');
    expect(last().init?.method).toBe('PUT');
    expect(body()).toEqual({});
  });

  it('crea recurrente mapeando la frecuencia a 1/2/3', async () => {
    stub({ id: 1 });
    await createRecurring({ name: 'Renta', amount: '300.00', frequency: 'Mensual' });
    expect(body()).toEqual({ name: 'Renta', amount: 300, frequency: 2, type: 2 });
    await createRecurring({ name: 'Streaming', amount: '5.00', frequency: 'Semanal' });
    expect(body()).toEqual({ name: 'Streaming', amount: 5, frequency: 1, type: 2 });
    await createRecurring({ name: 'Seguro', amount: '80.00', frequency: 'Anual' });
    expect(body()).toEqual({ name: 'Seguro', amount: 80, frequency: 3, type: 2 });
  });

  it('un recurrente de ingreso viaja con type 1', async () => {
    stub({ id: 1 });
    await createRecurring({ name: 'Sueldo', amount: '1430.65', frequency: 'Mensual', type: 1 });
    expect(body()).toEqual({ name: 'Sueldo', amount: 1430.65, frequency: 2, type: 1 });
  });

  it('crea y edita metas con fecha opcional', async () => {
    stub({ id: 1 });
    await createGoal({ name: 'Viaje', target: '1200.00', deadline: '' });
    expect(last().init?.method).toBe('POST');
    expect(body()).toEqual({ name: 'Viaje', target: 1200, deadline: null });

    await updateGoal(1, { name: 'Viaje', target: '900.00', deadline: '2026-11-30' });
    expect(last().url).toContain('/api/goals/1');
    expect(last().init?.method).toBe('PUT');
    expect(body()).toEqual({ name: 'Viaje', target: 900, deadline: '2026-11-30' });
  });
});

describe('schemas de formulario emiten codigos i18n (err.*)', () => {
  it('metas y movimientos usan codigos, no texto', () => {
    const g = goalSchema.safeParse({ name: 'ab', target: 'x' });
    expect(g.success).toBe(false);
    if (!g.success) expect(g.error.issues.map((i) => i.message)).toEqual(['err.min3', 'err.money']);

    const t = txSchema.safeParse({ accountId: 0, type: 2, amount: '1.00', date: '' });
    expect(t.success).toBe(false);
    if (!t.success) {
      expect(t.error.issues.map((i) => i.message)).toEqual(
        expect.arrayContaining(['err.required']),
      );
      expect(t.error.issues.every((i) => typeof i.message === 'string')).toBe(true);
    }
  });
});

// Un <select> sin opción elegida emite "", no undefined. El schema de inversión
// pide number | null: por eso el formulario coerciona antes de validar. Sin esa
// coerción el submit se quedaba enfocando el primer select vacío.
describe('inversiones: select vacío contra el schema', () => {
  const base = {
    platformId: 1,
    amount: '100.00',
    commission: '0',
    transactionType: 2 as const,
    transactionDate: '2026-10-28',
  };

  it('rechaza el "" crudo del select', () => {
    expect(investmentSchema.safeParse({ ...base, withdrawalMethodId: '', creditCardId: '' }).success).toBe(false);
  });

  it('acepta null, que es lo que el formulario envía al no elegir', () => {
    const result = investmentSchema.safeParse({ ...base, withdrawalMethodId: null, creditCardId: null });
    expect(result.success).toBe(true);
  });
});

// Corregir y borrar lo ya registrado: estas rutas tocan dinero ya asentado, así que
// el contrato (verbo, ruta y forma del cuerpo) queda fijado acá.
describe('correcciones: ahorros, tarjetas y recurrentes', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('edita un movimiento de ahorro con el monto ya numérico', async () => {
    stub({ id: 3 });
    await updateSavingTx(3, { date: '2026-11-01', amount: '250.50', description: 'Corregido', transactionType: 1 });
    expect(last().url).toContain('/api/savings/transactions/3');
    expect(last().init?.method).toBe('PUT');
    expect(body()).toEqual({ date: '2026-11-01', amount: 250.5, description: 'Corregido', transactionType: 1 });
  });

  it('borra un movimiento de ahorro', async () => {
    stub();
    await deleteSavingTx(3);
    expect(last().url).toContain('/api/savings/transactions/3');
    expect(last().init?.method).toBe('DELETE');
  });

  it('edita una tarjeta enviando isActive', async () => {
    stub({ id: 6 });
    await updateCard(6, { bankName: 'BAC', creditLimit: '2000', cutOffDay: 15, paymentDueDay: 5, annualInterestRate: '0', isActive: false });
    expect(last().url).toContain('/api/CreditCards/6');
    expect(last().init?.method).toBe('PUT');
    expect(body()).toEqual({ bankName: 'BAC', creditLimit: 2000, cutOffDay: 15, paymentDueDay: 5, annualInterestRate: 0, isActive: false });
  });

  it('borra una tarjeta', async () => {
    stub();
    await deleteCard(6);
    expect(last().url).toContain('/api/CreditCards/6');
    expect(last().init?.method).toBe('DELETE');
  });

  it('edita un recurrente conservando su tipo', async () => {
    stub({ id: 2 });
    await updateRecurring(2, { name: 'Sueldo', amount: '1430.65', frequency: 'Mensual', type: 1 });
    expect(last().url).toContain('/api/goals/recurring/2');
    expect(last().init?.method).toBe('PUT');
    expect(body()).toEqual({ name: 'Sueldo', amount: 1430.65, frequency: 2, type: 1 });
  });

  it('borra un recurrente', async () => {
    stub();
    await deleteRecurring(2);
    expect(last().url).toContain('/api/goals/recurring/2');
    expect(last().init?.method).toBe('DELETE');
  });
});
