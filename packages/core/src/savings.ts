import { z } from 'zod';
import { apiDel, apiGet, apiPost, apiPut } from './api-client';
import { moneyString } from './schemas';

export const savingTxSchema = z.object({
  date: z.string().min(1, 'err.required'),
  amount: moneyString,
  description: z.string().trim().min(1, 'err.required').max(500),
  transactionType: z.union([z.literal(1), z.literal(2)]),
});
export type SavingTxForm = z.infer<typeof savingTxSchema>;

export type SavingTx = {
  id: number;
  date: string;
  amount: number | string;
  description: string;
  transactionType: number;
};

export const getBalance = () => apiGet<{ balance: number } | number>(`/api/savings/balance`);
export const getHistory = () => apiGet<SavingTx[]>(`/api/savings/history`);
export const postTx = (b: SavingTxForm) =>
  apiPost<{ id: number }>(`/api/savings/transactions`, {
    ...b,
    transactionType: Number(b.transactionType),
  });

// Corregir un movimiento ya registrado. El backend rechaza si dejara el saldo negativo.
export const updateSavingTx = (id: number, b: SavingTxForm) =>
  apiPut<{ id: number }>(`/api/savings/transactions/${id}`, {
    ...b,
    amount: Number(b.amount),
    transactionType: Number(b.transactionType),
  });

export const deleteSavingTx = (id: number) => apiDel<{ deleted: boolean }>(`/api/savings/transactions/${id}`);

// Normaliza {balance} | number | string → number
export const normBalance = (b: unknown): number | null => {
  if (typeof b === 'number') return b;
  if (b && typeof b === 'object' && 'balance' in (b as any)) return Number((b as any).balance);
  return null;
};
