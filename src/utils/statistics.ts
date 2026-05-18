import dayjs from 'dayjs';
import type { Category, Transaction } from '@/data/models';
import { normalizeAmount } from '@/utils/money';

export type DailyExpenseSummary = {
  date: string;
  dayOfMonth: number;
  amount: number;
  hasExpense: boolean;
};

export type CategoryExpenseRankingItem = {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
  percent: number;
  count: number;
};

export type TransactionExpenseRankingItem = Transaction & {
  category?: Category;
};

export function getDailyExpenseSummary(
  transactions: Transaction[],
  month: string,
): DailyExpenseSummary[] {
  const monthStart = dayjs(`${month}-01`).startOf('month');
  const daysInMonth = monthStart.daysInMonth();
  const amountByDate = new Map<string, number>();

  for (const transaction of getMonthExpenseTransactions(transactions, month)) {
    const dateKey = dayjs(transaction.occurredAt).format('YYYY-MM-DD');
    amountByDate.set(dateKey, (amountByDate.get(dateKey) ?? 0) + transaction.amount);
  }

  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = monthStart.add(index, 'day');
    const dateKey = date.format('YYYY-MM-DD');
    const amount = normalizeAmount(amountByDate.get(dateKey) ?? 0);

    return {
      date: dateKey,
      dayOfMonth: date.date(),
      amount,
      hasExpense: amount > 0,
    };
  });
}

export function getTransactionsByDate(transactions: Transaction[], date: string): Transaction[] {
  return transactions
    .filter(
      (transaction) =>
        transaction.type === 'expense' && dayjs(transaction.occurredAt).format('YYYY-MM-DD') === date,
    )
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export function getCategoryExpenseRanking(
  transactions: Transaction[],
  month: string,
  categories: Category[] = [],
): CategoryExpenseRankingItem[] {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const amountByCategory = new Map<string, { amount: number; count: number }>();

  for (const transaction of getMonthExpenseTransactions(transactions, month)) {
    const current = amountByCategory.get(transaction.categoryId) ?? { amount: 0, count: 0 };
    amountByCategory.set(transaction.categoryId, {
      amount: current.amount + transaction.amount,
      count: current.count + 1,
    });
  }

  const total = Array.from(amountByCategory.values()).reduce(
    (sum, item) => sum + item.amount,
    0,
  );

  if (total <= 0) {
    return [];
  }

  return Array.from(amountByCategory.entries())
    .map(([categoryId, item]) => {
      const category = categoryMap.get(categoryId);

      return {
        categoryId,
        name: category?.name ?? '未分类',
        color: category?.color ?? '#64748b',
        icon: category?.icon ?? 'circle',
        amount: normalizeAmount(item.amount),
        percent: item.amount / total,
        count: item.count,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

export function getTransactionExpenseRanking(
  transactions: Transaction[],
  month: string,
  limit = 10,
  categories: Category[] = [],
): TransactionExpenseRankingItem[] {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  return getMonthExpenseTransactions(transactions, month)
    .sort((a, b) => b.amount - a.amount || b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, limit)
    .map((transaction) => ({
      ...transaction,
      category: categoryMap.get(transaction.categoryId),
    }));
}

export function getMonthExpenseTotal(transactions: Transaction[], month: string): number {
  return normalizeAmount(
    getMonthExpenseTransactions(transactions, month).reduce(
      (total, transaction) => total + transaction.amount,
      0,
    ),
  );
}

function getMonthExpenseTransactions(transactions: Transaction[], month: string): Transaction[] {
  return transactions.filter(
    (transaction) =>
      transaction.type === 'expense' && dayjs(transaction.occurredAt).format('YYYY-MM') === month,
  );
}
