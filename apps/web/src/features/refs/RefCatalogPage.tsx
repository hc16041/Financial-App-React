import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { Ref } from '@financial/core';
import { platformsApi, withdrawalMethodsApi } from '@financial/core';
import Modal from '../../components/Modal';
import PageHead from '../../components/PageHead';
import Skeleton from '../../components/Skeleton';

// Catálogo de referencia (Plataformas, Métodos de retiro): una sola pantalla,
// dos instancias. Solo nombre; sin KPIs propios porque el dato es un id+nombre.
export type RefApi = {
  list: () => Promise<Ref[]>;
  create: (name: string) => Promise<Ref>;
  update: (id: number, name: string) => Promise<Ref>;
  remove: (id: number) => Promise<void>;
};

export default function RefCatalogPage({ api, ns }: { api: RefApi; ns: 'platforms' | 'withdrawalMethods' }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Ref | null>(null);
  const [name, setName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const key = [ns];
  const list = useQuery({ queryKey: key, queryFn: api.list });
  const inv = () => qc.invalidateQueries({ queryKey: key });
  const create = useMutation({ mutationFn: api.create, onSuccess: inv });
  const update = useMutation({
    mutationFn: ({ id, value }: { id: number; value: string }) => api.update(id, value),
    onSuccess: inv,
  });
  const remove = useMutation({ mutationFn: api.remove, onSuccess: inv });

  const items = (list.data ?? []).filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
  const err = (m: unknown) => (m as { message?: string } | null)?.message ?? 'Error';

  const close = () => { setShowForm(false); setEditing(null); setName(''); };
  const openCreate = () => { setEditing(null); setName(''); setShowForm(true); };
  const openEdit = (r: Ref) => { setEditing(r); setName(r.name); setShowForm(true); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = name.trim();
    if (!value) return;
    if (editing) update.mutate({ id: editing.id, value }, { onSuccess: close });
    else create.mutate(value, { onSuccess: close });
  };

  if (list.isPending) return <Skeleton />;
  if (list.isError)
    return (
      <div>
        <p className="error-text">{t('common.error')}</p>
        <button className="btn btn--sm" onClick={() => list.refetch()}>{t('common.retry')}</button>
      </div>
    );

  return (
    <section>
      <PageHead
        title={t(`${ns}.title`)}
        count={items.length}
        actions={
          <button className="btn btn--primary" onClick={openCreate}>
            <Plus size={16} aria-hidden="true" />{t('common.create')}
          </button>
        }
      />

      <div className="toolbar">
        <label className="search">
          <Search size={16} aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search')}
            aria-label={t('common.search')}
          />
        </label>
      </div>

      <Modal open={showForm} onClose={close} title={editing ? t('common.edit') : t('common.create')}>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor={`${ns}-name`}>{t('common.name')}</label>
            <input
              id={`${ns}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
              autoFocus
            />
          </div>
          {(create.isError || update.isError) && <p className="error-text">{err(create.error ?? update.error)}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={close}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn--primary" disabled={!name.trim()}>
              {editing ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </Modal>

      {items.length === 0 ? (
        <p className="empty-state">{t(`${ns}.empty`)}</p>
      ) : (
        <div className="table-wrap">
          <table className="ledger">
            <thead>
              <tr><th>{t('common.name')}</th><th /></tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn--sm" onClick={() => openEdit(r)} title={t('common.edit')} aria-label={t('common.edit')}>
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                    <button className="btn btn--sm btn--danger" onClick={() => remove.mutate(r.id)} title={t('common.delete')} aria-label={t('common.delete')}>
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// Instancias concretas: el router las carga por nombre desde un solo chunk.
export const PlatformsPage = () => <RefCatalogPage api={platformsApi} ns="platforms" />;
export const WithdrawalMethodsPage = () => <RefCatalogPage api={withdrawalMethodsApi} ns="withdrawalMethods" />;
