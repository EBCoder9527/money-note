import dayjs, { type Dayjs } from 'dayjs';

export function getCurrentMonthKey(): string {
  return dayjs().format('YYYY-MM');
}

export function getMonthLabel(monthKey: string): string {
  return monthKeyToDayjs(monthKey).format('YYYY年M月');
}

export function getPreviousMonthKey(monthKey: string): string {
  return monthKeyToDayjs(monthKey).subtract(1, 'month').format('YYYY-MM');
}

export function getNextMonthKey(monthKey: string): string {
  return monthKeyToDayjs(monthKey).add(1, 'month').format('YYYY-MM');
}

export function getMonthRangeIso(monthKey: string): { startIso: string; endIso: string } {
  const month = monthKeyToDayjs(monthKey);

  return {
    startIso: month.startOf('month').toISOString(),
    endIso: month.endOf('month').toISOString(),
  };
}

export function getMonthBaseDate(monthKey: string): Dayjs {
  const currentMonthKey = getCurrentMonthKey();

  if (monthKey === currentMonthKey) {
    return dayjs();
  }

  return monthKeyToDayjs(monthKey).startOf('month');
}

export function monthKeyToDayjs(monthKey: string): Dayjs {
  return dayjs(`${monthKey}-01`);
}
