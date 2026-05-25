// T4ComparisonPanel — M6 (Cycle 11 Wave 3b, MIGRATION.md v1.3)
// TOGGLE panel for T4 alteration post-mortem comparison.
// Per Q2 RATIFIED: toggle display (cleaner on mobile); closed by default.
// Per Q3 RATIFIED: main-weapon-only context; no off-hand surface in this panel.
// Null-safe: toggle hidden when t4_alteration_output is null/absent.
// Tier 2 framing: INTENT METADATA only. Not combat-affecting.

import { useState } from 'react';
import type { T4AlterationOutput, T4StrategyType } from '../../data/types';

// Alternative strategy descriptions for post-mortem comparison.
// Each entry describes what the kit COULD have been under a different alteration.
// Per dispatch: v1 shows current alteration + static alternative descriptions;
// multi-candidate sourcing from class JSON deferred to v1.1.
interface AlternativeStrategy {
  strategy_type: T4StrategyType;
  label: string;
  brief: string;
}

const ALL_STRATEGIES: AlternativeStrategy[] = [
  {
    strategy_type: 'RESOURCE_CONVERSION',
    label: 'Resource Conversion',
    brief: 'Skills draw from HP or a non-standard pool. Higher risk, higher reward.',
  },
  {
    strategy_type: 'TRADE_OFF',
    label: 'Trade-Off Keystone',
    brief: 'Exceptional gain in one axis at the cost of another. Power through sacrifice.',
  },
  {
    strategy_type: 'ELEMENT_CONVERSION',
    label: 'Element Conversion',
    brief: 'All damage converted to a single element. Focuses kit resonance entirely.',
  },
  {
    strategy_type: 'DEFENSIVE_CONVERSION',
    label: 'Defensive Conversion',
    brief: 'Survival layer restructured. How the kit endures reshapes how it fights.',
  },
  {
    strategy_type: 'GEOMETRY_COLLAPSE',
    label: 'Geometry Collapse',
    brief: 'Spatial diversity collapses to concentrated geometry. One pattern, amplified.',
  },
];

function getStrategyLabel(strategyType: T4StrategyType): string {
  const found = ALL_STRATEGIES.find((s) => s.strategy_type === strategyType);
  return found?.label ?? (strategyType as string).replace(/_/g, ' ');
}

// Render a single comparison row — current or alternative.
interface ComparisonRowProps {
  strategyType: T4StrategyType;
  label: string;
  brief: string;
  etaScore?: number | null;
  isCurrent: boolean;
}

function ComparisonRow({ label, brief, etaScore, isCurrent }: ComparisonRowProps) {
  return (
    <div
      className={`rounded border px-3 py-2.5 space-y-1 ${
        isCurrent
          ? 'border-violet-700 bg-violet-950/30'
          : 'border-gray-800 bg-gray-900/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          {isCurrent && (
            <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-violet-900 text-violet-300 border border-violet-700">
              selected
            </span>
          )}
          <span className={`text-xs font-semibold font-mono ${isCurrent ? 'text-violet-200' : 'text-gray-400'}`}>
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isCurrent && etaScore !== null && etaScore !== undefined && (
            <span className="text-[10px] font-mono text-violet-400"
              title="η-score: alteration candidacy score from Algorithm §8">
              η {etaScore.toFixed(2)}
            </span>
          )}
          {!isCurrent && (
            <span className="text-[10px] font-mono text-gray-700"
              title="Multi-candidate η-scores deferred to v1.1">
              v1.1
            </span>
          )}
        </div>
      </div>
      <p className={`text-[11px] leading-relaxed ${isCurrent ? 'text-gray-400' : 'text-gray-600'}`}>
        {brief}
      </p>
    </div>
  );
}

interface T4ComparisonPanelProps {
  alteration: T4AlterationOutput | null | undefined;
  className?: string;
}

export function T4ComparisonPanel({ alteration, className = '' }: T4ComparisonPanelProps) {
  // Toggle state — closed by default per Q2 RATIFIED.
  const [open, setOpen] = useState(false);

  // Null-safe: hide toggle entirely when no alteration.
  if (!alteration) return null;

  const currentLabel = getStrategyLabel(alteration.strategy_type);

  // Alternatives = all strategies EXCEPT the current one.
  const alternatives = ALL_STRATEGIES.filter(
    (s) => s.strategy_type !== alteration.strategy_type
  );

  // Current strategy brief (from ALL_STRATEGIES lookup).
  const currentBrief = ALL_STRATEGIES.find(
    (s) => s.strategy_type === alteration.strategy_type
  )?.brief ?? 'The selected alteration for this kit\'s BC-axis configuration.';

  return (
    <div className={`${className}`}>
      {/* Toggle button — Q2 RATIFIED: toggle display, closed by default */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-[11px] font-mono text-gray-600 hover:text-gray-400 transition-colors py-1 px-0 group"
        aria-expanded={open}
      >
        <span
          className={`transition-transform duration-200 text-gray-700 group-hover:text-gray-500 ${open ? 'rotate-90' : ''}`}
          aria-hidden="true"
        >
          ▶
        </span>
        <span>T4 Post-Mortem — Strategy Comparison</span>
        <span className="text-gray-700 group-hover:text-gray-600">
          ({open ? 'collapse' : 'expand'})
        </span>
      </button>

      {/* Collapsible panel body */}
      {open && (
        <div className="mt-2 rounded-lg border border-gray-800 bg-gray-950/50 overflow-hidden">
          {/* Panel header */}
          <div className="px-3 py-2 border-b border-gray-800 bg-gray-900/60">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wide">
                Algorithm §8 — Candidate Strategy Comparison
              </span>
              <span className="text-[10px] font-mono text-gray-700"
                title="Tier 2 framing: intent metadata — post-mortem evaluation of alteration selection">
                Intent Metadata
              </span>
            </div>
            <p className="text-[10px] text-gray-700 mt-1 font-mono">
              Multi-candidate η-scores deferred to v1.1. Alternatives shown as static descriptions.
            </p>
          </div>

          {/* Comparison rows */}
          <div className="px-3 py-3 space-y-2">
            {/* Current (selected) strategy row */}
            <ComparisonRow
              strategyType={alteration.strategy_type}
              label={currentLabel}
              brief={currentBrief}
              etaScore={alteration.eta_score}
              isCurrent
            />

            {/* Alternative strategy rows */}
            {alternatives.map((alt) => (
              <ComparisonRow
                key={alt.strategy_type as string}
                strategyType={alt.strategy_type}
                label={alt.label}
                brief={alt.brief}
                isCurrent={false}
              />
            ))}
          </div>

          {/* Footer note */}
          <div className="px-3 py-2 border-t border-gray-800 bg-gray-900/60">
            <p className="text-[10px] font-mono text-gray-700">
              v1.1 will surface actual candidate scores + per-candidate thematic rationale when
              rocket §8 multi-candidate output ships.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
