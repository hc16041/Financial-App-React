import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CreditCard, PiggyBank, TrendingUp } from 'lucide-react';
import { Donut } from '../../components/Charts';
import KpiCard from '../../components/KpiCard';
import PageHead from '../../components/PageHead';
import Skeleton from '../../components/Skeleton';
import { getDashboardSummary } from '@financial/core';

// FEAT-09: GET /api/dashboard/summary real (orquesta queries en el backend).
export default function DashboardPage() {
  const { t } = useTranslation();
  const sum = useQuery({ queryKey: ['dashboard', 'summary'], queryFn: getDashboardSummary, retry: false });

  if (sum.isPending) return <Skeleton rows={4} />;
  if (sum.isError) return <div><p style={{ color: 'red' }}>{t('common.error')}</p><button onClick={() => sum.refetch()}>{t('common.retry')}</button></div>;

  const d = sum.data;
  return (
    <section>
      <PageHead title={t('dash.title')} />
      <div className="grid-2">
        <div className="balance-strip">
          <div className="balance-strip__total ledger-figure">{Number(d.totalBalance).toFixed(2)}</div>
          <p style={{ color: 'var(--fp-text-muted)', margin: 'var(--fp-space-1) 0 0' }}>{t('dash.total')}</p>
        </div>
        <div className="card">
          <h3 className="card__title">{t('dash.composition')}</h3>
          <Donut
            ariaLabel={t('dash.composition')}
            segments={[
              { name: t('dash.savings'), value: Number(d.savings), color: 'var(--fp-success)' },
              { name: t('dash.investments'), value: Number(d.investments), color: 'var(--fp-info)' },
              { name: t('dash.debt'), value: Number(d.cardDebt), color: 'var(--fp-danger)' },
            ]}
          />
        </div>
      </div>
      <div className="grid-kpi" style={{ marginTop: 'var(--fp-space-4)' }}>
        <KpiCard label={t('dash.savings')} value={Number(d.savings).toFixed(2)} tone="in" icon={PiggyBank} />
        <KpiCard label={t('dash.investments')} value={Number(d.investments).toFixed(2)} tone="in" icon={TrendingUp} />
        <KpiCard label={t('dash.debt')} value={Number(d.cardDebt).toFixed(2)} tone="out" icon={CreditCard} />
      </div>
      {d.isProvisional && <p style={{ color: 'var(--fp-text-muted)', fontSize: '0.8125rem', marginTop: 'var(--fp-space-3)' }}>{t('dash.provisional')}</p>}
    </section>
  );
}
