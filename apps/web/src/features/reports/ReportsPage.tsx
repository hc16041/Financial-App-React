import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { getMerchantsExpenses, getCashExpenses, getInvestmentsMonthly } from '@financial/core';
import { MonthlyBars } from '../../components/Charts';
import PageHead from '../../components/PageHead';
import Skeleton from '../../components/Skeleton';

const month = () => {
  const n = new Date();
  const f = (d: Date) => d.toISOString().slice(0, 10);
  return { from: f(new Date(n.getFullYear(), n.getMonth(), 1)), to: f(new Date(n.getFullYear(), n.getMonth() + 1, 0)) };
};

type Row = Record<string, unknown>;

const rowKeys = (rows: Row[]) => [...new Set(rows.flatMap((r) => Object.keys(r)))];

function RowsTable({ rows }: { rows: Row[] }) {
  const keys = rowKeys(rows);
  return (
    <div className="table-wrap"><table className="ledger">
      <thead><tr>{keys.map((k) => <th key={k}>{k}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{keys.map((k) => <td key={k} className={typeof r[k] === 'number' ? 'ledger-figure' : undefined}>{String(r[k] ?? '—').slice(0, 40)}</td>)}</tr>
        ))}
      </tbody>
    </table></div>
  );
}

// Filas exportables: array directo, o el primer array interno del objeto (detalle),
// o los escalares como fila única. null = sin datos.
function pickRows(data: unknown): Row[] | null {
  if (Array.isArray(data)) return data.length > 0 ? (data as Row[]) : null;
  if (data && typeof data === 'object') {
    const arr = Object.values(data as Row).find((v) => Array.isArray(v) && v.length > 0 && typeof v[0] === 'object');
    if (Array.isArray(arr)) return arr as Row[];
    const entries = Object.entries(data as Row).filter(([, v]) => typeof v !== 'object');
    return entries.length > 0 ? [Object.fromEntries(entries)] : null;
  }
  return null;
}

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

// Render genérico: escalares arriba; arrays internos como tablas de detalle.
function Raw({ data }: { data: unknown }) {
  if (Array.isArray(data)) {
    if (data.length === 0) return null;
    return <RowsTable rows={data as Row[]} />;
  }
  if (data && typeof data === 'object') {
    const scalars = Object.entries(data as Row).filter(([, v]) => typeof v !== 'object');
    const arrays = Object.entries(data as Row).filter(([, v]) => Array.isArray(v) && v.length > 0) as [string, Row[]][];
    return (
      <>
        {scalars.length > 0 && (
          <div className="table-wrap"><table className="ledger">
            <tbody>
              {scalars.map(([k, v]) => (
                <tr key={k}><td>{k}</td><td className="ledger-figure">{String(v)}</td></tr>
              ))}
            </tbody>
          </table></div>
        )}
        {arrays.map(([k, rows]) => <RowsTable key={k} rows={rows as Row[]} />)}
      </>
    );
  }
  return <p>{String(data)}</p>;
}

// monthlySummaries del backend → series del gráfico (tolerante a PascalCase).
function monthly(d: unknown): { months: string[]; income: number[]; expense: number[] } | null {
  const rows = (d as any)?.monthlySummaries ?? (d as any)?.MonthlySummaries;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return {
    months: rows.map((r: any) => String(r.monthName ?? r.MonthName ?? r.month ?? '')),
    income: rows.map((r: any) => Number(r.totalIngresos ?? r.TotalIngresos ?? 0)),
    expense: rows.map((r: any) => Number(r.totalRetiros ?? r.TotalRetiros ?? 0)),
  };
}

export default function ReportsPage() {
  const { t } = useTranslation();
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

  const m = monthly(q.data);
  const rows = kind === 'investments' && m
    ? m.months.map((name, i) => ({ month: name, income: m.income[i], expense: m.expense[i] }))
    : pickRows(q.data);

  return (
    <section>
      <PageHead title={t('reports.title')} />
      <div className="toolbar">
        <select value={kind} onChange={(e) => setKind(e.target.value as any)} aria-label={t('common.filter')}>
          <option value="merchants">{t('reports.merchants')}</option>
          <option value="cash">{t('reports.cash')}</option>
          <option value="investments">{t('reports.investments')}</option>
        </select>
        {kind === 'investments' ? (
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label={t('budgets.year')} />
        ) : (
          <>
            <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} aria-label={t('common.date')} />
            <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} aria-label={t('common.date')} />
          </>
        )}
        <span className="toolbar__spacer" />
        {rows && (
          <button className="btn" onClick={() => downloadCsv(`reporte-${kind}.csv`, toCsv(rows))}><Download size={16} aria-hidden="true" />{t('reports.export')}</button>
        )}
      </div>
      {q.isPending ? <Skeleton rows={6} />
        : q.isError ? <div><p className="error-text">{t('common.error')}</p><button className="btn btn--sm" onClick={() => q.refetch()}>{t('common.retry')}</button></div>
        : kind === 'investments' && monthly(q.data) ? <MonthlyBars {...monthly(q.data)!} ariaLabel={t('reports.monthlyAria')} />
        : <Raw data={q.data} />}
    </section>
  );
}
