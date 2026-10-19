import { apiGet } from './api-client';

// Reportes agregados reales :5063 (solo lectura; export server en FEAT-15).
export const getMerchantsExpenses = (from: string, to: string) =>
  apiGet<unknown>(`/api/Reports/merchants/expenses?startDate=${from}&endDate=${to}`);
export const getCashExpenses = (from: string, to: string) =>
  apiGet<unknown>(`/api/Reports/cash/expenses?startDate=${from}&endDate=${to}`);
export const getInvestmentsMonthly = (year: number) =>
  apiGet<unknown>(`/api/Reports/investments/monthly?year=${year}`);
