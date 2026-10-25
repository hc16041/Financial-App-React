import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { BarChart3, Banknote, CheckCircle2, HandCoins, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import {
  loanSchema, loanPaymentSchema, listLoans, createLoan, updateLoan, payLoan, deleteLoan,
  listAccounts, money, sumMoney, toCents, type Loan, type LoanForm, type LoanPaymentForm,
} from '@financial/core';
import { zodT } from '../../lib/errors';
import DataTable from '../../components/DataTable';
import KpiCard from '../../components/KpiCard';
import Modal from '../../components/Modal';
import PageHead from '../../components/PageHead';
import Skeleton from '../../components/Skeleton';
import ProjectionPanel from './ProjectionPanel';

const today = () => new Date().toISOString().slice(0, 10);

export default function LoansPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [paying, setPaying] = useState<Loan | null>(null);
  const [projecting, setProjecting] = useState<Loan | null>(null);

  const list = useQuery({ queryKey: ['loans'], queryFn: listLoans });
  const accs = useQuery({ queryKey: ['accounts'], queryFn: listAccounts });
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['loans'] });
    qc.invalidateQueries({ queryKey: ['accounts'] });
    qc.invalidateQueries({ queryKey: ['ptx'] });
  };
  const create = useMutation({ mutationFn: createLoan, onSuccess: inv });
  const update = useMutation({ mutationFn: ({ id, v }: { id: number; v: LoanForm }) => updateLoan(id, v), onSuccess: inv });
  const pay = useMutation({
    mutationFn: ({ id, p }: { id: number; p: LoanPaymentForm }) => payLoan(id, p),
    onSuccess: inv,
  });
  const remove = useMutation({ mutationFn: deleteLoan, onSuccess: inv });

  const form = useForm<LoanForm>({
    resolver: zodT(loanSchema),
    defaultValues: { startDate: today(), name: '', principal: '', balance: '', lender: '' },
  });
  const fPay = useForm<LoanPaymentForm>({
    resolver: zodT(loanPaymentSchema),
    defaultValues: { amount: '', date: today() },
  });
  const { register, handleSubmit, reset, formState: { errors } } = form;

  const items = Array.isArray(list.data) ? list.data : [];
  const open = items.filter((l) => !l.isClosed);
  const closed = items.filter((l) => l.isClosed);
  const debt = sumMoney(open.map((l) => String(l.balance)));
  const accounts = accs.data ?? [];
  const hasAccounts = accounts.length > 0;

  const close = () => { setShowForm(false); setEditing(null); reset(); };
  const openCreate = () => { setEditing(null); reset({ startDate: today(), name: '', principal: '', balance: '', lender: '' }); setShowForm(true); };
  const openEdit = (l: Loan) => {
    setEditing(l);
    form.reset({
      name: l.name,
      lender: l.lender ?? '',
      principal: String(l.principal),
      balance: String(l.balance),
      interestRate: l.interestRate === null ? '' : String(l.interestRate),
      installmentAmount: l.installmentAmount === null ? '' : String(l.installmentAmount),
      termMonths: l.termMonths === null ? '' : String(l.termMonths),
      startDate: String(l.startDate).slice(0, 10),
      dueDay: l.dueDay === null ? '' : String(l.dueDay),
    });
    setShowForm(true);
  };
  const closePay = () => { setPaying(null); fPay.reset({ amount: '', date: today() }); };

  const submit = (f: LoanForm) => {
    if (editing) update.mutate({ id: editing.id, v: f }, { onSuccess: close });
    else create.mutate(f, { onSuccess: close });
  };

  // Regla 7: solo se borra un préstamo sin abonos (saldo == monto original).
  const deletable = (l: Loan) => !l.isClosed && toCents(String(l.balance)) === toCents(String(l.principal));

  if (list.isPending) return <Skeleton rows={6} />;
  if (list.isError) {
    return (
      <div>
        <p className="error-text">{t('common.error')}</p>
        <button className="btn btn--sm" onClick={() => list.refetch()}>{t('common.retry')}</button>
      </div>
    );
  }

  return (
    <section>
      <PageHead
        title={t('loans.title')}
        count={items.length}
        actions={<button className="btn btn--primary" onClick={openCreate}><Plus size={16} aria-hidden="true" />{t('loans.newLoan')}</button>}
      />

      <div className="grid-kpi" style={{ marginBottom: 'var(--fp-space-4)' }}>
        <KpiCard label={t('loans.totalDebt')} value={money(debt)} tone={open.length > 0 ? 'out' : 'neutral'} icon={HandCoins} />
        <KpiCard label={t('loans.activeCount')} value={String(open.length)} icon={Wallet} />
        <KpiCard label={t('loans.closedCount')} value={String(closed.length)} tone="in" icon={CheckCircle2} />
      </div>

      <Modal open={showForm} onClose={close} title={editing ? t('loans.editLoan') : t('loans.newLoan')}>
        <form onSubmit={handleSubmit(submit)}>
          <div className="field">
            <label htmlFor="loan-name">{t('common.name')}</label>
            <input id="loan-name" {...register('name')} />
            {errors.name && <p className="field__error">{String(errors.name.message)}</p>}
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="loan-lender">{t('loans.lender')}</label>
              <input id="loan-lender" {...register('lender')} />
            </div>
            <div className="field">
              <label htmlFor="loan-start">{t('loans.startDate')}</label>
              <input id="loan-start" type="date" {...register('startDate')} />
              {errors.startDate && <p className="field__error">{String(errors.startDate.message)}</p>}
            </div>
            {editing ? (
              <>
                <div className="field">
                  <label>{t('loans.principal')}</label>
                  <p className="form-note ledger-figure">{money(editing.principal)}</p>
                </div>
                <div className="field">
                  <label>{t('loans.balance')}</label>
                  <p className="form-note ledger-figure">{money(editing.balance)}</p>
                  <p className="card__hint">{t('loans.balanceHint')}</p>
                </div>
              </>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="loan-principal">{t('loans.principal')}</label>
                  <input id="loan-principal" inputMode="decimal" placeholder="1000.00" {...register('principal')} />
                  {errors.principal && <p className="field__error">{String(errors.principal.message)}</p>}
                </div>
                <div className="field">
                  <label htmlFor="loan-balance">{t('loans.balance')}</label>
                  <input id="loan-balance" inputMode="decimal" placeholder="1000.00" {...register('balance')} />
                  {errors.balance && <p className="field__error">{String(errors.balance.message)}</p>}
                </div>
              </>
            )}
            <div className="field">
              <label htmlFor="loan-rate">{t('loans.rate')}</label>
              <input id="loan-rate" inputMode="decimal" placeholder="12.00" {...register('interestRate')} />
              {errors.interestRate && <p className="field__error">{String(errors.interestRate.message)}</p>}
            </div>
            <div className="field">
              <label htmlFor="loan-installment">{t('loans.installment')}</label>
              <input id="loan-installment" inputMode="decimal" placeholder="100.00" {...register('installmentAmount')} />
              {errors.installmentAmount && <p className="field__error">{String(errors.installmentAmount.message)}</p>}
            </div>
            <div className="field">
              <label htmlFor="loan-term">{t('loans.term')}</label>
              <input id="loan-term" inputMode="numeric" placeholder="12" {...register('termMonths')} />
              {errors.termMonths && <p className="field__error">{String(errors.termMonths.message)}</p>}
            </div>
            <div className="field">
              <label htmlFor="loan-due">{t('loans.dueDay')}</label>
              <input id="loan-due" inputMode="numeric" placeholder="15" {...register('dueDay')} />
              {errors.dueDay && <p className="field__error">{String(errors.dueDay.message)}</p>}
            </div>
          </div>
          {(create.isError || update.isError) && <p className="error-text">{((create.error ?? update.error) as Error)?.message}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={close}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn--primary">{editing ? t('common.save') : t('common.create')}</button>
          </div>
        </form>
      </Modal>

      <Modal open={paying != null} onClose={closePay} title={`${t('loans.payTitle')} · ${paying?.name ?? ''}`}>
        <form onSubmit={fPay.handleSubmit((f) => { if (paying) pay.mutate({ id: paying.id, p: f }, { onSuccess: closePay }); })}>
          <div className="field">
            <label htmlFor="pay-amount">{t('common.amount')}</label>
            <input id="pay-amount" inputMode="decimal" autoFocus {...fPay.register('amount')} />
            {fPay.formState.errors.amount && <p className="field__error">{String(fPay.formState.errors.amount.message)}</p>}
            <p className="card__hint">{t('loans.balance')}: {money(paying?.balance)}</p>
          </div>
          <div className="field">
            <label htmlFor="pay-account">{t('loans.account')}</label>
            <select id="pay-account" {...fPay.register('accountId', { valueAsNumber: true })} defaultValue={accounts[0]?.id}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} — {money(a.balance)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pay-date">{t('common.date')}</label>
            <input id="pay-date" type="date" max={today()} {...fPay.register('date')} />
            {fPay.formState.errors.date && <p className="field__error">{String(fPay.formState.errors.date.message)}</p>}
          </div>
          {pay.isError && <p className="error-text">{(pay.error as Error)?.message}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={closePay}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn--primary" disabled={!hasAccounts}>{t('loans.pay')}</button>
          </div>
        </form>
      </Modal>

      <Modal open={projecting != null} onClose={() => setProjecting(null)} title={t('loans.projectionTitle')}>
        {projecting && (
          <ProjectionPanel
            loan={projecting}
            onEdit={() => { const l = projecting; setProjecting(null); openEdit(l); }}
          />
        )}
      </Modal>

      {remove.isError && <p className="error-text">{(remove.error as Error)?.message}</p>}
      {items.length === 0 ? <p className="empty-state">{t('loans.empty')}</p> : (
        <DataTable
          columns={[
            {
              key: 'name',
              label: t('common.name'),
              render: (r) => <><strong>{String(r.name)}</strong>{r.lender ? <span className="card__hint"> · {String(r.lender)}</span> : null}</>,
            },
            { key: 'balance', label: t('loans.balance'), figure: true },
            { key: 'installmentAmount', label: t('loans.installment'), figure: true },
            { key: 'interestRate', label: t('loans.rate'), render: (r) => (r.interestRate == null ? '—' : `${String(r.interestRate)} %`) },
            { key: 'progressPct', label: t('loans.progress'), render: (r) => <span className="badge">{`${Math.round(Number(r.progressPct) || 0)}%`}</span> },
            {
              key: 'isClosed',
              label: t('common.status'),
              render: (r) => <span className={`badge${r.isClosed ? ' badge--in' : ''}`}>{r.isClosed ? t('loans.settled') : t('loans.current')}</span>,
            },
          ]}
          rows={items as unknown as Record<string, unknown>[]}
          searchKeys={['name', 'lender']}
          emptyText={t('loans.empty')}
          renderActions={(r) => {
            const l = r as unknown as Loan;
            return (
              <span style={{ display: 'flex', gap: 4 }}>
                {!l.isClosed && (
                  <button className="btn btn--sm" onClick={() => setPaying(l)} disabled={!hasAccounts} title={t('loans.pay')} aria-label={t('loans.pay')}>
                    <Banknote size={15} aria-hidden="true" />
                  </button>
                )}
                {!l.isClosed && (
                  <button className="btn btn--sm" onClick={() => setProjecting(l)} title={t('loans.projection')} aria-label={t('loans.projection')}>
                    <BarChart3 size={15} aria-hidden="true" />
                  </button>
                )}
                <button className="btn btn--sm" onClick={() => openEdit(l)} title={t('common.edit')} aria-label={t('common.edit')}>
                  <Pencil size={15} aria-hidden="true" />
                </button>
                {deletable(l) && (
                  <button className="btn btn--sm btn--danger" onClick={() => remove.mutate(l.id)} title={t('common.delete')} aria-label={t('common.delete')}>
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                )}
              </span>
            );
          }}
        />
      )}
    </section>
  );
}
