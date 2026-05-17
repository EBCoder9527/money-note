import type { LedgerDatabase } from '@/data/db';
import type { Account } from '@/data/models';
import { nowIso } from '@/data/utils/entity';

const defaultAccountTemplates = [
  { id: 'acc_default_cash', name: '现金', kind: 'asset', color: '#4CB782', icon: 'banknote' },
  { id: 'acc_default_bank_card', name: '银行卡', kind: 'asset', color: '#0ea5e9', icon: 'credit-card' },
  { id: 'acc_default_wechat', name: '微信', kind: 'asset', color: '#22c55e', icon: 'message-circle' },
  { id: 'acc_default_alipay', name: '支付宝', kind: 'asset', color: '#38bdf8', icon: 'wallet' },
  { id: 'acc_default_credit_card', name: '信用卡', kind: 'liability', color: '#f97316', icon: 'credit-card' },
  { id: 'acc_default_huabei', name: '花呗', kind: 'liability', color: '#8b5cf6', icon: 'receipt' },
  { id: 'acc_default_other_debt', name: '其他负债', kind: 'liability', color: '#64748b', icon: 'circle-ellipsis' },
] as const;

export function buildDefaultAccounts(): Account[] {
  const timestamp = nowIso();

  return defaultAccountTemplates.map((account, index) => ({
    id: account.id,
    name: account.name,
    kind: account.kind,
    balance: 0,
    color: account.color,
    icon: account.icon,
    sortOrder: index + 1,
    isDefault: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

export async function seedDefaultAccounts(database: LedgerDatabase) {
  const existingCount = await database.accounts.count();

  if (existingCount > 0) {
    return;
  }

  await database.accounts.bulkAdd(buildDefaultAccounts());
}
