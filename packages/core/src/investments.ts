import { apiGet, apiPost, apiPut, apiDel } from './api-client';
import { z } from 'zod';
import { moneyString } from './schemas';

// Lectura :5063. CRUD completo existe en el API; alta/edición UI en fase 2
// (requiere selectores de plataforma/método/tarjeta).
export type Investment = {
  id: number; platformId: number; platformName?: string;
  amount: number; commission: number; total: number;
  transactionType?: number; transactionDate?: string;
  [k: string]: unknown;
};

export const listInvestments = () => apiGet<Investment[]>(`/api/Investments`);
export const getInvestmentsByDate = (from: string, to: string) =>
  apiGet<Investment[]>(`/api/Investments/by-date?startDate=${from}&endDate=${to}`);

// Purchase(1) = Retiro de plataforma, Payment(2) = Ingreso (semántica de tarjeta).
export const investmentSchema = z.object({
  platformId: z.number().min(1, 'err.required'),
  amount: moneyString,
  commission: moneyString.default('0'),
  transactionType: z.union([z.literal(1), z.literal(2)]),
  transactionDate: z.string().min(1, 'err.required'),
  withdrawalMethodId: z.number().nullable().optional(),
  creditCardId: z.number().nullable().optional(),
});
export type InvestmentForm = z.infer<typeof investmentSchema>;
export const createInvestment = (b: InvestmentForm) => apiPost<number>(`/api/Investments`, b);
export const updateInvestment = (id: number, b: InvestmentForm) => apiPut<boolean>(`/api/Investments/${id}`, { ...b, id });
export const deleteInvestment = (id: number) => apiDel<void>(`/api/Investments/${id}`);

export type Ref = { id: number; name: string };
export const listPlatforms = () => apiGet<Ref[]>(`/api/Platforms`);
export const listWithdrawalMethods = () => apiGet<Ref[]>(`/api/WithdrawalMethods`);
