import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { zodT } from '../../lib/errors';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2, TrendingUp } from 'lucide-react';
import {
  listInvestments, createInvestment, updateInvestment, deleteInvestment,
  listPlatforms, listWithdrawalMethods, investmentSchema, type Investment, type InvestmentForm,
} from '@financial/core';
import { listCards } from '@financial/core';
import KpiCard from '../../components/KpiCard';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import PageHead from '../../components/PageHead';
import Skeleton from '../../components/Skeleton';

export default function InvestmentsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Investment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const q = useQuery({ queryKey: ['investments'], queryFn: listInvestments, retry: false });
  const plats = useQuery({ queryKey: ['platforms'], queryFn: listPlatforms });
  const methods = useQuery({ queryKey: ['withdrawalMethods'], queryFn: listWithdrawalMethods });
  const cards = useQuery({ queryKey: ['cards', 'list'], queryFn: listCards, retry: false });
  const inv = () => qc.invalidateQueries({ queryKey: ['investments'] });
  const create = useMutation({ mutationFn: createInvestment, onSuccess: inv });
  const update = useMutation({
    mutationFn: ({ id, v }: { id: number; v: InvestmentForm }) => updateInvestment(id, v),
    onSuccess: inv,
  });
  const remove = useMutation({ mutationFn: deleteInvestment, onSuccess: inv });
  const { register, handleSubmit, reset, setValue } = useForm<InvestmentForm>({
    // commission tiene default en el schema: en el formulario siempre llega definido.
    resolver: zodT(investmentSchema) as unknown as Resolver<InvestmentForm>,
    defaultValues: { transactionType: 2, transactionDate: new Date().toISOString().slice(0, 10), commission: '0' },
  });

  const items: Investment[] = Array.isArray(q.data) ? q.data : [];
  const total = items.reduce((a, x) => a + Number(x.total ?? 0), 0);
  const opt = (v: string | number | null | undefined) => (v === '' || v == null ? undefined : Number(v));

  const close = () => { setShowForm(false); setEditing(null); reset(); };
  const openCreate = () => { setEditing(null); reset(); setShowForm(true); };
  const openEdit = (x: Investment) => {
    setEditing(x);
    setValue('platformId', x.platformId); setValue('amount', String(x.amount));
    setValue('commission', String(x.commission)); setValue('transactionType', x.transactionType === 1 ? 1 : 2);
    setValue('transactionDate', String(x.transactionDate ?? '').slice(0, 10));
    setShowForm(true);
  };

  const submit = (f: InvestmentForm) => {
    const body: InvestmentForm = { ...f, withdrawalMethodId: opt(f.withdrawalMethodId), creditCardId: opt(f.creditCardId) };
    if (editing) update.mutate({ id: editing.id, v: body }, { onSuccess: close });
    else create.mutate(body, { onSuccess: close });
  };

  if (q.isPending) return <Skeleton rows={4} />;
  if (q.isError) return <div><p className="error-text">{t('common.error')}</p><button className="btn btn--sm" onClick={() => q.refetch()}>{t('common.retry')}</button></div>;

  return (
    <section>
      <PageHead
        title={t('invest.title')}
        count={items.length}
        actions={<button className="btn btn--primary" onClick={openCreate}><Plus size={16} aria-hidden="true" />{t('common.create')}</button>}
      />

      <div className="grid-kpi" style={{ marginBottom: 'var(--fp-space-4)' }}>
        <KpiCard label={t('invest.total')} value={total.toFixed(2)} tone="in" icon={TrendingUp} />
      </div>

      <Modal open={showForm} onClose={close} title={editing ? t('common.edit') : t('common.create')}>
        <form onSubmit={handleSubmit(submit)}>
          <div className="field">
            <label htmlFor="inv-plat">{t('invest.platform')}</label>
            <select id="inv-plat" {...register('platformId', { valueAsNumber: true })}>
              {(plats.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="inv-amount">{t('common.amount')}</label>
            <input id="inv-amount" {...register('amount')} inputMode="decimal" />
          </div>
          <div className="field">
            <label htmlFor="inv-comm">{t('common.commission')}</label>
            <input id="inv-comm" {...register('commission')} inputMode="decimal" />
          </div>
          <div className="field">
            <label htmlFor="inv-type">{t('common.type')}</label>
            <select id="inv-type" {...register('transactionType', { valueAsNumber: true })}>
              <option value={2}>{t('invest.income')}</option>
              <option value={1}>{t('invest.withdraw')}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="inv-date">{t('common.date')}</label>
            <input id="inv-date" {...register('transactionDate')} type="date" />
          </div>
          <div className="field">
            <label htmlFor="inv-method">{t('invest.noMethod')}</label>
            <select id="inv-method" {...register('withdrawalMethodId')}>
              <option value="">{t('invest.noMethod')}</option>
              {(methods.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="inv-card">{t('invest.noCard')}</label>
            <select id="inv-card" {...register('creditCardId')}>
              <option value="">{t('invest.noCard')}</option>
              {(Array.isArray(cards.data) ? cards.data : []).map((c) => <option key={c.id} value={c.id}>{c.name ?? `#${c.id}`}</option>)}
            </select>
          </div>
          {(create.isError || update.isError) && <p className="error-text">{((create.error ?? update.error) as Error)?.message}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={close}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn--primary">{editing ? t('common.save') : t('common.create')}</button>
          </div>
        </form>
      </Modal>

      {remove.isError && <p className="error-text">{((remove.error) as Error)?.message}</p>}
      {items.length === 0 ? <p className="empty-state">{t('common.empty')}</p> : (
        <DataTable
          columns={[
            { key: 'platform', label: t('invest.platform') },
            { key: 'date', label: t('common.date') },
            { key: 'kind', label: t('common.type') },
            { key: 'amount', label: t('common.amount'), figure: true },
            { key: 'commission', label: t('common.commission'), figure: true },
            { key: 'total', label: t('common.total'), figure: true },
          ]}
          rows={items.map((x) => ({
            ...x,
            platform: (x.platformName ?? `#${x.platformId}`) as string,
            date: String(x.transactionDate ?? '').slice(0, 10),
            kind: Number(x.transactionType) === 2 ? t('invest.income') : t('invest.withdraw'),
            amount: Number(x.amount).toFixed(2),
            commission: Number(x.commission).toFixed(2),
            total: Number(x.total).toFixed(2),
          }))}
          searchKeys={['platform']}
          emptyText={t('common.empty')}
          renderActions={(r) => (
            <span style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn--sm" onClick={() => openEdit(r as unknown as Investment)} title={t('common.edit')} aria-label={t('common.edit')}><Pencil size={15} aria-hidden="true" /></button>
              <button className="btn btn--sm btn--danger" onClick={() => remove.mutate(Number(r.id))} title={t('common.delete')} aria-label={t('common.delete')}><Trash2 size={15} aria-hidden="true" /></button>
            </span>
          )}
        />
      )}
    </section>
  );
}
