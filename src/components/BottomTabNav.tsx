import type { ReactNode } from 'react';

export type MainTab = 'home' | 'bills' | 'statistics' | 'accounts' | 'settings';

type BottomTabNavProps = {
  activeTab: MainTab;
  onChange: (tab: MainTab) => void;
};

type TabIconProps = {
  active: boolean;
};

const tabs: Array<{ key: MainTab; label: string; Icon: (props: TabIconProps) => ReactNode }> = [
  { key: 'home', label: '首页', Icon: HouseIcon },
  { key: 'bills', label: '账单', Icon: ReceiptIcon },
  { key: 'statistics', label: '统计', Icon: ChartIcon },
  { key: 'accounts', label: '资产', Icon: WalletIcon },
  { key: 'settings', label: '我的', Icon: UserIcon },
];

export function BottomTabNav({ activeTab, onChange }: BottomTabNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dcefe6] bg-white/95 px-3 pb-[calc(0.45rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_34px_rgba(23,53,42,0.08)] backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.Icon;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-semibold transition active:scale-[0.98] ${
                isActive ? 'bg-[#EAF7F1]/80 text-[#4CB782]' : 'text-[#8A9A93] hover:bg-[#F7FBF9]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon active={isActive} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function BaseIcon({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.15 : 1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[22px] w-[22px]"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function HouseIcon({ active }: TabIconProps) {
  return (
    <BaseIcon active={active}>
      <path d="M4 10.6 12 4l8 6.6" />
      <path d="M6.5 9.6V20h11V9.6" />
      <path d="M10 20v-5h4v5" />
    </BaseIcon>
  );
}

function ReceiptIcon({ active }: TabIconProps) {
  return (
    <BaseIcon active={active}>
      <path d="M7 4h10a1.5 1.5 0 0 1 1.5 1.5V20l-2.2-1.2L14.1 20 12 18.8 9.9 20l-2.2-1.2L5.5 20V5.5A1.5 1.5 0 0 1 7 4Z" />
      <path d="M9 9h6" />
      <path d="M9 13h5" />
    </BaseIcon>
  );
}

function ChartIcon({ active }: TabIconProps) {
  return (
    <BaseIcon active={active}>
      <path d="M5 19V5" />
      <path d="M5 19h14" />
      <path d="M9 16v-5" />
      <path d="M13 16V8" />
      <path d="M17 16v-3" />
    </BaseIcon>
  );
}

function WalletIcon({ active }: TabIconProps) {
  return (
    <BaseIcon active={active}>
      <path d="M5.5 7.5h12A2.5 2.5 0 0 1 20 10v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17V7a2 2 0 0 1 2-2h10" />
      <path d="M16 13h4" />
      <path d="M16.5 13h.1" />
    </BaseIcon>
  );
}

function UserIcon({ active }: TabIconProps) {
  return (
    <BaseIcon active={active}>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </BaseIcon>
  );
}
