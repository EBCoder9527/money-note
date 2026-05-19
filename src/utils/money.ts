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

export function formatCompactAmount(amount: number): string {
  const normalizedAmount = normalizeAmount(amount);

  if (normalizedAmount >= 10000) {
    return `${trimCompactNumber(normalizedAmount / 10000)}w`;
  }

  if (normalizedAmount >= 1000) {
    return `${trimCompactNumber(normalizedAmount / 1000)}k`;
  }

  if (normalizedAmount >= 10) {
    return String(Math.round(normalizedAmount));
  }

  return normalizedAmount % 1 === 0
    ? String(Math.round(normalizedAmount))
    : trimCompactNumber(normalizedAmount);
}

export function formatCalendarAmount(amount: number): string {
  return formatCompactAmount(amount);
}

function trimCompactNumber(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}
