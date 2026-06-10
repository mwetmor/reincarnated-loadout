/**
 * CascadePanel.tsx — Phase 5 spirit-guide-driven elicitation cascade UI.
 *
 * Drax Phase 5, 2026-06-10. Per dispatch:
 *   2026-06-10-drax-forge-phase-5-amendment-cycling-text-list-ui.md
 *
 * Authority: Earth-Avatar Creation Moment Architecture § 12 (canonical lock 2026-06-10).
 *   § 12.2 — iPad screen carries text labels; cosmograph carries sky runes only
 *   § 12.3 — 7 Tier 1 anchors (CANONICAL LIST)
 *   § 12.4 — Cycling-preview UX vocabulary (cycling != committing)
 *   § 12.5 — Nested cascade (same mechanic recursing at every layer)
 *   § 12.7 — Substrate-truth-wins discipline
 *   § 12.9 — Spirit guide voice patterns
 *
 * Architecture:
 *   Text-list cycling UI. Player cycles options; cosmograph sky region responds (soft preview).
 *   Commit via tap. Cascade recurses through Tier 1 → Tier 2 → Tier 3 → final emergence.
 *   Spirit guide narrates on commit only (not during cycling per § 12.4).
 *
 * Discipline #40 scaffold flags:
 *   Tier 2/3 question strings are scaffold draft vocabulary per § 12.13 open refinement.
 *
 * D7: All spirit guide voice patterns are fully templated. No raw LLM dialogue.
 * D8: Mobile-friendly; touch-cycling via swipe and arrow taps; min 44px touch targets.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  TIER1_ANCHORS,
  TIER2_LAYERS,
  TIER3_LAYERS,
  SPIRIT_GUIDE_VOICE,
  SCAFFOLD_KIT_EMERGENCE,
} from '../../data/cascadeData';
import type { Tier1Anchor, CascadeOption, CascadeLayer } from '../../data/cascadeData';

// ─── Cycling animation timing (per Gate-1 amendment: implement as const, not hardcoded literal)
// Gate-1 Discipline #42: implement as named constant so Phase 5.5 tuning lands cleanly.
// ~0.3-0.5 sec intent per § 12.4 CANONICAL property table.
export const CYCLING_TRANSITION_DURATION_MS = 400;

// ─── CSS variable surface for animation timing
const CYCLING_TRANSITION_STYLE = {
  '--cycling-preview-transition-duration': `${CYCLING_TRANSITION_DURATION_MS}ms`,
} as React.CSSProperties;

// ─── Cascade state types ──────────────────────────────────────────────────────

type CascadePhase =
  | 'tier1'           // Opening question; player cycles 7 anchors
  | 'tier2'           // Tier 2 follow-up; player cycles sub-options
  | 'tier3'           // Tier 3 follow-up; player cycles further sub-options
  | 'emergence'       // Final form emergence narration
  | 'refine';         // Player chose to refine; step back in cascade

interface CommittedStep {
  depth: number;
  anchor_id: string;
  label: string;
  question: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CascadePanelProps {
  /** Called when player highlights an option (soft preview; cycling not committing) */
  onHighlight: (anchorId: string | null) => void;
  /** Called when player commits to a Tier 1 anchor */
  onTier1Commit: (anchorId: string) => void;
  /** Called when cascade completes (final emergence) */
  onEmergence: (kitId: string) => void;
  /** Called when player resets cascade */
  onReset: () => void;
}

// ─── Helper: get options for current cascade phase ───────────────────────────

function getTier2Layer(tier1AnchorId: string): CascadeLayer | null {
  return TIER2_LAYERS[tier1AnchorId] ?? null;
}

function getTier3Layer(tier2OptionId: string): CascadeLayer | null {
  return TIER3_LAYERS[tier2OptionId] ?? null;
}

// ─── NarrationBubble — Spirit guide voice display ────────────────────────────

function NarrationBubble({ text, visible }: { text: string; visible: boolean }) {
  if (!visible || !text) return null;
  return (
    <div
      className="px-3 py-2 mb-3 rounded border border-violet-700/40 bg-violet-950/60 text-[11px] text-violet-200/90 font-mono leading-relaxed italic"
      style={CYCLING_TRANSITION_STYLE}
    >
      <span className="text-violet-400/70 not-italic mr-1.5 select-none">&#9670;</span>
      {text}
    </div>
  );
}

// ─── OptionsList — The cycling text-list ─────────────────────────────────────

interface OptionsListProps {
  options: CascadeOption[] | Tier1Anchor[];
  highlightedIndex: number;
  onHighlight: (index: number) => void;
  onCommit: (index: number) => void;
  committed: boolean;
}

function OptionsList({
  options,
  highlightedIndex,
  onHighlight,
  onCommit,
  committed,
}: OptionsListProps) {
  const listRef = useRef<HTMLUListElement>(null);

  // Scroll highlighted option into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const items = list.querySelectorAll<HTMLLIElement>('[data-option]');
    const target = items[highlightedIndex];
    if (target) {
      target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightedIndex]);

  return (
    <ul
      ref={listRef}
      className="flex flex-col gap-1 overflow-y-auto max-h-[45vh] sm:max-h-none pr-0.5"
      role="listbox"
      aria-label="Cycle options"
    >
      {options.map((option, index) => {
        const isHighlighted = index === highlightedIndex;
        const label = 'label' in option ? option.label : (option as Tier1Anchor).label;
        const description = 'description' in option ? option.description : '';
        return (
          <li
            key={option.id}
            data-option
            role="option"
            aria-selected={isHighlighted}
            onPointerEnter={() => !committed && onHighlight(index)}
            onClick={() => !committed && onCommit(index)}
            className={
              'relative flex flex-col gap-0.5 rounded px-3 py-2.5 cursor-pointer select-none ' +
              // Min 44px touch target per D8
              'min-h-[44px] sm:min-h-[36px] ' +
              'transition-all ' +
              (isHighlighted
                ? 'bg-violet-800/50 border border-violet-600/60 text-violet-100'
                : 'bg-gray-800/40 border border-gray-700/30 text-gray-400 hover:bg-gray-800/60 hover:text-gray-300') +
              (committed ? ' pointer-events-none opacity-50' : '')
            }
            style={{
              transitionDuration: `${CYCLING_TRANSITION_DURATION_MS}ms`,
            }}
          >
            {/* Highlight indicator */}
            {isHighlighted && (
              <span
                className="absolute left-1.5 top-1/2 -translate-y-1/2 text-violet-400 text-[8px] select-none"
                aria-hidden="true"
              >
                &#9654;
              </span>
            )}
            <span className={`text-[12px] font-semibold leading-snug ${isHighlighted ? 'text-violet-100' : ''} ml-2`}>
              {label}
            </span>
            {description && isHighlighted && (
              <span className="text-[10px] text-violet-300/70 font-mono leading-tight ml-2">
                {description}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ─── ArrowNav — Up/down arrow tap controls ────────────────────────────────────

function ArrowNav({
  onUp,
  onDown,
  disabled,
}: {
  onUp: () => void;
  onDown: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <button
        onClick={onUp}
        disabled={disabled}
        className="flex-1 flex items-center justify-center rounded border border-gray-700/50 bg-gray-800/40 hover:bg-gray-700/60 px-3 py-2 text-gray-400 hover:text-gray-200 text-[11px] font-mono transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-h-[36px]"
        aria-label="Previous option"
        title="Previous option"
      >
        &#8679; prev
      </button>
      <button
        onClick={onDown}
        disabled={disabled}
        className="flex-1 flex items-center justify-center rounded border border-gray-700/50 bg-gray-800/40 hover:bg-gray-700/60 px-3 py-2 text-gray-400 hover:text-gray-200 text-[11px] font-mono transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-h-[36px]"
        aria-label="Next option"
        title="Next option"
      >
        &#8681; next
      </button>
    </div>
  );
}

// ─── CommitBar — Commit + Step back controls ──────────────────────────────────

function CommitBar({
  onCommit,
  onStepBack,
  committed,
  canStepBack,
  commitLabel,
}: {
  onCommit: () => void;
  onStepBack: () => void;
  committed: boolean;
  canStepBack: boolean;
  commitLabel: string;
}) {
  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-800/60">
      {canStepBack && (
        <button
          onClick={onStepBack}
          className="px-2 py-1.5 text-[10px] font-mono text-gray-600 hover:text-gray-400 transition-colors rounded hover:bg-gray-800/40 min-h-[36px]"
        >
          &#8592; back
        </button>
      )}
      <button
        onClick={onCommit}
        disabled={committed}
        className={
          'flex-1 rounded px-3 py-2 text-[11px] font-mono font-semibold transition-colors min-h-[44px] sm:min-h-[36px] ' +
          (committed
            ? 'bg-violet-900/40 text-violet-400/70 border border-violet-800/40 cursor-default'
            : 'bg-violet-700/70 text-violet-100 border border-violet-600/60 hover:bg-violet-600/80')
        }
      >
        {committed ? 'committed' : commitLabel}
      </button>
    </div>
  );
}

// ─── EmergenceView — Final form emergence display ─────────────────────────────

function EmergenceView({
  commits: committedSteps,
  tier1AnchorId,
  onReset,
  onRefine,
}: {
  commits: CommittedStep[];
  tier1AnchorId: string;
  onReset: () => void;
  onRefine: () => void;
}) {
  const emergenceOptions = SCAFFOLD_KIT_EMERGENCE[tier1AnchorId] ?? [];
  const topKit = emergenceOptions[0] ?? {
    kit_name: 'Unknown Form',
    precedent_description: 'Unknown precedent',
    output_primitives: 'Unknown primitives',
  };

  const precedentStr = committedSteps.map(s => s.label).join(' → ');
  const commitsStr = committedSteps.map(s => s.label).join(', ');

  const emergenceText = SPIRIT_GUIDE_VOICE.final_emergence(
    topKit.kit_name,
    topKit.precedent_description,
    commitsStr,
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Emergence narration (synthesized for visualization) */}
      <div className="px-3 py-3 rounded border border-violet-500/50 bg-violet-950/70">
        <div className="text-[8px] text-violet-500/60 font-mono mb-1.5 uppercase tracking-wider">
          Spirit guide
        </div>
        <p className="text-[11px] text-violet-200/90 font-mono leading-relaxed italic">
          <span className="text-violet-400/70 not-italic mr-1.5">&#9670;</span>
          {emergenceText}
        </p>
      </div>

      {/* Kit identity */}
      <div className="px-3 py-2.5 rounded border border-gray-700/60 bg-gray-900/60">
        <div className="text-[8px] text-gray-600 font-mono mb-1 uppercase tracking-wider">
          Nearest form (synthesized — not engine output)
        </div>
        <div className="text-[13px] font-semibold text-gray-200 leading-snug mb-1">
          {topKit.kit_name}
        </div>
        <div className="text-[9px] text-gray-500 font-mono leading-relaxed">
          {topKit.output_primitives}
        </div>
      </div>

      {/* Path taken */}
      <div className="px-3 py-2 rounded border border-gray-800/50 bg-gray-950/40">
        <div className="text-[8px] text-gray-700 font-mono mb-1 uppercase tracking-wider">
          Your path
        </div>
        <div className="text-[10px] text-gray-500 font-mono leading-relaxed">
          {precedentStr}
        </div>
      </div>

      {/* Refine or restart */}
      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={onRefine}
          className="flex-1 rounded px-3 py-2.5 text-[11px] font-mono text-gray-400 border border-gray-700/60 bg-gray-800/40 hover:bg-gray-700/60 hover:text-gray-200 transition-colors min-h-[44px] sm:min-h-[36px]"
        >
          Refine &#8592;
        </button>
        <button
          onClick={onReset}
          className="flex-1 rounded px-3 py-2.5 text-[11px] font-mono text-gray-500 border border-gray-700/40 bg-gray-900/40 hover:bg-gray-800/60 hover:text-gray-300 transition-colors min-h-[44px] sm:min-h-[36px]"
        >
          Start over
        </button>
      </div>
    </div>
  );
}

// ─── Main CascadePanel Component ──────────────────────────────────────────────

export function CascadePanel({
  onHighlight,
  onTier1Commit,
  onEmergence,
  onReset,
}: CascadePanelProps) {
  const [phase, setPhase] = useState<CascadePhase>('tier1');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [committed, setCommitted] = useState(false);

  // Committed cascade steps for path display and emergence
  const [committedSteps, setCommittedSteps] = useState<CommittedStep[]>([]);

  // Active Tier 1 anchor commitment
  const [tier1AnchorId, setTier1AnchorId] = useState<string | null>(null);
  // Active Tier 2 option commitment
  const [tier2OptionId, setTier2OptionId] = useState<string | null>(null);

  // Spirit guide narration text (displayed after commit, cleared on cycle)
  const [narrationText, setNarrationText] = useState<string>('');
  const [showNarration, setShowNarration] = useState(false);

  // Keyboard navigation
  useEffect(() => {
    const options = getOptionsForPhase();
    const onKey = (e: KeyboardEvent) => {
      if (committed) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = (highlightedIndex - 1 + options.length) % options.length;
        setHighlightedIndex(prev);
        emitHighlight(options, prev);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const next = (highlightedIndex + 1) % options.length;
        setHighlightedIndex(next);
        emitHighlight(options, next);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        commitHighlighted();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Touch swipe support
  const touchStartY = useRef<number>(0);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (committed) return;
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(delta) < 20) return; // Threshold
    const options = getOptionsForPhase();
    if (delta > 0) {
      // Swipe up → next
      const next = (highlightedIndex + 1) % options.length;
      setHighlightedIndex(next);
      emitHighlight(options, next);
    } else {
      // Swipe down → prev
      const prev = (highlightedIndex - 1 + options.length) % options.length;
      setHighlightedIndex(prev);
      emitHighlight(options, prev);
    }
  }, [committed, highlightedIndex, phase, tier1AnchorId, tier2OptionId]);

  // Emit highlight to parent (cosmograph response)
  function emitHighlight(options: CascadeOption[] | Tier1Anchor[], index: number) {
    const option = options[index];
    if (phase === 'tier1') {
      onHighlight(option.id);
    } else {
      // For Tier 2/3, emit the parent Tier 1 anchor (cosmograph stays focused on that region)
      onHighlight(tier1AnchorId);
    }
    // Clear narration during cycling (per § 12.4: guide silent during cycling)
    setShowNarration(false);
  }

  function getOptionsForPhase(): CascadeOption[] | Tier1Anchor[] {
    switch (phase) {
      case 'tier1':
        return TIER1_ANCHORS;
      case 'tier2': {
        const t2 = tier1AnchorId ? getTier2Layer(tier1AnchorId) : null;
        return t2?.options ?? [];
      }
      case 'tier3': {
        const t3 = tier2OptionId ? getTier3Layer(tier2OptionId) : null;
        return t3?.options ?? [];
      }
      default:
        return [];
    }
  }

  function getQuestionForPhase(): string {
    switch (phase) {
      case 'tier1':
        return SPIRIT_GUIDE_VOICE.tier1_opening;
      case 'tier2': {
        const t2 = tier1AnchorId ? getTier2Layer(tier1AnchorId) : null;
        return t2?.question ?? '';
      }
      case 'tier3': {
        const t3 = tier2OptionId ? getTier3Layer(tier2OptionId) : null;
        return t3?.question ?? '';
      }
      case 'emergence':
        return '';
      default:
        return '';
    }
  }

  const handleHighlight = useCallback((index: number) => {
    setHighlightedIndex(index);
    const options = getOptionsForPhase();
    emitHighlight(options, index);
  }, [phase, tier1AnchorId, tier2OptionId, committed]);

  function commitHighlighted() {
    if (committed) return;
    const options = getOptionsForPhase();
    const option = options[highlightedIndex];
    if (!option) return;

    setCommitted(true);

    if (phase === 'tier1') {
      const anchor = option as Tier1Anchor;
      setTier1AnchorId(anchor.id);
      onTier1Commit(anchor.id);

      const t2 = getTier2Layer(anchor.id);
      const newStep: CommittedStep = {
        depth: 0,
        anchor_id: anchor.id,
        label: anchor.label,
        question: SPIRIT_GUIDE_VOICE.tier1_opening,
      };
      setCommittedSteps([newStep]);

      const tier2Question = t2?.question ?? 'What calls to you next?';
      const narration = SPIRIT_GUIDE_VOICE.tier1_commit(anchor.label, tier2Question);
      setNarrationText(narration);
      setShowNarration(true);

      // Advance to Tier 2 after a beat
      setTimeout(() => {
        setPhase('tier2');
        setHighlightedIndex(0);
        setCommitted(false);
        if (t2?.options?.length) {
          onHighlight(anchor.id); // Keep sky focused on committed anchor
        }
      }, CYCLING_TRANSITION_DURATION_MS * 2);

    } else if (phase === 'tier2') {
      const opt = option as CascadeOption;
      setTier2OptionId(opt.id);

      const t3 = getTier3Layer(opt.id);
      const newStep: CommittedStep = {
        depth: 1,
        anchor_id: opt.id,
        label: opt.label,
        question: getQuestionForPhase(),
      };
      setCommittedSteps(prev => [...prev, newStep]);

      const tier3Question = t3?.question ?? '';
      if (tier3Question && t3) {
        const narration = SPIRIT_GUIDE_VOICE.tier2_commit(opt.label, tier3Question);
        setNarrationText(narration);
        setShowNarration(true);

        setTimeout(() => {
          setPhase('tier3');
          setHighlightedIndex(0);
          setCommitted(false);
        }, CYCLING_TRANSITION_DURATION_MS * 2);
      } else {
        // No Tier 3 for this path — proceed to emergence
        const narration = SPIRIT_GUIDE_VOICE.tier2_commit(opt.label, 'Your form begins to emerge...');
        setNarrationText(narration);
        setShowNarration(true);

        const emergenceOptions = SCAFFOLD_KIT_EMERGENCE[tier1AnchorId ?? ''] ?? [];
        const kit = emergenceOptions[0];
        if (kit) onEmergence(kit.kit_id);

        setTimeout(() => {
          setPhase('emergence');
          setCommitted(false);
        }, CYCLING_TRANSITION_DURATION_MS * 2);
      }

    } else if (phase === 'tier3') {
      const opt = option as CascadeOption;
      const newStep: CommittedStep = {
        depth: 2,
        anchor_id: opt.id,
        label: opt.label,
        question: getQuestionForPhase(),
      };
      setCommittedSteps(prev => [...prev, newStep]);

      const narration = SPIRIT_GUIDE_VOICE.tier2_commit(opt.label, 'Your form takes shape...');
      setNarrationText(narration);
      setShowNarration(true);

      const emergenceOptions = SCAFFOLD_KIT_EMERGENCE[tier1AnchorId ?? ''] ?? [];
      const kit = emergenceOptions[0];
      if (kit) onEmergence(kit.kit_id);

      setTimeout(() => {
        setPhase('emergence');
        setCommitted(false);
      }, CYCLING_TRANSITION_DURATION_MS * 2);
    }
  }

  const handleStepBack = useCallback(() => {
    if (phase === 'tier2') {
      setPhase('tier1');
      setTier1AnchorId(null);
      setCommittedSteps([]);
      setHighlightedIndex(0);
      setShowNarration(false);
      onHighlight(null);
    } else if (phase === 'tier3') {
      setPhase('tier2');
      setTier2OptionId(null);
      setCommittedSteps(prev => prev.slice(0, -1));
      setHighlightedIndex(0);
      setShowNarration(false);
    }
  }, [phase, onHighlight]);

  const handleRefine = useCallback(() => {
    // Step back to Tier 2 if we have a Tier 1 commitment
    if (tier1AnchorId) {
      const t2 = getTier2Layer(tier1AnchorId);
      if (t2) {
        setPhase('tier2');
        setTier2OptionId(null);
        setCommittedSteps(prev => prev.slice(0, 1));
        setHighlightedIndex(0);
        setShowNarration(false);
        setNarrationText(SPIRIT_GUIDE_VOICE.refine_prompt);
        setShowNarration(true);
      } else {
        handleReset();
      }
    } else {
      handleReset();
    }
  }, [tier1AnchorId]);

  const handleReset = useCallback(() => {
    setPhase('tier1');
    setHighlightedIndex(0);
    setCommitted(false);
    setCommittedSteps([]);
    setTier1AnchorId(null);
    setTier2OptionId(null);
    setNarrationText('');
    setShowNarration(false);
    onHighlight(null);
    onReset();
  }, [onHighlight, onReset]);

  const options = getOptionsForPhase();
  const question = getQuestionForPhase();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className={
        // Mobile (< 640px): bottom sheet — full width, anchored to bottom
        // iPad+ (≥ 640px): right-side panel — fixed width, top-anchored
        'absolute z-20 flex flex-col ' +
        'bottom-0 left-0 right-0 max-h-[65%] ' +
        'sm:bottom-auto sm:top-3 sm:left-auto sm:right-3 sm:max-h-[calc(100%-24px)] sm:w-[300px] ' +
        'overflow-hidden rounded-t sm:rounded border border-gray-700/70 ' +
        'bg-gray-950/96 backdrop-blur-sm shadow-xl shadow-black/60'
      }
      style={{ pointerEvents: 'auto', ...CYCLING_TRANSITION_STYLE }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Panel header */}
      <div className="flex items-start justify-between px-3 pt-3 pb-2 border-b border-gray-800/60 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <div className="text-[8px] text-violet-500/70 font-mono uppercase tracking-wider mb-0.5">
            Spirit guide
            {committedSteps.length > 0 && (
              <span className="ml-2 text-gray-700">
                depth {committedSteps.length}
              </span>
            )}
          </div>
          {phase !== 'emergence' && question && (
            <p className="text-[12px] text-violet-200/90 font-semibold leading-snug">
              {question}
            </p>
          )}
          {phase === 'emergence' && (
            <p className="text-[12px] text-violet-200/90 font-semibold leading-snug">
              Your form emerges
            </p>
          )}
        </div>
        <button
          onClick={handleReset}
          title="Reset cascade"
          className="text-gray-600 hover:text-gray-400 text-[10px] font-mono mt-0.5 px-1 ml-2 flex-shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Committed path breadcrumb */}
      {committedSteps.length > 0 && (
        <div className="px-3 pt-2 pb-1 flex-shrink-0">
          <div className="flex flex-wrap gap-1">
            {committedSteps.map((step) => (
              <span
                key={step.anchor_id + step.depth}
                className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-violet-900/40 text-violet-300/70 border border-violet-800/30"
              >
                {step.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main content — scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 pt-2 pb-2">
        {/* Spirit guide narration (shown after commit; silent during cycling per § 12.4) */}
        <NarrationBubble text={narrationText} visible={showNarration} />

        {/* Emergence view */}
        {phase === 'emergence' ? (
          <EmergenceView
            commits={committedSteps}
            tier1AnchorId={tier1AnchorId ?? ''}
            onReset={handleReset}
            onRefine={handleRefine}
          />
        ) : options.length > 0 ? (
          <>
            {/* Arrow navigation (touch-friendly cycling per § 12.4) */}
            <ArrowNav
              onUp={() => {
                const prev = (highlightedIndex - 1 + options.length) % options.length;
                handleHighlight(prev);
              }}
              onDown={() => {
                const next = (highlightedIndex + 1) % options.length;
                handleHighlight(next);
              }}
              disabled={committed}
            />

            {/* Text-list cycling options */}
            <OptionsList
              options={options}
              highlightedIndex={highlightedIndex}
              onHighlight={handleHighlight}
              onCommit={(index) => {
                setHighlightedIndex(index);
                commitHighlighted();
              }}
              committed={committed}
            />

            {/* Commit bar */}
            <CommitBar
              onCommit={commitHighlighted}
              onStepBack={handleStepBack}
              committed={committed}
              canStepBack={phase === 'tier2' || phase === 'tier3'}
              commitLabel={phase === 'tier1' ? 'Begin this path' : 'Commit'}
            />
          </>
        ) : (
          <div className="text-[10px] text-gray-600 font-mono py-4 text-center">
            No options available for this path.
          </div>
        )}
      </div>

      {/* Footer: cycling instruction hint */}
      {phase !== 'emergence' && !committed && (
        <div className="px-3 pb-2 pt-1 border-t border-gray-900/60 flex-shrink-0">
          <p className="text-[8px] text-gray-700 font-mono leading-relaxed">
            Cycle to preview &middot; tap or commit to advance &middot; sky responds to your attention
          </p>
        </div>
      )}
    </div>
  );
}
