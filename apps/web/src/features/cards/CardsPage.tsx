import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodT } from '../../lib/errors';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { listCards, getCardsSummary, getCardsConsumption, createCard, cardSchema, type CardForm } from '@financial/core';
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
  const [range] = useState(month);
  const create = useMutation({ mutationFn: createCard, onSuccess: () => qc.invalidateQueries({ queryKey: ['cards'] }) });
  const { register, handleSubmit, reset } = useForm<CardForm>({ resolver: zodT(cardSchema) });
  const sum = useQuery({ queryKey: ['cards', 'summary'], queryFn: getCardsSummary, retry: false });
  const cards = useQuery({ queryKey: ['cards', 'list'], queryFn: listCards, retry: false });
  const cons = useQuery({ queryKey: ['cards', 'consumption', range], queryFn: () => getCardsConsumption(range.from, range.to), retry: false });
  const items = Array.isArray(cards.data) ? cards.data : [];
  const consItems = Array.isArray(cons.data) ? cons.data : [];

  const close = () => { setShowForm(false); reset(); };
  // Columnas camelCase/PascalCase del API: se muestran como vienen.
  const cell = (v: unknown) => (v == null || v === '' ? '�' : String(v));

  if (sum.isPending || cards.isPending) return <Skeleton rows={4} />;
  if (sum.isError || cards.isError)
    return <div><p className="error-text">{t('common.error')}</p><button className="btn btn--sm" onClick={() => { sum.refetch(); cards.refetch(); }}>{t('common.retry')}</button></div>;

  return (
    <section>
      <PageHead
        title={t('cards.title')}
        count={items.length}
        actions={<button className="btn btn--primary" onClick={() => setShowForm(true)}><Plus size={16} aria-hidden="true" />{t('cards.new')}</button>}
      />

      <div className="balance-strip">
        <div className="balance-strip__total ledger-figure">{Number(sum.data?.totalCurrentBalance ?? 0).toFixed(2)}</div>
        <p style={{ color: 'var(--fp-text-muted)', margin: 'var(--fp-space-1) 0 0' }}>
          {t('cards.limit')}: {Number(sum.data?.totalCreditLimit ?? 0).toFixed(2)} · {t('cards.available')}: {Number(sum.data?.totalAvailableCredit ?? 0).toFixed(2)}
        </p>
      </div>

      <h3 style={{ marginTop: 'var(--fp-space-4)' }}>{t('cards.list')}</h3>

      <Modal open={showForm} onClose={close} title={t('cards.new')}>
        <form onSubmit={handleSubmit((f) => create.mutate(f, { onSuccess: close }))}>
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
          {create.isError && <p className="error-text">{(create.error as Error).message}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={close}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn--primary">{t('common.create')}</button>
          </div>
        </form>
      </Modal>

      {items.length === 0 ? <p className="empty-state">{t('common.empty')}</p> : (
        <div className="table-wrap"><table className="ledger">
          <thead><tr><th>{t('common.name')}</th><th>{t('cards.limit')}</th><th>{t('cards.balance')}</th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} data-sign="out">
                <td>{c.name ?? `#${c.id}`}</td>
                <td className="ledger-figure">{cell(c.creditLimit ?? c.limit)}</td>
                <td className="ledger-figure">{cell(c.currentBalance ?? c.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      <h3 style={{ marginTop: 'var(--fp-space-4)' }}>{t('cards.consumption')}</h3>
      {cons.isPending ? <Skeleton rows={3} /> : consItems.length === 0 ? <p className="empty-state">{t('common.empty')}</p> : (
        <NameValueBars
          names={consItems.map((r, i) => String(r.cardName ?? r.name ?? r.cardId ?? `#${i}`))}
          values={consItems.map((r) => Number(r.total ?? r.amount ?? 0))}
          color="var(--fp-danger)"
          ariaLabel={t('cards.chartAria')}
        />
      )}
    </section>
  );
}
