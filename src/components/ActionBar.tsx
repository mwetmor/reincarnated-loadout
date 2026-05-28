import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/Button';

interface ActionBarProps {
  onReset: () => void;
  onSave: () => void;
  buildUrl: string;
  /** Whether the build has any invested points (used to gate reset confirmation). */
  hasInvestment: boolean;
}

// Part 2 — True reset action: two-click inline confirmation (Dispatch B).
// "Reset" → shows "Confirm reset?" for RESET_CONFIRM_MS ms → auto-cancels if not clicked.
// Composition: reset doesn't lose persisted state until next save (per dispatch requirement).
// Mobile-first: no modal; two-click inline avoids accidental reset without modal friction.
const RESET_CONFIRM_MS = 3000;

export function ActionBar({ onReset, onSave, buildUrl, hasInvestment }: ActionBarProps) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  // Reset confirmation state: null = idle; 'pending' = waiting for confirm click
  const [resetState, setResetState] = useState<'idle' | 'pending'>('idle');
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-cancel pending reset after RESET_CONFIRM_MS
  useEffect(() => {
    if (resetState === 'pending') {
      resetTimerRef.current = setTimeout(() => setResetState('idle'), RESET_CONFIRM_MS);
    }
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [resetState]);

  function handleResetClick() {
    if (!hasInvestment) return; // nothing to reset
    if (resetState === 'idle') {
      setResetState('pending');
    } else {
      // confirmed
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      setResetState('idle');
      onReset();
    }
  }

  function handleSave() {
    onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleShare() {
    navigator.clipboard.writeText(buildUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback: open in new tab if clipboard unavailable (e.g. non-secure context)
      window.open(buildUrl, '_blank');
    });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Part 2 — true reset: two-click inline; no modal; mobile-friendly */}
      <Button
        variant="danger"
        size="sm"
        onClick={handleResetClick}
        disabled={!hasInvestment}
        data-testid={resetState === 'pending' ? 'reset-confirm' : 'reset-btn'}
        title={!hasInvestment ? 'No points invested' : resetState === 'pending' ? 'Click again to confirm reset' : 'Reset all skill points'}
      >
        {resetState === 'pending' ? 'Confirm reset?' : 'Reset'}
      </Button>
      <Button variant="ghost" size="sm" onClick={handleSave}>
        {saved ? 'Saved' : 'Save Build'}
      </Button>
      {/* Part 3 — Share Build: enabled (URL params persistence completed in Loadout.tsx) */}
      <Button variant="dim" size="sm" onClick={handleShare} title="Copy shareable build URL">
        {copied ? 'Copied!' : 'Share Build'}
      </Button>
    </div>
  );
}
