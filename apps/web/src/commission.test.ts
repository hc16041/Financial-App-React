import { describe, it, expect } from 'vitest';
import { commissionFor } from '@financial/core';

// Reglas portadas de commission-calculation.service.ts (Angular). Cada caso fija
// una rama del cálculo para que el dinero no cambie en silencio al refactorizar.
describe('inversiones: comisión según método de retiro', () => {
  const base = { amount: 1000, transactionType: 2 as const };

  it('libre de comisión siempre es 0, aunque el método cobre', () => {
    expect(commissionFor({ ...base, requiresCreditCard: true, libreDeComision: true }).commission).toBe(0);
  });

  it('retiro de plataforma con tarjeta no genera comisión', () => {
    expect(commissionFor({ ...base, transactionType: 1, requiresCreditCard: true }).commission).toBe(0);
  });

  it('retiro con bitcoin deja la comisión a mano', () => {
    const result = commissionFor({ ...base, transactionType: 1, methodName: 'Bitcoin' });
    expect(result.commission).toBe(0);
    expect(result.auto).toBe(false);
  });

  it('ingreso por bitcoin cobra 1%', () => {
    expect(commissionFor({ ...base, methodName: 'Bitcoin' }).commission).toBe(10);
  });

  it('ingreso con tarjeta cobra 2.6% más 1.30 fijo', () => {
    expect(commissionFor({ ...base, requiresCreditCard: true }).commission).toBe(27.3);
  });

  it('redondea a dos decimales', () => {
    expect(commissionFor({ amount: 333.33, transactionType: 2, requiresCreditCard: true }).commission).toBe(9.97);
  });

  it('un método sin regla propia deja la comisión en 0', () => {
    expect(commissionFor({ ...base, methodName: 'Binance' }).commission).toBe(0);
  });

  it('un monto vacío o inválido no rompe el cálculo', () => {
    expect(commissionFor({ amount: '', transactionType: 2, requiresCreditCard: true }).commission).toBe(0);
  });
});
