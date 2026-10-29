import { apiGet, apiPost } from './api-client';
import { z } from 'zod';

// Lectura real :5063 (CRUD de tarjetas ya existe en Angular legacy; aquí paridad de lectura).
export type CardSummary = { totalCreditLimit: number; totalCurrentBalance: number; totalAvailableCredit: number };
export type Card = {
  id: number; name?: string; bankName?: string;
  creditLimit?: number; currentBalance?: number; availableCredit?: number;
  cutOffDay?: number; paymentDueDay?: number; annualInterestRate?: number;
  isActive?: boolean;
  [k: string]: unknown;
};
export type CardConsumption = {
  creditCardId: number;
  bankName: string;
  creditLimit?: number;
  currentBalance?: number;
  availableCredit?: number;
  totalExpenses?: number;
  totalPayments?: number;
  transactionCount?: number;
  utilizationPercentage?: number;
  [k: string]: unknown;
};

export const listCards = () => apiGet<Card[]>(`/api/CreditCards`);
export const cardSchema = z.object({
  bankName: z.string().trim().min(1, 'err.required').max(200),
  creditLimit: z.string().regex(/^\d+(\.\d{1,2})?$/, 'err.money'),
  cutOffDay: z.number().min(1).max(28),
  paymentDueDay: z.number().min(1).max(28),
  annualInterestRate: z.string().regex(/^\d+(\.\d{1,2})?$/, 'err.rate'),
});
export type CardForm = z.infer<typeof cardSchema>;
export const createCard = (b: CardForm) => apiPost<number>(`/api/CreditCards`, {
  bankName: b.bankName,
  creditLimit: Number(b.creditLimit),
  cutOffDay: b.cutOffDay,
  paymentDueDay: b.paymentDueDay,
  annualInterestRate: Number(b.annualInterestRate),
});
export const getCardsSummary = () => apiGet<CardSummary>(`/api/CreditCards/summary`);
export const getCardsConsumption = (from: string, to: string) =>
  apiGet<CardConsumption[]>(`/api/Reports/cards/consumption?startDate=${from}&endDate=${to}`);

export type DashboardSummary = {
  savings: number; cardDebt: number; investments: number; loanDebt: number; totalBalance: number; isProvisional: boolean;
};
export const getDashboardSummary = () => apiGet<DashboardSummary>(`/api/dashboard/summary`);
