import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  CENTRY_CONFIG,
  listCentries,
  createCentry,
  updateCentry,
  deleteCentry,
  toggleCentry,
  type CentryKind,
  type CentryRecord,
} from '@financial/core';
import { Pencil, Plus, Power, Trash2 } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import PageHead from '../../components/PageHead';
import Skeleton from '../../components/Skeleton';

const emptyForm = (kind: CentryKind): Record<string, unknown> =>
  Object.fromEntries(CENTRY_CONFIG[kind].fields.map((f) => [f.key, f.type === 'checkbox' ? false : '']));

// Select cuyas opciones salen de otro listado (valor = id, etiqueta = nombre).
function FieldSelect({ id, from, value, onChange }: {
  id: string; from: CentryKind; value: string; onChange: (v: string) => void;
}) {
  const opts = useQuery({ queryKey: ['centries', from], queryFn: () => listCentries(from) });
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      {(opts.data ?? []).map((o) => <option key={o.id} value={o.id}>{String(o.nombre ?? o.id)}</option>)}
    </select>
  );
}

// Módulo Centries (Módulo 8): una página config-driven sirve las 6 pantallas
// (tabla + formulario en modal). Datos reales vía /api/centries/*.
export function CentriesPage({ kind }: { kind: CentryKind }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const cfg = CENTRY_CONFIG[kind];
  const [editing, setEditing] = useState<CentryRecord | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(() => emptyForm(kind));
  const [showForm, setShowForm] = useState(false);

  const list = useQuery({ queryKey: ['centries', kind], queryFn: () => listCentries(kind) });
  const inv = () => qc.invalidateQueries({ queryKey: ['centries', kind] });
  const create = useMutation({ mutationFn: (d: Record<string, unknown>) => createCentry(kind, d), onSuccess: inv });
  const update = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Record<string, unknown> }) => updateCentry(kind, id, d),
    onSuccess: inv,
  });
  const remove = useMutation({ mutationFn: (id: number) => deleteCentry(kind, id), onSuccess: inv });
  const toggle = useMutation({ mutationFn: (id: number) => toggleCentry(kind, id), onSuccess: inv });

  const rows = list.data ?? [];
  const close = () => { setShowForm(false); setEditing(null); setForm(emptyForm(kind)); };
  const openCreate = () => { setEditing(null); setForm(emptyForm(kind)); setShowForm(true); };
  const openEdit = (r: CentryRecord) => { setEditing(r); setForm({ ...emptyForm(kind), ...r }); setShowForm(true); };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (editing) update.mutate({ id: editing.id, d: form }, { onSuccess: close });
    else create.mutate(form, { onSuccess: close });
  };

  if (list.isPending) return <Skeleton />;
  if (list.isError)
    return <div><p className="error-text">{t('common.error')}</p><button className="btn btn--sm" onClick={() => list.refetch()}>{t('common.retry')}</button></div>;

  const hasActions = cfg.canEdit || cfg.canToggle || cfg.canDelete;
  const fail = create.isError || update.isError || remove.isError || toggle.isError;

  return (
    <section>
      <PageHead
        title={t(cfg.titleKey)}
        section={t('sections.security')}
        count={rows.length}
        actions={cfg.canCreate ? <button className="btn btn--primary" onClick={openCreate}><Plus size={16} aria-hidden="true" />{t('common.create')}</button> : undefined}
      />
      <Modal open={showForm} onClose={close} title={editing ? t('common.edit') : t('common.create')}>
        <form onSubmit={submit}>
          {cfg.fields.map((f) => (
            <div className="field" key={f.key}>
              <label htmlFor={`${kind}-${f.key}`}>{t(f.labelKey)}</label>
              {f.type === 'checkbox' ? (
                <input id={`${kind}-${f.key}`} type="checkbox" checked={Boolean(form[f.key])} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} />
              ) : f.type === 'select' ? (
                <FieldSelect id={`${kind}-${f.key}`} from={f.optionsFrom!} value={String(form[f.key] ?? '')} onChange={(v) => setForm({ ...form, [f.key]: v })} />
              ) : (
                <input
                  id={`${kind}-${f.key}`}
                  type={f.type === 'password' ? 'password' : 'text'}
                  value={String(form[f.key] ?? '')}
                  placeholder={t(f.labelKey)}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
          {fail && <p className="error-text">{t('common.error')}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={close}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn--primary">{editing ? t('common.save') : t('common.create')}</button>
          </div>
        </form>
      </Modal>
      <DataTable
        columns={cfg.columns.map((c) => ({
          key: c.key,
          label: t(c.labelKey),
          render: (r) => typeof r[c.key] === 'boolean'
            ? <span className={`badge ${r[c.key] ? 'badge--in' : ''}`}>{r[c.key] ? t('centries.yes') : t('centries.no')}</span>
            : String(r[c.key] ?? '—').slice(0, 60),
        }))}
        rows={rows}
        searchKeys={cfg.searchKeys}
        emptyText={t('common.empty')}
        renderActions={hasActions ? (r) => (
          <span style={{ display: 'flex', gap: 4 }}>
            {cfg.canEdit && <button className="btn btn--sm" onClick={() => openEdit(r as CentryRecord)} title={t('common.edit')} aria-label={t('common.edit')}><Pencil size={15} aria-hidden="true" /></button>}
            {cfg.canToggle && <button className="btn btn--sm" onClick={() => toggle.mutate(Number(r.id))} title={t(cfg.toggleLabelKey)} aria-label={t(cfg.toggleLabelKey)}><Power size={15} aria-hidden="true" /></button>}
            {cfg.canDelete && <button className="btn btn--sm btn--danger" onClick={() => remove.mutate(Number(r.id))} title={t('common.delete')} aria-label={t('common.delete')}><Trash2 size={15} aria-hidden="true" /></button>}
          </span>
        ) : undefined}
      />
    </section>
  );
}

// Envoltorios por pantalla (rutas lazy por nombre de export).
export function CentriesUsuarios() { return <CentriesPage kind="usuario" />; }
export function CentriesUsuariosInactivos() { return <CentriesPage kind="inactivos" />; }
export function CentriesPerfiles() { return <CentriesPage kind="perfil" />; }
export function CentriesCargos() { return <CentriesPage kind="cargo" />; }
export function CentriesPermisos() { return <CentriesPage kind="permiso" />; }
export function CentriesBitacora() { return <CentriesPage kind="bitacora" />; }
