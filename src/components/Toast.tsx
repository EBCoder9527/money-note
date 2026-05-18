import { useEffect } from 'react';

type ToastType = 'success' | 'error';

type ToastProps = {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
};

export function Toast({ message, type = 'success', duration = 2200, onClose }: ToastProps) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timer);
  }, [duration, message, onClose]);

  if (!message) {
    return null;
  }

  const isSuccess = type === 'success';

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(0.75rem+env(safe-area-inset-top))] z-[100] flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-[1.35rem] border bg-white px-4 py-3 text-sm font-semibold shadow-[0_18px_45px_rgba(23,53,42,0.13)] ${
          isSuccess ? 'border-[#bfe8d4] text-[#2f8f66]' : 'border-[#f3b4a8] text-[#8f2c18]'
        }`}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base ${
            isSuccess ? 'bg-[#EAF7F1]' : 'bg-[#fff0ec]'
          }`}
          aria-hidden="true"
        >
          {isSuccess ? '✓' : '!'}
        </span>
        <span>{message}</span>
        <button
          type="button"
          onClick={onClose}
          className={`ml-1 rounded-full px-2 py-1 text-xs font-semibold ${
            isSuccess ? 'text-[#4CB782]' : 'text-[#8f2c18]'
          }`}
        >
          关闭
        </button>
      </div>
    </div>
  );
}
