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

dayjs.extend(quarterOfYear);

export type StatisticsData = {
  periodExpenses: PeriodExpenseSummary;
  trend: TrendPoint[];
  categoryShares: CategoryShare[];
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

export function useStatistics(selectedMonth: string): StatisticsData {
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
        hasExpenseData: false,
        isLoading,
      };
    }

    return {
      periodExpenses: calculatePeriodExpenses(snapshot.transactions, baseDate),
      trend: buildLastSevenDaysTrend(snapshot.transactions, baseDate),
      categoryShares: buildMonthlyCategoryShares(snapshot.transactions, snapshot.categories, baseDate),
      hasExpenseData: true,
      isLoading,
    };
  }, [baseDate, isLoading, snapshot]);
}
