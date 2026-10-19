import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Inbox, Search } from 'lucide-react';

export type Column = {
  key: string; label: string; figure?: boolean; sign?: 'in' | 'out';
  render?: (row: Record<string, unknown>) => ReactNode;
};

// Tabla libro-mayor con búsqueda y paginación en cliente.
// signKey: campo cuyo valor 1/2 marca la fila (verde/ladrillo) como información.
// renderActions: columna final de acciones por fila (editar/borrar).
export default function DataTable({ columns, rows, searchKeys = [], signKey, pageSize = 10, emptyText, renderActions }: {
  columns: Column[]; rows: Record<string, unknown>[]; searchKeys?: string[]; signKey?: string; pageSize?: number; emptyText?: string; renderActions?: (row: Record<string, unknown>) => ReactNode;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(needle)));
  }, [q, rows, searchKeys]);
  const safePage = Math.min(page, Math.max(0, Math.ceil(filtered.length / pageSize) - 1));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const view = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const sign = (r: Record<string, unknown>) => {
    if (!signKey || (r[signKey] !== 1 && r[signKey] !== 2)) return undefined;
    return r[signKey] === 1 ? 'in' : 'out';
  };

  return (
    <div>
      {searchKeys.length > 0 && (
        <div className="toolbar">
          <label className="search">
            <Search size={16} aria-hidden="true" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder={t('common.search')} aria-label={t('common.search')} />
          </label>
        </div>
      )}
      {filtered.length === 0 ? <p className="empty-state"><Inbox size={16} aria-hidden="true" />{emptyText ?? t('common.empty')}</p> : (
        <>
          <div className="table-wrap">
            <table className="ledger">
              <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}{renderActions && <th />}</tr></thead>
              <tbody>
                {view.map((r, i) => (
                  <tr key={i} data-sign={sign(r)}>
                    {columns.map((c) => (
                      <td key={c.key} className={c.figure ? 'ledger-figure' : undefined}>
                        {c.render ? c.render(r) : String(r[c.key] ?? '—').slice(0, 60)}
                      </td>
                    ))}
                    {renderActions && <td style={{ whiteSpace: 'nowrap' }}>{renderActions(r)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="toolbar" style={{ marginTop: 'var(--fp-space-3)', marginBottom: 0 }}>
              <button className="btn btn--sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} aria-label={t('common.prev')}>
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <span className="ledger-figure">{safePage + 1}/{pages}</span>
              <button className="btn btn--sm" disabled={safePage + 1 >= pages} onClick={() => setPage(safePage + 1)} aria-label={t('common.next')}>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
