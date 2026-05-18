export type MainTab = 'home' | 'bills' | 'statistics' | 'accounts' | 'settings';

type BottomTabNavProps = {
  activeTab: MainTab;
  onChange: (tab: MainTab) => void;
};

const tabs: Array<{ key: MainTab; label: string; icon: string }> = [
  { key: 'home', label: '首页', icon: '⌂' },
  { key: 'bills', label: '账单', icon: '≡' },
  { key: 'statistics', label: '统计', icon: '⌁' },
  { key: 'accounts', label: '资产', icon: '◌' },
  { key: 'settings', label: '我的', icon: '○' },
];

export function BottomTabNav({ activeTab, onChange }: BottomTabNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dcefe6] bg-white/95 px-3 pb-[calc(0.45rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_34px_rgba(23,53,42,0.08)] backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-semibold transition active:scale-[0.98] ${
                isActive ? 'bg-[#EAF7F1] text-[#4CB782]' : 'text-[#8b9b94] hover:bg-[#F7FBF9]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
