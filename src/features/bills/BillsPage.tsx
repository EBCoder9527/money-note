import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { liveQuery } from 'dexie';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { DateInput } from '@/components/DateInput';
import { Toast } from '@/components/Toast';
import { db } from '@/data/db';
import type { Category, Transaction, TransactionType } from '@/data/models';
import { categoryRepository, transactionRepository } from '@/data/repositories';
import { formatCurrency, formatPlainAmount, normalizeAmount } from '@/utils/money';
import { getMonthLabel, getMonthRangeIso } from '@/utils/month';
import { searchTransactions, type SearchableTransaction } from '@/utils/search';

type BillsPageProps = {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onCreateTransaction: () => void;
};

type TransactionFilter = 'all' | TransactionType;
type TransactionWithCategory = SearchableTransaction;

type TransactionGroup = {
  date: string;
  transactions: TransactionWithCategory[];
  expenseTotal: number;
  incomeTotal: number;
};

type EditFormState = {
  amount: string;
  date: string;
  note: string;
  categoryId: string;
};

export function BillsPage({ selectedMonth, onMonthChange, onCreateTransaction }: BillsPageProps) {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithCategory | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithCategory | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    amount: '',
    date: '',
    note: '',
    categoryId: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [transactionToDelete, setTransactionToDelete] = useState<TransactionWithCategory | null>(null);

  useEffect(() => {
    const { startIso, endIso } = getMonthRangeIso(selectedMonth);

    const subscription = liveQuery(async () => {
      const [monthTransactions, nextCategories] = await Promise.all([
        db.transactions
          .where('occurredAt')
          .between(startIso, endIso, true, true)
          .reverse()
          .sortBy('occurredAt'),
        db.categories.toArray(),
      ]);
      const categoryMap = new Map(nextCategories.map((category) => [category.id, category]));

      return {
        categories: nextCategories,
        transactions: monthTransactions
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
          .map((transaction) => ({
            ...transaction,
            category: categoryMap.get(transaction.categoryId),
          })),
      };
    }).subscribe({
      next: (snapshot) => {
        setCategories(snapshot.categories);
        setTransactions(snapshot.transactions);
      },
      error: () => setError('流水读取失败，请稍后再试。'),
    });

    return () => subscription.unsubscribe();
  }, [selectedMonth]);

  const visibleTransactions = useMemo(() => {
    const typeFiltered =
      filter === 'all'
        ? transactions
        : transactions.filter((transaction) => transaction.type === filter);

    return searchTransactions(typeFiltered, keyword);
  }, [filter, keyword, transactions]);

  const summary = useMemo(() => {
    const income = transactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((total, transaction) => total + transaction.amount, 0);
    const expense = transactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((total, transaction) => total + transaction.amount, 0);

    return {
      income: normalizeAmount(income),
      expense: normalizeAmount(expense),
      balance: normalizeAmount(income - expense),
    };
  }, [transactions]);

  const groups = useMemo(() => groupTransactionsByDate(visibleTransactions), [visibleTransactions]);

  function openEdit(transaction: TransactionWithCategory) {
    setSelectedTransaction(null);
    setEditingTransaction(transaction);
    setEditForm({
      amount: String(transaction.amount),
      date: dayjs(transaction.occurredAt).format('YYYY-MM-DD'),
      note: transaction.note ?? '',
      categoryId: transaction.categoryId,
    });
    setError('');
    setMessage('');
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!editingTransaction) {
      return;
    }

    const amount = Number(editForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('金额必须大于 0。');
      return;
    }

    if (!editForm.categoryId) {
      setError('请选择分类。');
      return;
    }

    try {
      const originalTime = dayjs(editingTransaction.occurredAt);
      const occurredAt = dayjs(editForm.date)
        .hour(originalTime.hour())
        .minute(originalTime.minute())
        .second(originalTime.second())
        .millisecond(originalTime.millisecond())
        .toISOString();

      await transactionRepository.update(editingTransaction.id, {
        amount: normalizeAmount(amount),
        categoryId: editForm.categoryId,
        occurredAt,
        note: editForm.note,
      });
      setEditingTransaction(null);
      setMessage('流水已更新');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : '更新失败，请稍后再试。');
    }
  }

  async function handleDelete(transaction: TransactionWithCategory) {
    setMessage('');
    setError('');

    try {
      await transactionRepository.remove(transaction.id);
      setSelectedTransaction(null);
      setEditingTransaction(null);
      setTransactionToDelete(null);
      setMessage('流水已删除');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除失败，请稍后再试。');
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FBF9] pb-28 text-[#17352a]">
      <Toast message={message} onClose={() => setMessage('')} />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8">
        <header className="flex items-center justify-between pt-2">
          <div>
            <p className="text-sm font-medium text-[#7a8d84]">{getMonthLabel(selectedMonth)}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">账单流水</h1>
          </div>
          <button
            type="button"
            onClick={onCreateTransaction}
            className="rounded-full bg-[#4CB782] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(76,183,130,0.24)]"
          >
            记一笔
          </button>
        </header>

        <MonthSwitcher selectedMonth={selectedMonth} onChange={onMonthChange} />
        <TransactionSummaryCard summary={summary} />
        <TransactionSearchBar keyword={keyword} onKeywordChange={setKeyword} />
        <TransactionFilterTabs filter={filter} onChange={setFilter} />

        {error ? (
          <div className="rounded-2xl border border-[#f3b4a8] bg-[#fff0ec] p-4 text-sm font-semibold text-[#8f2c18]">
            {error}
          </div>
        ) : null}

        {groups.length === 0 ? (
          <section className="rounded-[1.75rem] bg-white p-8 text-center shadow-[0_18px_45px_rgba(23,53,42,0.07)]">
            <p className="text-base font-semibold text-[#17352a]">
              {keyword ? '没有找到相关账单' : '这个月还没有流水，去记一笔吧'}
            </p>
            <p className="mt-2 text-sm text-[#7a8d84]">
              {keyword ? '换个金额、备注或分类试试看。' : '记录后这里会按日期自动归拢。'}
            </p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_18px_45px_rgba(23,53,42,0.07)]">
            {groups.map((group) => (
              <TransactionGroupSection
                key={group.date}
                group={group}
                onSelectTransaction={setSelectedTransaction}
              />
            ))}
          </section>
        )}
      </div>

      {selectedTransaction ? (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onEdit={() => openEdit(selectedTransaction)}
          onDelete={() => setTransactionToDelete(selectedTransaction)}
        />
      ) : null}

      {editingTransaction ? (
        <TransactionEditModal
          transaction={editingTransaction}
          categories={categories.filter((category) => category.type === editingTransaction.type && !category.deletedAt)}
          form={editForm}
          onFormChange={setEditForm}
          onClose={() => setEditingTransaction(null)}
          onSubmit={(event) => void handleEditSubmit(event)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(transactionToDelete)}
        title="删除这笔流水？"
        description="删除后无法恢复，已有统计和账单列表会同步更新。"
        confirmLabel="删除"
        variant="danger"
        onCancel={() => setTransactionToDelete(null)}
        onConfirm={() => {
          if (transactionToDelete) {
            void handleDelete(transactionToDelete);
          }
        }}
      />
    </main>
  );
}

function TransactionSummaryCard({
  summary,
}: {
  summary: { income: number; expense: number; balance: number };
}) {
  return (
    <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_18px_45px_rgba(23,53,42,0.07)]">
      <p className="text-sm font-medium text-[#7a8d84]">本月结余</p>
      <h2 className="mt-2 text-4xl font-bold tracking-normal">{formatCurrency(summary.balance)}</h2>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <SummaryMetric label="收入" value={summary.income} tone="income" />
        <SummaryMetric label="支出" value={summary.expense} tone="expense" />
      </div>
    </section>
  );
}

function SummaryMetric({ label, value, tone }: { label: string; value: number; tone: 'income' | 'expense' }) {
  return (
    <div className="rounded-[1.25rem] bg-[#F7FBF9] p-4">
      <p className="text-sm font-medium text-[#7a8d84]">{label}</p>
      <p className={`mt-2 text-xl font-bold ${tone === 'income' ? 'text-[#4CB782]' : 'text-[#d65a54]'}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function TransactionSearchBar({
  keyword,
  onKeywordChange,
}: {
  keyword: string;
  onKeywordChange: (keyword: string) => void;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">搜索账单</span>
      <input
        type="search"
        value={keyword}
        onChange={(event) => onKeywordChange(event.target.value)}
        placeholder="搜索金额、备注、分类"
        className="h-13 w-full rounded-[1.35rem] border border-[#dcefe6] bg-white px-4 pr-14 text-base outline-none placeholder:text-[#9fb6aa] shadow-[0_12px_34px_rgba(23,53,42,0.05)] focus:border-[#4CB782]"
      />
      {keyword ? (
        <button
          type="button"
          onClick={() => onKeywordChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-[#EAF7F1] px-3 py-1 text-sm font-semibold text-[#2f8f66]"
        >
          清除
        </button>
      ) : null}
    </label>
  );
}

function TransactionFilterTabs({
  filter,
  onChange,
}: {
  filter: TransactionFilter;
  onChange: (filter: TransactionFilter) => void;
}) {
  const filters: Array<{ key: TransactionFilter; label: string }> = [
    { key: 'all', label: '全部' },
    { key: 'expense', label: '支出' },
    { key: 'income', label: '收入' },
  ];

  return (
    <section className="grid grid-cols-3 gap-1 rounded-[1.25rem] bg-[#EAF7F1] p-1">
      {filters.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={`h-11 rounded-[1.05rem] text-sm font-semibold transition ${
            filter === item.key
              ? 'bg-white text-[#17352a] shadow-[0_8px_20px_rgba(76,183,130,0.12)]'
              : 'text-[#6f8178]'
          }`}
        >
          {item.label}
        </button>
      ))}
    </section>
  );
}

function TransactionGroupSection({
  group,
  onSelectTransaction,
}: {
  group: TransactionGroup;
  onSelectTransaction: (transaction: TransactionWithCategory) => void;
}) {
  return (
    <div className="border-b border-[#edf4f0] last:border-b-0">
      <div className="bg-[#fbfefd] px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#17352a]">{dayjs(group.date).format('M月D日 dddd')}</p>
            <p className="mt-1 text-xs text-[#7a8d84]">{group.date}</p>
          </div>
          <div className="text-right text-xs leading-5 text-[#7a8d84]">
            {group.expenseTotal > 0 ? <p>支出 {formatPlainAmount(group.expenseTotal)}</p> : null}
            {group.incomeTotal > 0 ? <p className="text-[#4CB782]">收入 {formatPlainAmount(group.incomeTotal)}</p> : null}
          </div>
        </div>
      </div>
      <ul className="divide-y divide-[#edf4f0] px-5">
        {group.transactions.map((transaction) => (
          <li key={transaction.id}>
            <button
              type="button"
              onClick={() => onSelectTransaction(transaction)}
              className="flex w-full items-center gap-3 py-4 text-left"
            >
              <CategoryAvatar transaction={transaction} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#17352a]">
                  {transaction.category?.name ?? '未分类'}
                </p>
                <p className="mt-1 truncate text-xs text-[#7a8d84]">
                  {transaction.note || '无备注'} · {dayjs(transaction.occurredAt).format('HH:mm')}
                </p>
              </div>
              <p
                className={`shrink-0 text-base font-bold ${
                  transaction.type === 'income' ? 'text-[#4CB782]' : 'text-[#d65a54]'
                }`}
              >
                {transaction.type === 'income' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TransactionDetailModal({
  transaction,
  onClose,
  onEdit,
  onDelete,
}: {
  transaction: TransactionWithCategory;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <ModalFrame title="流水详情" onClose={onClose}>
      <div className="flex items-center gap-3 rounded-[1.35rem] bg-[#F7FBF9] p-4">
        <CategoryAvatar transaction={transaction} />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold">{transaction.category?.name ?? '未分类'}</p>
          <p className="mt-1 text-sm text-[#7a8d84]">{dayjs(transaction.occurredAt).format('YYYY-MM-DD HH:mm')}</p>
        </div>
        <p className={`text-xl font-bold ${transaction.type === 'income' ? 'text-[#4CB782]' : 'text-[#d65a54]'}`}>
          {transaction.type === 'income' ? '+' : '-'}
          {formatCurrency(transaction.amount)}
        </p>
      </div>
      <p className="mt-4 rounded-[1.2rem] bg-white p-4 text-sm leading-6 text-[#6f8178]">
        {transaction.note || '这笔流水没有备注。'}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="h-12 rounded-[1.2rem] bg-[#4CB782] text-base font-semibold text-white"
        >
          编辑
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="h-12 rounded-[1.2rem] border border-[#f3b4a8] bg-[#fff0ec] text-base font-semibold text-[#8f2c18]"
        >
          删除
        </button>
      </div>
    </ModalFrame>
  );
}

function TransactionEditModal({
  transaction,
  categories,
  form,
  onFormChange,
  onClose,
  onSubmit,
}: {
  transaction: TransactionWithCategory;
  categories: Category[];
  form: EditFormState;
  onFormChange: React.Dispatch<React.SetStateAction<EditFormState>>;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <ModalFrame title="编辑流水" onClose={onClose}>
      <form onSubmit={onSubmit} className="grid gap-4">
        <label className="block">
          <span className="text-sm font-medium text-[#7a8d84]">金额</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(event) => onFormChange((current) => ({ ...current, amount: event.target.value }))}
            className="mt-2 h-12 w-full rounded-[1.1rem] border border-[#dcefe6] bg-[#F7FBF9] px-4 outline-none focus:border-[#4CB782]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[#7a8d84]">分类</span>
          <select
            value={form.categoryId}
            onChange={(event) => onFormChange((current) => ({ ...current, categoryId: event.target.value }))}
            className="mt-2 h-12 w-full rounded-[1.1rem] border border-[#dcefe6] bg-[#F7FBF9] px-4 outline-none focus:border-[#4CB782]"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[#7a8d84]">日期</span>
          <DateInput
            type="date"
            value={form.date}
            onValueChange={(value) => onFormChange((current) => ({ ...current, date: value }))}
            className="mt-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[#7a8d84]">备注</span>
          <input
            type="text"
            value={form.note}
            maxLength={60}
            onChange={(event) => onFormChange((current) => ({ ...current, note: event.target.value }))}
            className="mt-2 h-12 w-full rounded-[1.1rem] border border-[#dcefe6] bg-[#F7FBF9] px-4 outline-none focus:border-[#4CB782]"
          />
        </label>
        <button
          type="submit"
          className="h-12 rounded-[1.2rem] bg-[#4CB782] text-base font-semibold text-white"
        >
          保存修改
        </button>
      </form>
      <p className="mt-3 text-xs text-[#7a8d84]">
        当前类型：{transaction.type === 'expense' ? '支出' : '收入'}
      </p>
    </ModalFrame>
  );
}

function ModalFrame({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#17352a]/25 px-3 pb-3 backdrop-blur-sm sm:items-center sm:justify-center">
      <section className="w-full max-w-lg rounded-[1.75rem] bg-white p-5 shadow-[0_24px_70px_rgba(23,53,42,0.22)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-[#EAF7F1] text-lg font-semibold text-[#2f8f66]"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function CategoryAvatar({ transaction }: { transaction: TransactionWithCategory }) {
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-[0_10px_22px_rgba(23,53,42,0.10)]"
      style={{ backgroundColor: transaction.category?.color ?? '#64748b' }}
    >
      {(transaction.category?.name ?? '账')[0]}
    </span>
  );
}

function groupTransactionsByDate(transactions: TransactionWithCategory[]): TransactionGroup[] {
  const groups = new Map<string, TransactionWithCategory[]>();

  for (const transaction of transactions) {
    const date = dayjs(transaction.occurredAt).format('YYYY-MM-DD');
    groups.set(date, [...(groups.get(date) ?? []), transaction]);
  }

  return Array.from(groups.entries()).map(([date, groupTransactions]) => ({
    date,
    transactions: groupTransactions,
    expenseTotal: normalizeAmount(
      groupTransactions
        .filter((transaction) => transaction.type === 'expense')
        .reduce((total, transaction) => total + transaction.amount, 0),
    ),
    incomeTotal: normalizeAmount(
      groupTransactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((total, transaction) => total + transaction.amount, 0),
    ),
  }));
}
