// Barras SVG propias: verde ingreso, ladrillo gasto, cobre neto.
// Sin librerías (Apex pesaba 955KB por dos gráficos).
function bars(max: number, v: number, w: number) {
  return max > 0 ? Math.max(2, (v / max) * w) : 2;
}

export function MonthlyBars({ months, income, expense, ariaLabel }: { months: string[]; income: number[]; expense: number[]; ariaLabel: string }) {
  const max = Math.max(1, ...income, ...expense);
  const W = 320;
  return (
    <div role="img" aria-label={ariaLabel}>
      {months.map((m, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '4rem 1fr', gap: 8, alignItems: 'center', margin: '2px 0' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--fp-text-muted)' }}>{m}</span>
          <span style={{ display: 'flex', gap: 2 }}>
            <span title={`${income[i]}`} style={{ display: 'inline-block', height: 12, width: bars(max, income[i], W), background: 'var(--fp-success)' }} />
            <span title={`${expense[i]}`} style={{ display: 'inline-block', height: 12, width: bars(max, expense[i], W), background: 'var(--fp-danger)' }} />
          </span>
        </div>
      ))}
    </div>
  );
}

export function Donut({ segments, ariaLabel, size = 148, thickness = 18 }: {
  segments: { name: string; value: number; color: string }[]; ariaLabel: string; size?: number; thickness?: number;
}) {
  const total = segments.reduce((a, s) => a + Math.max(0, s.value), 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="chart-donut" role="img" aria-label={ariaLabel}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fp-surface-muted)" strokeWidth={thickness} />
        {total > 0 && segments.map((s, i) => {
          const len = (Math.max(0, s.value) / total) * c;
          const el = (
            <circle
              key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <ul className="legend">
        {segments.map((s, i) => (
          <li key={i}>
            <span className="legend__dot" style={{ background: s.color }} />
            {s.name}
            <span className="ledger-figure">{s.value.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NameValueBars({ names, values, color = 'var(--fp-success)', ariaLabel }: { names: string[]; values: number[]; color?: string; ariaLabel: string }) {
  const max = Math.max(1, ...values);
  return (
    <div role="img" aria-label={ariaLabel}>
      {names.map((n, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '8rem 1fr auto', gap: 8, alignItems: 'center', margin: '2px 0' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--fp-text-muted)' }}>{n}</span>
          <span style={{ display: 'inline-block', height: 12, width: bars(max, values[i], 280), background: color }} />
          <span className="ledger-figure" style={{ fontSize: '0.8125rem' }}>{values[i].toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}
