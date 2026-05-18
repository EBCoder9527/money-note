type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '确认',
  cancelLabel = '取消',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end bg-[#17352a]/25 px-3 pb-3 backdrop-blur-sm sm:items-center sm:justify-center">
      <section
        className="w-full max-w-md rounded-[1.75rem] bg-white p-5 shadow-[0_24px_70px_rgba(23,53,42,0.22)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold ${
            variant === 'danger' ? 'bg-[#fff0ec] text-[#b0442e]' : 'bg-[#EAF7F1] text-[#2f8f66]'
          }`}
        >
          !
        </div>
        <h2 id="confirm-dialog-title" className="mt-4 text-xl font-semibold tracking-normal text-[#17352a]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#7a8d84]">{description}</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-12 rounded-[1.2rem] border border-[#dcefe6] bg-[#F7FBF9] text-base font-semibold text-[#6f8178] transition hover:border-[#4CB782]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-12 rounded-[1.2rem] text-base font-semibold text-white shadow-[0_14px_28px_rgba(23,53,42,0.10)] transition active:scale-[0.99] ${
              variant === 'danger'
                ? 'bg-[#d65a54] hover:bg-[#c44d47]'
                : 'bg-[#4CB782] hover:bg-[#3fa574]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
