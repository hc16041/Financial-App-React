import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getTxByCard, getTxByDate, getCashByDate, type Tx } from '@financial/core';
import { listCards } from '@financial/core';
import DataTable from '../../components/DataTable';
import PageHead from '../../components/PageHead';
import Skeleton from '../../components/Skeleton';

const month = () => {
  const n = new Date();
  const f = (d: Date) => d.toISOString().slice(0, 10);
  return { from: f(new Date(n.getFullYear(), n.getMonth(), 1)), to: f(new Date(n.getFullYear(), n.getMonth() + 1, 0)) };
};

const kindOf = (t: Tx) => String(t.transactionDate ?? t.date ?? '').slice(0, 10);

export default function TransactionsPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState(month);
  const [cardId, setCardId] = useState<string>('all');
  const cards = useQuery({ queryKey: ['cards', 'list'], queryFn: listCards, retry: false });
  const txs = useQuery({
    queryKey: ['txs', cardId, range],
    queryFn: () =>
      cardId === 'all' ? getTxByDate(range.from, range.to)
      : cardId === 'cash' ? getCashByDate(range.from, range.to)
      : getTxByCard(Number(cardId)),
    retry: false,
  });
  const items: Tx[] = Array.isArray(txs.data) ? txs.data : [];

  return (
    <section>
      <PageHead title={t('tx.title')} count={items.length} />
      <div className="toolbar">
        <select value={cardId} onChange={(e) => setCardId(e.target.value)} aria-label={t('tx.merchant')}>
          <option value="all">{t('tx.all')}</option>
          <option value="cash">{t('tx.cash')}</option>
          {(Array.isArray(cards.data) ? cards.data : []).map((c) => (
            <option key={c.id} value={c.id}>{c.name ?? `#${c.id}`}</option>
          ))}
        </select>
        <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} aria-label={t('common.date')} />
        <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} aria-label={t('common.date')} />
      </div>
      {txs.isPending ? <Skeleton />
        : txs.isError ? <div><p className="error-text">{t('common.error')}</p><button className="btn btn--sm" onClick={() => txs.refetch()}>{t('common.retry')}</button></div>
        : items.length === 0 ? <p className="empty-state">{t('common.empty')}</p> : (
        <DataTable
          columns={[
            { key: 'date', label: t('common.date') },
            { key: 'merchant', label: t('tx.merchant') },
            { key: 'type', label: t('common.type') },
            { key: 'amount', label: t('common.amount'), figure: true },
          ]}
          rows={items.map((x) => ({
            ...x,
            date: kindOf(x),
            merchant: x.merchant?.name ?? (x.merchantId ? `#${x.merchantId}` : '—'),
            amount: Number(x.amount).toFixed(2),
          }))}
          searchKeys={['merchant', 'description']}
          emptyText={t('common.empty')}
        />
      )}
    </section>
  );
}
