import { apiGet, apiPost, apiPut, apiDel } from './api-client';

// Módulo Centries/Seguridad (Módulo 8). Cableado al backend real /api/centries/*.
// El backend expone `isActive` y campos anidados; aquí se normaliza al shape del
// UI (clave española `activo`) y se arma el payload por tipo.

export type CentryKind =
  | 'usuario'
  | 'inactivos'
  | 'perfil'
  | 'cargo'
  | 'permiso'
  | 'bitacora';

export type CentryFieldType = 'text' | 'password' | 'checkbox' | 'select';

export type CentryField = {
  key: string;
  labelKey: string;
  type: CentryFieldType;
  // select: carga las opciones de otro listado (valor = id, etiqueta = nombre).
  optionsFrom?: CentryKind;
};
export type CentryColumn = { key: string; labelKey: string };
export type CentryRecord = { id: number } & Record<string, unknown>;

export type CentryConfig = {
  titleKey: string;
  columns: CentryColumn[];
  fields: CentryField[];
  searchKeys: string[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canToggle: boolean;
  toggleLabelKey: string;
};

const USUARIO_COLUMNS: CentryColumn[] = [
  { key: 'usuario', labelKey: 'centries.username' },
  { key: 'nombre', labelKey: 'common.name' },
  { key: 'cargo', labelKey: 'centries.position' },
  { key: 'perfil', labelKey: 'centries.profile' },
  { key: 'activo', labelKey: 'common.status' },
];

export const CENTRY_CONFIG: Record<CentryKind, CentryConfig> = {
  usuario: {
    titleKey: 'centries.users',
    columns: USUARIO_COLUMNS,
    fields: [
      { key: 'email', labelKey: 'centries.email', type: 'text' },
      { key: 'password', labelKey: 'centries.password', type: 'password' },
      { key: 'nombre', labelKey: 'centries.firstName', type: 'text' },
      { key: 'apellido', labelKey: 'centries.lastName', type: 'text' },
      { key: 'usuario', labelKey: 'centries.username', type: 'text' },
      { key: 'cargo', labelKey: 'centries.position', type: 'select', optionsFrom: 'cargo' },
      { key: 'perfil', labelKey: 'centries.profile', type: 'select', optionsFrom: 'perfil' },
    ],
    searchKeys: ['usuario', 'nombre', 'cargo', 'perfil'],
    canCreate: true,
    // El backend no devuelve nombre/apellido separados ni admite cambiar password aquí.
    canEdit: false,
    canDelete: true,
    canToggle: true,
    toggleLabelKey: 'centries.deactivate',
  },
  inactivos: {
    titleKey: 'centries.inactive',
    columns: USUARIO_COLUMNS.filter((c) => c.key !== 'activo'),
    fields: [],
    searchKeys: ['usuario', 'nombre', 'cargo', 'perfil'],
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canToggle: true,
    toggleLabelKey: 'centries.activate',
  },
  perfil: {
    titleKey: 'centries.profiles',
    columns: [
      { key: 'nombre', labelKey: 'common.name' },
      { key: 'descripcion', labelKey: 'common.description' },
      { key: 'activo', labelKey: 'common.status' },
    ],
    fields: [
      { key: 'nombre', labelKey: 'common.name', type: 'text' },
      { key: 'descripcion', labelKey: 'common.description', type: 'text' },
    ],
    searchKeys: ['nombre', 'descripcion'],
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canToggle: true,
    toggleLabelKey: 'centries.deactivate',
  },
  cargo: {
    titleKey: 'centries.positions',
    columns: [
      { key: 'nombre', labelKey: 'common.name' },
      { key: 'activo', labelKey: 'common.status' },
    ],
    fields: [{ key: 'nombre', labelKey: 'common.name', type: 'text' }],
    searchKeys: ['nombre'],
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canToggle: true,
    toggleLabelKey: 'centries.deactivate',
  },
  // El backend modela permisos como asignación perfil → permiso (PermisoPerfil).
  permiso: {
    titleKey: 'centries.permissions',
    columns: [
      { key: 'perfil', labelKey: 'centries.profile' },
      { key: 'permiso', labelKey: 'centries.permission' },
    ],
    fields: [
      { key: 'perfil', labelKey: 'centries.profile', type: 'text' },
      { key: 'permiso', labelKey: 'centries.permission', type: 'text' },
    ],
    searchKeys: ['perfil', 'permiso'],
    canCreate: true,
    canEdit: false,
    canDelete: true,
    canToggle: false,
    toggleLabelKey: 'centries.deactivate',
  },
  bitacora: {
    titleKey: 'centries.audit',
    columns: [
      { key: 'fecha', labelKey: 'centries.date' },
      { key: 'usuario', labelKey: 'centries.username' },
      { key: 'accion', labelKey: 'centries.action' },
      { key: 'detalle', labelKey: 'centries.detail' },
    ],
    fields: [],
    searchKeys: ['usuario', 'accion', 'detalle'],
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canToggle: false,
    toggleLabelKey: 'centries.deactivate',
  },
};

// Segmento de ruta por tipo (inactivos reutiliza `usuarios` con filtro).
const PATH: Record<CentryKind, string> = {
  usuario: 'usuarios',
  inactivos: 'usuarios',
  perfil: 'perfiles',
  cargo: 'cargos',
  permiso: 'permisos-perfil',
  bitacora: 'bitacora',
};

const num = (v: unknown): number | null => {
  const n = Number(v);
  return v === '' || v == null || Number.isNaN(n) ? null : n;
};

// DTO del backend → registro del UI (normaliza isActive → activo).
const fromDto = (kind: CentryKind, d: any): CentryRecord => {
  switch (kind) {
    case 'usuario':
    case 'inactivos':
      return {
        id: d.id,
        usuario: d.usuario ?? '',
        nombre: d.nombre ?? '',
        cargo: d.cargo ?? '',
        perfil: d.perfil ?? '',
        activo: d.activo ?? d.isActive ?? false,
        email: d.email ?? '',
        cargoId: d.cargoId ?? null,
        perfilId: d.perfilId ?? null,
      };
    case 'perfil':
      return { id: d.id, nombre: d.nombre ?? '', descripcion: d.descripcion ?? '', activo: d.isActive ?? d.activo ?? false };
    case 'cargo':
      return { id: d.id, nombre: d.nombre ?? '', activo: d.isActive ?? d.activo ?? false };
    case 'permiso':
      return { id: d.id, perfil: d.perfil ?? '', permiso: d.permiso ?? '' };
    case 'bitacora':
      return { id: d.id, fecha: d.fecha ?? '', usuario: d.usuario ?? '', accion: d.accion ?? '', detalle: d.detalle ?? '' };
  }
};

// Registro del UI → payload del backend.
const toPayload = (kind: CentryKind, f: Record<string, unknown>): Record<string, unknown> => {
  switch (kind) {
    case 'usuario':
      return {
        email: f.email ?? '',
        password: f.password ?? '',
        firstName: f.nombre ?? '',
        lastName: f.apellido ?? '',
        username: f.usuario ?? '',
        cargoId: num(f.cargo),
        perfilId: num(f.perfil),
        isActive: true,
      };
    case 'perfil':
      return { nombre: f.nombre ?? '', descripcion: f.descripcion ?? '', isActive: f.activo ?? true };
    case 'cargo':
      return { nombre: f.nombre ?? '', isActive: f.activo ?? true };
    case 'permiso':
      return { perfil: f.perfil ?? '', permiso: f.permiso ?? '' };
    default:
      return f;
  }
};

export const listCentries = async (kind: CentryKind): Promise<CentryRecord[]> => {
  const seg = kind === 'inactivos' ? 'usuarios?activo=false' : PATH[kind];
  const data = await apiGet<unknown[]>(`/api/centries/${seg}`);
  return (Array.isArray(data) ? data : []).map((d) => fromDto(kind, d));
};

export const createCentry = async (kind: CentryKind, data: Record<string, unknown>): Promise<CentryRecord> =>
  fromDto(kind, await apiPost(`/api/centries/${PATH[kind]}`, toPayload(kind, data)));

export const updateCentry = async (kind: CentryKind, id: number, data: Record<string, unknown>): Promise<CentryRecord> =>
  fromDto(kind, await apiPut(`/api/centries/${PATH[kind]}/${id}`, toPayload(kind, data)));

export const deleteCentry = async (kind: CentryKind, id: number): Promise<void> => {
  await apiDel(`/api/centries/${PATH[kind]}/${id}`);
};

export const toggleCentry = async (kind: CentryKind, id: number): Promise<CentryRecord> =>
  fromDto(kind, await apiPost(`/api/centries/${PATH[kind]}/${id}/toggle`, {}));
