import dayjs from 'dayjs';
import { db } from '@/data/db';
import type { Account, AccountKind, Budget, Category, Transaction, TransactionType } from '@/data/models';
import { createId, nowIso } from '@/data/utils/entity';
import { markBackupExported } from '@/utils/backupReminder';
import { normalizeAmount } from '@/utils/money';

const backupVersion = 2;
const appName = '有数记账';
const backupAppId = 'youshu';
const defaultImportCategoryColor = '#4CB782';
const defaultImportAccountColor = '#14b8a6';

export type BackupData = {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  accounts: Account[];
};

export type BackupFile = {
  appName?: string;
  schemaVersion?: number;
  version: number;
  exportedAt: string;
  data: BackupData;
};

export type RestoreBackupResult = {
  transactions: number;
  categories: number;
  budgets: number;
  accounts: number;
};

export type ImportTransactionDraft = {
  type: TransactionType;
  amount: number;
  categoryName: string;
  parentCategoryName?: string;
  note?: string;
  occurredAt: string;
  accountName: string;
  createdAt: string;
  updatedAt: string;
  sourceIndex: number;
  warnings: string[];
  duplicateKey: string;
};

export type ImportPreviewRow = ImportTransactionDraft & {
  status: 'ready' | 'invalid' | 'duplicate';
  reason?: string;
};

export type TransactionImportPreview = {
  mode: 'transactions';
  sourceMessage: string;
  totalRecords: number;
  importableRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  incomeTotal: number;
  expenseTotal: number;
  categoryCount: number;
  accountCount: number;
  rows: ImportPreviewRow[];
  previewRows: ImportPreviewRow[];
};

export type ParsedImportFile =
  | {
      mode: 'backup';
      backup: BackupFile;
      sourceMessage: string;
    }
  | {
      mode: 'transactions';
      sourceMessage: string;
      rows: ImportPreviewRow[];
    };

export type ImportTransactionsResult = {
  imported: number;
  skippedDuplicates: number;
  invalidRecords: number;
  expenseTotal: number;
  incomeTotal: number;
  startDate?: string;
  endDate?: string;
  createdCategories: number;
  createdAccounts: number;
};

type ImportableRecord = Record<string, unknown>;

export async function exportBackupJson(): Promise<string> {
  const [transactions, categories, budgets, accounts] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.budgets.toArray(),
    db.accounts.toArray(),
  ]);
  const exportedAt = new Date().toISOString();
  const backup = {
    app: backupAppId,
    version: 1,
    exportedAt,
    data: {
      records: transactions,
      categories,
      budgets,
      settings: {
        accounts,
      },
    },
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `有数备份_${dayjs(exportedAt).format('YYYY-MM-DD_HH-mm')}.json`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  markBackupExported(exportedAt);
  return exportedAt;
}

export async function restoreBackup(file: File): Promise<RestoreBackupResult> {
  const text = await file.text();
  const backup = parseBackupFromContent(text);

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

export async function importBackupJson(file: File): Promise<RestoreBackupResult> {
  return restoreBackup(file);
}

export function parseImportFile(fileContent: string): ParsedImportFile {
  const parsed = parseJsonContent(fileContent);

  try {
    const backup = validateBackupFile(parsed);
    return {
      mode: 'backup',
      backup,
      sourceMessage: '这是本产品备份文件，可使用恢复备份模式导入。',
    };
  } catch (backupError) {
    const records = findTransactionRecords(parsed);

    if (!records) {
      if (looksLikeBackupFile(parsed)) {
        throw new Error(
          backupError instanceof Error
            ? `这是备份文件，但版本不兼容：${backupError.message}`
            : '这是备份文件，但版本不兼容。',
        );
      }

      throw new Error('未识别到账单数据，请检查文件格式。');
    }

    return {
      mode: 'transactions',
      sourceMessage: looksLikeBackupFile(parsed)
        ? '备份校验未通过，已尝试进入流水导入模式。'
        : '这是账单流水文件，已进入流水导入模式。',
      rows: records.map(normalizeImportRecord),
    };
  }
}

export async function createTransactionImportPreview(file: File): Promise<TransactionImportPreview> {
  const text = await file.text();
  const parsed = parseImportFile(text);

  if (parsed.mode === 'backup') {
    throw new Error('这是本产品备份文件，请使用“恢复备份”入口导入。');
  }

  return enrichTransactionImportPreview(parsed.rows, parsed.sourceMessage);
}

export async function importTransactions(preview: TransactionImportPreview): Promise<ImportTransactionsResult> {
  const rowsToImport = preview.rows.filter((row) => row.status === 'ready');
  const timestamp = nowIso();
  let createdCategories = 0;
  let createdAccounts = 0;

  await db.transaction('rw', db.transactions, db.categories, db.accounts, async () => {
    const [existingCategories, existingAccounts] = await Promise.all([
      db.categories.toArray(),
      db.accounts.toArray(),
    ]);

    const categoryMap = new Map(
      existingCategories
        .filter((category) => !category.deletedAt)
        .map((category) => [getCategoryLookupKey(category.type, category.name), category]),
    );
    const accountMap = new Map(existingAccounts.map((account) => [normalizeLookupText(account.name), account]));

    const transactions: Transaction[] = [];
    const nextCategorySortOrder = Date.now();
    const nextAccountSortOrder = Date.now();

    for (const [index, row] of rowsToImport.entries()) {
      const categoryKey = getCategoryLookupKey(row.type, row.categoryName);
      let category = categoryMap.get(categoryKey);

      if (!category) {
        category = {
          id: createId('cat'),
          name: row.categoryName,
          type: row.type,
          color: defaultImportCategoryColor,
          icon: 'circle',
          sortOrder: nextCategorySortOrder + index,
          isDefault: false,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        categoryMap.set(categoryKey, category);
        await db.categories.add(category);
        createdCategories += 1;
      }

      const accountName = row.accountName || '默认账户';
      const accountKey = normalizeLookupText(accountName);

      if (!accountMap.has(accountKey)) {
        const account: Account = {
          id: createId('acc'),
          name: accountName,
          kind: getAccountKindByTransactionType(row.type),
          balance: 0,
          color: defaultImportAccountColor,
          icon: row.type === 'income' ? 'wallet' : 'receipt',
          sortOrder: nextAccountSortOrder + index,
          isDefault: false,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        accountMap.set(accountKey, account);
        await db.accounts.add(account);
        createdAccounts += 1;
      }

      transactions.push({
        id: createId('txn'),
        type: row.type,
        amount: row.amount,
        categoryId: category.id,
        occurredAt: row.occurredAt,
        note: row.note,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    }

    if (transactions.length > 0) {
      await db.transactions.bulkAdd(transactions);
    }
  });

  return {
    imported: rowsToImport.length,
    skippedDuplicates: preview.duplicateRecords,
    invalidRecords: preview.invalidRecords,
    expenseTotal: preview.expenseTotal,
    incomeTotal: preview.incomeTotal,
    startDate: getImportRange(rowsToImport).startDate,
    endDate: getImportRange(rowsToImport).endDate,
    createdCategories,
    createdAccounts,
  };
}

function getImportRange(rows: ImportPreviewRow[]): { startDate?: string; endDate?: string } {
  if (rows.length === 0) {
    return {};
  }

  const timestamps = rows
    .map((row) => dayjs(row.occurredAt).valueOf())
    .filter((timestamp) => Number.isFinite(timestamp))
    .sort((a, b) => a - b);

  if (timestamps.length === 0) {
    return {};
  }

  return {
    startDate: dayjs(timestamps[0]).format('YYYY-MM-DD'),
    endDate: dayjs(timestamps[timestamps.length - 1]).format('YYYY-MM-DD'),
  };
}

function parseBackupFromContent(fileContent: string): BackupFile {
  return validateBackupFile(parseJsonContent(fileContent));
}

function parseJsonContent(fileContent: string): unknown {
  try {
    return JSON.parse(fileContent);
  } catch {
    throw new Error('文件不是有效的 JSON。CSV / Excel 导入入口已预留，当前请先选择 JSON 文件。');
  }
}

function validateBackupFile(value: unknown): BackupFile {
  if (!isRecord(value)) {
    throw new Error('备份文件格式不正确。');
  }

  if (value.app !== undefined) {
    return validateYoushuBackupFile(value);
  }

  const schemaVersion = typeof value.schemaVersion === 'number' ? value.schemaVersion : value.version;

  if (typeof value.version !== 'number' || ![1, backupVersion].includes(value.version)) {
    throw new Error('备份版本不支持。');
  }

  if (typeof schemaVersion !== 'number' || ![1, backupVersion].includes(schemaVersion)) {
    throw new Error('备份 schemaVersion 不支持。');
  }

  if (value.appName !== undefined && value.appName !== appName) {
    throw new Error('备份来源不是有数记账。');
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
    throw new Error('备份数据必须包含 transactions、categories、budgets、accounts。');
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
    appName: typeof value.appName === 'string' ? value.appName : undefined,
    schemaVersion,
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

function validateYoushuBackupFile(value: Record<string, unknown>): BackupFile {
  if (value.app !== backupAppId) {
    throw new Error('备份来源不是有数记账。');
  }

  if (value.version !== 1) {
    throw new Error('备份版本不支持。');
  }

  if (typeof value.exportedAt !== 'string' || Number.isNaN(Date.parse(value.exportedAt))) {
    throw new Error('备份导出时间无效。');
  }

  if (!isRecord(value.data)) {
    throw new Error('备份数据缺失。');
  }

  const { records = [], categories = [], budgets = [], settings = {} } = value.data;
  const accounts = isRecord(settings) && Array.isArray(settings.accounts) ? settings.accounts : [];

  if (!Array.isArray(records) || !Array.isArray(categories) || !Array.isArray(budgets)) {
    throw new Error('备份数据必须包含 records、categories、budgets。');
  }

  if (!records.every(isTransaction)) {
    throw new Error('records 数据格式不正确。');
  }

  if (!categories.every(isCategory)) {
    throw new Error('categories 数据格式不正确。');
  }

  if (!budgets.every(isBudget)) {
    throw new Error('budgets 数据格式不正确。');
  }

  if (!accounts.every(isAccount)) {
    throw new Error('settings.accounts 数据格式不正确。');
  }

  return {
    version: value.version,
    exportedAt: value.exportedAt,
    data: {
      transactions: records,
      categories,
      budgets,
      accounts,
    },
  };
}

function findTransactionRecords(value: unknown): ImportableRecord[] | null {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }

  if (!isRecord(value)) {
    return null;
  }

  const candidates = [
    value.transactions,
    value.records,
    value.data,
    isRecord(value.data) ? value.data.records : undefined,
    value.items,
    value.list,
  ];

  const recordArray = candidates.find(Array.isArray);
  return recordArray ? recordArray.filter(isRecord) : null;
}

function normalizeImportRecord(record: ImportableRecord, index: number): ImportPreviewRow {
  const rawAmount = getFirstValue(record, ['amount', 'money', '金额', 'price', 'value']);
  const rawType = getFirstValue(record, ['type', '类型', 'transactionType']);
  const rawCategory = getFirstValue(record, ['category', '分类', 'subCategory', '子分类']);
  const rawParentCategory = getFirstValue(record, ['parentCategory', '父分类']);
  const rawNote = getFirstValue(record, ['note', 'remark', '备注', 'description']);
  const rawDate = getFirstValue(record, ['date', 'time', 'createTime', 'createdAt', '创建时间', '账单时间']);
  const rawAccount = getFirstValue(record, ['account', 'asset', '资产', 'paymentAccount']);
  const warnings: string[] = [];
  const amount = parseImportAmount(rawAmount);
  const type = parseImportType(rawType, amount);
  const occurredAt = parseImportDate(rawDate);
  const categoryName =
    valueToText(rawCategory) || valueToText(rawParentCategory) || (type === 'income' ? '其他收入' : '其他支出');
  const parentCategoryName = valueToText(rawParentCategory);
  const note = valueToText(rawNote) || undefined;
  const accountName = valueToText(rawAccount) || '默认账户';
  const normalizedAmount = normalizeAmount(Math.abs(amount ?? 0));

  if (rawType === undefined || valueToText(rawType) === '') {
    warnings.push('类型为空，已按支出处理');
  }

  if (!occurredAt.isValid) {
    warnings.push('时间无法解析，已使用当前时间');
  }

  if (!rawCategory && !rawParentCategory) {
    warnings.push(`分类为空，已归入${categoryName}`);
  }

  if (!rawAccount) {
    warnings.push('账户为空，已使用默认账户');
  }

  const invalidReason = getInvalidReason(normalizedAmount, rawAmount);
  const occurredAtIso = occurredAt.iso;
  const draft: ImportTransactionDraft = {
    type,
    amount: normalizedAmount,
    categoryName,
    parentCategoryName,
    note,
    occurredAt: occurredAtIso,
    accountName,
    createdAt: occurredAtIso,
    updatedAt: nowIso(),
    sourceIndex: index,
    warnings,
    duplicateKey: getDuplicateKey({
      occurredAt: occurredAtIso,
      amount: normalizedAmount,
      type,
      categoryName,
      note,
    }),
  };

  return {
    ...draft,
    status: invalidReason ? 'invalid' : 'ready',
    reason: invalidReason,
  };
}

async function enrichTransactionImportPreview(
  rows: ImportPreviewRow[],
  sourceMessage: string,
): Promise<TransactionImportPreview> {
  const [existingTransactions, existingCategories] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
  ]);
  const categoryMap = new Map(existingCategories.map((category) => [category.id, category]));
  const existingKeys = new Set(
    existingTransactions.map((transaction) => {
      const categoryName = categoryMap.get(transaction.categoryId)?.name ?? '';
      return getDuplicateKey({
        occurredAt: transaction.occurredAt,
        amount: transaction.amount,
        type: transaction.type,
        categoryName,
        note: transaction.note,
      });
    }),
  );
  const seenImportKeys = new Set<string>();
  const enrichedRows = rows.map((row) => {
    if (row.status === 'invalid') {
      return row;
    }

    if (existingKeys.has(row.duplicateKey) || seenImportKeys.has(row.duplicateKey)) {
      return {
        ...row,
        status: 'duplicate' as const,
        reason: '疑似重复记录，默认跳过',
      };
    }

    seenImportKeys.add(row.duplicateKey);
    return row;
  });
  const importableRows = enrichedRows.filter((row) => row.status === 'ready');

  return {
    mode: 'transactions',
    sourceMessage,
    totalRecords: enrichedRows.length,
    importableRecords: importableRows.length,
    invalidRecords: enrichedRows.filter((row) => row.status === 'invalid').length,
    duplicateRecords: enrichedRows.filter((row) => row.status === 'duplicate').length,
    incomeTotal: normalizeAmount(
      importableRows
        .filter((row) => row.type === 'income')
        .reduce((total, row) => total + row.amount, 0),
    ),
    expenseTotal: normalizeAmount(
      importableRows
        .filter((row) => row.type === 'expense')
        .reduce((total, row) => total + row.amount, 0),
    ),
    categoryCount: new Set(importableRows.map((row) => getCategoryLookupKey(row.type, row.categoryName))).size,
    accountCount: new Set(importableRows.map((row) => normalizeLookupText(row.accountName))).size,
    rows: enrichedRows,
    previewRows: enrichedRows.slice(0, 10),
  };
}

function getInvalidReason(amount: number, rawAmount: unknown): string | undefined {
  if (rawAmount === undefined || rawAmount === null || valueToText(rawAmount) === '') {
    return '金额为空';
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return '金额无效或不大于 0';
  }

  return undefined;
}

function parseImportAmount(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const text = valueToText(value)
    .replace(/,/g, '')
    .replace(/[¥￥元\s]/g, '');
  const match = text.match(/[-+]?\d+(?:\.\d+)?/);

  if (!match) {
    return null;
  }

  const amount = Number(match[0]);
  return Number.isFinite(amount) ? amount : null;
}

function parseImportType(value: unknown, amount: number | null): TransactionType {
  const text = normalizeLookupText(valueToText(value));

  if (['income', '收入', '入账', 'in'].includes(text)) {
    return 'income';
  }

  if (['expense', '支出', '消费', '付款', 'out'].includes(text)) {
    return 'expense';
  }

  if (amount !== null && amount < 0) {
    return 'expense';
  }

  return 'expense';
}

function parseImportDate(value: unknown): { iso: string; isValid: boolean } {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { iso: value.toISOString(), isValid: true };
  }

  if (typeof value === 'number') {
    const date = value > 10000000000 ? dayjs(value) : dayjs.unix(value);
    return date.isValid() ? { iso: date.toISOString(), isValid: true } : { iso: nowIso(), isValid: false };
  }

  const text = valueToText(value);

  if (!text) {
    return { iso: nowIso(), isValid: false };
  }

  const normalizedText = text.replace(/\//g, '-').replace(/[年月]/g, '-').replace(/日/g, '');
  const date = dayjs(normalizedText);

  if (!date.isValid()) {
    return { iso: nowIso(), isValid: false };
  }

  return { iso: date.toISOString(), isValid: true };
}

function getDuplicateKey(input: {
  occurredAt: string;
  amount: number;
  type: TransactionType;
  categoryName: string;
  note?: string;
}): string {
  return [
    dayjs(input.occurredAt).format('YYYY-MM-DD HH:mm'),
    normalizeAmount(input.amount).toFixed(2),
    input.type,
    normalizeLookupText(input.categoryName),
    normalizeLookupText(input.note ?? ''),
  ].join('|');
}

function getCategoryLookupKey(type: TransactionType, name: string): string {
  return `${type}:${normalizeLookupText(name)}`;
}

function normalizeLookupText(value: string): string {
  return value.trim().toLowerCase();
}

function getAccountKindByTransactionType(type: TransactionType): AccountKind {
  return type === 'income' ? 'asset' : 'asset';
}

function getFirstValue(record: ImportableRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key];
    }
  }

  return undefined;
}

function valueToText(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }

  return '';
}

function looksLikeBackupFile(value: unknown): boolean {
  return (
    isRecord(value) &&
    ('app' in value || 'version' in value || 'schemaVersion' in value || 'exportedAt' in value) &&
    'data' in value
  );
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
