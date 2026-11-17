import { z } from 'zod';
import { apiGet, apiPost, apiPut, apiDel } from './api-client';
import { moneyString } from './schemas';

// Préstamos (SPEC-10): el backend calcula la proyección; el frontend solo
// muestra. La tasa es anual nominal; el saldo nunca se devenga aquí.
export type Loan = {
  id: number;
  name: string;
  lender: string | null;
  principal: number | string;
  balance: number | string;
  interestRate: number | string | null;
  installmentAmount: number | string | null;
  termMonths: number | null;
  startDate: string;
  dueDay: number | null;
  isClosed: boolean;
  paidAmount: number | string;
  progressPct: number;
};

// Opcionales del formulario: el input vacío llega como '' y se envía null.
const optMoney = z.string().regex(/^\d+(\.\d{1,2})?$|^$/, 'err.money').optional();
const optRate = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$|^$/, 'err.rate')
  .refine((v) => v === '' || Number(v) <= 100, 'err.rate')
  .optional();
const optInt = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d+$|^$/, 'err.required')
    .refine((v) => v === '' || (Number(v) >= min && Number(v) <= max), 'err.range')
    .optional();

export const loanSchema = z.object({
  name: z.string().trim().min(1, 'err.required').max(100),
  lender: z.string().trim().max(100).optional(),
  principal: moneyString.refine((v) => Number(v) > 0, 'err.positive'),
  balance: optMoney,
  interestRate: optRate,
  installmentAmount: optMoney,
  termMonths: optInt(1, 600),
  startDate: z.string().min(1, 'err.required'),
  dueDay: optInt(1, 28),
});
export type LoanForm = z.input<typeof loanSchema>;

export const loanPaymentSchema = z.object({
  amount: moneyString.refine((v) => Number(v) > 0, 'err.positive'),
  accountId: z.number().int().min(1, 'err.required'),
  date: z.string().min(1, 'err.required'),
});
export type LoanPaymentForm = z.input<typeof loanPaymentSchema>;

export type ProjectionRow = {
  number: number;
  date: string;
  payment: number | string;
  interest: number | string;
  principal: number | string;
  balance: number | string;
  isExtra: boolean;
};

export type ProjectionScenario = {
  installments: number;
  totalInterest: number | string;
  totalPaid: number | string;
  payoffDate: string;
  // Solo el escenario simulado trae calendario.
  schedule?: ProjectionRow[];
};

export type LoanProjection = {
  feasible: boolean;
  reason: string | null;
  installment: number | string;
  monthlyRate: number | string;
  base: ProjectionScenario;
  scenario: ProjectionScenario;
  savedInterest: number | string;
  savedMonths: number;
  assumption: string;
};

export type ProjectionOptions = {
  extraMonthly?: string | number;
  extraOnce?: string | number;
  extraOnceMonth?: number;
};

// Un solo cuerpo para crear y editar: los vacíos viajan como null y el saldo
// omitido arranca en el monto original (el API también lo hace por su lado).
const payload = (f: LoanForm) => {
  const v = loanSchema.parse(f);
  const num = (s: string | undefined) => (s === undefined || s === '' ? null : Number(s));
  return {
    name: v.name,
    lender: v.lender ? v.lender : null,
    principal: Number(v.principal),
    balance: v.balance ? Number(v.balance) : Number(v.principal),
    interestRate: num(v.interestRate),
    installmentAmount: num(v.installmentAmount),
    termMonths: num(v.termMonths),
    startDate: v.startDate,
    dueDay: num(v.dueDay),
  };
};

// El capital es inmutable y el saldo solo baja con abonos reales: el PUT no
// acepta ninguno de los dos, así que mandarlos sería un no-op silencioso.
const updatePayload = (f: LoanForm) => {
  const { principal: _p, balance: _b, ...rest } = payload(f);
  return rest;
};

export const listLoans = () => apiGet<Loan[]>('/api/loans');
export const createLoan = (f: LoanForm) => apiPost<Loan>('/api/loans', payload(f));
export const updateLoan = (id: number, f: LoanForm) => apiPut<Loan>(`/api/loans/${id}`, updatePayload(f));

export const payLoan = (id: number, p: LoanPaymentForm) => {
  const v = loanPaymentSchema.parse(p);
  return apiPost<Loan>(`/api/loans/${id}/payment`, {
    amount: Number(v.amount),
    accountId: v.accountId,
    date: v.date,
  });
};

export const deleteLoan = (id: number) => apiDel<void>(`/api/loans/${id}`);

export const getProjection = (id: number, o: ProjectionOptions = {}) => {
  const q = new URLSearchParams();
  const pos = (v: string | number | undefined) => v !== undefined && v !== '' && Number(v) > 0;
  if (pos(o.extraMonthly)) q.set('extraMonthly', String(Number(o.extraMonthly)));
  if (pos(o.extraOnce)) {
    q.set('extraOnce', String(Number(o.extraOnce)));
    if (o.extraOnceMonth && o.extraOnceMonth >= 1) q.set('extraOnceMonth', String(o.extraOnceMonth));
  }
  const s = q.toString();
  return apiGet<LoanProjection>(`/api/loans/${id}/projection${s ? `?${s}` : ''}`);
};
