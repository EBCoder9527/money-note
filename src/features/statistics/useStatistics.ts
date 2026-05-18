import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import { liveQuery } from 'dexie';
import { db } from '@/data/db';
import type { Category, Transaction } from '@/data/models';
import { getMonthBaseDate } from '@/utils/month';
import {
  buildLastSevenDaysTrend,
  buildMonthlyCategoryShares,
  calculatePeriodExpenses,
  type CategoryShare,
  type PeriodExpenseSummary,
  type TrendPoint,
} from './statisticsUtils';
import {
  getCategoryExpenseRanking,
  getDailyExpenseSummary,
  getMonthExpenseTotal,
  getTransactionExpenseRanking,
  getTransactionsByDate,
  type CategoryExpenseRankingItem,
  type DailyExpenseSummary,
  type TransactionExpenseRankingItem,
} from '@/utils/statistics';

dayjs.extend(quarterOfYear);

export type StatisticsData = {
  periodExpenses: PeriodExpenseSummary;
  trend: TrendPoint[];
  categoryShares: CategoryShare[];
  dailySummary: DailyExpenseSummary[];
  selectedDateTransactions: TransactionExpenseRankingItem[];
  categoryRanking: CategoryExpenseRankingItem[];
  transactionRanking: TransactionExpenseRankingItem[];
  monthExpenseTotal: number;
  hasExpenseData: boolean;
  isLoading: boolean;
};

type StatisticsSnapshot = {
  transactions: Transaction[];
  categories: Category[];
};

const emptyPeriodExpenses: PeriodExpenseSummary = {
  week: 0,
  month: 0,
  quarter: 0,
  year: 0,
};

export function useStatistics(selectedMonth: string, selectedDate: string): StatisticsData {
  const [snapshot, setSnapshot] = useState<StatisticsSnapshot>({
    transactions: [],
    categories: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const baseDate = useMemo(() => getMonthBaseDate(selectedMonth), [selectedMonth]);

  useEffect(() => {
    const subscription = liveQuery(async () => {
      const [transactions, categories] = await Promise.all([
        db.transactions.where('type').equals('expense').toArray(),
        db.categories.toArray(),
      ]);

      return { transactions, categories };
    }).subscribe({
      next: (nextSnapshot) => {
        setSnapshot(nextSnapshot);
        setIsLoading(false);
      },
      error: (error) => {
        console.error('Failed to load statistics.', error);
        setIsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, []);

  return useMemo(() => {
    if (snapshot.transactions.length === 0) {
      return {
        periodExpenses: emptyPeriodExpenses,
        trend: buildLastSevenDaysTrend([], baseDate),
        categoryShares: [],
        dailySummary: getDailyExpenseSummary([], selectedMonth),
        selectedDateTransactions: [],
        categoryRanking: [],
        transactionRanking: [],
        monthExpenseTotal: 0,
        hasExpenseData: false,
        isLoading,
      };
    }

    return {
      periodExpenses: calculatePeriodExpenses(snapshot.transactions, baseDate),
      trend: buildLastSevenDaysTrend(snapshot.transactions, baseDate),
      categoryShares: buildMonthlyCategoryShares(snapshot.transactions, snapshot.categories, baseDate),
      dailySummary: getDailyExpenseSummary(snapshot.transactions, selectedMonth),
      selectedDateTransactions: getTransactionsByDate(snapshot.transactions, selectedDate).map(
        (transaction) => ({
          ...transaction,
          category: snapshot.categories.find((category) => category.id === transaction.categoryId),
        }),
      ),
      categoryRanking: getCategoryExpenseRanking(
        snapshot.transactions,
        selectedMonth,
        snapshot.categories,
      ),
      transactionRanking: getTransactionExpenseRanking(
        snapshot.transactions,
        selectedMonth,
        10,
        snapshot.categories,
      ),
      monthExpenseTotal: getMonthExpenseTotal(snapshot.transactions, selectedMonth),
      hasExpenseData: true,
      isLoading,
    };
  }, [baseDate, isLoading, selectedDate, selectedMonth, snapshot]);
}
