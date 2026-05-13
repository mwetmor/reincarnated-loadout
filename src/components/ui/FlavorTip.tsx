import { useState, useEffect, useRef, useCallback } from 'react';

interface FlavorTipProps {
  mode: 'inline' | 'modal';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function FlavorTip({ mode, title, children, className = '' }: FlavorTipProps) {
  if (mode === 'inline') {
    return (
      <em className={`not-italic text-gray-500 text-sm leading-snug ${className}`}>
        {children}
      </em>
    );
  }
  return <FlavorModal title={title} className={className}>{children}</FlavorModal>;
}

function FlavorModal({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const openModal = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    timerRef.current = setTimeout(openModal, 400);
  }, [openModal]);

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, closeModal]);

  // Click / touch outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        modalRef.current &&
        !modalRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        closeModal();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open, closeModal]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={openModal}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label={`Info: ${title ?? 'details'}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`
          inline-flex items-center justify-center
          w-4 h-4 rounded-full border border-gray-600
          text-gray-500 text-[9px] font-bold leading-none
          hover:border-violet-500 hover:text-violet-400
          transition-colors touch-manipulation cursor-pointer
          flex-shrink-0
          ${className}
        `}
      >
        i
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? 'Flavor information'}
            onMouseEnter={() => { if (timerRef.current) clearTimeout(timerRef.current); }}
            className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-[480px] w-full"
            style={{ padding: '24px' }}
          >
            <button
              onClick={closeModal}
              aria-label="Close"
              className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-300 rounded-lg touch-manipulation transition-colors"
            >
              ✕
            </button>

            {title && (
              <h4 className="text-base font-semibold text-gray-200 mb-3 pr-10 leading-snug">
                {title}
              </h4>
            )}

            <p className="text-gray-300 leading-relaxed italic" style={{ fontSize: '18px' }}>
              {children}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
