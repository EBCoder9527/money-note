import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { liveQuery } from 'dexie';
import { db } from '@/data/db';
import { categoryRepository } from '@/data/repositories';
import type { Budget, Category, Transaction } from '@/data/models';
import { getMonthBaseDate, getMonthLabel, getMonthRangeIso } from '@/utils/month';

dayjs.locale('zh-cn');

export type RecentTransaction = Transaction & {
  category?: Category;
};

export type HomeDashboardData = {
  currentMonthKey: string;
  currentMonthLabel: string;
  monthExpenseTotal: number;
  weekExpenseTotal: number;
  monthBudgetTotal: number;
  budgetUsagePercent: number;
  budgetStatus: 'none' | 'safe' | 'warning' | 'exceeded';
  recentTransactions: RecentTransaction[];
  isLoading: boolean;
};

type HomeDashboardSnapshot = {
  monthTransactions: Transaction[];
  weekTransactions: Transaction[];
  recentTransactions: Transaction[];
  monthBudgets: Budget[];
  categories: Category[];
};

const initialSnapshot: HomeDashboardSnapshot = {
  monthTransactions: [],
  weekTransactions: [],
  recentTransactions: [],
  monthBudgets: [],
  categories: [],
};

export function useHomeDashboard(selectedMonth: string): HomeDashboardData {
  const [snapshot, setSnapshot] = useState<HomeDashboardSnapshot>(initialSnapshot);
  const [isLoading, setIsLoading] = useState(true);

  const baseDate = useMemo(() => getMonthBaseDate(selectedMonth), [selectedMonth]);
  const monthKey = selectedMonth;
  const { startIso: monthStartIso, endIso: monthEndIso } = useMemo(
    () => getMonthRangeIso(selectedMonth),
    [selectedMonth],
  );
  const weekStartIso = baseDate.startOf('week').toISOString();
  const weekEndIso = baseDate.endOf('week').toISOString();

  useEffect(() => {
    void categoryRepository.ensureDefaultCategories();

    const subscription = liveQuery(async () => {
      const [monthTransactions, weekTransactions, monthBudgets, categories] =
        await Promise.all([
          db.transactions
            .where('occurredAt')
            .between(monthStartIso, monthEndIso, true, true)
            .toArray(),
          db.transactions
            .where('occurredAt')
            .between(weekStartIso, weekEndIso, true, true)
            .toArray(),
          db.budgets.where('month').equals(monthKey).toArray(),
          db.categories.toArray(),
        ]);
      const recentTransactions = [...monthTransactions]
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, 5);

      return {
        monthTransactions,
        weekTransactions,
        recentTransactions,
        monthBudgets,
        categories,
      };
    }).subscribe({
      next: (nextSnapshot) => {
        setSnapshot(nextSnapshot);
        setIsLoading(false);
      },
      error: (error) => {
        console.error('Failed to load home dashboard data.', error);
        setIsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, [monthEndIso, monthKey, monthStartIso, weekEndIso, weekStartIso]);

  return useMemo(() => {
    const categoryMap = new Map(snapshot.categories.map((category) => [category.id, category]));
    const monthExpenseTotal = sumExpense(snapshot.monthTransactions);
    const weekExpenseTotal = sumExpense(snapshot.weekTransactions);
    const currentMonthBudget = snapshot.monthBudgets.sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    )[0];
    const monthBudgetTotal = currentMonthBudget?.amount ?? 0;
    const budgetUsagePercent =
      monthBudgetTotal > 0 ? Math.min((monthExpenseTotal / monthBudgetTotal) * 100, 999) : 0;
    const budgetStatus = getBudgetStatus(monthExpenseTotal, monthBudgetTotal);

    return {
      currentMonthKey: monthKey,
      currentMonthLabel: getMonthLabel(monthKey),
      monthExpenseTotal,
      weekExpenseTotal,
      monthBudgetTotal,
      budgetUsagePercent,
      budgetStatus,
      recentTransactions: snapshot.recentTransactions.map((transaction) => ({
        ...transaction,
        category: categoryMap.get(transaction.categoryId),
      })),
      isLoading,
    };
  }, [isLoading, monthKey, snapshot]);
}

function sumExpense(transactions: Transaction[]): number {
  return transactions.reduce((total, transaction) => {
    if (transaction.type !== 'expense') {
      return total;
    }

    return total + transaction.amount;
  }, 0);
}

function getBudgetStatus(
  monthExpenseTotal: number,
  monthBudgetTotal: number,
): HomeDashboardData['budgetStatus'] {
  if (monthBudgetTotal <= 0) {
    return 'none';
  }

  if (monthExpenseTotal > monthBudgetTotal) {
    return 'exceeded';
  }

  if (monthExpenseTotal >= monthBudgetTotal * 0.9) {
    return 'warning';
  }

  return 'safe';
}
