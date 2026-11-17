// Port de money.util + currency-usd.pipe. Suma en centavos enteros.
export const toCents = (m: string): number => Math.round(parseFloat(m) * 100);
export const fromCents = (c: number): string => (c / 100).toFixed(2);
export const sumMoney = (items: string[]): string =>
  fromCents(items.reduce((a, m) => a + toCents(m), 0));
export const formatUSD = (m: string | number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    typeof m === 'string' ? parseFloat(m) : m,
  );

// Presentación de dinero en pantalla: nunca deja NaN ni "12345.67" pelado.
// Los montos de la API llegan como number o string decimal.
export const money = (m: string | number | null | undefined): string => {
  if (m === null || m === undefined || m === '') return '—';
  const n = typeof m === 'string' ? Number(m) : m;
  return Number.isFinite(n) ? formatUSD(n) : '—';
};
