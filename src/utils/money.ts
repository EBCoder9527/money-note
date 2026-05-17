export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function normalizeAmount(amount: number): number {
  return fromCents(toCents(amount));
}

export function formatCurrency(amount: number, currency = 'CNY', locale = 'zh-CN'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normalizeAmount(amount));
}

export function formatPlainAmount(amount: number): string {
  return normalizeAmount(amount).toFixed(2);
}
