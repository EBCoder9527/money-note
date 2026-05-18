import { useRef, useState, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { AppLogo } from '@/components/AppLogo';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { Toast } from '@/components/Toast';
import { db } from '@/data/db';
import type { Category } from '@/data/models';
import {
  createTransactionImportPreview,
  exportBackupJson,
  importTransactions,
  restoreBackup,
  type ImportPreviewRow,
  type TransactionImportPreview,
} from '@/utils/backup';
import { exportCsv, type CsvRow } from '@/utils/exportCsv';
import { formatCurrency, formatPlainAmount } from '@/utils/money';
import { getMonthLabel, getMonthRangeIso } from '@/utils/month';
import packageJson from '../../../package.json';

type SettingsPageProps = {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onOpenAccountManagement?: () => void;
  onOpenCategoryManagement: () => void;
  onBack?: () => void;
};

export function SettingsPage({
  selectedMonth,
  onMonthChange,
  onOpenAccountManagement,
  onOpenCategoryManagement,
  onBack,
}: SettingsPageProps) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupFileToImport, setBackupFileToImport] = useState<File | null>(null);
  const [transactionImportPreview, setTransactionImportPreview] = useState<TransactionImportPreview | null>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const transactionInputRef = useRef<HTMLInputElement>(null);
  const monthKey = selectedMonth;
  const monthLabel = getMonthLabel(selectedMonth);

  async function handleExportCurrentMonth() {
    setMessage('');
    setError('');
    setIsExporting(true);

    try {
      const { startIso, endIso } = getMonthRangeIso(selectedMonth);
      const [transactions, categories] = await Promise.all([
        db.transactions
          .where('occurredAt')
          .between(startIso, endIso, true, true)
          .sortBy('occurredAt'),
        db.categories.toArray(),
      ]);

      if (transactions.length === 0) {
        setError('本月暂无账单可导出');
        return;
      }

      const categoryMap = new Map(categories.map((category: Category) => [category.id, category]));
      const rows: CsvRow[] = transactions.map((transaction) => ({
        日期: dayjs(transaction.occurredAt).format('YYYY-MM-DD HH:mm'),
        类型: transaction.type === 'expense' ? '支出' : '收入',
        分类: categoryMap.get(transaction.categoryId)?.name ?? '未分类',
        金额: formatPlainAmount(transaction.amount),
        备注: transaction.note ?? '',
      }));

      exportCsv(`账单-${monthKey}.csv`, rows);
      setMessage(`已导出 ${monthLabel} 账单`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : '导出失败，请稍后再试');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportBackup() {
    setMessage('');
    setError('');
    setIsBackingUp(true);

    try {
      await exportBackupJson();
      setMessage('全部数据备份已导出');
    } catch (backupError) {
      setError(backupError instanceof Error ? backupError.message : '备份导出失败，请稍后再试');
    } finally {
      setIsBackingUp(false);
    }
  }

  function handleRestoreBackup(file: File | undefined) {
    if (!file) {
      return;
    }

    setMessage('');
    setError('');
    setBackupFileToImport(file);
  }

  function cancelRestoreBackup() {
    setBackupFileToImport(null);
    if (backupInputRef.current) {
      backupInputRef.current.value = '';
    }
  }

  async function confirmRestoreBackup() {
    if (!backupFileToImport) {
      return;
    }

    const file = backupFileToImport;
    setBackupFileToImport(null);
    setIsImporting(true);

    try {
      const result = await restoreBackup(file);
      setMessage(
        `恢复成功：账单 ${result.transactions} 条，分类 ${result.categories} 个，预算 ${result.budgets} 条，账户 ${result.accounts} 个`,
      );
    } catch (importError) {
      try {
        const preview = await createTransactionImportPreview(file);
        setTransactionImportPreview(preview);
        setMessage(preview.sourceMessage);
      } catch {
        setError(importError instanceof Error ? importError.message : '恢复失败，请检查备份文件');
      }
    } finally {
      setIsImporting(false);
      if (backupInputRef.current) {
        backupInputRef.current.value = '';
      }
    }
  }

  async function handleImportTransactions(file: File | undefined) {
    if (!file) {
      return;
    }

    setMessage('');
    setError('');
    setIsImporting(true);

    try {
      const preview = await createTransactionImportPreview(file);
      setTransactionImportPreview(preview);
      setMessage(preview.sourceMessage);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : '未识别到账单数据，请检查文件格式');
    } finally {
      setIsImporting(false);
      if (transactionInputRef.current) {
        transactionInputRef.current.value = '';
      }
    }
  }

  function cancelImportTransactions() {
    setTransactionImportPreview(null);
  }

  async function confirmImportTransactions() {
    if (!transactionImportPreview) {
      return;
    }

    const preview = transactionImportPreview;
    setTransactionImportPreview(null);
    setIsImporting(true);
    setMessage('');
    setError('');

    try {
      const result = await importTransactions(preview);
      setMessage(
        `导入完成：新增流水 ${result.imported} 条，跳过重复 ${result.skippedDuplicates} 条，异常 ${result.invalidRecords} 条，新建分类 ${result.createdCategories} 个，账户 ${result.createdAccounts} 个`,
      );
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : '导入账单失败，请稍后再试');
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FBF9] pb-28 text-[#17352a]">
      <Toast message={message} onClose={() => setMessage('')} />
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
              <p className="text-sm font-medium text-[#7a8d84]">个人中心</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal">我的</h1>
            </div>
          )}
          {onBack ? <h1 className="text-xl font-semibold tracking-normal">我的</h1> : null}
          <div className="w-16" />
        </header>

        {error ? (
          <div className="rounded-2xl border border-[#f3b4a8] bg-[#fff0ec] p-4 text-sm font-semibold text-[#8f2c18]">
            {error}
          </div>
        ) : null}

        <BrandPanel />

        <SettingsGroup
          eyebrow="数据管理"
          title="导出与备份"
          description={`当前选择月份：${monthLabel}`}
          beforeList={<MonthSwitcher selectedMonth={selectedMonth} onChange={onMonthChange} />}
        >
          <SettingsActionRow
            icon="CSV"
            title="导出本月账单 CSV"
            description="导出当前月份的收入和支出记录，适合用 Excel 查看。"
            actionLabel={isExporting ? '导出中' : '导出'}
            disabled={isExporting}
            onClick={handleExportCurrentMonth}
          />
          <SettingsActionRow
            icon="JSON"
            title="导出全部数据 JSON"
            description="备份账单、分类、预算和账户数据，便于迁移或恢复。"
            actionLabel={isBackingUp ? '导出中' : '备份'}
            disabled={isBackingUp || isImporting}
            onClick={handleExportBackup}
          />
          <SettingsActionRow
            icon="IN"
            title="恢复备份"
            description="导入本产品导出的完整 JSON 备份，同 ID 数据会更新。"
            actionLabel={isImporting ? '恢复中' : '恢复'}
            disabled={isBackingUp || isImporting}
            onClick={() => backupInputRef.current?.click()}
          />
          <SettingsActionRow
            icon="账"
            title="导入账单"
            description="导入其他记账软件导出的账单流水。当前支持 JSON，CSV/Excel 入口已预留。"
            actionLabel={isImporting ? '解析中' : '导入'}
            disabled={isBackingUp || isImporting}
            onClick={() => transactionInputRef.current?.click()}
          />
          <input
            ref={backupInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => handleRestoreBackup(event.target.files?.[0])}
          />
          <input
            ref={transactionInputRef}
            type="file"
            accept="application/json,.json,.csv,.xlsx,.xls"
            className="hidden"
            onChange={(event) => void handleImportTransactions(event.target.files?.[0])}
          />
        </SettingsGroup>

        <SettingsGroup
          eyebrow="分类与账户"
          title="日常记账管理"
          description="维护常用分类和资产账户，让记账数据更好归拢。"
        >
          <SettingsActionRow
            icon="类"
            title="分类管理"
            description="新增、编辑或删除自定义支出分类，默认分类会被保护。"
            onClick={onOpenCategoryManagement}
          />
          {onOpenAccountManagement ? (
            <SettingsActionRow
              icon="账"
              title="资产账户管理"
              description="管理现金、银行卡、支付账户和负债账户。"
              onClick={onOpenAccountManagement}
            />
          ) : null}
        </SettingsGroup>

        <SettingsGroup
          eyebrow="关于产品"
          title="有数记账"
          description="本应用优先将数据保存在你的当前设备。"
        >
          <SettingsInfoRow
            icon="PWA"
            title="添加到主屏幕"
            description="手机浏览器打开线上地址后，可通过分享菜单或浏览器菜单添加到主屏幕。"
          />
          <SettingsInfoRow
            icon="V"
            title="版本号"
            description="当前安装的应用版本。"
            value={`v${packageJson.version}`}
          />
          <SettingsInfoRow
            icon="DB"
            title="本地数据说明"
            description="账单、分类、预算和账户数据存储在浏览器 IndexedDB 中。"
          />
          <SettingsInfoRow
            icon="隐"
            title="关于/隐私说明"
            description="目前不接入后端账号系统，数据不会主动上传到服务器。"
          />
        </SettingsGroup>
      </div>
      <ConfirmDialog
        open={Boolean(backupFileToImport)}
        title="恢复备份？"
        description="恢复备份会合并写入本地数据：同 ID 数据将更新，不同 ID 数据将新增。不会清空现有数据。"
        confirmLabel="恢复"
        onCancel={cancelRestoreBackup}
        onConfirm={() => void confirmRestoreBackup()}
      />
      <TransactionImportPreviewDialog
        preview={transactionImportPreview}
        isImporting={isImporting}
        onCancel={cancelImportTransactions}
        onConfirm={() => void confirmImportTransactions()}
      />
    </main>
  );
}

type TransactionImportPreviewDialogProps = {
  preview: TransactionImportPreview | null;
  isImporting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function TransactionImportPreviewDialog({
  preview,
  isImporting,
  onCancel,
  onConfirm,
}: TransactionImportPreviewDialogProps) {
  if (!preview) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#17352a]/30 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-8 sm:items-center">
      <section className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-[1.75rem] bg-white shadow-[0_24px_70px_rgba(23,53,42,0.22)]">
        <div className="max-h-[88vh] overflow-y-auto p-5">
          <p className="text-sm font-semibold text-[#4CB782]">导入预览</p>
          <h2 className="mt-2 text-xl font-semibold tracking-normal text-[#17352a]">确认导入账单流水</h2>
          <p className="mt-2 text-sm leading-6 text-[#7a8d84]">{preview.sourceMessage}</p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <PreviewMetric label="总记录" value={`${preview.totalRecords} 条`} />
            <PreviewMetric label="可导入" value={`${preview.importableRecords} 条`} />
            <PreviewMetric label="异常" value={`${preview.invalidRecords} 条`} tone="danger" />
            <PreviewMetric label="疑似重复" value={`${preview.duplicateRecords} 条`} tone="warning" />
            <PreviewMetric label="收入合计" value={formatCurrency(preview.incomeTotal)} />
            <PreviewMetric label="支出合计" value={formatCurrency(preview.expenseTotal)} tone="expense" />
            <PreviewMetric label="涉及分类" value={`${preview.categoryCount} 个`} />
            <PreviewMetric label="涉及账户" value={`${preview.accountCount} 个`} />
          </div>

          {preview.duplicateRecords > 0 ? (
            <div className="mt-4 rounded-[1.2rem] border border-[#f6dfae] bg-[#fff8e8] p-4 text-sm font-medium leading-6 text-[#8a5b11]">
              疑似重复记录 {preview.duplicateRecords} 条，将默认跳过。
            </div>
          ) : null}

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#17352a]">前 10 条预览</h3>
              <span className="text-sm text-[#7a8d84]">异常记录不会导入</span>
            </div>
            <div className="mt-3 overflow-hidden rounded-[1.35rem] border border-[#e4f1eb]">
              {preview.previewRows.map((row) => (
                <ImportPreviewRowItem key={`${row.sourceIndex}-${row.duplicateKey}`} row={row} />
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isImporting}
              className="h-12 rounded-[1.25rem] border border-[#dcefe6] bg-[#F7FBF9] text-base font-semibold text-[#2f8f66] disabled:opacity-60"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isImporting || preview.importableRecords === 0}
              className="h-12 rounded-[1.25rem] bg-[#4CB782] text-base font-semibold text-white shadow-[0_16px_34px_rgba(76,183,130,0.24)] disabled:bg-[#bdd7cb]"
            >
              {isImporting ? '导入中' : `确认导入 ${preview.importableRecords} 条`}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function PreviewMetric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'danger' | 'warning' | 'expense';
}) {
  const valueClassName =
    tone === 'danger'
      ? 'text-[#8f2c18]'
      : tone === 'warning'
        ? 'text-[#8a5b11]'
        : tone === 'expense'
          ? 'text-[#d65a54]'
          : 'text-[#17352a]';

  return (
    <div className="rounded-[1.2rem] bg-[#F7FBF9] p-3">
      <p className="text-xs font-medium text-[#7a8d84]">{label}</p>
      <p className={`mt-1 text-sm font-bold ${valueClassName}`}>{value}</p>
    </div>
  );
}

function ImportPreviewRowItem({ row }: { row: ImportPreviewRow }) {
  const statusText =
    row.status === 'ready'
      ? '可导入'
      : row.status === 'duplicate'
        ? '重复跳过'
        : '异常跳过';
  const statusClassName =
    row.status === 'ready'
      ? 'bg-[#EAF7F1] text-[#2f8f66]'
      : row.status === 'duplicate'
        ? 'bg-[#fff8e8] text-[#8a5b11]'
        : 'bg-[#fff0ec] text-[#8f2c18]';

  return (
    <div className="border-b border-[#edf4f0] bg-white p-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#17352a]">{row.categoryName}</span>
            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClassName}`}>{statusText}</span>
          </div>
          <p className="mt-1 text-sm text-[#7a8d84]">
            {dayjs(row.occurredAt).format('YYYY-MM-DD HH:mm')} · {row.note || '无备注'} · {row.accountName}
          </p>
          {row.reason ? <p className="mt-1 text-xs font-medium text-[#8f2c18]">{row.reason}</p> : null}
          {row.warnings.length > 0 ? (
            <p className="mt-1 text-xs text-[#8a5b11]">{row.warnings.join('；')}</p>
          ) : null}
        </div>
        <div className={`shrink-0 text-right text-sm font-bold ${row.type === 'income' ? 'text-[#4CB782]' : 'text-[#d65a54]'}`}>
          {row.type === 'income' ? '+' : '-'}
          {formatCurrency(row.amount)}
        </div>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <section className="rounded-[1.9rem] bg-white p-5 shadow-[0_18px_48px_rgba(23,53,42,0.07)]">
      <AppLogo />
      <p className="mt-4 text-sm leading-6 text-[#7a8d84]">
        管理数据、分类和账户设置。所有操作都围绕本地记账数据展开，轻一点，也安心一点。
      </p>
    </section>
  );
}

type SettingsGroupProps = {
  eyebrow: string;
  title: string;
  description: string;
  beforeList?: ReactNode;
  children: ReactNode;
};

function SettingsGroup({ eyebrow, title, description, beforeList, children }: SettingsGroupProps) {
  return (
    <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_18px_45px_rgba(23,53,42,0.07)]">
      <p className="text-sm font-medium text-[#7a8d84]">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold tracking-normal text-[#17352a]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#7a8d84]">{description}</p>
      {beforeList ? <div className="mt-5">{beforeList}</div> : null}
      <div className="mt-5 divide-y divide-[#edf4f0] overflow-hidden rounded-[1.35rem] border border-[#e4f1eb]">
        {children}
      </div>
    </section>
  );
}

type SettingsActionRowProps = {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  disabled?: boolean;
  onClick: () => void;
};

function SettingsActionRow({
  icon,
  title,
  description,
  actionLabel,
  disabled = false,
  onClick,
}: SettingsActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 bg-white p-4 text-left transition hover:bg-[#F7FBF9] active:bg-[#edf8f2] disabled:cursor-not-allowed disabled:opacity-65"
    >
      <SettingIcon label={icon} />
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-[#17352a]">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-[#7a8d84]">{description}</span>
      </span>
      {actionLabel ? (
        <span className="shrink-0 rounded-full bg-[#EAF7F1] px-3 py-1 text-sm font-semibold text-[#2f8f66]">
          {actionLabel}
        </span>
      ) : (
        <span className="shrink-0 text-2xl leading-none text-[#9fb6aa]">›</span>
      )}
    </button>
  );
}

type SettingsInfoRowProps = {
  icon: string;
  title: string;
  description: string;
  value?: string;
};

function SettingsInfoRow({ icon, title, description, value }: SettingsInfoRowProps) {
  return (
    <div className="flex items-center gap-3 bg-white p-4">
      <SettingIcon label={icon} />
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-[#17352a]">{title}</p>
        <p className="mt-1 text-sm leading-5 text-[#7a8d84]">{description}</p>
      </div>
      {value ? (
        <span className="shrink-0 rounded-full bg-[#F7FBF9] px-3 py-1 text-sm font-semibold text-[#6f8178]">
          {value}
        </span>
      ) : null}
    </div>
  );
}

function SettingIcon({ label }: { label: string }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EAF7F1] text-xs font-bold text-[#2f8f66] shadow-[0_10px_24px_rgba(76,183,130,0.10)]">
      {label}
    </span>
  );
}
