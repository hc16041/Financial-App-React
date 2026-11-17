// Flujo de caja de un mes: lo que esperás cobrar, lo que ya comprometiste y lo que
// queda libre. Se calcula en el cliente con datos que el API ya entrega.

/** 1 = semanal, 2 = mensual, 3 = anual (mismo enum que el backend). */
export type Frequency = 1 | 2 | 3;

export type CashFlow = {
  income: number;
  fixed: number;
  installments: number;
  free: number;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Lleva cualquier periodicidad a su equivalente mensual, para poder sumarlas. */
export const monthlyEquivalent = (amount: number | string, frequency: Frequency | number): number => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return 0;
  if (frequency === 1) return round2((value * 52) / 12);
  if (frequency === 3) return round2(value / 12);
  return round2(value);
};

type RecurringLike = { amount: number | string; frequency: number; active?: boolean; type?: number };
type BudgetLike = { limit: number | string };
type LoanLike = { installmentAmount?: number | string | null; isClosed?: boolean };

export const monthCashFlow = (input: {
  recurrings?: RecurringLike[];
  budgets?: BudgetLike[];
  loans?: LoanLike[];
}): CashFlow => {
  const income = (input.recurrings ?? [])
    .filter((r) => r.active !== false && Number(r.type) === 1)
    .reduce((sum, r) => sum + monthlyEquivalent(r.amount, r.frequency), 0);

  const fixed = (input.budgets ?? []).reduce((sum, b) => sum + Number(b.limit ?? 0), 0);

  const installments = (input.loans ?? [])
    .filter((l) => !l.isClosed)
    .reduce((sum, l) => sum + Number(l.installmentAmount ?? 0), 0);

  return {
    income: round2(income),
    fixed: round2(fixed),
    installments: round2(installments),
    free: round2(income - fixed - installments),
  };
};
