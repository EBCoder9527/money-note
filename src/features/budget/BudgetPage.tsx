import { useEffect, useMemo, useState } from 'react';
import { liveQuery } from 'dexie';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { db } from '@/data/db';
import { budgetRepository } from '@/data/repositories';
import type { Budget, Transaction } from '@/data/models';
import { formatCurrency, formatPlainAmount, normalizeAmount } from '@/utils/money';
import { getMonthLabel, getMonthRangeIso } from '@/utils/month';

type BudgetPageProps = {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onCancel: () => void;
  onSaved: () => void;
};

type BudgetSnapshot = {
  budget?: Budget;
  monthTransactions: Transaction[];
};

type FormErrors = {
  amount?: string;
  submit?: string;
};

export function BudgetPage({ selectedMonth, onMonthChange, onCancel, onSaved }: BudgetPageProps) {
  const monthKey = selectedMonth;
  const monthLabel = getMonthLabel(selectedMonth);
  const { startIso: monthStartIso, endIso: monthEndIso } = useMemo(
    () => getMonthRangeIso(selectedMonth),
    [selectedMonth],
  );

  const [amount, setAmount] = useState('');
  const [snapshot, setSnapshot] = useState<BudgetSnapshot>({ monthTransactions: [] });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setAmount('');
    setErrors({});
  }, [selectedMonth]);

  useEffect(() => {
    const subscription = liveQuery(async () => {
      const [budgets, monthTransactions] = await Promise.all([
        db.budgets.where('month').equals(monthKey).toArray(),
        db.transactions
          .where('occurredAt')
          .between(monthStartIso, monthEndIso, true, true)
          .toArray(),
      ]);

      const budget = budgets.sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];

      return { budget, monthTransactions };
    }).subscribe({
      next: (nextSnapshot) => {
        setSnapshot(nextSnapshot);
        setAmount((currentAmount) => {
          if (currentAmount !== '') {
            return currentAmount;
          }

          return nextSnapshot.budget ? formatPlainAmount(nextSnapshot.budget.amount) : '';
        });
      },
      error: () => {
        setErrors((currentErrors) => ({
          ...currentErrors,
          submit: '预算读取失败，请稍后再试。',
        }));
      },
    });

    return () => subscription.unsubscribe();
  }, [monthEndIso, monthKey, monthStartIso]);

  const amountValue = Number(amount);
  const monthExpenseTotal = snapshot.monthTransactions.reduce((total, transaction) => {
    if (transaction.type !== 'expense') {
      return total;
    }

    return total + transaction.amount;
  }, 0);
  const budgetAmount =
    Number.isFinite(amountValue) && amountValue > 0
      ? normalizeAmount(amountValue)
      : snapshot.budget?.amount ?? 0;
  const remainingBudget = budgetAmount - monthExpenseTotal;
  const displayedRemainingBudget = budgetAmount > 0 ? remainingBudget : 0;
  const usagePercent = budgetAmount > 0 ? Math.min((monthExpenseTotal / budgetAmount) * 100, 999) : 0;
  const progress = Math.min(usagePercent, 100);
  const isExceeded = budgetAmount > 0 && monthExpenseTotal > budgetAmount;
  const isWarning = budgetAmount > 0 && !isExceeded && monthExpenseTotal >= budgetAmount * 0.9;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateBudgetAmount(amount, amountValue);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      await budgetRepository.upsertMonthlyBudget(monthKey, normalizeAmount(amountValue));
      onSaved();
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : '保存失败，请稍后再试。',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FBF9] pb-32 text-[#17352a]">
      <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8">
        <header className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#6f8178] shadow-[0_10px_28px_rgba(23,53,42,0.06)] transition hover:text-[#2f8f66]"
          >
            返回
          </button>
          <h1 className="text-xl font-semibold tracking-normal">预算管理</h1>
          <div className="w-16" />
        </header>
        <MonthSwitcher selectedMonth={selectedMonth} onChange={onMonthChange} />

        <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_18px_45px_rgba(23,53,42,0.07)]">
          <p className="text-sm font-medium text-[#7a8d84]">当前月份</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-normal">{monthLabel}</h2>

          <label htmlFor="budget-amount" className="mt-7 block text-sm font-medium text-[#7a8d84]">
            本月预算
          </label>
          <div className="mt-2 flex items-center gap-3 rounded-[1.35rem] bg-[#F7FBF9] px-4 py-4">
            <span className="text-3xl font-bold text-[#4CB782]">¥</span>
            <input
              id="budget-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setErrors({});
              }}
              placeholder="0.00"
              className="min-w-0 flex-1 bg-transparent text-5xl font-bold tracking-normal text-[#17352a] outline-none placeholder:text-[#bdd7cb]"
            />
          </div>
          {errors.amount ? <p className="mt-2 text-sm text-[#d65a54]">{errors.amount}</p> : null}
        </section>

        <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_18px_45px_rgba(23,53,42,0.07)]">
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="本月已支出" value={formatCurrency(monthExpenseTotal)} tone="expense" />
            <SummaryCard
              label="剩余预算"
              value={formatCurrency(displayedRemainingBudget)}
              tone={displayedRemainingBudget < 0 ? 'expense' : 'income'}
            />
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-[#7a8d84]">预算使用率</span>
              <span className="rounded-full bg-[#EAF7F1] px-3 py-1 font-semibold text-[#2f8f66]">
                {budgetAmount > 0 ? `${Math.round(usagePercent)}%` : '未设置'}
              </span>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#DDF3E8]">
              <div
                className={`h-full rounded-full transition-all ${
                  isExceeded ? 'bg-[#4CB782]' : isWarning ? 'bg-[#4CB782]' : 'bg-[#4CB782]'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-[#7a8d84]">
              {budgetAmount > 0
                ? `预算 ${formatCurrency(budgetAmount)}，已使用 ${formatCurrency(monthExpenseTotal)}`
                : '输入预算金额后，可以轻松预览本月节奏。'}
            </p>
          </div>
        </section>

        {isWarning || isExceeded ? (
          <section
            className={`rounded-[1.35rem] border p-4 shadow-[0_12px_36px_rgba(23,53,42,0.05)] ${
              isExceeded
                ? 'border-[#f3b4a8] bg-[#fff0ec] text-[#8f2c18]'
                : 'border-[#f4d28b] bg-[#fff8e7] text-[#835b12]'
            }`}
          >
            <h2 className="text-base font-semibold">{isExceeded ? '预算已经超出' : '预算快用完了'}</h2>
            <p className="mt-1 text-sm leading-6">
              {isExceeded
                ? `当前已超出 ${formatCurrency(Math.abs(remainingBudget))}。`
                : '当前支出已达到预算 90%，可以留意接下来的消费安排。'}
            </p>
          </section>
        ) : null}

        {errors.submit ? (
          <div className="rounded-2xl border border-[#f3b4a8] bg-[#fff0ec] p-4 text-sm font-medium text-[#8f2c18]">
            {errors.submit}
          </div>
        ) : null}

        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-[#dcefe6] bg-[#F7FBF9]/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="mx-auto max-w-3xl">
            <button
              type="submit"
              disabled={isSaving}
              className="h-14 w-full rounded-[1.35rem] bg-[#4CB782] px-5 text-base font-semibold text-white shadow-[0_16px_34px_rgba(76,183,130,0.28)] transition hover:bg-[#3fa574] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#bdd7cb]"
            >
              {isSaving ? '保存中' : snapshot.budget ? '保存修改' : '保存预算'}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  tone: 'expense' | 'income';
};

function SummaryCard({ label, value, tone }: SummaryCardProps) {
  return (
    <div className="rounded-[1.35rem] border border-[#dcefe6] bg-[#F7FBF9] p-4">
      <p className="text-sm font-medium text-[#7a8d84]">{label}</p>
      <p className={`mt-2 text-xl font-bold ${tone === 'expense' ? 'text-[#d65a54]' : 'text-[#4CB782]'}`}>
        {value}
      </p>
    </div>
  );
}

function validateBudgetAmount(amount: string, amountValue: number): FormErrors {
  if (amount.trim() === '') {
    return { amount: '请输入预算金额。' };
  }

  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    return { amount: '预算金额必须大于 0。' };
  }

  return {};
}
