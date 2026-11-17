import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Info, Pencil } from 'lucide-react';
import { getProjection, money, type Loan } from '@financial/core';
import DataTable from '../../components/DataTable';
import MoneyInput from '../../components/MoneyInput';
import Skeleton from '../../components/Skeleton';
import { fmtDate } from '../../lib/date';

// SPEC-10: el calendario y los totales los calcula el backend. Aquí solo se
// comparan dos escenarios sobre el saldo de hoy: el base y el simulado.
export default function ProjectionPanel({ loan, onEdit }: { loan: Loan; onEdit?: () => void }) {
  const { t, i18n } = useTranslation();
  const [extraMonthly, setExtraMonthly] = useState('');
  const [extraOnce, setExtraOnce] = useState('');
  const [extraOnceMonth, setExtraOnceMonth] = useState('1');

  const proj = useQuery({
    queryKey: ['loan-projection', loan.id, extraMonthly, extraOnce, extraOnceMonth],
    queryFn: () => getProjection(loan.id, { extraMonthly, extraOnce, extraOnceMonth: Number(extraOnceMonth) || 1 }),
    // El panel no parpadea mientras se recalcula: mantiene el resultado previo.
    placeholderData: keepPreviousData,
  });

  if (proj.isPending) return <Skeleton rows={4} />;
  if (proj.isError) {
    return (
      <div>
        <p className="error-text">{t('common.error')}</p>
        <button className="btn btn--sm" onClick={() => proj.refetch()}>{t('common.retry')}</button>
      </div>
    );
  }

  const p = proj.data;
  const date = (v: string) => fmtDate(v, i18n.language);

  if (!p.feasible) {
    // Dato faltante del préstamo (cuota o plazo), no un fallo de la pantalla.
    return (
      <div className="card card--muted">
        <div className="row-between">
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--fp-space-2)' }}>
            <Info size={16} aria-hidden="true" />
            <span>{p.reason || t('loans.assumption')}</span>
          </span>
          {onEdit && (
            <button className="btn btn--sm" onClick={onEdit}>
              <Pencil size={15} aria-hidden="true" />{t('loans.editLoan')}
            </button>
          )}
        </div>
      </div>
    );
  }

  const rows: { label: string; base: string; extra: string; figure?: boolean }[] = [
    { label: t('loans.installments'), base: String(p.base.installments), extra: String(p.scenario.installments), figure: true },
    { label: t('loans.payoffDate'), base: date(p.base.payoffDate), extra: date(p.scenario.payoffDate) },
    { label: t('loans.totalInterest'), base: money(p.base.totalInterest), extra: money(p.scenario.totalInterest), figure: true },
    { label: t('loans.totalPaid'), base: money(p.base.totalPaid), extra: money(p.scenario.totalPaid), figure: true },
  ];
  const same = Number(p.savedInterest) === 0 && p.savedMonths === 0;

  return (
    <div>
      <div className="grid-2">
        <label className="field">
          <span>{t('loans.extraMonthly')}</span>
          <MoneyInput value={extraMonthly} onChange={setExtraMonthly} />
        </label>
        <label className="field">
          <span>{t('loans.extraOnce')}</span>
          <MoneyInput value={extraOnce} onChange={setExtraOnce} />
        </label>
      </div>
      <div className="field" style={{ marginTop: 'var(--fp-space-2)' }}>
        <label htmlFor="projection-month">{t('loans.extraOnceMonth')}</label>
        <input
          id="projection-month" type="number" min={1} max={600} inputMode="numeric"
          value={extraOnceMonth} onChange={(e) => setExtraOnceMonth(e.target.value)}
        />
      </div>

      <div className="table-wrap" style={{ marginTop: 'var(--fp-space-3)' }}>
        <table className="ledger">
          <thead>
            <tr>
              <th />
              <th>{t('loans.base')}</th>
              <th>{t('loans.extra')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td className={r.figure ? 'ledger-figure' : undefined}>{r.base}</td>
                <td className={r.figure ? 'ledger-figure' : undefined}>{r.extra}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card card--muted" style={{ marginTop: 'var(--fp-space-3)' }}>
        <p style={{ margin: 0 }}>
          {same
            ? t('loans.noSaving')
            : t('loans.savedText', {
                interest: money(p.savedInterest),
                months: p.savedMonths,
                date: date(p.scenario.payoffDate),
              })}
        </p>
        <p className="card__hint" style={{ marginTop: 'var(--fp-space-1)' }}>{p.assumption || t('loans.assumption')}</p>
      </div>

      <h3 className="card__title" style={{ marginTop: 'var(--fp-space-4)' }}>{t('loans.schedule')}</h3>
      <DataTable
        columns={[
          {
            key: 'number',
            label: t('loans.month'),
            render: (r) => (
              <>
                {String(r.number)}
                {r.isExtra ? <span className="badge badge--warn" style={{ marginLeft: 6 }}>{t('loans.extraRow')}</span> : null}
              </>
            ),
          },
          { key: 'date', label: t('common.date'), render: (r) => date(String(r.date)) },
          { key: 'payment', label: t('loans.payment'), figure: true },
          { key: 'interest', label: t('loans.interest'), figure: true },
          { key: 'principal', label: t('loans.capital'), figure: true },
          { key: 'balance', label: t('loans.balance'), figure: true },
        ]}
        rows={(p.scenario.schedule ?? []) as unknown as Record<string, unknown>[]}
        emptyText={t('common.empty')}
        pageSize={12}
      />
    </div>
  );
}
