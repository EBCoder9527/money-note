import { DateInput } from '@/components/DateInput';
import { getMonthLabel, getNextMonthKey, getPreviousMonthKey } from '@/utils/month';

type MonthSwitcherProps = {
  selectedMonth: string;
  onChange: (month: string) => void;
};

export function MonthSwitcher({ selectedMonth, onChange }: MonthSwitcherProps) {
  return (
    <section className="rounded-[1.35rem] bg-white p-3 shadow-[0_12px_34px_rgba(23,53,42,0.06)]">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(getPreviousMonthKey(selectedMonth))}
          className="h-10 w-10 rounded-full bg-[#EAF7F1] text-lg font-semibold text-[#2f8f66] transition hover:bg-[#DDF3E8]"
          aria-label="上个月"
        >
          ‹
        </button>
        <div className="min-w-0 flex-1">
          <DateInput
            type="month"
            value={selectedMonth}
            onValueChange={onChange}
            variant="compact"
            aria-label={getMonthLabel(selectedMonth)}
          />
        </div>
        <button
          type="button"
          onClick={() => onChange(getNextMonthKey(selectedMonth))}
          className="h-10 w-10 rounded-full bg-[#EAF7F1] text-lg font-semibold text-[#2f8f66] transition hover:bg-[#DDF3E8]"
          aria-label="下个月"
        >
          ›
        </button>
      </div>
    </section>
  );
}
