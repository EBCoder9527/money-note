import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import type { Category } from '@/data/models';
import { formatCompactAmount, formatCurrency, formatPlainAmount } from '@/utils/money';
import { getMonthLabel } from '@/utils/month';
import type {
  CategoryExpenseRankingItem,
  DailyExpenseSummary,
  TransactionExpenseRankingItem,
} from '@/utils/statistics';
import { useStatistics, type StatisticsData } from './useStatistics';

type StatisticsPageProps = {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onBack: () => void;
};

type StatisticsTab = 'calendar' | 'overview' | 'ranking';
type RankingMode = 'category' | 'transaction';

const tabs: Array<{ key: StatisticsTab; label: string }> = [
  { key: 'calendar', label: '日历总览' },
  { key: 'overview', label: '收支总览' },
  { key: 'ranking', label: '消费排行' },
];

export function StatisticsPage({ selectedMonth, onMonthChange, onBack }: StatisticsPageProps) {
  const [activeTab, setActiveTab] = useState<StatisticsTab>('calendar');
  const [selectedDate, setSelectedDate] = useState(() => getDefaultSelectedDate(selectedMonth));
  const statistics = useStatistics(selectedMonth, selectedDate);

  useEffect(() => {
    setSelectedDate(getDefaultSelectedDate(selectedMonth));
  }, [selectedMonth]);

  return (
    <main className="min-h-screen bg-[#F7FBF9] pb-28 text-[#17352a]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8">
        <header className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#6f8178] shadow-[0_10px_28px_rgba(23,53,42,0.06)] transition hover:text-[#2f8f66]"
          >
            返回
          </button>
          <h1 className="text-xl font-semibold tracking-normal">统计</h1>
          <div className="w-16" />
        </header>
        <MonthSwitcher selectedMonth={selectedMonth} onChange={onMonthChange} />
        <StatisticsTabs activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'calendar' ? (
          <CalendarOverview
            selectedMonth={selectedMonth}
            selectedDate={selectedDate}
            statistics={statistics}
            onSelectDate={setSelectedDate}
          />
        ) : null}

        {activeTab === 'overview' ? (
          <>
            <PeriodSummaryCards statistics={statistics} />
            <TrendChart statistics={statistics} />
            <CategoryShareChart statistics={statistics} />
          </>
        ) : null}

        {activeTab === 'ranking' ? <ExpenseRanking statistics={statistics} /> : null}
      </div>
    </main>
  );
}

type StatisticsTabsProps = {
  activeTab: StatisticsTab;
  onChange: (tab: StatisticsTab) => void;
};

function StatisticsTabs({ activeTab, onChange }: StatisticsTabsProps) {
  return (
    <section className="grid grid-cols-3 gap-1 rounded-[1.35rem] bg-[#EAF7F1] p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`h-11 rounded-[1.05rem] text-sm font-semibold transition ${
            activeTab === tab.key
              ? 'bg-white text-[#17352a] shadow-[0_8px_20px_rgba(76,183,130,0.12)]'
              : 'text-[#6f8178]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </section>
  );
}

type CalendarOverviewProps = {
  selectedMonth: string;
  selectedDate: string;
  statistics: StatisticsData;
  onSelectDate: (date: string) => void;
};

function CalendarOverview({
  selectedMonth,
  selectedDate,
  statistics,
  onSelectDate,
}: CalendarOverviewProps) {
  return (
    <>
      <DailyExpenseCalendar
        selectedMonth={selectedMonth}
        selectedDate={selectedDate}
        dailySummary={statistics.dailySummary}
        monthExpenseTotal={statistics.monthExpenseTotal}
        onSelectDate={onSelectDate}
      />
      <DailyTransactionList
        selectedDate={selectedDate}
        transactions={statistics.selectedDateTransactions}
        isLoading={statistics.isLoading}
      />
    </>
  );
}

type DailyExpenseCalendarProps = {
  selectedMonth: string;
  selectedDate: string;
  dailySummary: DailyExpenseSummary[];
  monthExpenseTotal: number;
  onSelectDate: (date: string) => void;
};

function DailyExpenseCalendar({
  selectedMonth,
  selectedDate,
  dailySummary,
  monthExpenseTotal,
  onSelectDate,
}: DailyExpenseCalendarProps) {
  const calendarCells = useMemo(
    () => buildCalendarCells(selectedMonth, dailySummary),
    [dailySummary, selectedMonth],
  );

  return (
    <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_18px_45px_rgba(23,53,42,0.07)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#7a8d84]">{getMonthLabel(selectedMonth)}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-normal">每日消费预览</h2>
        </div>
        <div className="shrink-0 rounded-full bg-[#EAF7F1] px-3 py-1 text-sm font-semibold text-[#2f8f66]">
          {formatCurrency(monthExpenseTotal)}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 text-center text-xs font-semibold text-[#7a8d84]">
        {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarCells.map((cell, index) =>
          cell ? (
            <CalendarDayButton
              key={cell.date}
              day={cell}
              isSelected={cell.date === selectedDate}
              isToday={cell.date === dayjs().format('YYYY-MM-DD')}
              onSelectDate={onSelectDate}
            />
          ) : (
            <div key={`empty-${index}`} className="min-h-[4.5rem]" />
          ),
        )}
      </div>
    </section>
  );
}

type CalendarDayButtonProps = {
  day: DailyExpenseSummary;
  isSelected: boolean;
  isToday: boolean;
  onSelectDate: (date: string) => void;
};

function CalendarDayButton({ day, isSelected, isToday, onSelectDate }: CalendarDayButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelectDate(day.date)}
      className={`flex min-h-[4.5rem] min-w-0 flex-col justify-between rounded-2xl border p-1.5 text-left transition active:scale-[0.98] ${
        isSelected
          ? 'border-[#4CB782] bg-[#E7F6EE]'
          : isToday
            ? 'border-[#bfe8d4] bg-[#F7FBF9]'
            : 'border-transparent bg-[#fbfefd] hover:border-[#dcefe6]'
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={`text-sm font-semibold ${
            isSelected ? 'text-[#2f8f66]' : 'text-[#17352a]'
          }`}
        >
          {day.dayOfMonth}
        </span>
        {day.hasExpense ? <span className="h-1.5 w-1.5 rounded-full bg-[#d65a54]" /> : null}
      </div>
      {day.hasExpense ? (
        <p
          className="mt-1 w-full rounded-full bg-[#fff0ec] px-0.5 py-0.5 text-center text-[0.62rem] font-bold leading-4 tracking-normal text-[#d65a54] tabular-nums"
          title={formatCurrency(day.amount)}
        >
          {formatCompactAmount(day.amount)}
        </p>
      ) : null}
    </button>
  );
}

type DailyTransactionListProps = {
  selectedDate: string;
  transactions: TransactionExpenseRankingItem[];
  isLoading: boolean;
};

function DailyTransactionList({ selectedDate, transactions, isLoading }: DailyTransactionListProps) {
  const dayExpenseTotal = transactions.reduce((total, transaction) => total + transaction.amount, 0);

  return (
    <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_18px_45px_rgba(23,53,42,0.07)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{selectedDate} 消费记录</h2>
          <p className="mt-1 text-xs text-[#7a8d84]">{transactions.length} 笔</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#EAF7F1] px-3 py-1 text-sm font-semibold text-[#2f8f66]">
          {formatCurrency(dayExpenseTotal)}
        </span>
      </div>

      {transactions.length === 0 ? (
        <EmptyState title={isLoading ? '记录读取中' : '当天没有消费记录'} />
      ) : (
        <ul className="mt-4 divide-y divide-[#edf4f0]">
          {transactions.map((transaction) => (
            <TransactionListRow key={transaction.id} transaction={transaction} />
          ))}
        </ul>
      )}
    </section>
  );
}

type StatisticsSectionProps = {
  statistics: StatisticsData;
};

function PeriodSummaryCards({ statistics }: StatisticsSectionProps) {
  const { periodExpenses } = statistics;

  return (
    <section className="grid grid-cols-2 gap-3">
      <SummaryCard label="本周支出" amount={periodExpenses.week} />
      <SummaryCard label="本月支出" amount={periodExpenses.month} />
      <SummaryCard label="本季度支出" amount={periodExpenses.quarter} />
      <SummaryCard label="本年支出" amount={periodExpenses.year} />
    </section>
  );
}

type SummaryCardProps = {
  label: string;
  amount: number;
};

function SummaryCard({ label, amount }: SummaryCardProps) {
  return (
    <div className="rounded-[1.35rem] bg-white p-4 shadow-[0_12px_34px_rgba(23,53,42,0.06)]">
      <p className="text-sm font-medium text-[#7a8d84]">{label}</p>
      <p className="mt-2 text-xl font-bold tracking-normal text-[#17352a]">
        {formatCurrency(amount)}
      </p>
    </div>
  );
}

function TrendChart({ statistics }: StatisticsSectionProps) {
  const hasTrendData = statistics.trend.some((point) => point.amount > 0);

  return (
    <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_18px_45px_rgba(23,53,42,0.07)]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">最近 7 天趋势</h2>
        <span className="rounded-full bg-[#EAF7F1] px-3 py-1 text-sm text-[#2f8f66]">支出</span>
      </div>

      {hasTrendData ? (
        <div className="mt-5 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statistics.trend} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#7a8d84', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#7a8d84', fontSize: 12 }}
                tickFormatter={(value) => `${value}`}
                width={48}
              />
              <Tooltip
                cursor={{ fill: '#F7FBF9' }}
                formatter={(value) => [formatCurrency(Number(value)), '支出']}
                labelFormatter={(label) => `${label}`}
              />
              <Bar dataKey="amount" fill="#4CB782" radius={[8, 8, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState title={statistics.isLoading ? '统计读取中' : '最近 7 天还没有支出'} />
      )}
    </section>
  );
}

function CategoryShareChart({ statistics }: StatisticsSectionProps) {
  return (
    <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_18px_45px_rgba(23,53,42,0.07)]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">本月分类占比</h2>
        <span className="rounded-full bg-[#EAF7F1] px-3 py-1 text-sm text-[#2f8f66]">支出</span>
      </div>

      {statistics.categoryShares.length > 0 ? (
        <>
          <div className="mt-5 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statistics.categoryShares}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="50%"
                  outerRadius="78%"
                  paddingAngle={2}
                >
                  {statistics.categoryShares.map((category) => (
                    <Cell key={category.categoryId} fill={category.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, item) => [
                    formatCurrency(Number(value)),
                    item.payload.name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-3 divide-y divide-[#edf4f0]">
            {statistics.categoryShares.map((category) => (
              <li key={category.categoryId} className="flex items-center gap-3 py-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#17352a]">{category.name}</span>
                <span className="text-sm font-semibold text-[#7a8d84]">
                  {(category.percent * 100).toFixed(1)}%
                </span>
                <span className="w-20 text-right text-sm font-bold text-[#17352a]">
                  {formatPlainAmount(category.amount)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState title={statistics.isLoading ? '统计读取中' : '本月还没有支出'} />
      )}
    </section>
  );
}

function ExpenseRanking({ statistics }: StatisticsSectionProps) {
  const [mode, setMode] = useState<RankingMode>('category');

  return (
    <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_18px_45px_rgba(23,53,42,0.07)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#7a8d84]">本月总支出</p>
          <h2 className="mt-2 text-2xl font-bold tracking-normal">
            {formatCurrency(statistics.monthExpenseTotal)}
          </h2>
        </div>
        <span className="shrink-0 rounded-full bg-[#EAF7F1] px-3 py-1 text-sm font-semibold text-[#2f8f66]">
          排行
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-[1.25rem] bg-[#EAF7F1] p-1">
        <RankingModeButton active={mode === 'category'} label="按分类" onClick={() => setMode('category')} />
        <RankingModeButton active={mode === 'transaction'} label="按单笔" onClick={() => setMode('transaction')} />
      </div>

      {mode === 'category' ? (
        <CategoryRankingList items={statistics.categoryRanking} isLoading={statistics.isLoading} />
      ) : (
        <TransactionRankingList items={statistics.transactionRanking} isLoading={statistics.isLoading} />
      )}
    </section>
  );
}

type RankingModeButtonProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

function RankingModeButton({ active, label, onClick }: RankingModeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 rounded-[1.05rem] text-sm font-semibold transition ${
        active
          ? 'bg-white text-[#17352a] shadow-[0_8px_20px_rgba(76,183,130,0.12)]'
          : 'text-[#6f8178]'
      }`}
    >
      {label}
    </button>
  );
}

type CategoryRankingListProps = {
  items: CategoryExpenseRankingItem[];
  isLoading: boolean;
};

function CategoryRankingList({ items, isLoading }: CategoryRankingListProps) {
  if (items.length === 0) {
    return <EmptyState title={isLoading ? '排行读取中' : '这个月还没有消费记录'} />;
  }

  return (
    <ul className="mt-4 divide-y divide-[#edf4f0]">
      {items.map((item, index) => (
        <li key={item.categoryId} className="py-4">
          <div className="flex items-center gap-3">
            <RankingBadge rank={index + 1} />
            <CategoryAvatar category={item} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#17352a]">{item.name}</p>
              <p className="mt-1 text-xs text-[#7a8d84]">
                {item.count} 笔 · {(item.percent * 100).toFixed(1)}%
              </p>
            </div>
            <p className="shrink-0 text-right text-base font-bold text-[#17352a]">
              {formatPlainAmount(item.amount)}
            </p>
          </div>
          <RankingProgressBar percent={item.percent} />
        </li>
      ))}
    </ul>
  );
}

type TransactionRankingListProps = {
  items: TransactionExpenseRankingItem[];
  isLoading: boolean;
};

function TransactionRankingList({ items, isLoading }: TransactionRankingListProps) {
  if (items.length === 0) {
    return <EmptyState title={isLoading ? '排行读取中' : '这个月还没有消费记录'} />;
  }

  return (
    <ul className="mt-4 divide-y divide-[#edf4f0]">
      {items.map((item, index) => (
        <li key={item.id} className="flex items-center gap-3 py-4">
          <RankingBadge rank={index + 1} />
          <CategoryAvatar category={item.category} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#17352a]">
              {item.category?.name ?? '未分类'}
            </p>
            <p className="mt-1 truncate text-xs text-[#7a8d84]">
              {item.note || '无备注'} · {dayjs(item.occurredAt).format('M月D日 HH:mm')}
            </p>
          </div>
          <p className="shrink-0 text-right text-base font-bold text-[#d65a54]">
            {formatPlainAmount(item.amount)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function TransactionListRow({ transaction }: { transaction: TransactionExpenseRankingItem }) {
  return (
    <li className="flex items-center gap-3 py-4">
      <CategoryAvatar category={transaction.category} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#17352a]">
          {transaction.category?.name ?? '未分类'}
        </p>
        <p className="mt-1 truncate text-xs text-[#7a8d84]">
          {transaction.note || '无备注'} · {dayjs(transaction.occurredAt).format('HH:mm')}
        </p>
      </div>
      <p className="shrink-0 text-base font-bold text-[#d65a54]">
        -{formatCurrency(transaction.amount)}
      </p>
    </li>
  );
}

function RankingBadge({ rank }: { rank: number }) {
  const isTopThree = rank <= 3;

  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
        isTopThree ? 'bg-[#4CB782] text-white' : 'bg-[#F7FBF9] text-[#7a8d84]'
      }`}
    >
      {rank}
    </span>
  );
}

function RankingProgressBar({ percent }: { percent: number }) {
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#DDF3E8]">
      <div
        className="h-full rounded-full bg-[#4CB782] transition-all"
        style={{ width: `${Math.min(percent * 100, 100)}%` }}
      />
    </div>
  );
}

function CategoryAvatar({
  category,
}: {
  category?: Pick<Category, 'name' | 'color'> | Pick<CategoryExpenseRankingItem, 'name' | 'color'>;
}) {
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-[0_10px_22px_rgba(23,53,42,0.10)]"
      style={{ backgroundColor: category?.color ?? '#64748b' }}
    >
      {(category?.name ?? '账')[0]}
    </span>
  );
}

type EmptyStateProps = {
  title: string;
};

function EmptyState({ title }: EmptyStateProps) {
  return (
    <div className="py-12 text-center">
      <p className="text-base font-semibold text-[#17352a]">{title}</p>
      <p className="mt-2 text-sm text-[#7a8d84]">记录几笔支出后，这里会自动生成统计。</p>
    </div>
  );
}

function buildCalendarCells(month: string, dailySummary: DailyExpenseSummary[]) {
  const firstDay = dayjs(`${month}-01`);
  const mondayOffset = firstDay.day() === 0 ? 6 : firstDay.day() - 1;
  const leadingEmptyCells = Array.from<null>({ length: mondayOffset }).fill(null);

  return [...leadingEmptyCells, ...dailySummary];
}

function getDefaultSelectedDate(month: string): string {
  const today = dayjs();

  if (today.format('YYYY-MM') === month) {
    return today.format('YYYY-MM-DD');
  }

  return dayjs(`${month}-01`).format('YYYY-MM-DD');
}
