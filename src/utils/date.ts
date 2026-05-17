export type DateRange = {
  start: Date;
  end: Date;
};

export type DateRangePreset = 'week' | 'month' | 'quarter' | 'year';

export function toIsoDate(date: Date): string {
  return date.toISOString();
}

export function toMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function isMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function getDateRange(preset: DateRangePreset, baseDate = new Date()): DateRange {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const day = baseDate.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  if (preset === 'week') {
    const start = new Date(baseDate);
    start.setDate(baseDate.getDate() + mondayOffset);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return { start: startOfDay(start), end: endOfDay(end) };
  }

  if (preset === 'month') {
    return {
      start: startOfDay(new Date(year, month, 1)),
      end: endOfDay(new Date(year, month + 1, 0)),
    };
  }

  if (preset === 'quarter') {
    const quarterStartMonth = Math.floor(month / 3) * 3;
    return {
      start: startOfDay(new Date(year, quarterStartMonth, 1)),
      end: endOfDay(new Date(year, quarterStartMonth + 3, 0)),
    };
  }

  return {
    start: startOfDay(new Date(year, 0, 1)),
    end: endOfDay(new Date(year, 11, 31)),
  };
}

export function formatDate(date: Date, locale = 'zh-CN'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
