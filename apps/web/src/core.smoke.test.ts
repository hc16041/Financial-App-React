import { describe, it, expect } from 'vitest';
import { toCents, fromCents, sumMoney, formatUSD } from '@financial/core';
import { moneyString, categorySchema } from '@financial/core';

describe('core RN-ready (sin DOM)', () => {
  it('dinero exacto en centavos', () => {
    expect(sumMoney(['1000.00', '0.10'])).toBe('1000.10');
    expect(fromCents(toCents('0.10') + toCents('0.20'))).toBe('0.30');
    expect(formatUSD('1000.00')).toContain('1,000');
  });
  it('schemas validan', () => {
    expect(moneyString.safeParse('10.00').success).toBe(true);
    expect(moneyString.safeParse('abc').success).toBe(false);
    expect(categorySchema.safeParse({ name: 'X', type: 2 }).success).toBe(true);
    expect(categorySchema.safeParse({ name: 'X', type: 2, icon: 'evil-icon' }).success).toBe(false);
  });
});
