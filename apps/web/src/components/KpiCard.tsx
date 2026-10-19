import type { LucideIcon } from 'lucide-react';

type Tone = 'in' | 'out' | 'warn' | 'neutral';

// Tarjeta de indicador estilo libro-mayor: la regla superior codifica el tono,
// la cifra es tabular, el icono lo tiñe el mismo tono. Sin sombras pesadas.
export default function KpiCard({ label, value, tone = 'neutral', loading, icon: Icon, trend }: {
  label: string; value: string; tone?: Tone; loading?: boolean;
  icon?: LucideIcon; trend?: { dir: 'up' | 'down'; label: string };
}) {
  return (
    <div className="kpi" data-tone={tone}>
      <div className="kpi__head">
        <p className="kpi__label">{label}</p>
        {Icon && (
          <span className="kpi__icon" aria-hidden="true"><Icon size={18} /></span>
        )}
      </div>
      <p className="ledger-figure kpi__value">{loading ? '—' : value}</p>
      {trend && <p className={`kpi__trend kpi__trend--${trend.dir}`}>{trend.label}</p>}
    </div>
  );
}
