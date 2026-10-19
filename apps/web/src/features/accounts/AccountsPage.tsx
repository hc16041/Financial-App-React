import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodT } from '../../lib/errors';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, Plus } from 'lucide-react';
import MoneyInput from '../../components/MoneyInput';
import Modal from '../../components/Modal';
import PageHead from '../../components/PageHead';
import Skeleton from '../../components/Skeleton';
import { accountSchema, txSchema, listAccounts, createAccount, listTx, createTx } from '@financial/core';
import type { TxFilters, AccountForm, PersonalTxForm } from '@financial/core';
import { listCategories } from '@financial/core';

export default function AccountsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [showAcc, setShowAcc] = useState(false);
  const [showTx, setShowTx] = useState(false);
  const [filters, setFilters] = useState<TxFilters>({});
  const accs = useQuery({ queryKey: ['accounts'], queryFn: listAccounts });
  const txs = useQuery({ queryKey: ['ptx', filters], queryFn: () => listTx(filters) });
  const cats = useQuery({ queryKey: ['categories'], queryFn: () => listCategories() });
  const inv = () => { qc.invalidateQueries({ queryKey: ['accounts'] }); qc.invalidateQueries({ queryKey: ['ptx'] }); };
  const addAcc = useMutation({ mutationFn: createAccount, onSuccess: inv });
  const addTx = useMutation({ mutationFn: createTx, onSuccess: inv });
  const fAcc = useForm<AccountForm>({ resolver: zodT(accountSchema) });
  const fTx = useForm<PersonalTxForm>({
    resolver: zodT(txSchema),
    defaultValues: { date: new Date().toISOString().slice(0, 10), type: 2 },
  });
  const catName = (id: number) => cats.data?.find((c) => c.id === Number(id))?.name ?? `#${id}`;
  const accName = (id: number) => accs.data?.find((a) => a.id === Number(id))?.name ?? `#${id}`;

  const closeAcc = () => { setShowAcc(false); fAcc.reset(); };
  const closeTx = () => { setShowTx(false); fTx.reset(); };

  if (accs.isPending || txs.isPending) return <Skeleton />;
  if (accs.isError || txs.isError) return <div><p className="error-text">{t('common.error')}</p><button className="btn btn--sm" onClick={() => { accs.refetch(); txs.refetch(); }}>{t('common.retry')}</button></div>;

  return (
    <section>
      <PageHead
        title={t('accounts.title')}
        count={(accs.data ?? []).length}
        actions={
          <>
            <button className="btn" onClick={() => setShowAcc(true)}><Plus size={16} aria-hidden="true" />{t('accounts.newAccount')}</button>
            <button className="btn btn--primary" onClick={() => setShowTx(true)}><ArrowLeftRight size={16} aria-hidden="true" />{t('accounts.movement')}</button>
          </>
        }
      />

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 var(--fp-space-4)', display: 'flex', flexWrap: 'wrap', gap: 'var(--fp-space-2)' }}>
        {(accs.data ?? []).map((a) => (
          <li key={a.id} className="card" style={{ padding: 'var(--fp-space-2) var(--fp-space-3)' }}>{a.name} ({a.type === 1 ? t('accounts.cash') : t('accounts.bank')}) — <span className="ledger-figure">{Number(a.balance).toFixed(2)}</span></li>
        ))}
      </ul>

      <Modal open={showAcc} onClose={closeAcc} title={t('accounts.newAccount')}>
        <form onSubmit={fAcc.handleSubmit((f) => addAcc.mutate(f, { onSuccess: closeAcc }))}>
          <div className="field">
            <label htmlFor="acc-name">{t('common.name')}</label>
            <input id="acc-name" {...fAcc.register('name')} />
          </div>
          <div className="field">
            <label htmlFor="acc-type">{t('common.type')}</label>
            <select id="acc-type" {...fAcc.register('type', { valueAsNumber: true })}><option value={1}>{t('accounts.cash')}</option><option value={2}>{t('accounts.bank')}</option></select>
          </div>
          {addAcc.isError && <p className="error-text">{(addAcc.error as Error).message}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={closeAcc}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn--primary">{t('common.create')}</button>
          </div>
        </form>
      </Modal>

      <Modal open={showTx} onClose={closeTx} title={t('accounts.movement')}>
        <form onSubmit={fTx.handleSubmit((f) => addTx.mutate(f, { onSuccess: closeTx }))}>
          <div className="field">
            <label htmlFor="tx-acc">{t('nav.accounts')}</label>
            <select id="tx-acc" {...fTx.register('accountId', { valueAsNumber: true })}>
              {(accs.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="tx-cat">{t('common.category')}</label>
            <select id="tx-cat" {...fTx.register('categoryId', { valueAsNumber: true })}>
              {(cats.data ?? []).filter((c) => c.isActive).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="tx-type">{t('common.type')}</label>
            <select id="tx-type" {...fTx.register('type', { valueAsNumber: true })}>
              <option value={1}>{t('categories.income')}</option><option value={2}>{t('categories.expense')}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="tx-amount">{t('common.amount')}</label>
            <Controller
              name="amount" control={fTx.control}
              render={({ field }) => <MoneyInput value={field.value ?? ''} onChange={field.onChange} name={field.name} placeholder="100.00" />}
            />
          </div>
          <div className="field">
            <label htmlFor="tx-date">{t('common.date')}</label>
            <input id="tx-date" {...fTx.register('date')} type="date" />
          </div>
          <div className="field">
            <label htmlFor="tx-note">{t('common.note')}</label>
            <input id="tx-note" {...fTx.register('note')} />
          </div>
          {addTx.isError && <p className="error-text">{(addTx.error as Error).message}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={closeTx}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn--primary">{t('accounts.register')}</button>
          </div>
        </form>
      </Modal>

      <div className="row-between" style={{ margin: 'var(--fp-space-4) 0 var(--fp-space-2)', flexWrap: 'wrap', gap: 'var(--fp-space-2)' }}>
        <select
          aria-label={t('nav.accounts')}
          value={filters.accountId ?? ''}
          onChange={(e) => setFilters({ ...filters, accountId: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">{t('common.all')} — {t('nav.accounts')}</option>
          {(accs.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select
          aria-label={t('common.category')}
          value={filters.categoryId ?? ''}
          onChange={(e) => setFilters({ ...filters, categoryId: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">{t('common.all')} — {t('common.category')}</option>
          {(cats.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" aria-label={`${t('common.date')} (desde)`} title={`${t('common.date')} (desde)`} value={filters.from ?? ''} onChange={(e) => setFilters({ ...filters, from: e.target.value || undefined })} />
        <input type="date" aria-label={`${t('common.date')} (hasta)`} title={`${t('common.date')} (hasta)`} value={filters.to ?? ''} onChange={(e) => setFilters({ ...filters, to: e.target.value || undefined })} />
        <button className="btn btn--sm" onClick={() => setFilters({})}>{t('common.clear')}</button>
      </div>

      <div className="table-wrap"><table className="ledger">
        <thead><tr><th>{t('common.date')}</th><th>{t('nav.accounts')}</th><th>{t('common.category')}</th><th>{t('common.type')}</th><th>{t('common.amount')}</th></tr></thead>
        <tbody>{(txs.data ?? []).map((tx) => (
          <tr key={tx.id} data-sign={tx.type === 1 ? 'in' : 'out'}><td>{tx.date.slice(0, 10)}</td><td>{tx.accountName ?? accName(tx.accountId)}</td><td>{tx.categoryId ? catName(tx.categoryId) : '—'}</td><td>{tx.type === 1 ? t('categories.income') : t('categories.expense')}</td><td className="ledger-figure">{Number(tx.amount).toFixed(2)}</td></tr>
        ))}</tbody>
      </table></div>
      {(txs.data ?? []).length === 0 && <p className="empty-state">{t('accounts.empty')}</p>}
    </section>
  );
}
