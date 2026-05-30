/**
 * Cycle14T4Panel.tsx — Two-layer T4 architecture display
 *
 * Consumes class.primary_t4 + class.t4_candidates + class.chain_composition
 * (MIGRATION.md §v1.69). Renders:
 *   - Chain composition kit-level structural summary (t4_chains / supporting_chains / total)
 *   - Primary T4 fixed universal slot (non-toggleable; universal per doc 47 § 4.6.4)
 *   - Layer 2 T4: toggleable radio-button on Loadout (mode="loadout");
 *                 read-only AS-gauntlet-passed active on Sample (mode="sample")
 *
 * CHAIN_WIDE_OWN kits: t4_candidates=[] — renders empty-state copy anchored to
 * doc 47 § 4.6.4 universal-guarantee. NOT "coming soon" — canonically complete at v1.1.
 *
 * Discipline #39 scaffold surface: Primary T4 DIRECT_DAMAGE_AMPLIFICATION 1.75× is
 * an explicitly flagged scaffold (Cycle 15 retirement commit per MIGRATION.md §v1.69).
 * This is surfaced as a UI note in the Primary T4 slot.
 *
 * Doc 40 § 8.3.1 D66: player selects ONE Layer 2 T4 active at a time (radio-button).
 * Doc 49 § 1.2: Sample tab is immutable — no toggle UI on Sample.
 * Doc 47 § 4.6.4: universal-guarantee proof — every kit has Primary T4 regardless of
 * whether Layer 2 candidates exist.
 */

import { useState } from 'react';
import type { ChainComposition, T4Candidate, PrimaryT4 } from '../../data/types';

// ── Display helpers ───────────────────────────────────────────────────────────

// Format strategy strings for player display: RESOURCE_CONVERSION → Resource Conversion
function fmtStrategy(s: string): string {
  return s
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Scope display label
function scopeLabel(scope: string): string {
  if (scope === 'chain_wide_parallel') return 'Chain-Wide (Parallel)';
  if (scope === 'chain_wide_own') return 'Chain-Wide (Own)';
  if (scope === 'character_wide') return 'Character-Wide';
  if (scope === 'CHAIN_WIDE_OWN') return 'Chain-Wide (Own)';
  return scope.replace(/_/g, ' ');
}

// ── Chain composition summary ─────────────────────────────────────────────────

function ChainCompositionRow({ composition, chainCount }: {
  composition: ChainComposition;
  chainCount: number | null | undefined;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h4 className="text-xs font-mono font-semibold text-gray-400 uppercase tracking-wide">
          Chain Structure
        </h4>
        <span className="text-[10px] font-mono text-gray-600">
          {chainCount ?? composition.total_chains} chains total
        </span>
      </div>
      <div className="flex gap-4">
        <div className="text-center">
          <p className="text-sm font-mono font-bold text-amber-300">
            {composition.t4_chains}
          </p>
          <p className="text-[9px] font-mono text-gray-600 uppercase tracking-wide">T4 chains</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-mono font-bold text-gray-400">
            {composition.supporting_chains}
          </p>
          <p className="text-[9px] font-mono text-gray-600 uppercase tracking-wide">Supporting</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-mono font-bold text-gray-300">
            {composition.total_chains}
          </p>
          <p className="text-[9px] font-mono text-gray-600 uppercase tracking-wide">Total</p>
        </div>
      </div>
    </div>
  );
}

// ── Primary T4 slot (fixed; non-toggleable; universal) ────────────────────────

function PrimaryT4Slot({ primary }: { primary: PrimaryT4 }) {
  return (
    <div className="rounded-lg border border-amber-700/50 bg-amber-950/25 px-3 py-2.5">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold bg-amber-900/40 text-amber-400 border-amber-700/60">
          Primary T4
        </span>
        <span className="text-[10px] font-mono text-amber-600/80 uppercase tracking-wide">
          Universal · Fixed
        </span>
      </div>
      <p className="text-xs font-mono text-gray-200">
        {fmtStrategy(primary.strategy)}{' '}
        <span className="text-amber-300 font-bold">{primary.magnitude}×</span>
        {' '}
        <span className="text-gray-400">{primary.applied_to.replace(/_/g, ' ')}</span>
        {' · '}
        <span className="text-amber-600">{primary.scope}</span>
      </p>
      {/* Discipline #39 scaffold surface: MIGRATION.md §v1.69 */}
      <p className="text-[9px] font-mono text-gray-700 mt-1.5 leading-relaxed">
        Scaffold: natural-mechanics resolution (per-element damage stats) replaces this
        1.75× constant in Cycle 15. Doc 47 § 4.6.4 universal-guarantee.
      </p>
    </div>
  );
}

// ── Layer 2 T4 candidate card ─────────────────────────────────────────────────

function T4CandidateCard({
  candidate,
  isSelected,
  isReadOnly,
  onSelect,
}: {
  candidate: T4Candidate;
  isSelected: boolean;
  isReadOnly: boolean;
  onSelect?: () => void;
}) {
  const borderClass = isSelected
    ? 'border-violet-500/70 bg-violet-950/30'
    : 'border-gray-700/50 bg-gray-900/20';

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 transition-colors ${borderClass} ${
        !isReadOnly ? 'cursor-pointer hover:border-violet-600/50' : ''
      }`}
      onClick={!isReadOnly ? onSelect : undefined}
      role={!isReadOnly ? 'radio' : undefined}
      aria-checked={!isReadOnly ? isSelected : undefined}
    >
      <div className="flex items-start gap-2">
        {/* Radio indicator (Loadout mode only) */}
        {!isReadOnly && (
          <div
            className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex-shrink-0 flex items-center justify-center ${
              isSelected
                ? 'border-violet-400 bg-violet-500'
                : 'border-gray-600 bg-transparent'
            }`}
          >
            {isSelected && (
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            )}
          </div>
        )}
        {/* "Active" badge on Sample mode */}
        {isReadOnly && isSelected && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold bg-violet-900/40 text-violet-400 border-violet-700/60 flex-shrink-0 mt-0.5">
            AS-PASSED
          </span>
        )}

        <div className="flex-1 min-w-0 space-y-1">
          {/* Strategy pair */}
          <p className="text-xs font-mono text-gray-200">
            <span className="text-violet-300 font-semibold">
              {fmtStrategy(candidate.category_a_strategy)}
            </span>
            <span className="text-gray-600 mx-1">+</span>
            <span className="text-gray-300">
              {fmtStrategy(candidate.category_bc_strategy)}
            </span>
          </p>

          {/* Scope + secondary element + magnitude tier row */}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            <span className="text-[10px] font-mono text-gray-500">
              scope: <span className="text-gray-400">{scopeLabel(candidate.t4_scope)}</span>
            </span>
            {candidate.secondary_element && (
              <span className="text-[10px] font-mono text-gray-500">
                element: <span className="text-gray-400">{candidate.secondary_element}</span>
              </span>
            )}
            {candidate.magnitude_tier && (
              <span className="text-[10px] font-mono text-gray-500">
                magnitude: <span className="text-gray-400">{candidate.magnitude_tier}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Layer 2 T4 section — Loadout (toggleable radio-button) ───────────────────

function Layer2T4Loadout({
  candidates,
  selectedId,
  onSelect,
}: {
  candidates: T4Candidate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (candidates.length === 0) {
    // CHAIN_WIDE_OWN empty-state (doc 47 § 4.6.4 canonical — NOT "coming soon")
    return (
      <div className="rounded-lg border border-gray-800/60 bg-gray-900/15 px-3 py-3">
        <p className="text-[10px] font-mono text-gray-500 leading-relaxed">
          No Layer 2 T4 unlocks — this kit's T4 capability is provided by the Primary T4
          universal guarantee alone. Canonically complete at v1.1 per doc 47 § 4.6.4.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2" role="radiogroup" aria-label="Layer 2 T4 selection">
      <p className="text-[10px] font-mono text-gray-600 leading-relaxed">
        Select one Layer 2 T4 — active at a time per D66. Theorycraft mode.
      </p>
      {candidates.map((c) => (
        <T4CandidateCard
          key={c.candidate_id}
          candidate={c}
          isSelected={selectedId === c.candidate_id}
          isReadOnly={false}
          onSelect={() => onSelect(c.candidate_id)}
        />
      ))}
    </div>
  );
}

// ── Layer 2 T4 section — Sample (read-only AS-gauntlet-passed) ───────────────

function Layer2T4Sample({ candidates }: { candidates: T4Candidate[] }) {
  const active = candidates.find((c) => c.is_active) ?? null;

  if (!active) {
    // CHAIN_WIDE_OWN empty-state (doc 47 § 4.6.4 canonical — NOT "coming soon")
    return (
      <div className="rounded-lg border border-gray-800/60 bg-gray-900/15 px-3 py-3">
        <p className="text-[10px] font-mono text-gray-500 leading-relaxed">
          No Layer 2 T4 — gauntlet passed via Primary T4 universal guarantee alone.
          Canonically complete at v1.1 per doc 47 § 4.6.4.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-mono text-gray-600 leading-relaxed">
        AS-gauntlet-passed Layer 2 T4 selection — read-only.
      </p>
      <T4CandidateCard
        candidate={active}
        isSelected={true}
        isReadOnly={true}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface Cycle14T4PanelProps {
  /**
   * "loadout" = sandbox theorycraft — Layer 2 T4 is radio-button toggleable (D66 one-active).
   * "sample" = immutable AS-gauntlet-passed — Layer 2 T4 shows active candidate read-only.
   * Per doc 49 § 1.1 (Loadout) and § 1.2 (Sample).
   */
  mode: 'loadout' | 'sample';
  chainComposition: ChainComposition | null | undefined;
  classChainCount: number | null | undefined;
  primaryT4: PrimaryT4 | null | undefined;
  t4Candidates: T4Candidate[] | null | undefined;
}

export function Cycle14T4Panel({
  mode,
  chainComposition,
  classChainCount,
  primaryT4,
  t4Candidates,
}: Cycle14T4PanelProps) {
  const candidates = t4Candidates ?? [];

  // D66 radio-button state: default to the engine-active candidate (or null for empty kits).
  const defaultActiveId = candidates.find((c) => c.is_active)?.candidate_id ?? null;
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(defaultActiveId);

  // Guard: if neither chain_composition nor primary_t4 are present, this is a pre-v1.69
  // season — render nothing (component is additive-only).
  if (!chainComposition && !primaryT4) return null;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wide">
          T4 Architecture
        </h3>
        <span className="text-[10px] font-mono text-gray-700">
          {mode === 'loadout' ? 'theorycraft' : 'as-gauntlet-passed'}
        </span>
      </div>

      {/* Chain composition structural summary */}
      {chainComposition && (
        <ChainCompositionRow
          composition={chainComposition}
          chainCount={classChainCount}
        />
      )}

      {/* Primary T4 — fixed universal slot (non-toggleable; both modes) */}
      {primaryT4 && (
        <div>
          <p className="text-[10px] font-mono text-gray-600 mb-1.5 uppercase tracking-wide">
            Layer 1 — Primary T4
          </p>
          <PrimaryT4Slot primary={primaryT4} />
        </div>
      )}

      {/* Layer 2 T4 — mode-dependent rendering */}
      <div>
        <p className="text-[10px] font-mono text-gray-600 mb-1.5 uppercase tracking-wide">
          Layer 2 T4{candidates.length > 0 ? ` — ${candidates.length} candidate${candidates.length > 1 ? 's' : ''}` : ''}
        </p>
        {mode === 'loadout' ? (
          <Layer2T4Loadout
            candidates={candidates}
            selectedId={selectedCandidateId}
            onSelect={(id) => setSelectedCandidateId(id)}
          />
        ) : (
          <Layer2T4Sample candidates={candidates} />
        )}
      </div>
    </div>
  );
}
