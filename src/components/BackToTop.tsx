import { useEffect, useState } from 'react';

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsVisible(window.scrollY > 300);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-[#bfe8d4] bg-white text-2xl font-semibold text-[#2f8f66] shadow-[0_16px_34px_rgba(76,183,130,0.24)] transition ${
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-3 opacity-0'
      } bottom-[calc(6.25rem+env(safe-area-inset-bottom))] hover:bg-[#EAF7F1] active:scale-95`}
      aria-label="回到顶部"
    >
      ↑
    </button>
  );
}
