import { z } from 'zod';
import { apiGet, apiPost, apiPut, apiDel } from './api-client';
import { moneyString } from './schemas';

// Un presupuesto por usuario/categoría/mes. El consumido lo calcula el backend
// sumando los gastos del mes (no se envía).
export const budgetSchema = z.object({
  categoryId: z.number().min(1, 'err.required'),
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
  limit: moneyString,
});
export type BudgetForm = z.input<typeof budgetSchema>;
export type Budget = {
  id: number;
  categoryId: number;
  categoryName?: string | null;
  month: number;
  year: number;
  limit: number | string;
  spent: number | string;
};

export const listBudgets = () => apiGet<Budget[]>('/api/budgets');
export const createBudget = (b: BudgetForm) => {
  const v = budgetSchema.parse(b);
  return apiPost<Budget>('/api/budgets', {
    categoryId: v.categoryId,
    month: v.month,
    year: v.year,
    limit: Number(v.limit),
  });
};
export const updateBudget = (id: number, limit: string | number) =>
  apiPut<Budget>(`/api/budgets/${id}`, { id, limit: Number(limit) });
export const deleteBudget = (id: number) => apiDel<boolean>(`/api/budgets/${id}`);

export const pct = (b: Budget) => Math.round((Number(b.spent) / Math.max(0.01, Number(b.limit))) * 100);
export const stateOf = (b: Budget) => (pct(b) >= 100 ? 'over' : pct(b) >= 80 ? 'warn' : 'ok');
