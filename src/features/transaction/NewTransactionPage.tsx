import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { liveQuery } from 'dexie';
import { DateInput } from '@/components/DateInput';
import { categoryRepository, transactionRepository } from '@/data/repositories';
import type { Category, TransactionType } from '@/data/models';
import { normalizeAmount } from '@/utils/money';

type NewTransactionPageProps = {
  onCancel: () => void;
  onSaved: () => void;
};

type FormErrors = {
  amount?: string;
  categoryId?: string;
  submit?: string;
};

export function NewTransactionPage({ onCancel, onSaved }: NewTransactionPageProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [note, setNote] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void categoryRepository.ensureDefaultCategories().catch(() => {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: '默认分类初始化失败，请刷新后再试。',
      }));
    });
  }, []);

  useEffect(() => {
    const subscription = liveQuery(async () => {
      return categoryRepository.listByType(type);
    }).subscribe({
      next: (nextCategories) => {
        setCategories(nextCategories);
        setCategoryId((currentCategoryId) => {
          if (nextCategories.some((category) => category.id === currentCategoryId)) {
            return currentCategoryId;
          }

          return nextCategories[0]?.id ?? '';
        });
      },
      error: (error) => {
        setErrors((currentErrors) => ({
          ...currentErrors,
          submit: error instanceof Error ? error.message : '分类读取失败，请稍后再试。',
        }));
      },
    });

    return () => subscription.unsubscribe();
  }, [type]);

  const amountValue = useMemo(() => Number(amount), [amount]);
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm({ amount, amountValue, categoryId });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const now = dayjs();
      const occurredAt = dayjs(date)
        .hour(now.hour())
        .minute(now.minute())
        .second(now.second())
        .millisecond(now.millisecond())
        .toISOString();

      await transactionRepository.create({
        type,
        amount: normalizeAmount(amountValue),
        categoryId,
        occurredAt,
        note,
      });

      onSaved();
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : '保存失败，请稍后再试。',
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleTypeChange(nextType: TransactionType) {
    setType(nextType);
    setCategoryId('');
    setErrors({});
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
          <h1 className="text-xl font-semibold tracking-normal">记一笔</h1>
          <div className="w-16" />
        </header>

        <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_18px_45px_rgba(23,53,42,0.07)]">
          <div className="grid grid-cols-2 gap-2 rounded-[1.25rem] bg-[#EAF7F1] p-1">
            <TypeButton active={type === 'expense'} label="支出" onClick={() => handleTypeChange('expense')} />
            <TypeButton active={type === 'income'} label="收入" onClick={() => handleTypeChange('income')} />
          </div>

          <label htmlFor="amount" className="mt-7 block text-sm font-medium text-[#7a8d84]">
            金额
          </label>
          <div className="mt-2 flex items-center gap-3 rounded-[1.35rem] bg-[#F7FBF9] px-4 py-4">
            <span className="text-3xl font-bold text-[#4CB782]">¥</span>
            <input
              id="amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setErrors((currentErrors) => ({ ...currentErrors, amount: undefined, submit: undefined }));
              }}
              placeholder="0.00"
              className="min-w-0 flex-1 bg-transparent text-5xl font-bold tracking-normal text-[#17352a] outline-none placeholder:text-[#bdd7cb]"
            />
          </div>
          {errors.amount ? <p className="mt-2 text-sm text-[#d65a54]">{errors.amount}</p> : null}
        </section>

        <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_18px_45px_rgba(23,53,42,0.07)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">选择分类</h2>
            <span className="rounded-full bg-[#EAF7F1] px-3 py-1 text-sm text-[#2f8f66]">
              {type === 'expense' ? '支出' : '收入'}
            </span>
          </div>

          {categories.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#7a8d84]">分类正在整理中，请稍后再试。</p>
          ) : (
            <div className="mt-4 grid grid-cols-4 gap-3">
              {categories.map((category) => (
                <CategoryOption
                  key={category.id}
                  category={category}
                  active={category.id === categoryId}
                  onClick={() => {
                    setCategoryId(category.id);
                    setErrors((currentErrors) => ({ ...currentErrors, categoryId: undefined, submit: undefined }));
                  }}
                />
              ))}
            </div>
          )}
          {errors.categoryId ? <p className="mt-3 text-sm text-[#d65a54]">{errors.categoryId}</p> : null}
        </section>

        <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_18px_45px_rgba(23,53,42,0.07)]">
          <label htmlFor="date" className="block text-sm font-medium text-[#7a8d84]">
            日期
          </label>
          <DateInput
            id="date"
            type="date"
            value={date}
            onValueChange={setDate}
            className="mt-2"
          />

          <label htmlFor="note" className="mt-5 block text-sm font-medium text-[#7a8d84]">
            备注
          </label>
          <input
            id="note"
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={60}
            placeholder="可选，例如午餐、地铁、工资"
            className="mt-2 h-12 w-full rounded-[1.1rem] border border-[#dcefe6] bg-[#F7FBF9] px-4 text-base outline-none placeholder:text-[#9fb6aa] focus:border-[#4CB782]"
          />
        </section>

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
              {isSaving ? '保存中' : '保存'}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}

type TypeButtonProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

function TypeButton({ active, label, onClick }: TypeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 rounded-xl text-base font-semibold transition ${
        active ? 'bg-white text-[#17352a] shadow-[0_8px_20px_rgba(76,183,130,0.12)]' : 'text-[#6f8178]'
      }`}
    >
      {label}
    </button>
  );
}

type CategoryOptionProps = {
  category: Category;
  active: boolean;
  onClick: () => void;
};

function CategoryOption({ category, active, onClick }: CategoryOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-24 flex-col items-center justify-center rounded-2xl border p-2 transition ${
        active ? 'border-[#4CB782] bg-[#F7FBF9]' : 'border-[#dcefe6] bg-white'
      }`}
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-[0_10px_22px_rgba(23,53,42,0.10)]"
        style={{ backgroundColor: category.color }}
      >
        {category.name[0]}
      </span>
      <span className="mt-2 max-w-full truncate text-sm font-medium text-[#17352a]">{category.name}</span>
    </button>
  );
}

type ValidateInput = {
  amount: string;
  amountValue: number;
  categoryId: string;
};

function validateForm({ amount, amountValue, categoryId }: ValidateInput): FormErrors {
  const errors: FormErrors = {};

  if (amount.trim() === '') {
    errors.amount = '请输入金额。';
  } else if (!Number.isFinite(amountValue) || amountValue <= 0) {
    errors.amount = '金额必须大于 0。';
  }

  if (!categoryId) {
    errors.categoryId = '请选择分类。';
  }

  return errors;
}
