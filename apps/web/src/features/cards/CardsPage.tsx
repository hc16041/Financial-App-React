import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { zodT } from '../../lib/errors';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { listCards, getCardsSummary, getCardsConsumption, createCard, updateCard, deleteCard, cardSchema, money, type Card, type CardForm } from '@financial/core';
import { NameValueBars } from '../../components/Charts';
import Modal from '../../components/Modal';
import PageHead from '../../components/PageHead';
import Skeleton from '../../components/Skeleton';

const month = () => {
  const n = new Date();
  const f = (d: Date) => d.toISOString().slice(0, 10);
  return { from: f(new Date(n.getFullYear(), n.getMonth(), 1)), to: f(new Date(n.getFullYear(), n.getMonth() + 1, 0)) };
};

export default function CardsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);
  const [range] = useState(month);
  const inv = () => qc.invalidateQueries({ queryKey: ['cards'] });
  const create = useMutation({ mutationFn: createCard, onSuccess: () => { setShowForm(false); inv(); } });
  const upd = useMutation({
    mutationFn: ({ id, v }: { id: number; v: CardForm }) => updateCard(id, v),
    onSuccess: () => { setShowForm(false); setEditing(null); inv(); },
  });
  const del = useMutation({ mutationFn: deleteCard, onSuccess: inv });
  const { register, handleSubmit, reset } = useForm<CardForm>({ resolver: zodT(cardSchema) as unknown as Resolver<CardForm>, defaultValues: { isActive: true } });
  const openCreate = () => { setEditing(null); reset({ bankName: '', creditLimit: '', cutOffDay: 15, paymentDueDay: 5, annualInterestRate: '0', isActive: true }); setShowForm(true); };
  const openEdit = (c: Card) => {
    setEditing(c);
    reset({
      bankName: String(c.bankName ?? c.name ?? ''),
      creditLimit: String(c.creditLimit ?? 0),
      cutOffDay: Number(c.cutOffDay ?? 15),
      paymentDueDay: Number(c.paymentDueDay ?? 5),
      annualInterestRate: String(c.annualInterestRate ?? 0),
      isActive: c.isActive !== false,
    });
    setShowForm(true);
  };
  const submit = (f: CardForm) => {
    if (editing) upd.mutate({ id: editing.id, v: f });
    else create.mutate(f);
  };
  const sum = useQuery({ queryKey: ['cards', 'summary'], queryFn: getCardsSummary, retry: false });
  const cards = useQuery({ queryKey: ['cards', 'list'], queryFn: listCards, retry: false });
  const cons = useQuery({ queryKey: ['cards', 'consumption', range], queryFn: () => getCardsConsumption(range.from, range.to), retry: false });
  const items = Array.isArray(cards.data) ? cards.data : [];
  const consItems = Array.isArray(cons.data) ? cons.data : [];

  const close = () => { setShowForm(false); setEditing(null); reset(); };
  // Columnas camelCase/PascalCase del API: se muestran como vienen.
  const cell = (v: unknown) => money(v as number | string | null | undefined);

  if (sum.isPending || cards.isPending) return <Skeleton rows={4} />;
  if (sum.isError || cards.isError)
    return <div><p className="error-text">{t('common.error')}</p><button className="btn btn--sm" onClick={() => { sum.refetch(); cards.refetch(); }}>{t('common.retry')}</button></div>;

  return (
    <section>
      <PageHead
        title={t('cards.title')}
        count={items.length}
        actions={<button className="btn btn--primary" onClick={openCreate}><Plus size={16} aria-hidden="true" />{t('cards.new')}</button>}
      />

      <div className="balance-strip">
        <div className="balance-strip__total ledger-figure">{money(sum.data?.totalCurrentBalance ?? 0)}</div>
        <p style={{ color: 'var(--fp-text-muted)', margin: 'var(--fp-space-1) 0 0' }}>
          {t('cards.limit')}: {money(sum.data?.totalCreditLimit ?? 0)} · {t('cards.available')}: {money(sum.data?.totalAvailableCredit ?? 0)}
        </p>
      </div>

      <h3 style={{ marginTop: 'var(--fp-space-4)' }}>{t('cards.list')}</h3>

      <Modal open={showForm} onClose={close} title={editing ? t('common.edit') : t('cards.new')}>
        <form onSubmit={handleSubmit(submit)}>
          <div className="field">
            <label htmlFor="card-bank">{t('cards.bank')}</label>
            <input id="card-bank" {...register('bankName')} />
          </div>
          <div className="field">
            <label htmlFor="card-limit">{t('cards.limit')}</label>
            <input id="card-limit" {...register('creditLimit')} />
          </div>
          <div className="field">
            <label htmlFor="card-cut">{t('cards.cutOff')}</label>
            <input id="card-cut" {...register('cutOffDay', { valueAsNumber: true })} type="number" min={1} max={28} />
          </div>
          <div className="field">
            <label htmlFor="card-due">{t('cards.dueDay')}</label>
            <input id="card-due" {...register('paymentDueDay', { valueAsNumber: true })} type="number" min={1} max={28} />
          </div>
          <div className="field">
            <label htmlFor="card-rate">{t('cards.rate')}</label>
            <input id="card-rate" {...register('annualInterestRate')} />
          </div>
          <div className="field">
            <label htmlFor="card-active" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input id="card-active" type="checkbox" {...register('isActive')} />
              {t('common.active')}
            </label>
          </div>
          {create.isError && <p className="error-text">{(create.error as Error).message}</p>}
          {upd.isError && <p className="error-text">{(upd.error as Error).message}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={close}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn--primary">{editing ? t('common.save') : t('common.create')}</button>
          </div>
        </form>
      </Modal>

      {items.length === 0 ? <p className="empty-state">{t('common.empty')}</p> : (
        <div className="table-wrap"><table className="ledger">
          <thead>
            <tr>
              <th>{t('cards.bank')}</th><th>{t('cards.limit')}</th><th>{t('cards.balance')}</th>
              <th>{t('cards.available')}</th><th>{t('cards.cutOff')}</th><th>{t('cards.dueDay')}</th><th>{t('cards.rate')}</th><th />
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} data-sign="out">
                <td>{c.bankName ?? c.name ?? `#${c.id}`}</td>
                <td className="ledger-figure">{cell(c.creditLimit ?? c.limit)}</td>
                <td className="ledger-figure">{cell(c.currentBalance ?? c.balance)}</td>
                <td className="ledger-figure">{cell(c.availableCredit)}</td>
                <td>{c.cutOffDay ?? '—'}</td>
                <td>{c.paymentDueDay ?? '—'}</td>
                <td className="ledger-figure">{c.annualInterestRate ?? '—'}</td>
                <td style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn--sm" onClick={() => openEdit(c)} title={t('common.edit')} aria-label={t('common.edit')}><Pencil size={15} aria-hidden="true" /></button>
                  <button className="btn btn--sm btn--danger" onClick={() => del.mutate(c.id)} title={t('common.delete')} aria-label={t('common.delete')}><Trash2 size={15} aria-hidden="true" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      <h3 style={{ marginTop: 'var(--fp-space-4)' }}>{t('cards.consumption')}</h3>
      {cons.isPending ? <Skeleton rows={3} /> : consItems.length === 0 ? <p className="empty-state">{t('common.empty')}</p> : (
        <div className="card">
          <NameValueBars
            names={consItems.map((r) => String(r.bankName ?? `#${r.creditCardId}`))}
            values={consItems.map((r) => Number(r.totalExpenses ?? 0))}
            color="var(--fp-danger)"
            ariaLabel={t('cards.chartAria')}
          />
        </div>
      )}
    </section>
  );
}
