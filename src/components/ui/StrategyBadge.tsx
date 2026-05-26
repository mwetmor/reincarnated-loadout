// StrategyBadge — Tier 3 optional (engine generation run, 2026-05-25)
// Compact badge surfacing t4_alteration_output.strategy_type.
// At-a-glance "which keystone fired" view — supports T4 post-mortem strategy distribution review.
// Display: both Player-mode AND Design-mode (player-relevant intent affordance per Tier 2 framing).
// Null-safe: renders nothing when t4_alteration_output is null/absent.
//
// Source: t4_alteration_output.strategy_type (T4StrategyType union per types.ts).
// Strategies: RESOURCE_CONVERSION / TRADE_OFF / ELEMENT_CONVERSION /
//             DEFENSIVE_CONVERSION / GEOMETRY_COLLAPSE / DEFENSIVE_TRADEOFF

import type { T4StrategyType } from '../../data/types';

// Short compact labels for badge display (brief enough to fit in a chip).
const STRATEGY_BADGE_LABELS: Record<string, string> = {
  RESOURCE_CONVERSION:  'Resource Convert',
  TRADE_OFF:            'Trade-Off',
  ELEMENT_CONVERSION:   'Element Convert',
  DEFENSIVE_CONVERSION: 'Defensive Convert',
  GEOMETRY_COLLAPSE:    'Geo Collapse',
  DEFENSIVE_TRADEOFF:   'Def Trade-Off',
};

// Color treatment per strategy — violet palette consistent with T4AlterationPanel T4 badge.
const STRATEGY_BADGE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  RESOURCE_CONVERSION:  { bg: 'bg-red-950',     text: 'text-red-300',    border: 'border-red-800'    },
  TRADE_OFF:            { bg: 'bg-orange-950',   text: 'text-orange-300', border: 'border-orange-800' },
  ELEMENT_CONVERSION:   { bg: 'bg-blue-950',     text: 'text-blue-300',   border: 'border-blue-800'   },
  DEFENSIVE_CONVERSION: { bg: 'bg-green-950',    text: 'text-green-300',  border: 'border-green-800'  },
  GEOMETRY_COLLAPSE:    { bg: 'bg-violet-950',   text: 'text-violet-300', border: 'border-violet-800' },
  DEFENSIVE_TRADEOFF:   { bg: 'bg-amber-950',    text: 'text-amber-300',  border: 'border-amber-800'  },
};

const DEFAULT_STYLE = { bg: 'bg-gray-900', text: 'text-gray-400', border: 'border-gray-700' };

function getBadgeLabel(strategyType: T4StrategyType): string {
  return STRATEGY_BADGE_LABELS[strategyType as string]
    ?? (strategyType as string).replace(/_/g, ' ');
}

interface StrategyBadgeProps {
  strategyType: T4StrategyType | null | undefined;
  className?: string;
}

export function StrategyBadge({ strategyType, className = '' }: StrategyBadgeProps) {
  if (!strategyType) return null;

  const label = getBadgeLabel(strategyType);
  const style = STRATEGY_BADGE_STYLES[strategyType as string] ?? DEFAULT_STYLE;

  return (
    <span
      title={`T4 keystone strategy: ${strategyType}`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      <span className="opacity-60 text-[9px]">§8</span>
      <span>{label}</span>
    </span>
  );
}
