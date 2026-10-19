import { apiGet, apiPost, apiPut, apiDel } from './api-client';

// API real :5063 (migración AddCategories aplicada). Misma firma que el mock.
export type Category = {
  id: number;
  name: string;
  type: 1 | 2;
  typeName?: string;
  color: string;
  icon: string;
  isActive: boolean;
};

export type CategoryInput = { name: string; type: 1 | 2; color: string; icon: string; isActive?: boolean };

export const listCategories = async (type?: 1 | 2, search?: string): Promise<Category[]> => {
  const q = new URLSearchParams();
  if (type) q.set('type', String(type));
  if (search) q.set('search', search);
  const s = q.toString();
  return apiGet<Category[]>(`/api/categories${s ? `?${s}` : ''}`);
};
export const createCategory = (c: CategoryInput): Promise<Category> =>
  apiPost<Category>(`/api/categories`, c);
export const updateCategory = (id: number, c: CategoryInput & { isActive: boolean }): Promise<Category> =>
  apiPut<Category>(`/api/categories/${id}`, c);
export const removeCategory = (id: number): Promise<void> =>
  apiDel<void>(`/api/categories/${id}`);
export const deactivateCategory = (id: number, current: Category): Promise<Category> =>
  apiPut<Category>(`/api/categories/${id}`, { ...current, isActive: false });
