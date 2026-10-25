// Catálogos de referencia: solo id + nombre. Mismo contrato de CRUD para ambos.
import { apiGet, apiPost, apiPut, apiDel } from './api-client';

export type Ref = { id: number; name: string };

const catalog = (base: string) => ({
  list: () => apiGet<Ref[]>(base),
  create: (name: string) => apiPost<Ref>(base, { name }),
  update: (id: number, name: string) => apiPut<Ref>(`${base}/${id}`, { id, name }),
  remove: (id: number) => apiDel<void>(`${base}/${id}`),
});

export const platformsApi = catalog('/api/Platforms');
export const withdrawalMethodsApi = catalog('/api/WithdrawalMethods');
