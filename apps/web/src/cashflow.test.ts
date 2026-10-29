import { describe, it, expect } from 'vitest';
import { monthlyEquivalent, monthCashFlow } from '@financial/core';

// El panel mensual suma cosas con distinta periodicidad, así que la normalización
// es la pieza que hay que fijar: si cambia, cambia el número que el usuario lee.
describe('flujo de caja: equivalente mensual', () => {
  it('mensual se deja igual', () => {
    expect(monthlyEquivalent(100, 2)).toBe(100);
  });

  it('semanal se anualiza y se reparte en doce', () => {
    expect(monthlyEquivalent(100, 1)).toBe(433.33);
  });

  it('anual se divide en doce', () => {
    expect(monthlyEquivalent(1200, 3)).toBe(100);
  });

  it('un monto inválido no rompe la suma', () => {
    expect(monthlyEquivalent('', 2)).toBe(0);
  });
});

describe('flujo de caja: resumen del mes', () => {
  const recurrings = [
    { amount: 1430.65, frequency: 2, active: true, type: 1 },
    { amount: 200, frequency: 2, active: true, type: 1 },
    { amount: 6, frequency: 2, active: true, type: 2 },
    { amount: 300, frequency: 2, active: false, type: 1 },
  ];

  it('suma solo los ingresos activos y resta presupuestos y cuotas', () => {
    const flow = monthCashFlow({
      recurrings,
      budgets: [{ limit: 180 }, { limit: 175 }, { limit: 50 }],
      loans: [{ installmentAmount: 240, isClosed: false }],
    });

    expect(flow.income).toBe(1630.65);
    expect(flow.fixed).toBe(405);
    expect(flow.installments).toBe(240);
    expect(flow.free).toBe(985.65);
  });

  it('un mes en rojo devuelve libre negativo', () => {
    const flow = monthCashFlow({
      recurrings: [{ amount: 100, frequency: 2, active: true, type: 1 }],
      budgets: [{ limit: 300 }],
      loans: [],
    });

    expect(flow.free).toBe(-200);
  });

  it('sin datos el resumen es cero, no NaN', () => {
    expect(monthCashFlow({})).toEqual({ income: 0, fixed: 0, installments: 0, free: 0 });
  });
});
