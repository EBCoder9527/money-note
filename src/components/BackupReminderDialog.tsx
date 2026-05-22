type BackupReminderDialogProps = {
  open: boolean;
  isExporting: boolean;
  onDismiss: () => void;
  onExport: () => void;
};

export function BackupReminderDialog({
  open,
  isExporting,
  onDismiss,
  onExport,
}: BackupReminderDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end bg-[#17352a]/25 px-3 pb-3 backdrop-blur-sm sm:items-center sm:justify-center">
      <section
        className="w-full max-w-md rounded-[1.75rem] bg-white p-5 shadow-[0_24px_70px_rgba(23,53,42,0.22)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-reminder-title"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF7F1] text-lg font-bold text-[#2f8f66]">
          备
        </div>
        <h2 id="backup-reminder-title" className="mt-4 text-xl font-semibold tracking-normal text-[#17352a]">
          数据安全提醒
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#7a8d84]">
          你的记账数据保存在当前设备中。为了避免清理缓存、误删应用或更换设备导致数据丢失，建议定期导出一份备份文件。
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onDismiss}
            disabled={isExporting}
            className="h-12 rounded-[1.2rem] border border-[#dcefe6] bg-[#F7FBF9] text-base font-semibold text-[#6f8178] transition hover:border-[#4CB782] disabled:opacity-60"
          >
            暂不备份
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={isExporting}
            className="h-12 rounded-[1.2rem] bg-[#4CB782] text-base font-semibold text-white shadow-[0_14px_28px_rgba(76,183,130,0.24)] transition active:scale-[0.99] disabled:bg-[#bdd7cb]"
          >
            {isExporting ? '导出中' : '立即导出'}
          </button>
        </div>
      </section>
    </div>
  );
}
