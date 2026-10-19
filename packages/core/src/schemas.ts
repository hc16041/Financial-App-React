import { z } from 'zod';

// ponytail: dinero como string decimal, nunca float
// Mensajes = códigos i18n (err.*) traducidos en la capa UI; el core no depende de i18n.
export const moneyString = z.string().regex(/^\d+(\.\d{1,2})?$/, 'err.money');
export const iconString = z.string().regex(/^(mdi-|ri-|bx-|la-).+/, 'err.icon');

export const loginSchema = z.object({
  email: z.string().email('err.email'),
  password: z.string().min(1, 'err.required'),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'err.required').max(100),
  type: z.union([z.literal(1), z.literal(2)]),
  color: z.string().default('var(--fp-primary)'),
  icon: iconString.default('mdi-tag'),
  isActive: z.boolean().default(true),
});
export type CategoryDto = z.infer<typeof categorySchema> & { id: number };

export const authResponseSchema = z.object({
  token: z.string(),
  username: z.string().optional(),
  email: z.string().optional(),
});
