import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodT } from '../../lib/errors';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { merchantSchema, listMerchants, createMerchant, updateMerchant, deleteMerchant, type MerchantForm, type Merchant } from '@financial/core';
import { listCategories } from '@financial/core';
import DataTable from '../../components/DataTable';
import CategorySelect from '../../components/CategorySelect';
import Modal from '../../components/Modal';
import PageHead from '../../components/PageHead';
import Skeleton from '../../components/Skeleton';

export default function MerchantsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Merchant | null>(null);
  const [showForm, setShowForm] = useState(false);
  const list = useQuery({ queryKey: ['merchants'], queryFn: listMerchants, retry: false });
  const cats = useQuery({ queryKey: ['categories'], queryFn: () => listCategories() });
  const inv = () => qc.invalidateQueries({ queryKey: ['merchants'] });
  const create = useMutation({ mutationFn: createMerchant, onSuccess: inv });
  const update = useMutation({ mutationFn: ({ id, v }: { id: number; v: MerchantForm }) => updateMerchant(id, v), onSuccess: inv });
  const remove = useMutation({ mutationFn: deleteMerchant, onSuccess: inv });
  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<MerchantForm>({ resolver: zodT(merchantSchema) });
  const active = (cats.data ?? []).filter((c) => c.isActive);
  const items = Array.isArray(list.data) ? list.data : [];

  // SPEC-09 §6: valor histórico huérfano aparece como opción "legado".
  const legacy = (m: { category: string }) =>
    active.some((c) => c.name === m.category) ? null : m.category;

  const close = () => { setShowForm(false); setEditing(null); reset(); };
  const openCreate = () => { setEditing(null); reset(); setShowForm(true); };
  const openEdit = (m: Merchant) => {
    setEditing(m);
    setValue('name', m.name); setValue('description', m.description); setValue('category', m.category);
    setShowForm(true);
  };

  const submit = (f: MerchantForm) => {
    if (editing) update.mutate({ id: editing.id, v: f }, { onSuccess: close });
    else create.mutate(f, { onSuccess: close });
  };

  if (list.isPending) return <Skeleton />;
  if (list.isError)
    return <div><p className="error-text">{t('common.error')}</p><button className="btn btn--sm" onClick={() => list.refetch()}>{t('common.retry')}</button></div>;

  return (
    <section>
      <PageHead
        title={t('merchants.title')}
        count={items.length}
        actions={<button className="btn btn--primary" onClick={openCreate}><Plus size={16} aria-hidden="true" />{t('common.create')}</button>}
      />

      <Modal open={showForm} onClose={close} title={editing ? t('common.edit') : t('common.create')}>
        <form onSubmit={handleSubmit(submit)}>
          <div className="field">
            <label htmlFor="mer-name">{t('common.name')}</label>
            <input id="mer-name" {...register('name')} />
            {errors.name && <p className="field__error">{String(errors.name.message)}</p>}
          </div>
          <div className="field">
            <label htmlFor="mer-desc">{t('common.description')}</label>
            <input id="mer-desc" {...register('description')} />
            {errors.description && <p className="field__error">{String(errors.description.message)}</p>}
          </div>
          <div className="field">
            <label htmlFor="mer-cat">{t('common.category')}</label>
            <Controller
              name="category" control={control}
              render={({ field }) => (
                <CategorySelect value={field.value ?? ''} onChange={field.onChange} name={field.name} allowLegacy={editing ? editing.category : undefined} />
              )}
            />
          </div>
          {(create.isError || update.isError) && <p className="error-text">{((create.error ?? update.error) as Error)?.message}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={close}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn--primary">{editing ? t('common.save') : t('common.create')}</button>
          </div>
        </form>
      </Modal>

      {remove.isError && <p className="error-text">{(remove.error as Error)?.message}</p>}
      {items.length === 0 ? <p className="empty-state">{t('merchants.empty')}</p> : (
        <DataTable
          columns={[{ key: 'name', label: t('common.name') }, { key: 'description', label: t('common.description') }, { key: 'category', label: t('common.category') }]}
          rows={items.map((m) => ({ ...m, category: legacy(m) ? `${m.category} (${t('merchants.legacy')})` : m.category }))}
          searchKeys={['name', 'description', 'category']}
          emptyText={t('merchants.empty')}
          renderActions={(r) => (
            <span style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn--sm" onClick={() => openEdit(r as unknown as Merchant)} title={t('common.edit')} aria-label={t('common.edit')}><Pencil size={15} aria-hidden="true" /></button>
              <button className="btn btn--sm btn--danger" onClick={() => remove.mutate(Number(r.id))} title={t('common.delete')} aria-label={t('common.delete')}><Trash2 size={15} aria-hidden="true" /></button>
            </span>
          )}
        />
      )}
    </section>
  );
}
