import { useState, useEffect } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';
const STORAGE_KEY = 'floor-mobile-gate-dismissed';

export default function MobileGate() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
  );
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) === '1'
  );

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  if (!isMobile || dismissed) return null;

  function handleContinue() {
    sessionStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[100] bg-floor-bg flex items-center justify-center p-6"
    >
      <div className="bg-floor-surface rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center space-y-6 border border-floor-gold/30">
        <div className="text-6xl">🖥️</div>
        <h1 className="text-4xl uppercase tracking-widest text-floor-gold font-bold">
          The Floor
        </h1>
        <p className="text-floor-text text-lg leading-relaxed">
          המשחק מיועד למחשב
          <br />
          וכל המרבה בגודל המסך הרי זה משובח
        </p>
        <button
          onClick={handleContinue}
          className="text-floor-text/40 text-sm underline hover:text-floor-text/70 transition-colors"
        >
          המשך בכל זאת
        </button>
      </div>
    </div>
  );
}
