import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodT } from '../../lib/errors';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { budgetSchema, listBudgets, createBudget, deleteBudget, pct, stateOf, type BudgetForm } from '@financial/core';
import { listCategories } from '@financial/core';
import Modal from '../../components/Modal';
import PageHead from '../../components/PageHead';
import Skeleton from '../../components/Skeleton';

export default function BudgetsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const now = new Date();
  const [showForm, setShowForm] = useState(false);
  const budgets = useQuery({ queryKey: ['budgets'], queryFn: listBudgets });
  const cats = useQuery({ queryKey: ['categories'], queryFn: () => listCategories() });
  const inv = () => qc.invalidateQueries({ queryKey: ['budgets'] });
  const create = useMutation({ mutationFn: createBudget, onSuccess: inv });
  const remove = useMutation({ mutationFn: deleteBudget, onSuccess: inv });
  const { register, handleSubmit, reset } = useForm<BudgetForm>({
    resolver: zodT(budgetSchema),
    defaultValues: { month: now.getMonth() + 1, year: now.getFullYear() },
  });
  const catName = (id: number) => cats.data?.find((c) => c.id === Number(id))?.name ?? `#${id}`;
  const color = (s: string) => (s === 'over' ? 'var(--fp-danger)' : s === 'warn' ? 'var(--fp-warning)' : 'var(--fp-success)');

  const close = () => { setShowForm(false); reset(); };

  if (budgets.isPending) return <Skeleton />;
  if (budgets.isError) return <div><p className="error-text">{t('common.error')}</p><button className="btn btn--sm" onClick={() => budgets.refetch()}>{t('common.retry')}</button></div>;
  const items = budgets.data ?? [];

  return (
    <section>
      <PageHead
        title={t('budgets.title')}
        count={items.length}
        actions={<button className="btn btn--primary" onClick={() => setShowForm(true)}><Plus size={16} aria-hidden="true" />{t('common.create')}</button>}
      />

      <Modal open={showForm} onClose={close} title={t('common.create')}>
        <form onSubmit={handleSubmit((f) => create.mutate(f, { onSuccess: close }))}>
          <div className="field">
            <label htmlFor="bgt-cat">{t('common.category')}</label>
            <select id="bgt-cat" {...register('categoryId', { valueAsNumber: true })}>
              {(cats.data ?? []).filter((c) => c.isActive).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="bgt-month">{t('budgets.month')}</label>
            <input id="bgt-month" {...register('month', { valueAsNumber: true })} type="number" min={1} max={12} />
          </div>
          <div className="field">
            <label htmlFor="bgt-year">{t('budgets.year')}</label>
            <input id="bgt-year" {...register('year', { valueAsNumber: true })} type="number" />
          </div>
          <div className="field">
            <label htmlFor="bgt-limit">{t('common.limit')}</label>
            <input id="bgt-limit" {...register('limit')} placeholder="500.00" />
          </div>
          {create.isError && <p className="error-text">{(create.error as Error).message}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={close}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn--primary">{t('common.create')}</button>
          </div>
        </form>
      </Modal>

      {items.length === 0 ? <p className="empty-state">{t('budgets.empty')}</p> : (
        <div className="table-wrap"><table className="ledger">
          <thead><tr><th>{t('common.category')}</th><th>{t('budgets.month')}</th><th>{t('common.limit')}</th><th>{t('budgets.spent')}</th><th>%</th><th /></tr></thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id}>
                <td>{b.categoryName ?? catName(b.categoryId)}</td>
                <td>{b.month}/{b.year}</td>
                <td className="ledger-figure">{Number(b.limit).toFixed(2)}</td>
                <td className="ledger-figure">{Number(b.spent).toFixed(2)}</td>
                <td style={{ color: color(stateOf(b)) }}>{pct(b)}%</td>
                <td><button className="btn btn--sm btn--danger" onClick={() => remove.mutate(b.id)} title={t('common.delete')} aria-label={t('common.delete')}><Trash2 size={15} aria-hidden="true" /></button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </section>
  );
}
