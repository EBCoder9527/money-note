type AppLogoProps = {
  size?: 'sm' | 'md';
  showText?: boolean;
};

const sizeClassNames = {
  sm: 'h-10 w-10 rounded-2xl',
  md: 'h-12 w-12 rounded-[1.25rem]',
};

const appIconUrl = `${import.meta.env.BASE_URL}icons/app-icon.png`;

export function AppLogo({ size = 'md', showText = true }: AppLogoProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <img
        src={appIconUrl}
        alt="有数记账"
        className={`${sizeClassNames[size]} shrink-0 object-cover shadow-[0_10px_28px_rgba(76,183,130,0.18)]`}
      />
      {showText ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#7a8d84]">有数记账</p>
          <p className="truncate text-lg font-semibold tracking-normal text-[#17352a]">轻松掌握每一笔</p>
        </div>
      ) : null}
    </div>
  );
}
