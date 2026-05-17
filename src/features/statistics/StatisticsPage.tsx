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
import { formatCurrency, formatPlainAmount } from '@/utils/money';
import { getMonthLabel } from '@/utils/month';
import { useStatistics, type StatisticsData } from './useStatistics';

type StatisticsPageProps = {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onBack: () => void;
};

export function StatisticsPage({ selectedMonth, onMonthChange, onBack }: StatisticsPageProps) {
  const statistics = useStatistics(selectedMonth);

  return (
    <main className="min-h-screen bg-[#F7FBF9] text-[#17352a]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8">
        <header className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#6f8178] shadow-[0_10px_28px_rgba(23,53,42,0.06)] transition hover:text-[#2f8f66]"
          >
            返回
          </button>
          <h1 className="text-xl font-semibold tracking-normal">{getMonthLabel(selectedMonth)}统计</h1>
          <div className="w-16" />
        </header>
        <MonthSwitcher selectedMonth={selectedMonth} onChange={onMonthChange} />

        <PeriodSummaryCards statistics={statistics} />
        <TrendChart statistics={statistics} />
        <CategoryShareChart statistics={statistics} />
      </div>
    </main>
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

type EmptyStateProps = {
  title: string;
};

function EmptyState({ title }: EmptyStateProps) {
  return (
    <div className="py-12 text-center">
      <p className="text-base font-semibold text-[#17352a]">{title}</p>
      <p className="mt-2 text-sm text-[#7a8d84]">记录几笔支出后，这里会自动生成图表。</p>
    </div>
  );
}
