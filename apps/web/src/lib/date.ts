// Fechas de la API: ISO completo ("2026-10-18T00:00:00Z") o "YYYY-MM-DD".
// Se formatean en UTC para que la zona horaria no corra un día el período.
export const fmtDate = (v: string | null | undefined, locale: string): string => {
  if (!v) return '—';
  const d = new Date(`${String(v).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

// 10/2026 → "oct 2026"
export const monthYear = (month: number, year: number, locale: string): string => {
  const d = new Date(Date.UTC(2000, month - 1, 1));
  return `${d.toLocaleDateString(locale, { month: 'short', timeZone: 'UTC' })} ${year}`;
};
