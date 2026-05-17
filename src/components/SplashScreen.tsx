import { useEffect, useState } from 'react';

const SPLASH_VISIBLE_MS = 1600;
const SPLASH_FADE_MS = 420;
const appIconUrl = `${import.meta.env.BASE_URL}icons/app-icon.png`;

export function SplashScreen() {
  const [isLeaving, setIsLeaving] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    const leaveTimer = window.setTimeout(() => {
      setIsLeaving(true);
    }, SPLASH_VISIBLE_MS);

    const unmountTimer = window.setTimeout(() => {
      setIsMounted(false);
    }, SPLASH_VISIBLE_MS + SPLASH_FADE_MS);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(unmountTimer);
    };
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <div
      className={`splash-screen fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#F7FBF9] to-[#E7F6EE] px-8 transition-opacity duration-500 ${
        isLeaving ? 'opacity-0' : 'opacity-100'
      }`}
      aria-label="有数记账正在启动"
      role="status"
    >
      <div className="splash-content flex flex-col items-center text-center">
        <img
          src={appIconUrl}
          alt="有数记账"
          className="splash-logo h-[88px] w-[88px] rounded-[1.65rem] object-cover shadow-[0_18px_45px_rgba(76,183,130,0.22)]"
        />
        <h1 className="mt-6 text-2xl font-semibold tracking-normal text-[#17352a]">有数记账</h1>
        <p className="mt-2 text-sm font-medium text-[#7a8d84]">清爽记账，心里有数</p>
        <div className="mt-7 flex items-center gap-2" aria-hidden="true">
          <span className="splash-dot splash-dot-1" />
          <span className="splash-dot splash-dot-2" />
          <span className="splash-dot splash-dot-3" />
        </div>
      </div>
    </div>
  );
}
