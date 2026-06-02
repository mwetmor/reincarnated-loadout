/**
 * KitSpace — /kit-space route
 *
 * EAA-6: loadout app consumes kit_space output from public/kit-space/.
 *
 * LOCK O compliance: reuses existing component patterns (CourtBrowser card grid,
 * inline detail pattern from existing skill/gear detail views).
 * No new bespoke UI component shells created.
 *
 * Data: fetched at runtime from public/kit-space/ via useKitSpaceData hook.
 * Backward-compat: V1/V2 historical seasons unaffected (Path α preserved).
 * Null-field rendering: cultural_tradition / period / t4_selection / supporting_chain
 * may all be null (ClassGenerator path). Render gracefully — placeholder or omission.
 *
 * Kit_space_expansion event ID format: kse_YYYYMMDD_seq3 (per CHRONICLE_SCHEMA.md § 3).
 */

import { useState, useMemo, useCallback } from 'react';
import { useKitSpaceData } from '../hooks/useKitSpaceData';
import type { KitData, KitSkill } from '../data/kitSpaceTypes';
import { SUBSTRATE_COLORS, SUBSTRATE_GROUPING_LABEL } from '../data/courtTypes';

// ---------------------------------------------------------------------------
// Constants + helpers
// ---------------------------------------------------------------------------

// Kit-space adds "physical" element; extend substrate colors with a fallback
const KIT_ELEMENT_COLORS: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  ...SUBSTRATE_COLORS,
  physical: { bg: 'bg-gray-900', text: 'text-gray-300', border: 'border-gray-600', accent: 'bg-gray-500' },
};

const ALL_ELEMENTS = ['fire', 'water', 'earth', 'wind', 'lightning', 'holy', 'shadow', 'physical'] as const;
type ElementFilter = (typeof ALL_ELEMENTS)[number] | 'all';

type SortKey = 'element' | 'kit_id' | 'skill_count';
const SORT_LABELS: Record<SortKey, string> = {
  element:     'Element',
  kit_id:      'Kit ID',
  skill_count: 'Skill count',
};

function elementLabel(el: string): string {
  return SUBSTRATE_GROUPING_LABEL[el] ?? el;
}

function getColors(element: string) {
  return KIT_ELEMENT_COLORS[element] ?? KIT_ELEMENT_COLORS['physical'];
}

// Format a kit ID for display: kit_fire_000001 -> "fire #1"
function formatKitId(kitId: string): string {
  const parts = kitId.split('_');
  if (parts.length === 3) {
    const seq = parseInt(parts[2], 10);
    return `${parts[1]} #${seq}`;
  }
  return kitId;
}

// Flavor rate from skills array
function computeFlavorRate(skills: KitSkill[]): number {
  if (!skills.length) return 0;
  const flavored = skills.filter((s) => s.ws1a4_flavor_decision === true).length;
  return flavored / skills.length;
}

// Mean cohesion score from skills that have it
function computeMeanCohesion(skills: KitSkill[]): number | null {
  const scored = skills.filter((s) => typeof s.phase5_cohesion_score === 'number' && s.phase5_cohesion_score != null);
  if (!scored.length) return null;
  const sum = scored.reduce((acc, s) => acc + (s.phase5_cohesion_score as number), 0);
  return sum / scored.length;
}

// ---------------------------------------------------------------------------
// Loading + error states
// ---------------------------------------------------------------------------

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-500 font-mono">Loading kit space...</p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="rounded-lg border border-red-900 bg-red-950/40 p-4">
        <p className="text-sm text-red-400 font-mono">Kit space load error: {message}</p>
        <p className="text-xs text-gray-600 mt-1">
          Ensure kit JSON files are present at /public/kit-space/kits/.
        </p>
        <button
          onClick={onRetry}
          className="mt-2 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-mono transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ElementToggle — reuses CourtBrowser SubstrateToggle pattern
// ---------------------------------------------------------------------------

function ElementToggle({
  value,
  active,
  onClick,
}: {
  value: ElementFilter;
  active: boolean;
  onClick: () => void;
}) {
  if (value === 'all') {
    return (
      <button
        onClick={onClick}
        className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
          active
            ? 'bg-gray-700 text-gray-200'
            : 'bg-gray-900 text-gray-500 hover:text-gray-300 hover:bg-gray-800'
        }`}
      >
        all
      </button>
    );
  }
  const colors = getColors(value);
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors border ${
        active
          ? `${colors.bg} ${colors.text} ${colors.border}`
          : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700'
      }`}
    >
      {elementLabel(value)}
    </button>
  );
}

// ---------------------------------------------------------------------------
// KitCard — card grid item (CourtBrowser CourtCard pattern)
// ---------------------------------------------------------------------------

function KitCard({
  kit,
  selected,
  onClick,
}: {
  kit: KitData;
  selected: boolean;
  onClick: () => void;
}) {
  const colors = getColors(kit.primary_element);
  const flavorRate = computeFlavorRate(kit.skills);
  const meanCohesion = computeMeanCohesion(kit.skills);
  const displayName = kit.emergent_kit_concept ?? formatKitId(kit.kit_id);
  const chainCount = kit.chain_composition?.chain_count ?? null;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border overflow-hidden flex flex-col transition-all duration-150 hover:brightness-110 focus:outline-none focus:ring-1 focus:ring-orange-500 ${
        selected ? `ring-1 ring-orange-500 ${colors.border}` : colors.border
      } ${colors.bg}`}
    >
      {/* Header strip */}
      <div className={`px-3 pt-3 pb-2`}>
        <div className="flex items-start justify-between gap-1 mb-1">
          <span className={`text-[9px] font-mono uppercase tracking-widest ${colors.text} opacity-70`}>
            {elementLabel(kit.primary_element)}
          </span>
          <span className="text-[9px] font-mono text-gray-600 truncate ml-1">
            {kit.kit_id}
          </span>
        </div>
        <p className={`text-sm font-semibold ${colors.text} leading-snug`}>
          {displayName}
        </p>
      </div>

      {/* Stats row */}
      <div className="px-3 pb-3 flex flex-col gap-1 flex-1">
        <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
          <span>{kit.skills.length} skills</span>
          {chainCount !== null && <span>{chainCount} chain{chainCount !== 1 ? 's' : ''}</span>}
        </div>

        {/* Flavor rate bar */}
        {flavorRate > 0 && (
          <div className="mt-1">
            <div className="flex items-center justify-between text-[9px] font-mono text-gray-600 mb-0.5">
              <span>flavor</span>
              <span>{Math.round(flavorRate * 100)}%</span>
            </div>
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${colors.accent} opacity-70`}
                style={{ width: `${flavorRate * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Cohesion score */}
        {meanCohesion !== null && (
          <div className="flex items-center justify-between text-[9px] font-mono text-gray-600 mt-0.5">
            <span>cohesion</span>
            <span className={meanCohesion >= 0.9 ? 'text-green-500' : meanCohesion >= 0.8 ? 'text-yellow-500' : 'text-gray-500'}>
              {meanCohesion.toFixed(3)}
            </span>
          </div>
        )}

        {/* Substrate trace */}
        {kit.substrate_trace?.role_orientation && (
          <div className="mt-auto pt-1">
            <span className="text-[9px] font-mono text-gray-700">
              {kit.substrate_trace.role_orientation} · {kit.substrate_trace.range_profile ?? '—'}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// KitDetailPanel — per-kit detail view (adapts existing SkillDetailPanel pattern)
// Reuses inline detail render approach from existing Sample/Loadout pages.
// ---------------------------------------------------------------------------

function SkillRow({ skill }: { skill: KitSkill }) {
  const colors = getColors(skill.canonical_element);
  const flavorWord = skill.ws1a4_flavor_word_used;

  return (
    <div className="py-2 border-b border-gray-800 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-gray-200">{skill.name ?? '—'}</span>
            <span className={`text-[9px] font-mono px-1 py-0.5 rounded border ${colors.border} ${colors.text} opacity-70 uppercase tracking-wide`}>
              {skill.canonical_element}
            </span>
            {flavorWord && (
              <span className="text-[9px] font-mono text-orange-400 opacity-80">
                ✦ {flavorWord}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[9px] font-mono text-gray-600">
            <span>T{skill.tier}</span>
            <span>{skill.role.replace(/_/g, ' ')}</span>
            {skill.chain_id && <span>{skill.chain_id}</span>}
            {skill.chain_position != null && <span>pos {skill.chain_position}</span>}
          </div>
          {skill.flavor_text && (
            <p className="mt-1 text-[10px] text-gray-500 leading-relaxed line-clamp-2" title={skill.flavor_text}>
              {skill.flavor_text}
            </p>
          )}
          {skill.effects && skill.effects.length > 0 && (
            <p className="mt-0.5 text-[9px] text-gray-600 leading-relaxed line-clamp-1" title={skill.effects[0]}>
              {skill.effects[0]}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0 text-[9px] font-mono text-gray-600">
          <span>{skill.energy_cost.toFixed(1)} en</span>
          <span>{skill.cooldown_seconds.toFixed(1)}s cd</span>
          {skill.phase5_cohesion_score != null && (
            <span className={skill.phase5_cohesion_score >= 0.9 ? 'text-green-500' : skill.phase5_cohesion_score >= 0.8 ? 'text-yellow-500' : 'text-gray-500'}>
              {skill.phase5_cohesion_score.toFixed(3)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function KitDetailPanel({ kit, onClose }: { kit: KitData; onClose: () => void }) {
  const colors = getColors(kit.primary_element);
  const displayName = kit.emergent_kit_concept ?? formatKitId(kit.kit_id);
  const chainCount = kit.chain_composition?.chain_count ?? null;

  // Group skills by tier
  const skillsByTier = useMemo(() => {
    const groups: Record<number, KitSkill[]> = {};
    for (const skill of kit.skills) {
      if (!groups[skill.tier]) groups[skill.tier] = [];
      groups[skill.tier].push(skill);
    }
    return groups;
  }, [kit.skills]);

  const tiers = Object.keys(skillsByTier).map(Number).sort((a, b) => a - b);
  const meanCohesion = computeMeanCohesion(kit.skills);
  const flavorRate = computeFlavorRate(kit.skills);

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 ${colors.bg} border-b ${colors.border}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[9px] font-mono uppercase tracking-widest ${colors.text} opacity-70`}>
                {elementLabel(kit.primary_element)}
              </span>
              <span className="text-[9px] font-mono text-gray-500">{kit.kit_id}</span>
            </div>
            <h2 className={`text-base font-bold ${colors.text} leading-snug`}>{displayName}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-400 text-xs font-mono px-2 py-1 rounded hover:bg-gray-800 transition-colors shrink-0"
          >
            close
          </button>
        </div>

        {/* Kit-level metadata strip */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] font-mono text-gray-500">
          <span>{kit.skills.length} skills</span>
          {chainCount !== null && <span>{chainCount} chain{chainCount !== 1 ? 's' : ''}</span>}
          {kit.substrate_trace?.role_orientation && (
            <span>{kit.substrate_trace.role_orientation}</span>
          )}
          {kit.substrate_trace?.range_profile && (
            <span>{kit.substrate_trace.range_profile}</span>
          )}
          {kit.substrate_trace?.energy_type && (
            <span>{kit.substrate_trace.energy_type}</span>
          )}
          {meanCohesion !== null && (
            <span className={meanCohesion >= 0.9 ? 'text-green-500' : meanCohesion >= 0.8 ? 'text-yellow-500' : ''}>
              cohesion {meanCohesion.toFixed(3)}
            </span>
          )}
          {flavorRate > 0 && (
            <span className="text-orange-400 opacity-80">
              flavor {Math.round(flavorRate * 100)}%
            </span>
          )}
        </div>

        {/* Null-field notices — graceful omission per Gate-1 INFO-1 */}
        <div className="flex flex-wrap gap-2 mt-2">
          {kit.cultural_tradition == null && (
            <span className="text-[9px] font-mono text-gray-700 italic">cultural tradition: pending EAA-8</span>
          )}
          {kit.t4_selection == null && (
            <span className="text-[9px] font-mono text-gray-700 italic">t4 selection: pending EAA-8</span>
          )}
        </div>
      </div>

      {/* Skills by tier */}
      <div className="px-4 py-3 overflow-y-auto max-h-[60vh]">
        {tiers.map((tier) => (
          <div key={tier} className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-600">
                Tier {tier}
              </span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>
            <div>
              {skillsByTier[tier].map((skill) => (
                <SkillRow key={skill.id} skill={skill} />
              ))}
            </div>
          </div>
        ))}

        {/* Provenance footer */}
        <div className="mt-3 pt-3 border-t border-gray-800">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-mono text-gray-700">
            {kit.kit_space_expansion_event_id && (
              <span>event: {kit.kit_space_expansion_event_id}</span>
            )}
            {kit.engine_version && (
              <span>engine: {kit.engine_version}</span>
            )}
            {kit.lineage_tags?.substrate_provenance && (
              <span>substrate: {kit.lineage_tags.substrate_provenance}</span>
            )}
            {kit.generation_timestamp && (
              <span>generated: {kit.generation_timestamp.slice(0, 10)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KitSpace page
// ---------------------------------------------------------------------------

export function KitSpace() {
  const { kits, status, error, refresh } = useKitSpaceData();

  const [elementFilter, setElementFilter] = useState<ElementFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('element');
  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);

  // Filtered + sorted kits
  const displayKits = useMemo(() => {
    let filtered = kits;
    if (elementFilter !== 'all') {
      filtered = filtered.filter((k) => k.primary_element === elementFilter);
    }
    const sorted = [...filtered];
    switch (sortKey) {
      case 'element':
        sorted.sort((a, b) => {
          const el = a.primary_element.localeCompare(b.primary_element);
          return el !== 0 ? el : a.kit_id.localeCompare(b.kit_id);
        });
        break;
      case 'kit_id':
        sorted.sort((a, b) => a.kit_id.localeCompare(b.kit_id));
        break;
      case 'skill_count':
        sorted.sort((a, b) => b.skills.length - a.skills.length);
        break;
    }
    return sorted;
  }, [kits, elementFilter, sortKey]);

  const selectedKit = useMemo(
    () => kits.find((k) => k.kit_id === selectedKitId) ?? null,
    [kits, selectedKitId]
  );

  const handleElementToggle = useCallback((el: ElementFilter) => {
    setElementFilter((prev) => (prev === el ? 'all' : el));
    setSelectedKitId(null);
  }, []);

  const handleKitSelect = useCallback((kitId: string) => {
    setSelectedKitId((prev) => (prev === kitId ? null : kitId));
  }, []);

  const handleDetailClose = useCallback(() => setSelectedKitId(null), []);

  // ---- Render states ----

  if (status === 'idle' || status === 'loading') return <LoadingSpinner />;
  if (status === 'error') return <ErrorState message={error ?? 'Unknown error'} onRetry={refresh} />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-200 tracking-wide">Kit Space</h1>
        <p className="text-xs text-gray-600 mt-0.5">
          {kits.length} kit{kits.length !== 1 ? 's' : ''} — kse_20260602_001 (EAA-5 first expansion fire)
        </p>
      </div>

      {/* Controls strip */}
      <div className="space-y-3">
        {/* Element filter toggles */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-gray-600 font-mono mr-1 shrink-0">element:</span>
          <ElementToggle
            value="all"
            active={elementFilter === 'all'}
            onClick={() => handleElementToggle('all')}
          />
          {ALL_ELEMENTS.map((el) => (
            <ElementToggle
              key={el}
              value={el}
              active={elementFilter === el}
              onClick={() => handleElementToggle(el)}
            />
          ))}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 font-mono shrink-0">sort:</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-gray-500 font-mono"
          >
            {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          {elementFilter !== 'all' && (
            <span className="text-[10px] text-gray-600 font-mono">
              {displayKits.length} of {kits.length} kits
            </span>
          )}
        </div>
      </div>

      {/* Detail panel (shown above grid when a kit is selected) */}
      {selectedKit && (
        <KitDetailPanel kit={selectedKit} onClose={handleDetailClose} />
      )}

      {/* Kit grid — adapts CourtBrowser card grid */}
      {displayKits.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-600">No kits match the current filter.</p>
          <button
            onClick={() => setElementFilter('all')}
            className="mt-2 text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2"
          >
            Clear filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayKits.map((kit) => (
            <KitCard
              key={kit.kit_id}
              kit={kit}
              selected={selectedKitId === kit.kit_id}
              onClick={() => handleKitSelect(kit.kit_id)}
            />
          ))}
        </div>
      )}

      {/* Footer — provenance note */}
      <footer className="pt-4 border-t border-gray-800">
        <p className="text-[10px] text-gray-700 font-mono leading-relaxed">
          Kit space — Phase 3 EAA-6. Data from{' '}
          <code className="bg-gray-900 px-1 rounded">public/kit-space/kits/</code>
          . Historical seasons (V1/V2) accessible via Loadout and Sample pages (Path α preserved).
        </p>
      </footer>
    </div>
  );
}
