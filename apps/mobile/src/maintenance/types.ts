// Un mantenimiento es un CRUD de catálogo. En vez de una pantalla por entidad,
// una sola pantalla se configura con esto: columnas para listar y campos para el
// formulario.

export type Option = { value: string; label: string };

export type FieldKind = 'text' | 'number' | 'money' | 'date' | 'select' | 'checkbox';

export type MaintenanceField = {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  placeholder?: string;
  /** Opciones fijas (enums chicos). */
  options?: Option[];
  /** Opciones que dependen de otra consulta (categorías, plataformas…). */
  loadOptions?: () => Promise<Option[]>;
};

export type MaintenanceColumn = {
  key: string;
  label: string;
  money?: boolean;
  /** Texto ya formateado para una columna que no es un campo simple. */
  render?: (row: Record<string, unknown>) => string;
};

export type MaintenanceConfig = {
  slug: string;
  title: string;
  description: string;
  fetch: () => Promise<Array<Record<string, unknown>>>;
  create?: (values: Record<string, string>) => Promise<unknown>;
  update?: (id: number, values: Record<string, string>) => Promise<unknown>;
  remove?: (id: number) => Promise<unknown>;
  columns: MaintenanceColumn[];
  fields: MaintenanceField[];
  searchKeys: string[];
};
