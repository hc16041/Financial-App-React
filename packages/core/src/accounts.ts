import { z } from 'zod';
import { apiGet, apiPost, apiPut, apiDel } from './api-client';
import { moneyString } from './schemas';

// Libro mayor personal: el backend calcula y persiste el saldo; el frontend solo
// registra movimientos. Mismo contrato que /api/accounts.
export const accountSchema = z.object({
  name: z.string().trim().min(1, 'err.required').max(100),
  type: z.union([z.literal(1), z.literal(2)]), // 1 Efectivo, 2 Banco
  isActive: z.boolean().default(true),
});
export type AccountForm = z.input<typeof accountSchema>;
export type Account = {
  id: number;
  name: string;
  type: number;
  typeName?: string;
  balance: number | string;
  isActive: boolean;
};

export const txSchema = z.object({
  accountId: z.number().min(1, 'err.required'),
  categoryId: z.number().int().positive().nullable().optional(),
  type: z.union([z.literal(1), z.literal(2)]), // 1 ingreso, 2 gasto
  amount: moneyString,
  date: z.string().min(1, 'err.required'),
  note: z.string().max(500).default(''),
});
export type PersonalTxForm = z.input<typeof txSchema>;
export type PersonalTx = {
  id: number;
  accountId: number;
  accountName?: string | null;
  categoryId?: number | null;
  type: number;
  amount: number | string;
  date: string;
  note: string;
};

export const listAccounts = () => apiGet<Account[]>('/api/accounts');
export const createAccount = (a: AccountForm) =>
  apiPost<Account>('/api/accounts', { name: a.name, type: a.type, isActive: a.isActive ?? true });
export const updateAccount = (id: number, a: AccountForm) =>
  apiPut<Account>(`/api/accounts/${id}`, { ...a, id });
export const deleteAccount = (id: number) => apiDel<boolean>(`/api/accounts/${id}`);

export type TxFilters = {
  accountId?: number;
  categoryId?: number;
  /** YYYY-MM-DD */
  from?: string;
  /** YYYY-MM-DD */
  to?: string;
};

export const listTx = (f: TxFilters = {}) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  }
  const qs = q.toString();
  return apiGet<PersonalTx[]>(`/api/accounts/transactions${qs ? `?${qs}` : ''}`);
};
export const createTx = (t: PersonalTxForm) => {
  const v = txSchema.parse(t);
  return apiPost<PersonalTx>('/api/accounts/transactions', {
    accountId: v.accountId,
    categoryId: v.categoryId ?? null,
    type: v.type,
    amount: Number(v.amount),
    date: v.date,
    note: v.note,
  });
};
