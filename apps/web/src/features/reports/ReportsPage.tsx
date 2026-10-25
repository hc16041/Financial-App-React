import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Download, Receipt, Store, TrendingUp } from 'lucide-react';
import { getMerchantsExpenses, getCashExpenses, getInvestmentsMonthly, money } from '@financial/core';
import { MonthlyBars } from '../../components/Charts';
import KpiCard from '../../components/KpiCard';
import PageHead from '../../components/PageHead';
import Skeleton from '../../components/Skeleton';
import { fmtDate, monthYear } from '../../lib/date';

const month = () => {
  const n = new Date();
  const f = (d: Date) => d.toISOString().slice(0, 10);
  return { from: f(new Date(n.getFullYear(), n.getMonth(), 1)), to: f(new Date(n.getFullYear(), n.getMonth() + 1, 0)) };
};

type Row = Record<string, unknown>;

type MerchantReport = {
  periodStart: string; periodEnd: string;
  totalExpenses: string; totalTransactions: number;
  merchants: { merchantName: string; category: string; totalAmount: string; transactionCount: number; percentageOfTotal: string }[];
};
type CashReport = {
  periodStart: string; periodEnd: string;
  totalExpenses: string; transactionCount: number;
  expenses: { transactionDate: string; description: string; merchantName: string; amount: string }[];
};
type MonthlyRow = { month: number; totalIngresos: string; totalRetiros: string; netBalance: string; ingresoCount: number; retiroCount: number };
type InvestReport = { year: number; monthlySummaries: MonthlyRow[]; totalIngresos: string; totalRetiros: string; netBalance: string };

const rowKeys = (rows: Row[]) => [...new Set(rows.flatMap((r) => Object.keys(r)))];

function toCsv(rows: Row[]): string {
  const keys = rowKeys(rows);
  const esc = (v: unknown) => {
    const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\r\n');
}

// BOM para que Excel abra UTF-8 (acentos) correctamente.
function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const Empty = ({ text }: { text: string }) => <p className="empty-state"><Receipt size={16} aria-hidden="true" />{text}</p>;

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [range, setRange] = useState(month);
  const [year, setYear] = useState(new Date().getFullYear());
  const [kind, setKind] = useState<'merchants' | 'cash' | 'investments'>('merchants');
  const q = useQuery({
    queryKey: ['reports', kind, range, year],
    queryFn: () =>
      kind === 'merchants' ? getMerchantsExpenses(range.from, range.to)
      : kind === 'cash' ? getCashExpenses(range.from, range.to)
      : getInvestmentsMonthly(year),
    retry: false,
  });

  const data = q.data as MerchantReport & CashReport & InvestReport | undefined;

  // Filas exportables y de tabla, ya en su forma final por tipo de reporte.
  const csvRows: Row[] = !data ? []
    : kind === 'merchants' ? (data.merchants ?? []).map((r) => ({
        [t('reports.merchant')]: r.merchantName,
        [t('common.category')]: r.category,
        [t('common.total')]: r.totalAmount,
        [t('reports.count')]: r.transactionCount,
        [t('reports.share')]: r.percentageOfTotal,
      }))
    : kind === 'cash' ? (data.expenses ?? []).map((r) => ({
        [t('common.date')]: fmtDate(r.transactionDate, locale),
        [t('common.description')]: r.description,
        [t('reports.merchant')]: r.merchantName,
        [t('common.amount')]: r.amount,
      }))
    : (data.monthlySummaries ?? []).map((r) => ({
        [t('budgets.month')]: monthYear(r.month, data.year, locale),
        [t('reports.income')]: r.totalIngresos,
        [t('reports.withdrawals')]: r.totalRetiros,
        [t('reports.net')]: r.netBalance,
        [t('reports.count')]: r.ingresoCount + r.retiroCount,
      }));

  const period = data && 'periodStart' in data && data.periodStart
    ? `${fmtDate(data.periodStart, locale)} — ${fmtDate(data.periodEnd, locale)}`
    : null;

  return (
    <section>
      <PageHead title={t('reports.title')} />
      <div className="toolbar">
        <select value={kind} onChange={(e) => setKind(e.target.value as 'merchants' | 'cash' | 'investments')} aria-label={t('common.filter')}>
          <option value="merchants">{t('reports.merchants')}</option>
          <option value="cash">{t('reports.cash')}</option>
          <option value="investments">{t('reports.investments')}</option>
        </select>
        {kind === 'investments' ? (
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label={t('budgets.year')} />
        ) : (
          <>
            <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} aria-label={t('common.from')} title={t('common.from')} />
            <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} aria-label={t('common.to')} title={t('common.to')} />
          </>
        )}
        <span className="toolbar__spacer" />
        {csvRows.length > 0 && (
          <button className="btn" onClick={() => downloadCsv(`reporte-${kind}.csv`, toCsv(csvRows))}><Download size={16} aria-hidden="true" />{t('reports.export')}</button>
        )}
      </div>

      {q.isPending ? <Skeleton rows={6} />
        : q.isError ? <div><p className="error-text">{t('common.error')}</p><button className="btn btn--sm" onClick={() => q.refetch()}>{t('common.retry')}</button></div>
        : !data ? <Empty text={t('reports.empty')} />
        : (
          <>
            {period && <p style={{ color: 'var(--fp-text-muted)', fontSize: '0.8125rem', margin: '0 0 var(--fp-space-3)' }}>{t('reports.period')}: {period}</p>}

            {kind === 'merchants' && (
              <div className="grid-kpi" style={{ marginBottom: 'var(--fp-space-4)' }}>
                <KpiCard label={t('reports.totalExpenses')} value={money(data.totalExpenses)} tone="out" icon={Receipt} />
                <KpiCard label={t('reports.totalTx')} value={String(data.totalTransactions ?? 0)} icon={TrendingUp} />
                <KpiCard label={t('reports.merchantsCount')} value={String(data.merchants?.length ?? 0)} icon={Store} />
              </div>
            )}

            {kind === 'cash' && (
              <div className="grid-kpi" style={{ marginBottom: 'var(--fp-space-4)' }}>
                <KpiCard label={t('reports.totalExpenses')} value={money(data.totalExpenses)} tone="out" icon={Receipt} />
                <KpiCard label={t('reports.totalTx')} value={String(data.transactionCount ?? 0)} icon={TrendingUp} />
              </div>
            )}

            {kind === 'investments' && (
              <div className="grid-kpi" style={{ marginBottom: 'var(--fp-space-4)' }}>
                <KpiCard label={t('reports.income')} value={money(data.totalIngresos)} tone="in" icon={TrendingUp} />
                <KpiCard label={t('reports.withdrawals')} value={money(data.totalRetiros)} tone="out" icon={Receipt} />
                <KpiCard label={t('reports.net')} value={money(data.netBalance)} icon={Store} />
              </div>
            )}

            {kind === 'investments' && (data.monthlySummaries?.length ?? 0) > 0 && (
              <div className="card" style={{ marginBottom: 'var(--fp-space-4)' }}>
                <MonthlyBars
                  months={(data.monthlySummaries ?? []).map((r) => monthYear(r.month, data.year, locale))}
                  income={(data.monthlySummaries ?? []).map((r) => Number(r.totalIngresos ?? 0))}
                  expense={(data.monthlySummaries ?? []).map((r) => Number(r.totalRetiros ?? 0))}
                  ariaLabel={t('reports.monthlyAria')}
                />
              </div>
            )}

            {csvRows.length === 0 ? <Empty text={t('reports.empty')} /> : (
              <div className="table-wrap">
                <table className="ledger">
                  <thead>
                    <tr>
                      {kind === 'cash' && <><th>{t('common.date')}</th><th>{t('common.description')}</th><th>{t('reports.merchant')}</th><th>{t('common.amount')}</th></>}
                      {kind === 'merchants' && <><th>{t('reports.merchant')}</th><th>{t('common.category')}</th><th>{t('reports.count')}</th><th>{t('common.total')}</th><th>{t('reports.share')}</th></>}
                      {kind === 'investments' && <><th>{t('budgets.month')}</th><th>{t('reports.income')}</th><th>{t('reports.withdrawals')}</th><th>{t('reports.net')}</th><th>{t('reports.count')}</th></>}
                    </tr>
                  </thead>
                  <tbody>
                    {kind === 'cash' && (data.expenses ?? []).map((r) => (
                      <tr key={r.transactionDate + r.description}>
                        <td>{fmtDate(r.transactionDate, locale)}</td>
                        <td>{r.description || '—'}</td>
                        <td>{r.merchantName || '—'}</td>
                        <td className="ledger-figure">{money(r.amount)}</td>
                      </tr>
                    ))}
                    {kind === 'merchants' && (data.merchants ?? []).map((r) => (
                      <tr key={r.merchantName + r.category}>
                        <td>{r.merchantName || '—'}</td>
                        <td>{r.category || '—'}</td>
                        <td className="ledger-figure">{r.transactionCount ?? 0}</td>
                        <td className="ledger-figure">{money(r.totalAmount)}</td>
                        <td className="ledger-figure">{Number(r.percentageOfTotal ?? 0).toFixed(1)}%</td>
                      </tr>
                    ))}
                    {kind === 'investments' && (data.monthlySummaries ?? []).map((r) => (
                      <tr key={r.month}>
                        <td>{monthYear(r.month, data.year, locale)}</td>
                        <td className="ledger-figure">{money(r.totalIngresos)}</td>
                        <td className="ledger-figure">{money(r.totalRetiros)}</td>
                        <td className="ledger-figure">{money(r.netBalance)}</td>
                        <td className="ledger-figure">{r.ingresoCount + r.retiroCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
    </section>
  );
}
