import { db } from '@/data/db';
import type { Account, Budget, Category, Transaction } from '@/data/models';

const backupVersion = 2;

export type BackupData = {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  accounts: Account[];
};

export type BackupFile = {
  version: number;
  exportedAt: string;
  data: BackupData;
};

export type ImportBackupResult = {
  transactions: number;
  categories: number;
  budgets: number;
  accounts: number;
};

export async function exportBackupJson(): Promise<void> {
  const [transactions, categories, budgets, accounts] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.budgets.toArray(),
    db.accounts.toArray(),
  ]);
  const backup: BackupFile = {
    version: backupVersion,
    exportedAt: new Date().toISOString(),
    data: {
      transactions,
      categories,
      budgets,
      accounts,
    },
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `有数备份-${new Date().toISOString().slice(0, 10)}.json`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function importBackupJson(file: File): Promise<ImportBackupResult> {
  const text = await file.text();
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('备份文件不是有效的 JSON。');
  }

  const backup = validateBackupFile(parsed);

  await db.transaction('rw', db.transactions, db.categories, db.budgets, db.accounts, async () => {
    if (backup.data.categories.length > 0) {
      await db.categories.bulkPut(backup.data.categories);
    }

    if (backup.data.budgets.length > 0) {
      await db.budgets.bulkPut(backup.data.budgets);
    }

    if (backup.data.transactions.length > 0) {
      await db.transactions.bulkPut(backup.data.transactions);
    }

    if (backup.data.accounts.length > 0) {
      await db.accounts.bulkPut(backup.data.accounts);
    }
  });

  return {
    transactions: backup.data.transactions.length,
    categories: backup.data.categories.length,
    budgets: backup.data.budgets.length,
    accounts: backup.data.accounts.length,
  };
}

function validateBackupFile(value: unknown): BackupFile {
  if (!isRecord(value)) {
    throw new Error('备份文件格式不正确。');
  }

  if (typeof value.version !== 'number' || ![1, backupVersion].includes(value.version)) {
    throw new Error('备份版本不支持。');
  }

  if (typeof value.exportedAt !== 'string' || Number.isNaN(Date.parse(value.exportedAt))) {
    throw new Error('备份导出时间无效。');
  }

  if (!isRecord(value.data)) {
    throw new Error('备份数据缺失。');
  }

  const { transactions, categories, budgets, accounts = [] } = value.data;

  if (
    !Array.isArray(transactions) ||
    !Array.isArray(categories) ||
    !Array.isArray(budgets) ||
    !Array.isArray(accounts)
  ) {
    throw new Error('备份数据必须包含 transactions、categories、budgets。');
  }

  if (!transactions.every(isTransaction)) {
    throw new Error('transactions 数据格式不正确。');
  }

  if (!categories.every(isCategory)) {
    throw new Error('categories 数据格式不正确。');
  }

  if (!budgets.every(isBudget)) {
    throw new Error('budgets 数据格式不正确。');
  }

  if (!accounts.every(isAccount)) {
    throw new Error('accounts 数据格式不正确。');
  }

  return {
    version: value.version,
    exportedAt: value.exportedAt,
    data: {
      transactions,
      categories,
      budgets,
      accounts,
    },
  };
}

function isTransaction(value: unknown): value is Transaction {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    (value.type === 'expense' || value.type === 'income') &&
    typeof value.amount === 'number' &&
    Number.isFinite(value.amount) &&
    typeof value.categoryId === 'string' &&
    typeof value.occurredAt === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    (value.note === undefined || typeof value.note === 'string')
  );
}

function isCategory(value: unknown): value is Category {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.type === 'expense' || value.type === 'income') &&
    typeof value.color === 'string' &&
    typeof value.icon === 'string' &&
    typeof value.sortOrder === 'number' &&
    typeof value.isDefault === 'boolean' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    (value.deletedAt === undefined || typeof value.deletedAt === 'string')
  );
}

function isBudget(value: unknown): value is Budget {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.month === 'string' &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(value.month) &&
    typeof value.amount === 'number' &&
    Number.isFinite(value.amount) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    (value.categoryId === undefined || typeof value.categoryId === 'string')
  );
}

function isAccount(value: unknown): value is Account {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.kind === 'asset' || value.kind === 'liability') &&
    typeof value.balance === 'number' &&
    Number.isFinite(value.balance) &&
    typeof value.color === 'string' &&
    typeof value.icon === 'string' &&
    typeof value.sortOrder === 'number' &&
    typeof value.isDefault === 'boolean' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
