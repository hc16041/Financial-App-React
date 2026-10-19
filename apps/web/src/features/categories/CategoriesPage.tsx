import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { zodT } from '../../lib/errors';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Power, Search, Trash2 } from 'lucide-react';
import { categorySchema } from '@financial/core';
import {
  listCategories, createCategory, updateCategory, removeCategory, deactivateCategory,
  type Category,
} from '@financial/core';
import Modal from '../../components/Modal';
import PageHead from '../../components/PageHead';
import Skeleton from '../../components/Skeleton';

type Form = { name: string; type: 1 | 2; color: string; icon: string };

export default function CategoriesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | '1' | '2'>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const list = useQuery({ queryKey: ['categories'], queryFn: () => listCategories() });
  const inv = () => qc.invalidateQueries({ queryKey: ['categories'] });
  const create = useMutation({ mutationFn: createCategory, onSuccess: inv });
  const update = useMutation({
    mutationFn: ({ id, v }: { id: number; v: Form }) => updateCategory(id, { ...v, isActive: true }),
    onSuccess: inv,
  });
  const remove = useMutation({ mutationFn: removeCategory, onSuccess: inv });
  const deact = useMutation({ mutationFn: (c: Category) => deactivateCategory(c.id, c), onSuccess: inv });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<Form>({
    // color/icon tienen default en el schema; en el formulario ya llegan siempre definidos.
    resolver: zodT(categorySchema.omit({ isActive: true })) as unknown as Resolver<Form>,
    defaultValues: { type: 2 as const, color: 'var(--fp-primary)', icon: 'mdi-tag' },
  });

  const items = (list.data ?? []).filter(
    (c) => (filter === 'all' || String(c.type) === filter) && c.name.toLowerCase().includes(search.toLowerCase()),
  );
  const err = (m: unknown) => (m as { message?: string } | null)?.message ?? 'Error';

  const close = () => { setShowForm(false); setEditing(null); reset(); };
  const openCreate = () => { setEditing(null); reset(); setShowForm(true); };
  const openEdit = (c: Category) => {
    setEditing(c);
    setValue('name', c.name); setValue('type', c.type as 1 | 2); setValue('icon', c.icon); setValue('color', c.color);
    setShowForm(true);
  };
  const submit = (f: Form) => {
    if (editing) update.mutate({ id: editing.id, v: f }, { onSuccess: close });
    else create.mutate({ ...f, isActive: true }, { onSuccess: close });
  };

  if (list.isPending) return <Skeleton />;
  if (list.isError) return <div><p className="error-text">{t('common.error')}</p><button className="btn btn--sm" onClick={() => list.refetch()}>{t('common.retry')}</button></div>;

  return (
    <section>
      <PageHead
        title={t('categories.title')}
        count={items.length}
        actions={<button className="btn btn--primary" onClick={openCreate}><Plus size={16} aria-hidden="true" />{t('common.create')}</button>}
      />

      <div className="toolbar">
        <select value={filter} onChange={(e) => setFilter(e.target.value as 'all' | '1' | '2')} aria-label={t('common.filter')}>
          <option value="all">{t('common.all')}</option><option value="1">{t('categories.income')}</option><option value="2">{t('categories.expense')}</option>
        </select>
        <label className="search">
          <Search size={16} aria-hidden="true" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('common.search')} aria-label={t('common.search')} />
        </label>
      </div>

      <Modal open={showForm} onClose={close} title={editing ? t('common.edit') : t('common.create')}>
        <form onSubmit={handleSubmit(submit)}>
          <div className="field">
            <label htmlFor="cat-name">{t('common.name')}</label>
            <input id="cat-name" {...register('name')} />
            {errors.name && <p className="field__error">{errors.name.message}</p>}
          </div>
          <div className="field">
            <label htmlFor="cat-type">{t('common.type')}</label>
            <select id="cat-type" {...register('type', { valueAsNumber: true })}>
              <option value={1}>{t('categories.income')}</option><option value={2}>{t('categories.expense')}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="cat-icon">{t('common.icon')}</label>
            <input id="cat-icon" {...register('icon')} placeholder="mdi-tag" />
            {errors.icon && <p className="field__error">{errors.icon.message}</p>}
          </div>
          {(create.isError || update.isError) && <p className="error-text">{err(create.error ?? update.error)}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={close}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn--primary">{editing ? t('common.save') : t('common.create')}</button>
          </div>
        </form>
      </Modal>

      {items.length === 0 ? <p className="empty-state">{t('categories.empty')}</p> : (
        <div className="table-wrap"><table className="ledger">
          <thead><tr><th>{t('common.name')}</th><th>{t('common.type')}</th><th>{t('common.icon')}</th><th>{t('common.status')}</th><th /></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.type === 1 ? t('categories.income') : t('categories.expense')}</td>
                <td>{c.icon}</td>
                <td><span className={`badge ${c.isActive ? 'badge--in' : ''}`}>{c.isActive ? t('categories.active') : t('categories.inactive')}</span></td>
                <td style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn--sm" onClick={() => openEdit(c)} title={t('common.edit')} aria-label={t('common.edit')}><Pencil size={15} aria-hidden="true" /></button>
                  {c.isActive
                    ? <button className="btn btn--sm" onClick={() => deact.mutate(c)} title={t('categories.deactivate')} aria-label={t('categories.deactivate')}><Power size={15} aria-hidden="true" /></button>
                    : <button className="btn btn--sm btn--danger" onClick={() => remove.mutate(c.id)} title={t('common.delete')} aria-label={t('common.delete')}><Trash2 size={15} aria-hidden="true" /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </section>
  );
}
