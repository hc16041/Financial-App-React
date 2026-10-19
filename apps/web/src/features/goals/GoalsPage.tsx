import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodT } from '../../lib/errors';
import { useTranslation } from 'react-i18next';
import { Pause, Pencil, Play, Plus, Receipt } from 'lucide-react';
import {
  goalSchema, recurringSchema, listGoals, createGoal, updateGoal, depositGoal,
  listRecurring, createRecurring, toggleRecurring, payRecurring, listAccounts,
} from '@financial/core';
import Modal from '../../components/Modal';
import PageHead from '../../components/PageHead';
import Skeleton from '../../components/Skeleton';

export default function GoalsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [showGoal, setShowGoal] = useState(false);
  const [showRec, setShowRec] = useState(false);
  const [goalId, setGoalId] = useState<number | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [payId, setPayId] = useState<number | null>(null);
  const goals = useQuery({ queryKey: ['goals'], queryFn: listGoals });
  const recs = useQuery({ queryKey: ['recurring'], queryFn: listRecurring });
  const accs = useQuery({ queryKey: ['accounts'], queryFn: listAccounts });
  const invG = () => qc.invalidateQueries({ queryKey: ['goals'] });
  const invR = () => qc.invalidateQueries({ queryKey: ['recurring'] });
  const invA = () => qc.invalidateQueries({ queryKey: ['accounts'] });
  const addG = useMutation({ mutationFn: createGoal, onSuccess: invG });
  const updG = useMutation({
    mutationFn: ({ id, ...f }: { id: number } & any) => updateGoal(id, f),
    onSuccess: () => { invG(); setEditing(null); fE.reset(); },
  });
  const depG = useMutation({
    mutationFn: ({ id, a, accountId }: { id: number; a: string; accountId: number }) => depositGoal(id, a, accountId),
    onSuccess: () => { invG(); invA(); qc.invalidateQueries({ queryKey: ['ptx'] }); },
  });
  const addR = useMutation({ mutationFn: createRecurring, onSuccess: invR });
  const togR = useMutation({ mutationFn: toggleRecurring, onSuccess: invR });
  const payR = useMutation({
    mutationFn: ({ id, accountId }: { id: number; accountId: number }) => payRecurring(id, accountId),
    onSuccess: () => { invR(); invA(); qc.invalidateQueries({ queryKey: ['ptx'] }); },
  });
  const fG = useForm<any>({ resolver: zodT(goalSchema as any) as any });
  const fE = useForm<any>({ resolver: zodT(goalSchema as any) as any });
  const fC = useForm<any>({ defaultValues: { amount: '100.00' } });
  const fP = useForm<any>();
  const fR = useForm<any>({ resolver: zodT(recurringSchema.omit({ active: true }) as any) as any, defaultValues: { frequency: 'Mensual' } });

  const progress = (g: any) => Math.min(100, Math.max(0, (Number(g.current) / Math.max(0.01, Number(g.target))) * 100));
  const hasAccounts = (accs.data ?? []).length > 0;

  const closeGoal = () => { setShowGoal(false); fG.reset(); };
  const closeRec = () => { setShowRec(false); fR.reset(); };
  const closeContribute = () => { setGoalId(null); fC.reset(); };
  const openEdit = (g: any) => {
    setEditing(g);
    fE.reset({ name: g.name, target: String(g.target), deadline: g.deadline ? String(g.deadline).slice(0, 10) : '' });
  };
  const closeEdit = () => { setEditing(null); fE.reset(); };
  const closePay = () => { setPayId(null); fP.reset(); };

  if (goals.isPending || recs.isPending) return <Skeleton />;

  return (
    <section>
      <PageHead
        title={t('goals.title')}
        count={(goals.data ?? []).length}
        actions={<button className="btn btn--primary" onClick={() => setShowGoal(true)}><Plus size={16} aria-hidden="true" />{t('goals.newGoal')}</button>}
      />

      <Modal open={showGoal} onClose={closeGoal} title={t('goals.newGoal')}>
        <form onSubmit={fG.handleSubmit((f: any) => addG.mutate(f as any, { onSuccess: closeGoal }))}>
          <div className="field">
            <label htmlFor="goal-name">{t('common.name')}</label>
            <input id="goal-name" {...fG.register('name')} />
          </div>
          <div className="field">
            <label htmlFor="goal-target">{t('goals.target')}</label>
            <input id="goal-target" {...fG.register('target')} inputMode="decimal" placeholder="1000.00" />
          </div>
          <div className="field">
            <label htmlFor="goal-deadline">{t('common.date')}</label>
            <input id="goal-deadline" {...fG.register('deadline')} type="date" />
          </div>
          {addG.isError && <p className="error-text">{(addG.error as Error)?.message}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={closeGoal}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn--primary">{t('common.create')}</button>
          </div>
        </form>
      </Modal>

      <Modal open={editing != null} onClose={closeEdit} title={t('common.edit')}>
        <form onSubmit={fE.handleSubmit((f: any) => { if (editing) updG.mutate({ id: editing.id, ...f }); })}>
          <div className="field">
            <label htmlFor="edit-name">{t('common.name')}</label>
            <input id="edit-name" {...fE.register('name')} />
          </div>
          <div className="field">
            <label htmlFor="edit-target">{t('goals.target')}</label>
            <input id="edit-target" {...fE.register('target')} inputMode="decimal" />
          </div>
          <div className="field">
            <label htmlFor="edit-deadline">{t('common.date')}</label>
            <input id="edit-deadline" {...fE.register('deadline')} type="date" />
          </div>
          {updG.isError && <p className="error-text">{(updG.error as Error)?.message}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={closeEdit}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn--primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>

      <Modal open={goalId != null} onClose={closeContribute} title={t('goals.contribute')}>
        <form onSubmit={fC.handleSubmit((f: any) => { if (goalId != null) depG.mutate({ id: goalId, a: f.amount, accountId: f.accountId }, { onSuccess: closeContribute }); })}>
          <div className="field">
            <label htmlFor="goal-account">{t('nav.accounts')}</label>
            <select id="goal-account" {...fC.register('accountId', { valueAsNumber: true })} defaultValue={accs.data?.[0]?.id}>
              {(accs.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name} — {Number(a.balance).toFixed(2)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="goal-amount">{t('goals.contribution')}</label>
            <input id="goal-amount" {...fC.register('amount')} inputMode="decimal" autoFocus />
          </div>
          {depG.isError && <p className="error-text">{(depG.error as Error)?.message}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={closeContribute}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn--primary" disabled={!hasAccounts}>{t('goals.contribute')}</button>
          </div>
        </form>
      </Modal>

      <Modal open={payId != null} onClose={closePay} title={t('goals.pay')}>
        <form onSubmit={fP.handleSubmit((f: any) => { if (payId != null) payR.mutate({ id: payId, accountId: f.accountId }, { onSuccess: closePay }); })}>
          <div className="field">
            <label htmlFor="pay-account">{t('nav.accounts')}</label>
            <select id="pay-account" {...fP.register('accountId', { valueAsNumber: true })} defaultValue={accs.data?.[0]?.id}>
              {(accs.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name} — {Number(a.balance).toFixed(2)}</option>)}
            </select>
          </div>
          {payR.isError && <p className="error-text">{(payR.error as Error)?.message}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={closePay}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn--primary" disabled={!hasAccounts}>{t('goals.pay')}</button>
          </div>
        </form>
      </Modal>

      {(goals.data ?? []).length === 0 ? <p className="empty-state">{t('goals.empty')}</p> : (
        <ul className="stack">
          {(goals.data ?? []).map((g) => (
            <li key={g.id} className="card">
              <div className="row-between">
                <strong>{g.name}</strong>
                <span style={{ display: 'flex', gap: 'var(--fp-space-2)', alignItems: 'center' }}>
                  {g.overdue && <span className="badge badge--out">{t('goals.overdue')}</span>}
                  <span className="badge">{Math.round(progress(g))}%</span>
                  <button className="btn btn--sm" onClick={() => openEdit(g)} aria-label={t('common.edit')}>
                    <Pencil size={15} aria-hidden="true" />
                  </button>
                </span>
              </div>
              <div className="progress"><span className="progress__bar" style={{ width: `${progress(g)}%` }} /></div>
              <div className="row-between" style={{ marginTop: 'var(--fp-space-2)' }}>
                <span className="ledger-figure" style={{ color: 'var(--fp-text-muted)' }}>{Number(g.current).toFixed(2)} / {Number(g.target).toFixed(2)}{g.deadline ? ` · ${String(g.deadline).slice(0, 10)}` : ''}</span>
                {!g.closed && <button className="btn btn--sm" onClick={() => setGoalId(g.id)} disabled={!hasAccounts}><Plus size={15} aria-hidden="true" />{t('goals.contribute')}</button>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="row-between" style={{ margin: 'var(--fp-space-5) 0 var(--fp-space-3)' }}>
        <h2>{t('goals.recurring')}</h2>
        <button className="btn" onClick={() => setShowRec(true)}><Plus size={16} aria-hidden="true" />{t('common.create')}</button>
      </div>

      <Modal open={showRec} onClose={closeRec} title={t('goals.recurring')}>
        <form onSubmit={fR.handleSubmit((f: any) => addR.mutate({ ...f, active: true } as any, { onSuccess: closeRec }))}>
          <div className="field">
            <label htmlFor="rec-name">{t('common.name')}</label>
            <input id="rec-name" {...fR.register('name')} />
          </div>
          <div className="field">
            <label htmlFor="rec-amount">{t('common.amount')}</label>
            <input id="rec-amount" {...fR.register('amount')} inputMode="decimal" />
          </div>
          <div className="field">
            <label htmlFor="rec-freq">{t('common.type')}</label>
            <select id="rec-freq" {...fR.register('frequency')}><option>Semanal</option><option>Mensual</option><option>Anual</option></select>
          </div>
          {addR.isError && <p className="error-text">{(addR.error as Error)?.message}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={closeRec}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn--primary">{t('common.create')}</button>
          </div>
        </form>
      </Modal>

      {(recs.data ?? []).length === 0 ? <p className="empty-state">{t('common.empty')}</p> : (
        <ul className="stack">
          {(recs.data ?? []).map((r) => (
            <li key={r.id} className="card row-between">
              <span>
                <strong>{r.name}</strong>
                <span style={{ color: 'var(--fp-text-muted)' }}> — <span className="ledger-figure">{Number(r.amount).toFixed(2)}</span> {r.frequencyName ?? r.frequency} · {t('goals.due')} {r.nextDue?.slice(0, 10)}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--fp-space-2)' }}>
                <span className={`badge ${r.active ? 'badge--in' : ''}`}>{r.active ? t('goals.active') : t('goals.paused')}</span>
                <button className="btn btn--sm" onClick={() => setPayId(r.id)} disabled={!r.active || !hasAccounts}>
                  <Receipt size={15} aria-hidden="true" />{t('goals.pay')}
                </button>
                <button className="btn btn--sm" onClick={() => togR.mutate(r.id)}>
                  {r.active ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
                  {r.active ? t('goals.pause') : t('goals.activate')}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
