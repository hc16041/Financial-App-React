import { z } from 'zod';
import { apiGet, apiPost, apiPut } from './api-client';
import { moneyString } from './schemas';

export const goalSchema = z.object({
  name: z.string().min(3, 'err.min3'),
  target: moneyString,
  deadline: z.string().optional(),
});
export type GoalForm = z.input<typeof goalSchema>;

export const recurringSchema = z.object({
  name: z.string().min(3, 'err.min3'),
  amount: moneyString,
  frequency: z.enum(['Semanal', 'Mensual', 'Anual']),
  active: z.boolean().optional(),
});
export type RecurringForm = z.input<typeof recurringSchema>;

export type Goal = {
  id: number;
  name: string;
  target: number | string;
  current: number | string;
  deadline: string | null;
  closed: boolean;
  overdue: boolean;
};

export type Recurring = {
  id: number;
  name: string;
  amount: number | string;
  frequency: number;
  frequencyName: string;
  active: boolean;
  nextDue: string;
};

// El API usa 1/2/3; el formulario conserva las etiquetas en español.
const FREQ: Record<string, number> = { Semanal: 1, Mensual: 2, Anual: 3 };

export const listGoals = () => apiGet<Goal[]>('/api/goals');
export const listRecurring = () => apiGet<Recurring[]>('/api/goals/recurring');

export const createGoal = (g: GoalForm) => {
  const v = goalSchema.parse(g);
  return apiPost<Goal>('/api/goals', {
    name: v.name,
    target: Number(v.target),
    deadline: v.deadline || null,
  });
};
export const updateGoal = (id: number, g: GoalForm) => {
  const v = goalSchema.parse(g);
  return apiPut<Goal>(`/api/goals/${id}`, {
    name: v.name,
    target: Number(v.target),
    deadline: v.deadline || null,
  });
};
export const depositGoal = (id: number, amount: string | number, accountId: number) =>
  apiPost<Goal>(`/api/goals/${id}/deposit`, { amount: Number(amount), accountId });

export const createRecurring = (r: RecurringForm) => {
  const v = recurringSchema.parse(r);
  return apiPost<Recurring>('/api/goals/recurring', {
    name: v.name,
    amount: Number(v.amount),
    frequency: FREQ[v.frequency],
  });
};
export const toggleRecurring = (id: number) => apiPut<Recurring>(`/api/goals/recurring/${id}/toggle`, {});

/// Marca pagado: el backend registra el gasto en la cuenta y avanza NextDue.
export const payRecurring = (id: number, accountId: number) =>
  apiPost<Recurring>(`/api/goals/recurring/${id}/pay`, { accountId });
