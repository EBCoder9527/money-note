import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { db } from '@/data/db';
import type { Account, AccountKind } from '@/data/models';
import { accountRepository } from '@/data/repositories';
import { formatCurrency, normalizeAmount } from '@/utils/money';

type AccountManagementPageProps = {
  onBack?: () => void;
};

type AccountFormState = {
  name: string;
  kind: AccountKind;
  balance: string;
  color: string;
};

const colorOptions = ['#4CB782', '#14b8a6', '#0ea5e9', '#8b5cf6', '#ec4899', '#f97316', '#d65a54', '#64748b'];

const initialForm: AccountFormState = {
  name: '',
  kind: 'asset',
  balance: '',
  color: colorOptions[0],
};

export function AccountManagementPage({ onBack }: AccountManagementPageProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState<AccountFormState>(initialForm);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void accountRepository.ensureDefaultAccounts();

    const subscription = liveQuery(() => accountRepository.list()).subscribe({
      next: setAccounts,
      error: () => setError('账户读取失败，请稍后再试。'),
    });

    return () => subscription.unsubscribe();
  }, []);

  const editingAccount = editingAccountId
    ? accounts.find((account) => account.id === editingAccountId)
    : undefined;
  const totalAssets = accounts
    .filter((account) => account.kind === 'asset')
    .reduce((total, account) => total + account.balance, 0);
  const totalLiabilities = accounts
    .filter((account) => account.kind === 'liability')
    .reduce((total, account) => total + account.balance, 0);
  const netAssets = totalAssets - totalLiabilities;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');

    const name = form.name.trim();
    const balance = Number(form.balance);

    if (!name) {
      setError('请输入账户名称。');
      return;
    }

    if (!Number.isFinite(balance) || balance < 0) {
      setError('账户金额不能小于 0。');
      return;
    }

    setIsSaving(true);

    try {
      if (editingAccount) {
        await accountRepository.update(editingAccount.id, {
          name,
          kind: form.kind,
          balance: normalizeAmount(balance),
          color: form.color,
          icon: editingAccount.icon,
          sortOrder: editingAccount.sortOrder,
        });
        setMessage('账户已更新');
      } else {
        await accountRepository.create({
          name,
          kind: form.kind,
          balance: normalizeAmount(balance),
          color: form.color,
          icon: form.kind === 'asset' ? 'wallet' : 'receipt',
          isDefault: false,
        });
        setMessage('账户已新增');
      }

      setForm(initialForm);
      setEditingAccountId(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存失败，请稍后再试。');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(account: Account) {
    setMessage('');
    setError('');

    const confirmed = window.confirm(`确定删除“${account.name}”吗？此操作不会影响已有账单数据。`);

    if (!confirmed) {
      return;
    }

    try {
      await accountRepository.remove(account.id);
      if (editingAccountId === account.id) {
        setEditingAccountId(null);
        setForm(initialForm);
      }
      setMessage('账户已删除');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除失败，请稍后再试。');
    }
  }

  function handleEdit(account: Account) {
    setMessage('');
    setError('');
    setEditingAccountId(account.id);
    setForm({
      name: account.name,
      kind: account.kind,
      balance: String(account.balance),
      color: account.color,
    });
  }

  function handleCancelEdit() {
    setEditingAccountId(null);
    setForm(initialForm);
    setError('');
  }

  return (
    <main className="min-h-screen bg-[#F7FBF9] pb-28 text-[#17352a]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8">
        <header className="flex items-center justify-between pt-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#6f8178] shadow-[0_10px_28px_rgba(23,53,42,0.06)] transition hover:text-[#2f8f66]"
            >
              返回
            </button>
          ) : (
            <div>
              <p className="text-sm font-medium text-[#7a8d84]">资产</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal">资产账户</h1>
            </div>
          )}
          {onBack ? <h1 className="text-xl font-semibold tracking-normal">资产管理</h1> : null}
          <div className="w-16" />
        </header>

        <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_18px_45px_rgba(23,53,42,0.07)]">
          <p className="text-sm font-medium text-[#7a8d84]">净资产</p>
          <h2 className="mt-2 text-4xl font-bold tracking-normal">{formatCurrency(netAssets)}</h2>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <SummaryCard label="总资产" value={formatCurrency(totalAssets)} tone="asset" />
            <SummaryCard label="总负债" value={formatCurrency(totalLiabilities)} tone="liability" />
          </div>
        </section>

        <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_18px_45px_rgba(23,53,42,0.07)]">
          <p className="text-sm font-medium text-[#7a8d84]">账户</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">
            {editingAccount ? '编辑账户' : '新增账户'}
          </h2>

          <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
            <div className="grid grid-cols-2 gap-2 rounded-[1.25rem] bg-[#EAF7F1] p-1">
              <KindButton active={form.kind === 'asset'} label="资产账户" onClick={() => setForm((current) => ({ ...current, kind: 'asset' }))} />
              <KindButton active={form.kind === 'liability'} label="负债账户" onClick={() => setForm((current) => ({ ...current, kind: 'liability' }))} />
            </div>

            <label className="block">
              <span className="text-sm font-medium text-[#7a8d84]">账户名称</span>
              <input
                type="text"
                value={form.name}
                maxLength={16}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="例如 储蓄卡、房贷"
                className="mt-2 h-12 w-full rounded-[1.1rem] border border-[#dcefe6] bg-[#F7FBF9] px-4 text-base outline-none placeholder:text-[#9fb6aa] focus:border-[#4CB782]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[#7a8d84]">金额</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.balance}
                onChange={(event) => setForm((current) => ({ ...current, balance: event.target.value }))}
                placeholder="0.00"
                className="mt-2 h-12 w-full rounded-[1.1rem] border border-[#dcefe6] bg-[#F7FBF9] px-4 text-base outline-none placeholder:text-[#9fb6aa] focus:border-[#4CB782]"
              />
            </label>

            <div>
              <span className="text-sm font-medium text-[#7a8d84]">颜色</span>
              <div className="mt-3 grid grid-cols-8 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, color }))}
                    className={`h-9 rounded-full border-2 transition ${
                      form.color === color ? 'border-[#17352a]' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`选择颜色 ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-[1.25rem] bg-[#4CB782] px-4 py-3 text-base font-semibold text-white shadow-[0_16px_34px_rgba(76,183,130,0.24)] transition hover:bg-[#3fa574] disabled:cursor-not-allowed disabled:bg-[#bdd7cb]"
              >
                {isSaving ? '保存中' : editingAccount ? '保存修改' : '新增账户'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded-[1.25rem] border border-[#dcefe6] bg-[#F7FBF9] px-4 py-3 text-base font-semibold text-[#2f8f66] transition hover:border-[#4CB782]"
              >
                取消
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_18px_45px_rgba(23,53,42,0.07)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">全部账户</h2>
            <span className="rounded-full bg-[#EAF7F1] px-3 py-1 text-sm text-[#2f8f66]">
              {accounts.length} 个
            </span>
          </div>

          <ul className="mt-4 divide-y divide-[#edf4f0]">
            {accounts.map((account) => (
              <li key={account.id} className="flex items-center gap-3 py-4">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-[0_10px_22px_rgba(23,53,42,0.10)]"
                  style={{ backgroundColor: account.color }}
                >
                  {account.name[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#17352a]">{account.name}</p>
                  <p className="mt-1 text-xs text-[#7a8d84]">
                    {account.kind === 'asset' ? '资产账户' : '负债账户'}
                    {account.isDefault ? ' · 默认' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${account.kind === 'asset' ? 'text-[#4CB782]' : 'text-[#d65a54]'}`}>
                    {formatCurrency(account.balance)}
                  </p>
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(account)}
                      className="rounded-full bg-[#EAF7F1] px-3 py-2 text-xs font-semibold text-[#2f8f66]"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(account)}
                      className="rounded-full bg-[#fff0ec] px-3 py-2 text-xs font-semibold text-[#8f2c18]"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {message ? (
          <div className="rounded-[1.35rem] border border-[#bfe8d4] bg-white p-4 text-sm font-semibold text-[#2f8f66] shadow-[0_12px_36px_rgba(76,183,130,0.10)]">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-[#f3b4a8] bg-[#fff0ec] p-4 text-sm font-semibold text-[#8f2c18]">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  tone: 'asset' | 'liability';
};

function SummaryCard({ label, value, tone }: SummaryCardProps) {
  return (
    <div className="rounded-[1.35rem] border border-[#dcefe6] bg-[#F7FBF9] p-4">
      <p className="text-sm font-medium text-[#7a8d84]">{label}</p>
      <p className={`mt-2 text-xl font-bold ${tone === 'asset' ? 'text-[#4CB782]' : 'text-[#d65a54]'}`}>
        {value}
      </p>
    </div>
  );
}

type KindButtonProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

function KindButton({ active, label, onClick }: KindButtonProps) {
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
