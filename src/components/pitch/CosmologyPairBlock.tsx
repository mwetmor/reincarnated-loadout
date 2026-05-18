// CosmologyPairBlock — literary pair-rationale prose block.
// Per analytics-IA § 3.3 arc-2 special case: text-base leading-loose max-w-prose mx-auto
// Substrate-accent rule line above the pair label; pair label as eyebrow in mono-label register.

import { type Substrate, SUBSTRATE_RULE_COLOR } from '../../data/pitch/pitchData';

interface CosmologyPairBlockProps {
  pairLabel: string;
  rationale: string;
  accentSubstrate: Substrate;
}

export function CosmologyPairBlock({
  pairLabel,
  rationale,
  accentSubstrate,
}: CosmologyPairBlockProps) {
  const ruleColor = SUBSTRATE_RULE_COLOR[accentSubstrate];

  return (
    <div className="max-w-prose mx-auto">
      {/* Substrate accent rule — 1px, opacity-50 */}
      <div
        className="h-px mb-3 opacity-50"
        style={{ backgroundColor: ruleColor }}
        aria-hidden="true"
      />

      {/* Pair label eyebrow — label register */}
      <p className="font-mono uppercase tracking-wide text-xs text-gray-500 mb-2">
        {pairLabel}
      </p>

      {/* Pair-rationale prose — leading-loose for literary breathing room */}
      <p className="text-base leading-loose text-gray-200">
        {rationale}
      </p>
    </div>
  );
}
