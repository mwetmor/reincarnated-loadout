/**
 * SidePanel.tsx
 * Lasso-resolved kit display for /forge cosmograph.
 *
 * Per dispatch § 5.3 + § 5.4 + § 5.5:
 * - PROVISIONAL badge prominently displayed (Option B amendment compliance)
 * - Per-kit row: bc_cell_NNNN_simulated placeholder ID + composite score + literal PROVISIONAL narrative
 * - Flag-family chips grouped per § 5.4 (17 family enums → 11 display groups)
 * - Heuristic-derived disclosure footnote per gandalf authoring
 * - No q-scores / no pareto_rank / no gauntlet_pass_rate anywhere (D7 line + Option B amendment)
 * - No LLM-named identities — placeholders only
 *
 * Also handles edge cases:
 * - Empty lasso (0 primitives enclosed)
 * - Ambiguous match (top-2 scores within 5%)
 * - No match ≥ 0.3
 */

import type { LassoResolutionResult } from '../../utils/lassoResolution';
import type { CosmographData } from '../../data/cosmographData';
import type { FlagFamilyGroup } from '../../data/cosmographTypes';
import { groupFlags, getFamilyTooltip, formatFlagLabel } from '../../utils/flagFamilies';

interface SidePanelProps {
  result: LassoResolutionResult | null;
  data: CosmographData;
  onClear: () => void;
}

// ─── Chip style → Tailwind class mapping ─────────────────────────────────────
// Static class strings only — avoids Tailwind purge of dynamic class names.

const CHIP_STYLE_CLASSES: Record<FlagFamilyGroup['chipStyle'], string> = {
  earth:      'bg-amber-900/40 border border-amber-700/50 text-amber-300',
  capstone:   'bg-yellow-900/40 border border-yellow-500/60 text-yellow-300',
  structural: 'bg-blue-900/40 border border-blue-600/50 text-blue-300',
  faded:      'bg-gray-800/40 border border-gray-600/30 text-gray-500',
  mechanical: 'bg-slate-800/40 border border-slate-600/40 text-slate-400',
  tactical:   'bg-cyan-900/40 border border-cyan-700/50 text-cyan-300',
  default:    'bg-gray-800/30 border border-gray-700/30 text-gray-400',
};

// ─── Flag Chip ────────────────────────────────────────────────────────────────

function FlagChip({
  flag,
  chipStyle,
  familyTooltip,
}: {
  flag: string;
  chipStyle: FlagFamilyGroup['chipStyle'];
  familyTooltip: string;
}) {
  const label = formatFlagLabel(flag);
  const cls = CHIP_STYLE_CLASSES[chipStyle];

  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono leading-tight cursor-default ${cls}`}
      title={`${flag}\n\n${familyTooltip}`}
    >
      {label}
    </span>
  );
}

// ─── Flag Family Group display ────────────────────────────────────────────────

function FlagGroupBlock({ group }: { group: FlagFamilyGroup }) {
  const tooltip = getFamilyTooltip(group.groupLabel);

  return (
    <div className="mb-2">
      <div
        className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mb-1 cursor-default"
        title={tooltip}
      >
        {group.groupLabel}
      </div>
      <div className="flex flex-wrap gap-1">
        {group.flags.map(flag => (
          <FlagChip
            key={flag}
            flag={flag}
            chipStyle={group.chipStyle}
            familyTooltip={tooltip}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Kit Match Card ───────────────────────────────────────────────────────────

function KitMatchCard({
  match,
  data,
  rank,
  isAmbiguous,
  isLowConfidence = false,
}: {
  match: import('../../data/cosmographTypes').LassoMatch;
  data: CosmographData;
  rank: number;
  isAmbiguous: boolean;
  isLowConfidence?: boolean;
}) {
  const { kit, coverage_fraction, density_score, composite_score } = match;

  // Parse primitive set for kit
  const primitiveIds = JSON.parse(kit.primitive_set_json) as string[];

  // Top-3 load-bearing primitives by bdi_weight
  const loadBearingPrimitives = primitiveIds
    .map(id => data.primitiveById.get(id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined)
    .sort((a, b) => b.bdi_weight - a.bdi_weight)
    .slice(0, 3);

  // Flag family chips
  const flags = data.flagsByKitId.get(kit.kit_id) ?? [];
  const flagGroups = groupFlags(flags);

  // Find faction membership
  const factionEntry = data.factionOverlays.factions.find(f =>
    f.member_kit_ids.includes(kit.kit_id)
  );

  return (
    <div className={`border rounded mb-3 overflow-hidden ${isLowConfidence ? 'border-gray-700/20 opacity-70' : 'border-gray-700/40'}`}>
      {/* Card header */}
      <div className="bg-gray-900/60 px-3 py-2 border-b border-gray-700/40">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* PROVISIONAL badge */}
            <span className="inline-block text-[8px] font-mono font-bold text-amber-400 bg-amber-900/30 border border-amber-700/40 px-1.5 py-0.5 rounded mb-1">
              PROVISIONAL
            </span>
            {isLowConfidence && (
              <span className="inline-block ml-1 text-[8px] font-mono text-indigo-400/80 bg-indigo-900/20 border border-indigo-700/30 px-1.5 py-0.5 rounded mb-1">
                LOW CONFIDENCE
              </span>
            )}
            {isAmbiguous && (
              <span className="inline-block ml-1 text-[8px] font-mono text-purple-400 bg-purple-900/20 border border-purple-700/40 px-1.5 py-0.5 rounded mb-1">
                AMBIGUOUS MATCH
              </span>
            )}
          </div>
          <div className="text-[9px] font-mono text-gray-500">
            #{rank}
          </div>
        </div>

        {/* Kit ID (placeholder) */}
        <div className="text-[10px] font-mono text-gray-400 truncate">
          {kit.kit_id}
        </div>

        {/* Identity narrative — literal PROVISIONAL string (D7 compliance) */}
        <div className="text-[9px] font-mono text-gray-600 mt-1 leading-relaxed">
          {kit.kit_identity_narrative}
        </div>
      </div>

      {/* Match metrics */}
      <div className="px-3 py-2 border-b border-gray-700/30 bg-gray-950/40">
        <div className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mb-1.5">
          Match quality
        </div>
        <div className="grid grid-cols-3 gap-1">
          <MetricCell label="Coverage" value={`${(coverage_fraction * 100).toFixed(0)}%`} />
          <MetricCell label="Density" value={`${(density_score * 100).toFixed(0)}%`} />
          <MetricCell
            label="Score"
            value={composite_score.toFixed(3)}
            highlight={composite_score >= 0.5}
          />
        </div>
      </div>

      {/* Kit metadata */}
      <div className="px-3 py-2 border-b border-gray-700/30">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] font-mono">
          <MetaRow label="Element" value={kit.primary_element} />
          <MetaRow label="Attribute" value={kit.kit_attribute} />
          <MetaRow label="Surface B" value={kit.surface_B_element_class} />
          <MetaRow label="Chain" value={kit.chain_architecture} />
          {kit.is_hybrid && (
            <div className="col-span-2">
              <span className="text-purple-400/80 text-[8px]">Hybrid (2 primary elements)</span>
            </div>
          )}
          {factionEntry && (
            <div className="col-span-2">
              <span className="text-gray-600">Faction: </span>
              <span className="text-gray-400">[Emergent] {factionEntry.faction_label_placeholder}</span>
            </div>
          )}
        </div>
      </div>

      {/* Load-bearing primitives (top 3 by bdi_weight) */}
      {loadBearingPrimitives.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-700/30">
          <div className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mb-1.5">
            Load-bearing primitives
          </div>
          <div className="space-y-1">
            {loadBearingPrimitives.map(p => (
              <div key={p.primitive_id} className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ opacity: 0.4 + 0.6 * p.bdi_weight }}
                />
                <span className="text-[9px] font-mono text-gray-300 truncate">
                  {p.primitive_label}
                </span>
                <span className="text-[8px] font-mono text-gray-600 flex-shrink-0">
                  {p.primitive_family}
                </span>
                {p.provenance_tag !== 'CORE_14' &&
                  p.provenance_tag !== 'active-v1.13' &&
                  p.provenance_tag !== 'primary_attribute_v1' &&
                  p.provenance_tag !== 'canonical_7_rotating' &&
                  p.provenance_tag !== 'canonical_plus_physical' && (
                  <span className="text-[7px] font-mono text-cyan-600/70 flex-shrink-0">
                    [{p.provenance_tag.split('_')[0]}]
                  </span>
                )}
              </div>
            ))}
            <div className="text-[8px] font-mono text-gray-700 mt-1">
              +{primitiveIds.length - 3} more primitives in constellation
            </div>
          </div>
        </div>
      )}

      {/* Flag families */}
      {flagGroups.length > 0 && (
        <div className="px-3 py-2">
          <div className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mb-2">
            Flag families
          </div>
          {flagGroups.map(group => (
            <FlagGroupBlock key={group.groupLabel} group={group} />
          ))}

          {/* Heuristic-derived disclosure footnote (dispatch § 5.5) */}
          <div className="text-[8px] font-mono text-gray-700 leading-relaxed mt-2 pt-2 border-t border-gray-800/60">
            Flags shown are heuristic-derived from the simulated primitive set. They become
            empirically-derived once the engine validates real kits against this substrate (cycle 15+).
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Small helper cells ───────────────────────────────────────────────────────

function MetricCell({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-[7px] font-mono text-gray-600 uppercase tracking-widest">{label}</div>
      <div className={`text-[10px] font-mono font-medium ${highlight ? 'text-amber-300' : 'text-gray-300'}`}>
        {value}
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-600">{label}: </span>
      <span className="text-gray-400">{value}</span>
    </div>
  );
}

// ─── Side Panel (root export) ─────────────────────────────────────────────────

export function SidePanel({ result, data, onClear }: SidePanelProps) {
  if (result === null) {
    // No lasso drawn yet — idle state
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <div className="text-gray-700 font-mono text-[10px] leading-relaxed">
          <div className="mb-2 text-gray-600">Lasso — draw to resolve</div>
          <div>Switch to <span className="text-gray-500">lasso mode</span> (toolbar top-left),</div>
          <div>then drag to draw a selection polygon.</div>
          <div className="mt-2 text-gray-700">The substrate will match enclosed stars</div>
          <div className="text-gray-700">to the nearest charted constellations.</div>
          <div className="mt-2 text-gray-700/60 text-[9px]">
            Lasso a bright star cluster for best results.
            <br />
            Center regions may be uncharted sky.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Panel header */}
      <div className="px-3 py-2 border-b border-gray-700/50 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-gray-400 font-semibold uppercase tracking-wider">
            Lasso Resolution
          </span>
          <span className="text-[8px] font-mono text-amber-500/70 bg-amber-900/20 border border-amber-800/30 px-1.5 py-0.5 rounded">
            PROVISIONAL
          </span>
        </div>
        <button
          onClick={onClear}
          className="text-[8px] font-mono text-gray-600 hover:text-gray-400 border border-gray-700/40 hover:border-gray-600/60 rounded px-2 py-0.5 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Scrollable results area */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {/* Edge case: empty lasso */}
        {result.emptyLasso && (
          <div className="text-[10px] font-mono text-gray-500 text-center py-4">
            Your lasso enclosed no primitives.
            <br />
            <span className="text-gray-600">Try a wider region.</span>
          </div>
        )}

        {/* Edge case: no match ≥ 0.3 — "Uncharted sky" signal */}
        {/* Substrate-honest: do NOT manufacture matches. Render the signal clearly. */}
        {!result.emptyLasso && result.noBestMatch && result.matches.length > 0 && (
          <div className="mb-3 text-[10px] font-mono bg-indigo-950/30 border border-indigo-800/30 rounded p-2">
            <div className="text-indigo-300/80 font-semibold mb-1">Uncharted sky</div>
            <div className="text-gray-500 leading-relaxed">
              Your lasso enclosed{' '}
              <span className="text-gray-400">{result.lassoPrimitiveIds.size} primitive{result.lassoPrimitiveIds.size !== 1 ? 's' : ''}</span>,
              but no constellation scores above the match threshold (best:{' '}
              <span className="text-gray-400">{result.matches[0].composite_score.toFixed(3)}</span> of 0.300 required).
            </div>
            <div className="text-gray-600 mt-1 text-[9px] leading-relaxed">
              This region sits between the charted constellation clusters. The low-confidence
              nearest matches are shown below for reference — they are substrate-honest signals,
              not confirmed compositions.
            </div>
          </div>
        )}

        {/* No matches at all when noBestMatch + matches empty */}
        {!result.emptyLasso && result.noBestMatch && result.matches.length === 0 && (
          <div className="mb-3 text-[10px] font-mono text-gray-500 bg-gray-900/60 border border-gray-700/30 rounded p-2">
            <div className="text-indigo-300/70 font-semibold mb-1">Uncharted sky</div>
            Your lasso enclosed{' '}
            <span className="text-gray-400">{result.lassoPrimitiveIds.size} primitive{result.lassoPrimitiveIds.size !== 1 ? 's' : ''}</span>{' '}
            with no constellation overlap. Try a wider region or lasso a visible star cluster.
          </div>
        )}

        {/* Ambiguous match notice */}
        {result.ambiguous && !result.noBestMatch && (
          <div className="mb-3 text-[9px] font-mono text-purple-400/80 bg-purple-900/10 border border-purple-800/30 rounded p-2">
            Top matches are ambiguous (scores within 5%).
            <br />
            Try narrowing your lasso to disambiguate.
          </div>
        )}

        {/* Lasso primitive count — omit when noBestMatch (count shown inline in uncharted-sky banner) */}
        {!result.emptyLasso && !result.noBestMatch && (
          <div className="mb-2 text-[9px] font-mono text-gray-600">
            {result.lassoPrimitiveIds.size} primitive{result.lassoPrimitiveIds.size !== 1 ? 's' : ''} enclosed
            {result.matches.length > 0 && ` · ${result.matches.length} constellation${result.matches.length !== 1 ? 's' : ''} matched`}
          </div>
        )}

        {/* Match cards — rendered for both normal and noBestMatch (low-confidence) states */}
        {result.matches.map((match, idx) => (
          <KitMatchCard
            key={match.kit.kit_id}
            match={match}
            data={data}
            rank={idx + 1}
            isAmbiguous={result.ambiguous && idx < 2}
            isLowConfidence={result.noBestMatch}
          />
        ))}

        {/* No matches at all — only show when not noBestMatch (noBestMatch+empty case handled above) */}
        {!result.emptyLasso && !result.noBestMatch && result.matches.length === 0 && (
          <div className="text-[10px] font-mono text-gray-600 text-center py-4">
            No constellations matched the lasso region.
          </div>
        )}
      </div>
    </div>
  );
}
