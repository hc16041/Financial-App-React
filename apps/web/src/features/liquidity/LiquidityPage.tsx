import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ArrowRightLeft, Banknote, CreditCard, Landmark, Plus, Trash2, Wallet } from 'lucide-react';
import {
  createTransfer, deleteTransfer, listAccounts, listCards, listTransfers,
  money, sumMoney, toCents, fromCents,
  transferSchema,
  type Account, type Card, type Transfer, type TransferForm,
} from '@financial/core';
import { zodT } from '../../lib/errors';
import PageHead from '../../components/PageHead';
import KpiCard from '../../components/KpiCard';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import MoneyInput from '../../components/MoneyInput';
import Skeleton from '../../components/Skeleton';

type Kind = 'account' | 'card';
const today = () => new Date().toISOString().slice(0, 10);

export default function LiquidityPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [fromKind, setFromKind] = useState<Kind>('account');
  const [toKind, setToKind] = useState<Kind>('account');
  const [ok, setOk] = useState(false);

  const accs = useQuery({ queryKey: ['accounts'], queryFn: listAccounts });
  const cards = useQuery({ queryKey: ['cards'], queryFn: listCards });
  const transfers = useQuery({ queryKey: ['transfers'], queryFn: listTransfers });

  const inv = () => {
    qc.invalidateQueries({ queryKey: ['accounts'] });
    qc.invalidateQueries({ queryKey: ['cards'] });
    qc.invalidateQueries({ queryKey: ['transfers'] });
    qc.invalidateQueries({ queryKey: ['ptx'] });
  };

  const form = useForm<TransferForm>({
    resolver: zodT(transferSchema),
    defaultValues: { amount: '', feeAmount: '', date: today(), note: '' },
  });
  const { register, handleSubmit, control, reset, setValue, formState: { errors } } = form;

  const create = useMutation({
    mutationFn: createTransfer,
    onSuccess: () => {
      inv();
      setShowForm(false);
      setOk(true);
      setTimeout(() => setOk(false), 4000);
      reset({ amount: '', feeAmount: '', date: today(), note: '' });
      setFromKind('account');
      setToKind('account');
    },
  });

  const remove = useMutation({ mutationFn: deleteTransfer, onSuccess: inv });

  const accounts = accs.data ?? [];
  const cardList = cards.data ?? [];
  const list = transfers.data ?? [];

  if (accs.isLoading || cards.isLoading || transfers.isLoading) return <Skeleton rows={7} />;
  if (accs.isError || cards.isError || transfers.isError) {
    return (
      <div>
        <p className="error-text">{t('common.error')}</p>
        <button className="btn btn--sm" onClick={() => { accs.refetch(); cards.refetch(); transfers.refetch(); }}>
          {t('common.retry')}
        </button>
      </div>
    );
  }

  const liquidity = sumMoney(accounts.map((a: Account) => String(a.balance)));
  const cardDebt = sumMoney(cardList.map((c: Card) => String(c.currentBalance ?? 0)));
  const available = sumMoney(cardList.map((c: Card) => String((c.creditLimit ?? 0) - (c.currentBalance ?? 0))));
  const net = fromCents(toCents(liquidity) - toCents(cardDebt));

  const switchFrom = (k: Kind) => {
    setValue('fromAccountId', '');
    setValue('fromCreditCardId', '');
    setFromKind(k);
  };
  const switchTo = (k: Kind) => {
    setValue('toAccountId', '');
    setValue('toCreditCardId', '');
    setToKind(k);
  };

  const close = () => { setShowForm(false); create.reset(); };

  const rows = list.map((x: Transfer) => ({
    id: x.id,
    date: x.date.slice(0, 10),
    from: x.fromAccountName ?? x.fromCreditCardName ?? '—',
    to: x.toAccountName ?? x.toCreditCardName ?? '—',
    amount: x.amount,
    fee: x.feeAmount,
    note: x.note,
  }));

  return (
    <div>
      <PageHead
        title={t('liquidity.title')}
        section={t('sections.finance')}
        count={list.length}
        actions={
          <button className="btn btn--primary" onClick={() => setShowForm(true)}>
            <Plus size={16} aria-hidden="true" />{t('liquidity.new')}
          </button>
        }
      />

      {ok && <p className="form-note" role="status">{t('liquidity.created')}</p>}

      <div className="kpi-grid">
        <KpiCard label={t('liquidity.totalLiquidity')} value={money(liquidity)} tone="in" icon={Wallet} />
        <KpiCard label={t('liquidity.cardDebt')} value={money(cardDebt)} tone="out" icon={CreditCard} />
        <KpiCard label={t('liquidity.availableCredit')} value={money(available)} tone="neutral" icon={Banknote} />
        <KpiCard label={t('liquidity.net')} value={money(net)} tone={toCents(net) < 0 ? 'warn' : 'in'} icon={Landmark} />
      </div>

      <section className="card">
        <h2 className="card__title">{t('liquidity.history')}</h2>
        <DataTable
          columns={[
            { key: 'date', label: t('common.date') },
            { key: 'from', label: t('liquidity.from') },
            { key: 'to', label: t('liquidity.to') },
            { key: 'amount', label: t('liquidity.amount'), figure: true },
            { key: 'fee', label: t('liquidity.fee'), figure: true },
            { key: 'note', label: t('common.note') },
          ]}
          rows={rows}
          searchKeys={['date', 'from', 'to', 'note']}
          emptyText={t('liquidity.empty')}
          renderActions={(row) => (
            <button
              className="btn btn--ghost btn--sm icon-btn"
              aria-label={t('common.delete')}
              onClick={() => {
                if (window.confirm(t('liquidity.confirmDelete'))) remove.mutate(Number(row.id));
              }}
              disabled={remove.isPending}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          )}
        />
      </section>

      <Modal open={showForm} onClose={close} title={t('liquidity.new')} wide>
        <form onSubmit={handleSubmit((f) => create.mutate(f))}>
          <div className="field">
            <label htmlFor="from-kind">{t('liquidity.from')}</label>
            <div className="form-row">
              <select id="from-kind" value={fromKind} onChange={(e) => switchFrom(e.target.value as Kind)}>
                <option value="account">{t('liquidity.account')}</option>
                <option value="card">{t('liquidity.card')}</option>
              </select>
              {fromKind === 'account' ? (
                <select id="from-account" {...register('fromAccountId')}>
                  <option value="">—</option>
                  {accounts.map((a: Account) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              ) : (
                <select id="from-card" {...register('fromCreditCardId')}>
                  <option value="">—</option>
                  {cardList.map((c: Card) => <option key={c.id} value={c.id}>{c.bankName ?? `#${c.id}`}</option>)}
                </select>
              )}
            </div>
            {(errors.fromAccountId || errors.fromCreditCardId) && (
              <p className="field__error">{errors.fromAccountId?.message ?? errors.fromCreditCardId?.message}</p>
            )}
          </div>

          <div className="field">
            <label htmlFor="to-kind">{t('liquidity.to')}</label>
            <div className="form-row">
              <select id="to-kind" value={toKind} onChange={(e) => switchTo(e.target.value as Kind)}>
                <option value="account">{t('liquidity.account')}</option>
                <option value="card">{t('liquidity.card')}</option>
              </select>
              {toKind === 'account' ? (
                <select id="to-account" {...register('toAccountId')}>
                  <option value="">—</option>
                  {accounts.map((a: Account) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              ) : (
                <select id="to-card" {...register('toCreditCardId')}>
                  <option value="">—</option>
                  {cardList.map((c: Card) => <option key={c.id} value={c.id}>{c.bankName ?? `#${c.id}`}</option>)}
                </select>
              )}
            </div>
            {(errors.toAccountId || errors.toCreditCardId) && (
              <p className="field__error">{errors.toAccountId?.message ?? errors.toCreditCardId?.message}</p>
            )}
          </div>

          <div className="form-row">
            <div className="field">
              <label htmlFor="tr-amount">{t('liquidity.amount')}</label>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <MoneyInput value={field.value ?? ''} onChange={field.onChange} name={field.name} placeholder="100.00" />
                )}
              />
              {errors.amount && <p className="field__error">{errors.amount.message}</p>}
            </div>
            <div className="field">
              <label htmlFor="tr-fee">{t('liquidity.fee')}</label>
              <Controller
                control={control}
                name="feeAmount"
                render={({ field }) => (
                  <MoneyInput value={field.value ?? ''} onChange={field.onChange} name={field.name} placeholder="0.00" />
                )}
              />
              {errors.feeAmount && <p className="field__error">{errors.feeAmount.message}</p>}
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label htmlFor="tr-date">{t('liquidity.date')}</label>
              <input id="tr-date" type="date" {...register('date')} />
              {errors.date && <p className="field__error">{errors.date.message}</p>}
            </div>
            <div className="field">
              <label htmlFor="tr-note">{t('liquidity.note')}</label>
              <input id="tr-note" {...register('note')} maxLength={500} />
            </div>
          </div>

          {create.isError && <p className="error-text" role="alert">{(create.error as Error).message}</p>}

          <div className="form-actions">
            <button type="button" className="btn" onClick={close}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn--primary" disabled={create.isPending}>
              <ArrowRightLeft size={16} aria-hidden="true" />
              {create.isPending ? t('common.loading') : t('liquidity.transfer')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
