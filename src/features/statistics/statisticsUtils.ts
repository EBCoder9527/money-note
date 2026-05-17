import dayjs, { type Dayjs } from 'dayjs';
import type { Category, Transaction } from '@/data/models';
import { normalizeAmount } from '@/utils/money';

export type PeriodExpenseSummary = {
  week: number;
  month: number;
  quarter: number;
  year: number;
};

export type TrendPoint = {
  date: string;
  label: string;
  amount: number;
};

export type CategoryShare = {
  categoryId: string;
  name: string;
  amount: number;
  color: string;
  percent: number;
};

export function filterExpenseTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.filter((transaction) => transaction.type === 'expense');
}

export function calculatePeriodExpenses(
  transactions: Transaction[],
  baseDate: Dayjs = dayjs(),
): PeriodExpenseSummary {
  const expenses = filterExpenseTransactions(transactions);

  return {
    week: sumTransactionsInRange(expenses, baseDate.startOf('week'), baseDate.endOf('week')),
    month: sumTransactionsInRange(expenses, baseDate.startOf('month'), baseDate.endOf('month')),
    quarter: sumTransactionsInRange(expenses, baseDate.startOf('quarter'), baseDate.endOf('quarter')),
    year: sumTransactionsInRange(expenses, baseDate.startOf('year'), baseDate.endOf('year')),
  };
}

export function buildLastSevenDaysTrend(
  transactions: Transaction[],
  baseDate: Dayjs = dayjs(),
): TrendPoint[] {
  const expenses = filterExpenseTransactions(transactions);
  const startDate = baseDate.startOf('day').subtract(6, 'day');

  return Array.from({ length: 7 }, (_, index) => {
    const date = startDate.add(index, 'day');
    const dateKey = date.format('YYYY-MM-DD');
    const amount = expenses.reduce((total, transaction) => {
      if (dayjs(transaction.occurredAt).format('YYYY-MM-DD') !== dateKey) {
        return total;
      }

      return total + transaction.amount;
    }, 0);

    return {
      date: dateKey,
      label: date.format('M/D'),
      amount: normalizeAmount(amount),
    };
  });
}

export function buildMonthlyCategoryShares(
  transactions: Transaction[],
  categories: Category[],
  baseDate: Dayjs = dayjs(),
): CategoryShare[] {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const monthExpenses = filterExpenseTransactions(transactions).filter((transaction) =>
    isInRange(transaction.occurredAt, baseDate.startOf('month'), baseDate.endOf('month')),
  );
  const amountByCategory = new Map<string, number>();

  for (const transaction of monthExpenses) {
    amountByCategory.set(
      transaction.categoryId,
      (amountByCategory.get(transaction.categoryId) ?? 0) + transaction.amount,
    );
  }

  const total = Array.from(amountByCategory.values()).reduce((sum, amount) => sum + amount, 0);

  if (total <= 0) {
    return [];
  }

  return Array.from(amountByCategory.entries())
    .map(([categoryId, amount]) => {
      const category = categoryMap.get(categoryId);

      return {
        categoryId,
        name: category?.name ?? '未分类',
        amount: normalizeAmount(amount),
        color: category?.color ?? '#64748b',
        percent: amount / total,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

function sumTransactionsInRange(transactions: Transaction[], start: Dayjs, end: Dayjs): number {
  return normalizeAmount(
    transactions.reduce((total, transaction) => {
      if (!isInRange(transaction.occurredAt, start, end)) {
        return total;
      }

      return total + transaction.amount;
    }, 0),
  );
}

function isInRange(occurredAt: string, start: Dayjs, end: Dayjs): boolean {
  const date = dayjs(occurredAt);
  return (date.isAfter(start) || date.isSame(start)) && (date.isBefore(end) || date.isSame(end));
}
