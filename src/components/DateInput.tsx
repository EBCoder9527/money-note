import { useMemo, useState, type InputHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  type: 'date' | 'month';
  variant?: 'regular' | 'compact';
  onValueChange?: (value: string) => void;
};

export function DateInput({
  className = '',
  value,
  variant = 'regular',
  onValueChange,
  ...props
}: DateInputProps) {
  const hasValue = value !== undefined && String(value) !== '';
  const isCompact = variant === 'compact';

  if (props.type === 'date' && !isCompact) {
    return (
      <CustomDatePicker
        className={className}
        id={props.id}
        name={props.name}
        value={String(value ?? '')}
        onValueChange={onValueChange}
      />
    );
  }

  if (props.type === 'month' && isCompact) {
    return (
      <CustomMonthPicker
        className={className}
        id={props.id}
        name={props.name}
        value={String(value ?? '')}
        ariaLabel={props['aria-label']}
        onValueChange={onValueChange}
      />
    );
  }

  return (
    <div
      className={`relative border transition ${
        isCompact ? 'rounded-full' : 'rounded-[1.35rem]'
      } ${
        hasValue ? 'border-[#4CB782] bg-[#EAF7F1]' : 'border-[#dcefe6] bg-[#F7FBF9]'
      } focus-within:border-[#4CB782] focus-within:bg-[#EAF7F1] ${className}`}
    >
      <input
        {...props}
        value={value}
        className={`w-full bg-transparent text-[#17352a] outline-none [color-scheme:light] ${
          isCompact
            ? 'h-10 rounded-full px-4 text-center text-sm font-semibold'
            : 'h-14 rounded-[1.35rem] px-4 pr-14 text-base font-semibold'
        }`}
      />
      {isCompact ? null : (
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white px-2 py-1 text-xs font-semibold text-[#2f8f66] shadow-[0_8px_18px_rgba(76,183,130,0.10)]">
          选择
        </span>
      )}
    </div>
  );
}

type CustomMonthPickerProps = {
  id?: string;
  name?: string;
  value: string;
  className?: string;
  ariaLabel?: string;
  onValueChange?: (value: string) => void;
};

function CustomMonthPicker({
  id,
  name,
  value,
  className = '',
  ariaLabel,
  onValueChange,
}: CustomMonthPickerProps) {
  const selectedMonth = value ? dayjs(`${value}-01`) : dayjs();
  const [isOpen, setIsOpen] = useState(false);
  const [visibleYear, setVisibleYear] = useState(() => selectedMonth.year());

  function handleSelect(monthIndex: number) {
    const nextValue = dayjs()
      .year(visibleYear)
      .month(monthIndex)
      .date(1)
      .format('YYYY-MM');

    onValueChange?.(nextValue);
    setIsOpen(false);
  }

  return (
    <div className={`relative ${className}`}>
      <input id={id} name={name} type="hidden" value={value} readOnly />
      <button
        type="button"
        onClick={() => {
          setVisibleYear(selectedMonth.year());
          setIsOpen((current) => !current);
        }}
        className="h-10 w-full rounded-full border border-[#4CB782] bg-[#EAF7F1] px-4 text-center text-sm font-semibold text-[#17352a] transition focus:outline-none focus:ring-2 focus:ring-[#BFE8D4]"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        {selectedMonth.format('YYYY年M月')}
      </button>

      {isOpen ? (
        <div className="absolute left-1/2 top-[calc(100%+0.5rem)] z-40 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-[1.5rem] border border-[#dcefe6] bg-white p-4 shadow-[0_22px_55px_rgba(23,53,42,0.16)]">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVisibleYear((current) => current - 1)}
              className="h-10 w-10 rounded-full bg-[#EAF7F1] text-lg font-semibold text-[#2f8f66] transition hover:bg-[#DDF3E8]"
              aria-label="上一年"
            >
              ‹
            </button>
            <div className="text-base font-semibold text-[#17352a]">{visibleYear}年</div>
            <button
              type="button"
              onClick={() => setVisibleYear((current) => current + 1)}
              className="h-10 w-10 rounded-full bg-[#EAF7F1] text-lg font-semibold text-[#2f8f66] transition hover:bg-[#DDF3E8]"
              aria-label="下一年"
            >
              ›
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }, (_, index) => {
              const monthValue = dayjs().year(visibleYear).month(index).date(1).format('YYYY-MM');
              const isSelected = monthValue === value;

              return (
                <button
                  key={monthValue}
                  type="button"
                  onClick={() => handleSelect(index)}
                  className={`h-11 rounded-2xl border text-sm font-semibold transition ${
                    isSelected
                      ? 'border-[#4CB782] bg-[#EAF7F1] text-[#2f8f66]'
                      : 'border-[#edf4f0] bg-[#F7FBF9] text-[#17352a] hover:border-[#4CB782]'
                  }`}
                >
                  {index + 1}月
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onValueChange?.(dayjs().format('YYYY-MM'));
                setIsOpen(false);
              }}
              className="h-11 rounded-full bg-[#EAF7F1] text-sm font-semibold text-[#2f8f66] transition hover:bg-[#DDF3E8]"
            >
              本月
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-11 rounded-full border border-[#dcefe6] text-sm font-semibold text-[#6f8178] transition hover:border-[#4CB782]"
            >
              关闭
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type CustomDatePickerProps = {
  id?: string;
  name?: string;
  value: string;
  className?: string;
  onValueChange?: (value: string) => void;
};

function CustomDatePicker({ id, name, value, className = '', onValueChange }: CustomDatePickerProps) {
  const selectedDate = value ? dayjs(value) : dayjs();
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate.startOf('month'));
  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

  function handleSelect(nextValue: string) {
    onValueChange?.(nextValue);
    setIsOpen(false);
  }

  return (
    <div className={`relative ${className}`}>
      <input id={id} name={name} type="hidden" value={value} readOnly />
      <button
        type="button"
        onClick={() => {
          setVisibleMonth(selectedDate.startOf('month'));
          setIsOpen((current) => !current);
        }}
        className={`flex h-14 w-full items-center justify-between rounded-[1.35rem] border px-4 text-left text-base font-semibold transition ${
          value
            ? 'border-[#4CB782] bg-[#EAF7F1] text-[#17352a]'
            : 'border-[#dcefe6] bg-[#F7FBF9] text-[#7a8d84]'
        } focus:outline-none focus:ring-2 focus:ring-[#BFE8D4]`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span>{value ? selectedDate.format('YYYY年M月D日') : '选择日期'}</span>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-[#2f8f66] shadow-[0_8px_18px_rgba(76,183,130,0.10)]">
          选择
        </span>
      </button>

      {isOpen
        ? createPortal(
            <DatePickerDrawer
              days={days}
              value={value}
              visibleMonth={visibleMonth}
              onClose={() => setIsOpen(false)}
              onSelect={handleSelect}
              onVisibleMonthChange={setVisibleMonth}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

type DatePickerDrawerProps = {
  days: dayjs.Dayjs[];
  value: string;
  visibleMonth: dayjs.Dayjs;
  onClose: () => void;
  onSelect: (value: string) => void;
  onVisibleMonthChange: React.Dispatch<React.SetStateAction<dayjs.Dayjs>>;
};

function DatePickerDrawer({
  days,
  value,
  visibleMonth,
  onClose,
  onSelect,
  onVisibleMonthChange,
}: DatePickerDrawerProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-[#17352a]/25 px-3 pb-3 backdrop-blur-sm sm:items-center sm:justify-center">
      <div
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-[1.65rem] border border-[#dcefe6] bg-white p-4 shadow-[0_24px_70px_rgba(23,53,42,0.22)]"
        role="dialog"
        aria-modal="true"
        aria-label="选择日期"
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onVisibleMonthChange((current) => current.subtract(1, 'month'))}
            className="h-10 w-10 rounded-full bg-[#EAF7F1] text-lg font-semibold text-[#2f8f66] transition hover:bg-[#DDF3E8]"
            aria-label="上个月"
          >
            ‹
          </button>
          <div className="text-base font-semibold text-[#17352a]">{visibleMonth.format('YYYY年M月')}</div>
          <button
            type="button"
            onClick={() => onVisibleMonthChange((current) => current.add(1, 'month'))}
            className="h-10 w-10 rounded-full bg-[#EAF7F1] text-lg font-semibold text-[#2f8f66] transition hover:bg-[#DDF3E8]"
            aria-label="下个月"
          >
            ›
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 text-center text-xs font-semibold text-[#7a8d84]">
          {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayValue = day.format('YYYY-MM-DD');
            const isSelected = dayValue === value;
            const isCurrentMonth = day.month() === visibleMonth.month();

            return (
              <button
                key={dayValue}
                type="button"
                onClick={() => onSelect(dayValue)}
                className={`h-10 rounded-full text-sm font-semibold transition ${
                  isSelected
                    ? 'border border-[#4CB782] bg-[#EAF7F1] text-[#2f8f66]'
                    : isCurrentMonth
                      ? 'text-[#17352a] hover:bg-[#F7FBF9]'
                      : 'text-[#bdd1c7] hover:bg-[#F7FBF9]'
                }`}
              >
                {day.date()}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            onClick={() => onSelect(dayjs().format('YYYY-MM-DD'))}
            className="h-11 rounded-full bg-[#EAF7F1] text-sm font-semibold text-[#2f8f66] transition hover:bg-[#DDF3E8]"
          >
            今天
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-full border border-[#dcefe6] text-sm font-semibold text-[#6f8178] transition hover:border-[#4CB782]"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

function buildCalendarDays(month: dayjs.Dayjs) {
  const firstDay = month.startOf('month');
  const mondayOffset = firstDay.day() === 0 ? 6 : firstDay.day() - 1;
  const start = firstDay.subtract(mondayOffset, 'day');

  return Array.from({ length: 42 }, (_, index) => start.add(index, 'day'));
}
