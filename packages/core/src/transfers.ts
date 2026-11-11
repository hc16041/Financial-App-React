import { z } from 'zod';
import { apiGet, apiPost, apiDel } from './api-client';
import { moneyString } from './schemas';

// Transferencias de liquidez (ruleting): mueven saldos entre cuentas y
// tarjetas sin ser ingreso ni gasto. Solo la comisión es un gasto.
export type Transfer = {
  id: number;
  fromAccountId: number | null;
  fromAccountName: string | null;
  fromCreditCardId: number | null;
  fromCreditCardName: string | null;
  toAccountId: number | null;
  toAccountName: string | null;
  toCreditCardId: number | null;
  toCreditCardName: string | null;
  amount: number | string;
  feeAmount: number | string;
  date: string;
  note: string;
};

// El formulario usa strings (selects e inputs) y exactamente un origen y un destino.
export const transferSchema = z
  .object({
    fromAccountId: z.string().optional(),
    fromCreditCardId: z.string().optional(),
    toAccountId: z.string().optional(),
    toCreditCardId: z.string().optional(),
    amount: moneyString,
    feeAmount: moneyString.optional(),
    date: z.string().min(1, 'err.required'),
    note: z.string().max(500).optional(),
  })
  .refine(
    (v) => (v.fromAccountId ? 1 : 0) + (v.fromCreditCardId ? 1 : 0) === 1,
    { path: ['fromAccountId'], message: 'err.source' },
  )
  .refine(
    (v) => (v.toAccountId ? 1 : 0) + (v.toCreditCardId ? 1 : 0) === 1,
    { path: ['toAccountId'], message: 'err.target' },
  )
  .refine(
    (v) => !(v.fromAccountId && v.fromAccountId === v.toAccountId),
    { path: ['toAccountId'], message: 'err.same' },
  )
  .refine(
    (v) => !(v.fromCreditCardId && v.fromCreditCardId === v.toCreditCardId),
    { path: ['toCreditCardId'], message: 'err.same' },
  );
export type TransferForm = z.input<typeof transferSchema>;

export const transferBody = (f: TransferForm) => {
  const v = transferSchema.parse(f);
  const id = (s?: string) => (s ? Number(s) : null);
  return {
    fromAccountId: id(v.fromAccountId),
    fromCreditCardId: id(v.fromCreditCardId),
    toAccountId: id(v.toAccountId),
    toCreditCardId: id(v.toCreditCardId),
    amount: Number(v.amount),
    feeAmount: v.feeAmount ? Number(v.feeAmount) : 0,
    date: v.date,
    note: v.note ?? '',
  };
};

export const listTransfers = () => apiGet<Transfer[]>('/api/transfers');
export const createTransfer = (f: TransferForm) => apiPost<Transfer>('/api/transfers', transferBody(f));
export const deleteTransfer = (id: number) => apiDel<void>(`/api/transfers/${id}`);
