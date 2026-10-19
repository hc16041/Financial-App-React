import { z } from 'zod';
import { apiGet, apiPost, apiPut, apiDel } from './api-client';

// Port de MerchantsDTO + MerchantsService (GET/POST reales :5063).
// PUT/DELETE no existen en el backend (404) → UI solo lectura + alta (FEAT-15).
export const merchantSchema = z.object({
  name: z.string().trim().min(3, 'err.min3').max(500),
  description: z.string().trim().min(3, 'err.min3').max(500),
  category: z.string().trim().min(1, 'err.required').max(500),
});
export type MerchantForm = z.infer<typeof merchantSchema>;
export type Merchant = { id: number; name: string; description: string; category: string };

export const listMerchants = () => apiGet<Merchant[]>(`/api/Merchants`);
export const createMerchant = (b: MerchantForm) => apiPost<Merchant>(`/api/Merchants`, b);
export const updateMerchant = (id: number, b: MerchantForm) => apiPut<Merchant>(`/api/Merchants/${id}`, b);
export const deleteMerchant = (id: number) => apiDel<boolean>(`/api/Merchants/${id}`);
