import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { goalSchema, accountSchema, txSchema } from '@financial/core';

// i18n lee localStorage al importarse y zodT/session leen storage: en node no existen.
const ls = new Map<string, string>();
const ss = new Map<string, string>();
const mk = (m: Map<string, string>) => ({
  getItem: (k: string) => m.get(k) ?? null,
  setItem: (k: string, v: string) => void m.set(k, v),
  removeItem: (k: string) => void m.delete(k),
});
vi.stubGlobal('localStorage', mk(ls));
vi.stubGlobal('sessionStorage', mk(ss));

const { zodT } = await import('./lib/errors');
const { default: i18n } = await import('./i18n');
const { session, initial } = await import('./lib/session');

type ResolverOut = { errors?: Record<string, unknown> };
const run = async (schema: z.ZodType, values: unknown): Promise<ResolverOut> => {
  const resolve = zodT(schema) as unknown as (
    v: unknown,
    c: unknown,
    o: unknown,
  ) => Promise<ResolverOut>;
  return resolve(values, {}, {});
};

const messages = (e: unknown, out: string[] = []): string[] => {
  if (!e || typeof e !== 'object') return out;
  const node = e as Record<string, unknown>;
  if (typeof node.message === 'string') out.push(node.message);
  for (const k in node) if (k !== 'message' && k !== 'type' && k !== 'ref') messages(node[k], out);
  return out;
};

describe('zodT: codigos err.* traducidos, texto del backend intacto', () => {
  it('traduce el codigo del schema al idioma activo', async () => {
    await i18n.changeLanguage('es');
    const r = await run(goalSchema, { name: 'ab', target: '10.00' });
    const msgs = messages(r.errors);
    expect(msgs.length).toBeGreaterThan(0);
    expect(msgs).not.toContain('err.min3');
    expect(msgs).toContain(i18n.t('err.min3'));
  });

  it('cambia de idioma sin tocar el schema', async () => {
    await i18n.changeLanguage('en');
    const r = await run(goalSchema, { name: 'ab', target: 'x' });
    const msgs = messages(r.errors);
    expect(msgs).toContain(i18n.t('err.min3'));
    expect(msgs).toContain(i18n.t('err.money'));
    expect(msgs.every((m) => !m.startsWith('err.'))).toBe(true);
    await i18n.changeLanguage('es');
  });

  it('recorre errores anidados (union) y no deja codigos crudos', async () => {
    const bad = await run(accountSchema, { name: '', type: 5 });
    const union = await run(txSchema, { accountId: 0, type: 9, amount: 'x', date: '' });
    for (const r of [bad, union]) {
      const msgs = messages(r.errors);
      expect(msgs.length).toBeGreaterThan(0);
      expect(msgs.filter((m) => m.startsWith('err.'))).toEqual([]);
    }
  });

  it('deja pasar mensajes libres (los del backend)', async () => {
    const schema = z.object({ name: z.string().min(1, 'El nombre es obligatorio') });
    const r = await run(schema, { name: '' });
    expect(messages(r.errors)).toEqual(['El nombre es obligatorio']);
  });
});

describe('session: claims del token como unica fuente', () => {
  const jwt = (payload: Record<string, unknown>) => `h.${btoa(JSON.stringify(payload))}.s`;

  it('lee correo y claims del JWT', () => {
    ss.clear();
    ss.set('fa_user', 'ana@x.com');
    ss.set('fa_token', jwt({ name: 'Ana', role: 'Admin', exp: 1893456000 }));
    expect(session()).toEqual({ email: 'ana@x.com', name: 'Ana', role: 'Admin', expires: 1893456000 });
  });

  it('acepta unique_name y el claim largo de rol', () => {
    ss.clear();
    ss.set('fa_token', jwt({ unique_name: 'bea@x.com', 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'User' }));
    const s = session();
    expect(s).toMatchObject({ name: 'bea@x.com', role: 'User', expires: null });
  });

  it('un token que no es JWT no rompe la sesion', () => {
    ss.clear();
    ss.set('fa_user', 'carla@x.com');
    ss.set('fa_token', 'demo-token');
    expect(session()).toEqual({ email: 'carla@x.com', name: null, role: null, expires: null });
  });

  it('sin token devuelve todo nulo', () => {
    ss.clear();
    expect(session()).toEqual({ email: null, name: null, role: null, expires: null });
  });

  it('inicial del avatar con fallback a correo', () => {
    expect(initial({ email: 'ana@x.com', name: 'ana', role: null, expires: null })).toBe('A');
    expect(initial({ email: 'bea@x.com', name: null, role: null, expires: null })).toBe('B');
    expect(initial({ email: '', name: null, role: null, expires: null })).toBe('?');
  });
});
