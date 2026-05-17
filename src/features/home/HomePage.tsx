import dayjs from 'dayjs';
import { AppLogo } from '@/components/AppLogo';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { useHomeDashboard, type HomeDashboardData, type RecentTransaction } from './useHomeDashboard';
import { formatCurrency } from '@/utils/money';

type HomePageProps = {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  successMessage?: string;
  onCreateTransaction: () => void;
  onManageBudget: () => void;
  onOpenStatistics: () => void;
  onOpenSettings: () => void;
};

export function HomePage({
  selectedMonth,
  onMonthChange,
  successMessage,
  onCreateTransaction,
  onManageBudget,
  onOpenStatistics,
  onOpenSettings,
}: HomePageProps) {
  const dashboard = useHomeDashboard(selectedMonth);

  return (
    <main className="min-h-screen bg-[#F7FBF9] text-[#17352a]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8">
        <HomeHeader onOpenSettings={onOpenSettings} />
        <MonthSwitcher selectedMonth={selectedMonth} onChange={onMonthChange} />
        {successMessage ? (
          <div className="rounded-[1.35rem] border border-[#bfe8d4] bg-white p-4 text-sm font-semibold text-[#2f8f66] shadow-[0_12px_36px_rgba(76,183,130,0.10)]">
            {successMessage}
          </div>
        ) : null}
        <MonthOverview dashboard={dashboard} onManageBudget={onManageBudget} />
        <QuickActions
          onCreateTransaction={onCreateTransaction}
          onOpenStatistics={onOpenStatistics}
          onOpenBills={() => {
            document.getElementById('recent-transactions')?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
          }}
        />
        <RecentTransactions transactions={dashboard.recentTransactions} isLoading={dashboard.isLoading} />
      </div>
    </main>
  );
}

function HomeHeader({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <header className="flex items-center justify-between pt-2">
      <AppLogo />
      <button
        type="button"
        onClick={onOpenSettings}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#dcefe6] bg-white text-lg font-semibold text-[#2f8f66] shadow-[0_10px_28px_rgba(23,53,42,0.06)] transition hover:border-[#4CB782] hover:bg-[#F7FBF9] active:scale-[0.98]"
        aria-label="打开设置"
      >
        ⚙
      </button>
    </header>
  );
}

type MonthOverviewProps = {
  dashboard: HomeDashboardData;
  onManageBudget: () => void;
};

function MonthOverview({ dashboard, onManageBudget }: MonthOverviewProps) {
  const progress = Math.min(dashboard.budgetUsagePercent, 100);
  const hasBudget = dashboard.monthBudgetTotal > 0;
  const remainingBudget = dashboard.monthBudgetTotal - dashboard.monthExpenseTotal;

  return (
    <section className="overflow-hidden rounded-[1.9rem] bg-white shadow-[0_18px_48px_rgba(23,53,42,0.07)]">
      <div className="bg-gradient-to-br from-[#f3fbf7] via-white to-[#eaf7f1] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#7a8d84]">{dashboard.currentMonthLabel}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-[#17352a]">今日财务概览</h1>
          </div>
          <span className={getStatusPillClassName(dashboard.budgetStatus)}>
            {getStatusText(dashboard.budgetStatus)}
          </span>
        </div>

        <div className="mt-7">
          <p className="text-sm font-medium text-[#7a8d84]">本月支出</p>
          <div className="mt-2 text-5xl font-bold tracking-normal text-[#17352a]">
            {formatCurrency(dashboard.monthExpenseTotal)}
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
          <OverviewMetric
            label="本月预算"
            value={hasBudget ? formatCurrency(dashboard.monthBudgetTotal) : '未设置'}
            actionLabel={hasBudget ? '调整' : '设置'}
            onAction={onManageBudget}
          />
          <OverviewMetric
            label="剩余预算"
            value={hasBudget ? formatCurrency(remainingBudget) : '--'}
            tone={remainingBudget < 0 ? 'danger' : 'default'}
          />
        </div>

        <div className="mt-5 rounded-[1.4rem] bg-[#F7FBF9] p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-[#7a8d84]">预算进度</span>
            <span className="font-semibold text-[#2f8f66]">
              {hasBudget ? `${Math.round(dashboard.budgetUsagePercent)}%` : '待设置'}
            </span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#DDF3E8]">
            <div
              className="h-full rounded-full bg-[#4CB782] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className={getBudgetHintClassName(dashboard.budgetStatus)}>
            {getBudgetHint(dashboard)}
          </p>
        </div>
      </div>
    </section>
  );
}

type OverviewMetricProps = {
  label: string;
  value: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'default' | 'danger';
};

function OverviewMetric({ label, value, actionLabel, onAction, tone = 'default' }: OverviewMetricProps) {
  return (
    <div className="min-w-0 rounded-[1.35rem] border border-[#e4f1eb] bg-white p-4 shadow-[0_10px_28px_rgba(23,53,42,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#7a8d84]">{label}</p>
          <p
            className={`mt-2 break-words text-[1.35rem] font-bold leading-tight tracking-normal sm:text-xl ${
              tone === 'danger' ? 'text-[#d65a54]' : 'text-[#17352a]'
            }`}
          >
            {value}
          </p>
        </div>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="shrink-0 rounded-full bg-[#EAF7F1] px-3 py-1 text-sm font-semibold text-[#2f8f66] transition hover:bg-[#DDF3E8]"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

type QuickActionsProps = {
  onCreateTransaction: () => void;
  onOpenBills: () => void;
  onOpenStatistics: () => void;
};

function QuickActions({ onCreateTransaction, onOpenBills, onOpenStatistics }: QuickActionsProps) {
  return (
    <section className="grid grid-cols-3 gap-3">
      <QuickActionButton label="记一笔" accent onClick={onCreateTransaction} />
      <QuickActionButton label="账单" onClick={onOpenBills} />
      <QuickActionButton label="统计" onClick={onOpenStatistics} />
    </section>
  );
}

type QuickActionButtonProps = {
  label: string;
  onClick: () => void;
  accent?: boolean;
};

function QuickActionButton({ label, onClick, accent = false }: QuickActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-16 rounded-[1.35rem] text-base font-semibold shadow-[0_12px_30px_rgba(23,53,42,0.06)] transition active:scale-[0.98] ${
        accent
          ? 'bg-[#4CB782] text-white shadow-[0_16px_34px_rgba(76,183,130,0.26)] hover:bg-[#3fa574]'
          : 'border border-[#e4f1eb] bg-white text-[#2f8f66] hover:border-[#4CB782]'
      }`}
    >
      {label}
    </button>
  );
}

type RecentTransactionsProps = {
  transactions: RecentTransaction[];
  isLoading: boolean;
};

function RecentTransactions({ transactions, isLoading }: RecentTransactionsProps) {
  return (
    <section
      id="recent-transactions"
      className="scroll-mt-5 rounded-[1.75rem] bg-white p-5 shadow-[0_18px_45px_rgba(23,53,42,0.07)]"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">最近账单</h2>
        <span className="rounded-full bg-[#F7FBF9] px-3 py-1 text-sm text-[#7a8d84]">近 5 条</span>
      </div>

      {transactions.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-base font-semibold text-[#17352a]">
            {isLoading ? '正在整理账单' : '这个月还很清爽'}
          </p>
          <p className="mt-2 text-sm text-[#7a8d84]">
            {isLoading ? '稍等一下就好。' : '记下第一笔后，这里会帮你轻轻归拢起来。'}
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-[#edf4f0]">
          {transactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </ul>
      )}
    </section>
  );
}

type TransactionRowProps = {
  transaction: RecentTransaction;
};

function TransactionRow({ transaction }: TransactionRowProps) {
  const isExpense = transaction.type === 'expense';

  return (
    <li className="flex items-center gap-3 py-4">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-[0_10px_22px_rgba(23,53,42,0.10)]"
        style={{ backgroundColor: transaction.category?.color ?? '#64748b' }}
      >
        {(transaction.category?.name ?? '账')[0]}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#17352a]">{transaction.category?.name ?? '未分类'}</p>
        <p className="mt-1 truncate text-xs text-[#7a8d84]">
          {dayjs(transaction.occurredAt).format('M月D日 HH:mm')}
          {transaction.note ? ` · ${transaction.note}` : ''}
        </p>
      </div>
      <div
        className={`shrink-0 text-base font-bold ${
          isExpense ? 'text-[#d65a54]' : 'text-[#4CB782]'
        }`}
      >
        {isExpense ? '-' : '+'}
        {formatCurrency(transaction.amount)}
      </div>
    </li>
  );
}

function getStatusText(status: HomeDashboardData['budgetStatus']): string {
  if (status === 'exceeded') {
    return '已超支';
  }

  if (status === 'warning') {
    return '接近预算';
  }

  if (status === 'safe') {
    return '节奏良好';
  }

  return '未设预算';
}

function getStatusPillClassName(status: HomeDashboardData['budgetStatus']): string {
  const baseClassName = 'shrink-0 rounded-full px-3 py-1 text-xs font-semibold';

  if (status === 'exceeded') {
    return `${baseClassName} bg-[#fff0ec] text-[#b0442e]`;
  }

  if (status === 'warning') {
    return `${baseClassName} bg-[#fff8e7] text-[#8a651a]`;
  }

  return `${baseClassName} bg-[#EAF7F1] text-[#2f8f66]`;
}

function getBudgetHint(dashboard: HomeDashboardData): string {
  if (dashboard.budgetStatus === 'none') {
    return '设置一个轻松的月预算，花钱会更有节奏。';
  }

  if (dashboard.budgetStatus === 'exceeded') {
    return `已超出 ${formatCurrency(dashboard.monthExpenseTotal - dashboard.monthBudgetTotal)}，接下来每一笔都要更有数。`;
  }

  if (dashboard.budgetStatus === 'warning') {
    return '当前支出已达到预算 90%，可以稍微放慢一下消费节奏。';
  }

  return '预算使用平稳，继续保持这个节奏。';
}

function getBudgetHintClassName(status: HomeDashboardData['budgetStatus']): string {
  const baseClassName = 'mt-3 text-sm leading-6';

  if (status === 'exceeded') {
    return `${baseClassName} text-[#b0442e]`;
  }

  if (status === 'warning') {
    return `${baseClassName} text-[#8a651a]`;
  }

  return `${baseClassName} text-[#7a8d84]`;
}
