import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CENTRY_CONFIG,
  listCentries,
  createCentry,
  toggleCentry,
  deleteCentry,
} from '@financial/core';

type Call = { url: string; init?: RequestInit };
let calls: Call[] = [];

const json = (body: unknown) => ({ status: 200, ok: true, json: async () => body }) as Response;

const stub = (body: unknown) => {
  calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return json(body);
  }));
};

describe('centries → API (/api/centries/*)', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('configura los 6 kinds con sus flags', () => {
    expect(Object.keys(CENTRY_CONFIG)).toHaveLength(6);
    expect(CENTRY_CONFIG.bitacora).toMatchObject({ canCreate: false, canEdit: false, canDelete: false, canToggle: false });
    expect(CENTRY_CONFIG.inactivos.fields).toHaveLength(0);
    expect(CENTRY_CONFIG.inactivos.toggleLabelKey).toBe('centries.activate');
  });

  it('lista cargos y normaliza isActive → activo', async () => {
    stub([{ id: 1, nombre: 'Analista', isActive: false }]);
    const rows = await listCentries('cargo');
    expect(calls[0].url).toContain('/api/centries/cargos');
    expect(rows[0]).toMatchObject({ id: 1, nombre: 'Analista', activo: false });
  });

  it('inactivos filtra por activo=false en la URL', async () => {
    stub([]);
    await listCentries('inactivos');
    expect(calls[0].url).toContain('/api/centries/usuarios?activo=false');
  });

  it('crea un cargo con el payload del backend', async () => {
    stub({ id: 9, nombre: 'QA', isActive: true });
    const created = await createCentry('cargo', { nombre: 'QA' });
    expect(calls[0].url).toContain('/api/centries/cargos');
    expect(calls[0].init?.method).toBe('POST');
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ nombre: 'QA', isActive: true });
    expect(created).toMatchObject({ id: 9, activo: true });
  });

  it('crea un usuario mapeando a UsuarioInputDto', async () => {
    stub({ id: 4, usuario: 'jdoe', nombre: 'John Doe', activo: true });
    await createCentry('usuario', { email: 'j@x.com', password: 'p', nombre: 'John', apellido: 'Doe', usuario: 'jdoe', cargo: '2', perfil: '3' });
    expect(calls[0].url).toContain('/api/centries/usuarios');
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      email: 'j@x.com', password: 'p', firstName: 'John', lastName: 'Doe', username: 'jdoe', cargoId: 2, perfilId: 3, isActive: true,
    });
  });

  it('alterna y borra por el endpoint correcto', async () => {
    stub({ id: 3, nombre: 'X', isActive: false });
    await toggleCentry('perfil', 3);
    expect(calls[0].url).toContain('/api/centries/perfiles/3/toggle');
    stub(true);
    await deleteCentry('permiso', 5);
    expect(calls[0].url).toContain('/api/centries/permisos-perfil/5');
    expect(calls[0].init?.method).toBe('DELETE');
  });
});
