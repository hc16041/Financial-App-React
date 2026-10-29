// Catálogos de referencia. Todos comparten id + nombre; plataformas y métodos de
// retiro además aceptan descripción y estado, y los métodos si requieren tarjeta.
import { apiGet, apiPost, apiPut, apiDel } from './api-client';

export type Ref = {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
  requiresCreditCard?: boolean;
};

export type RefForm = {
  name: string;
  description?: string;
  isActive?: boolean;
  requiresCreditCard?: boolean;
};

const catalog = (base: string) => ({
  list: () => apiGet<Ref[]>(base),
  create: (form: RefForm) => apiPost<Ref>(base, form),
  update: (id: number, form: RefForm) => apiPut<Ref>(`${base}/${id}`, { id, ...form }),
  remove: (id: number) => apiDel<void>(`${base}/${id}`),
});

export const platformsApi = catalog('/api/Platforms');
export const withdrawalMethodsApi = catalog('/api/WithdrawalMethods');
