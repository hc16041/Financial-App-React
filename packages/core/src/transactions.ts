import { apiGet } from './api-client';

// Lectura :5063. Alta existe (POST) pero el flujo real exige tarjeta+comercio;
// en v1 paridad de lectura (el Angular legacy crea desde tarjetas).
export type Tx = {
  id: number; amount: number; type: number; description?: string;
  date?: string; transactionDate?: string; merchantId?: number;
  merchant?: { name?: string }; creditCardId?: number | null;
  [k: string]: unknown;
};

export const getTxByCard = (cardId: number) => apiGet<Tx[]>(`/api/transactions/credit-card/${cardId}`);
export const getTxByDate = (from: string, to: string) =>
  apiGet<Tx[]>(`/api/transactions/transactions/by-date?startDate=${from}&endDate=${to}`);
export const getCashByDate = (from: string, to: string) =>
  apiGet<Tx[]>(`/api/transactions/cash/by-date?startDate=${from}&endDate=${to}`);
export const getTxTypes = () => apiGet<unknown>(`/api/transactions/types`);
