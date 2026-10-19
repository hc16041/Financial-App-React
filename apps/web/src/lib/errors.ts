import { type ZodType, z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { FieldValues, Resolver } from 'react-hook-form';
import i18n from '../i18n';

// Los schemas del core devuelven códigos i18n (err.*) como mensaje. Este resolver
// delega en zodResolver y traduce esos códigos al idioma activo; el texto libre
// (mensajes del backend) pasa sin cambios.
export function zodT<S extends ZodType>(
  schema: S,
): Resolver<z.input<S> & FieldValues, unknown, z.output<S>> {
  const base = zodResolver(schema as never) as unknown as (
    values: z.input<S>,
    context: unknown,
    options: unknown,
  ) => Promise<{ errors?: Record<string, unknown> }>;
  const wrapped = async (...args: Parameters<typeof base>) => {
    const res = (await base(...args)) as { errors?: Record<string, unknown> };
    const walk = (e: unknown): void => {
      const node = e as { message?: unknown; types?: Record<string, unknown> };
      if (!node) return;
      if (typeof node.message === 'string' && node.message.startsWith('err.')) {
        (node as { message: string }).message = i18n.t(node.message);
      }
      if (node.types) for (const k in node.types) walk(node.types[k]);
    };
    for (const k in res.errors ?? {}) walk(res.errors?.[k]);
    return res;
  };
  return wrapped as unknown as Resolver<z.input<S> & FieldValues, unknown, z.output<S>>;
}
