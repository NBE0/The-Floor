import React, { useEffect } from 'react';

export default function SettingsDrawer({ isOpen, onClose, children }) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[80] bg-black/50 transition-opacity duration-200
                    ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-[90] w-80 max-w-[90vw]
                    bg-floor-surface shadow-2xl border-l border-white/10
                    flex flex-col transition-transform duration-200
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-floor-text/80 text-sm uppercase tracking-widest font-semibold">
            Settings
          </h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="text-floor-text/40 hover:text-floor-text transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {children}
        </div>
      </aside>
    </>
  );
}
