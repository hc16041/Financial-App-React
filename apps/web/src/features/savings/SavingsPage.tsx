import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodT } from '../../lib/errors';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import MoneyInput from '../../components/MoneyInput';
import Modal from '../../components/Modal';
import PageHead from '../../components/PageHead';
import Skeleton from '../../components/Skeleton';
import {
  getBalance, getHistory, postTx, normBalance,
  savingTxSchema, type SavingTxForm,
} from '@financial/core';

export default function SavingsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const bal = useQuery({ queryKey: ['savings', 'balance'], queryFn: getBalance, retry: false });
  const hist = useQuery({ queryKey: ['savings', 'history'], queryFn: getHistory, retry: false });
  const mut = useMutation({
    mutationFn: postTx,
    onSuccess: () => {
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['savings'] });
    },
  });

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<SavingTxForm>({
    resolver: zodT(savingTxSchema),
    defaultValues: { date: new Date().toISOString().slice(0, 10), transactionType: 1 as const },
  });

  const balance = normBalance(bal.data);
  const txs = Array.isArray(hist.data) ? hist.data : [];
  const close = () => { setShowForm(false); reset(); };

  if (bal.isPending || hist.isPending) return <Skeleton />;
  if (bal.isError || hist.isError)
    return (
      <div>
        <p className="error-text">{t('common.error')}</p>
        <button className="btn btn--sm" onClick={() => { bal.refetch(); hist.refetch(); }}>{t('common.retry')}</button>
      </div>
    );

  return (
    <section>
      <PageHead
        title={t('savings.title')}
        actions={
          <>
            <span className="badge">{t('savings.balance')}: <span className="ledger-figure">{balance ?? '—'}</span></span>
            <button className="btn btn--primary" onClick={() => setShowForm(true)}><Plus size={16} aria-hidden="true" />{t('savings.new')}</button>
          </>
        }
      />

      <Modal open={showForm} onClose={close} title={t('savings.new')}>
        <form onSubmit={handleSubmit((f) => mut.mutate(f, { onSuccess: () => reset() }))}>
          <div className="field">
            <label htmlFor="sav-date">{t('common.date')}</label>
            <input id="sav-date" {...register('date')} type="date" />
            {errors.date && <p className="field__error">{errors.date.message}</p>}
          </div>
          <div className="field">
            <label htmlFor="sav-amount">{t('common.amount')}</label>
            <Controller
              name="amount" control={control}
              render={({ field }) => <MoneyInput value={field.value ?? ''} onChange={field.onChange} name={field.name} placeholder="100.00" />}
            />
            {errors.amount && <p className="field__error">{errors.amount.message}</p>}
          </div>
          <div className="field">
            <label htmlFor="sav-desc">{t('common.description')}</label>
            <input id="sav-desc" {...register('description')} />
            {errors.description && <p className="field__error">{errors.description.message}</p>}
          </div>
          <div className="field">
            <label htmlFor="sav-type">{t('common.type')}</label>
            <select id="sav-type" {...register('transactionType', { valueAsNumber: true })}>
              <option value={1}>{t('savings.deposit')}</option>
              <option value={2}>{t('savings.withdrawal')}</option>
            </select>
          </div>
          {mut.isError && <p className="error-text">{(mut.error as Error).message}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={close}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn--primary" disabled={mut.isPending}>{mut.isPending ? t('common.loading') : t('common.save')}</button>
          </div>
        </form>
      </Modal>

      {txs.length === 0 ? (
        <p className="empty-state">{t('savings.empty')}</p>
      ) : (
        <div className="table-wrap"><table className="ledger">
          <thead><tr><th>{t('common.date')}</th><th>{t('common.description')}</th><th>{t('common.type')}</th><th>{t('common.amount')}</th></tr></thead>
          <tbody>
            {txs.map((tx: any) => (
              <tr key={tx.id} data-sign={tx.transactionType === 1 ? 'in' : 'out'}>
                <td>{String(tx.date).slice(0, 10)}</td>
                <td>{tx.description}</td>
                <td>{tx.transactionType === 1 ? t('savings.deposit') : t('savings.withdrawal')}</td>
                <td className="ledger-figure">{tx.amount}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </section>
  );
}
