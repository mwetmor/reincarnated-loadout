/**
 * KitBrowser — /kits route
 *
 * cycle-18 recovery-2: extracted from Loadout.tsx (cycle-18 grid view). This page
 * preserves the full kit-browser surface (grid + Featured Characters + faction filter
 * + element filter) that cycle-18 built. Loadout.tsx now hosts the rich per-character
 * detail view; this page hosts the browsing/discovery surface.
 *
 * Element filter uses canonical-7+1 primary names (Fire/Water/Earth/Wind/Lightning/Holy/
 * Shadow/Physical) — NOT flavor pool words (Issue 1 fix carried through).
 *
 * Issue 5B: faction badge + filter operational (preserved from cycle-18).
 * Issue 3: Featured Characters section preserved.
 * Historical toggle: EAA-5 v2 kits accessible via toggle (Path α preservation).
 *
 * LOCK O AMENDED: no new component shells. All render helpers inline. Reuses existing
 * SUBSTRATE_COLORS pattern from EAA-6/KitSpace.tsx.
 */

import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useKitSpaceData, CURRENT_KIT_EVENT_ID, HISTORICAL_KIT_EVENT_ID } from '../hooks/useKitSpaceData';
import type { KitData, KitT4Selection, KitFactionMap } from '../data/kitSpaceTypes';
import { SUBSTRATE_COLORS, SUBSTRATE_GROUPING_LABEL } from '../data/courtTypes';

// ---------------------------------------------------------------------------
// Constants + helpers
// ---------------------------------------------------------------------------

const KIT_ELEMENT_COLORS: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  ...SUBSTRATE_COLORS,
  physical: { bg: 'bg-gray-900', text: 'text-gray-300', border: 'border-gray-600', accent: 'bg-gray-500' },
};

const FACTION_COLORS: Record<string, { badge: string; text: string; border: string }> = {
  f001: { badge: 'bg-red-950',    text: 'text-red-300',    border: 'border-red-800'    },
  f002: { badge: 'bg-sky-950',    text: 'text-sky-300',    border: 'border-sky-800'    },
  f003: { badge: 'bg-lime-950',   text: 'text-lime-300',   border: 'border-lime-800'   },
};

// Issue 1 fix: canonical-7+1 primary element names (NOT flavor pool words)
const ALL_ELEMENTS = ['fire', 'water', 'earth', 'wind', 'lightning', 'holy', 'shadow', 'physical'] as const;
type ElementFilter = (typeof ALL_ELEMENTS)[number] | 'all';

// Issue 1 fix: canonical display labels for the 7+1 primary elements
const CANONICAL_ELEMENT_LABEL: Record<string, string> = {
  fire:      'Fire',
  water:     'Water',
  earth:     'Earth',
  wind:      'Wind',
  lightning: 'Lightning',
  holy:      'Holy',
  shadow:    'Shadow',
  physical:  'Physical',
};

type SortKey = 'element' | 'kit_id' | 'skill_count';
const SORT_LABELS: Record<SortKey, string> = {
  element:     'Element',
  kit_id:      'Kit ID',
  skill_count: 'Skill count',
};

// Issue 3 — top-5 featured kit_ids (stable references; names read from JSON at render time)
const FEATURED_KIT_IDS = [
  'kit_shadow_000007',   // top-1 ★
  'kit_fire_000007',
  'kit_wind_000006',
  'kit_holy_000005',
  'kit_physical_000026',
] as const;

function elementLabel(el: string): string {
  return CANONICAL_ELEMENT_LABEL[el] ?? SUBSTRATE_GROUPING_LABEL[el] ?? el;
}

function getColors(element: string) {
  return KIT_ELEMENT_COLORS[element] ?? KIT_ELEMENT_COLORS['physical'];
}

function formatKitId(kitId: string): string {
  const parts = kitId.split('_');
  if (parts.length === 3) {
    const seq = parseInt(parts[2], 10);
    return `${parts[1]} #${seq}`;
  }
  return kitId;
}

function computeMeanCohesion(skills: KitData['skills']): number | null {
  const scored = skills.filter((s) => typeof s.phase5_cohesion_score === 'number' && s.phase5_cohesion_score != null);
  if (!scored.length) return null;
  const sum = scored.reduce((acc, s) => acc + (s.phase5_cohesion_score as number), 0);
  return sum / scored.length;
}

function isT4Active(t4: KitT4Selection | null | undefined): t4 is KitT4Selection {
  return t4 != null && t4.is_active === true;
}

// ---------------------------------------------------------------------------
// Loading + error states
// ---------------------------------------------------------------------------

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-500 font-mono">Loading kit browser...</p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="rounded-lg border border-red-900 bg-red-950/40 p-4">
        <p className="text-sm text-red-400 font-mono">Kit space load error: {message}</p>
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
      {/* Issue 1 fix: display canonical primary element name */}
      {elementLabel(value)}
    </button>
  );
}

// ---------------------------------------------------------------------------
// FactionBadge
// ---------------------------------------------------------------------------

function FactionBadge({
  factionId,
  factionName,
  active,
  onClick,
}: {
  factionId: string;
  factionName: string;
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const colors = FACTION_COLORS[factionId] ?? { badge: 'bg-gray-900', text: 'text-gray-400', border: 'border-gray-700' };
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-mono uppercase tracking-wide transition-colors ${
        active
          ? `${colors.badge} ${colors.text} ${colors.border} ring-1 ring-offset-0 ring-current`
          : `${colors.badge} ${colors.text} ${colors.border} opacity-70 hover:opacity-100`
      }`}
      title={`Filter by ${factionName}`}
    >
      {factionName}
    </button>
  );
}

// ---------------------------------------------------------------------------
// KitCard — grid item
// ---------------------------------------------------------------------------

function KitCard({
  kit,
  factionMap,
  activeFactionId,
  onFactionClick,
}: {
  kit: KitData;
  factionMap: KitFactionMap;
  activeFactionId: string | null;
  onFactionClick: (factionId: string) => void;
}) {
  const colors = getColors(kit.primary_element);
  const meanCohesion = computeMeanCohesion(kit.skills);
  const displayName = kit.emergent_kit_concept ?? formatKitId(kit.kit_id);
  const chainCount = kit.chain_composition?.chain_count ?? null;
  const hasActiveT4 = isT4Active(kit.t4_selection);
  const faction = factionMap[kit.kit_id] ?? null;

  return (
    <Link
      to={`/loadout?kit=${kit.kit_id}`}
      className={`w-full text-left rounded-lg border overflow-hidden flex flex-col transition-all duration-150 hover:brightness-110 focus:outline-none focus:ring-1 focus:ring-orange-500 ${colors.border} ${colors.bg}`}
    >
      {/* Header strip */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-start justify-between gap-1 mb-1">
          {/* Issue 1 fix: canonical element primary name as prominent bordered flag */}
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide ${colors.bg} ${colors.text} ${colors.border}`}>
            {elementLabel(kit.primary_element)}
          </span>
          <div className="flex items-center gap-1.5">
            {hasActiveT4 && (
              <span className="text-[9px] font-mono text-orange-400 opacity-80">T4</span>
            )}
            <span className="text-[9px] font-mono text-gray-600 truncate ml-1">
              {kit.kit_id}
            </span>
          </div>
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
        {meanCohesion !== null && (
          <div className="flex items-center justify-between text-[9px] font-mono text-gray-600 mt-0.5">
            <span>cohesion</span>
            <span className={meanCohesion >= 0.9 ? 'text-green-500' : meanCohesion >= 0.8 ? 'text-yellow-500' : 'text-gray-500'}>
              {meanCohesion.toFixed(3)}
            </span>
          </div>
        )}
        {faction && (
          <div className="mt-auto pt-1">
            <FactionBadge
              factionId={faction.faction_id}
              factionName={faction.faction_name}
              active={activeFactionId === faction.faction_id}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFactionClick(faction.faction_id);
              }}
            />
          </div>
        )}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// FeaturedKitCard — Issue 3: larger card for featured characters section
// ---------------------------------------------------------------------------

function FeaturedKitCard({
  kit,
  isTop1,
  factionMap,
  activeFactionId,
  onFactionClick,
}: {
  kit: KitData;
  isTop1: boolean;
  factionMap: KitFactionMap;
  activeFactionId: string | null;
  onFactionClick: (factionId: string) => void;
}) {
  const colors = getColors(kit.primary_element);
  const displayName = kit.emergent_kit_concept ?? formatKitId(kit.kit_id);
  const meanCohesion = computeMeanCohesion(kit.skills);
  const hasActiveT4 = isT4Active(kit.t4_selection);
  const faction = factionMap[kit.kit_id] ?? null;

  return (
    <Link
      to={`/loadout?kit=${kit.kit_id}`}
      className={`w-full text-left rounded-lg border overflow-hidden flex flex-col transition-all duration-150 hover:brightness-110 focus:outline-none ${
        isTop1
          ? `border-2 ${colors.border} ring-1 ring-yellow-500/40`
          : colors.border
      } ${colors.bg}`}
    >
      {isTop1 && (
        <div className="px-3 pt-2 pb-0">
          <span className="text-[10px] font-mono text-yellow-400 font-semibold tracking-widest">
            ★ TOP PICK
          </span>
        </div>
      )}
      <div className="px-3 pt-2 pb-2">
        <div className="flex items-start justify-between gap-1 mb-1.5">
          {/* Issue 1 fix: canonical element primary name */}
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide ${colors.bg} ${colors.text} ${colors.border}`}>
            {elementLabel(kit.primary_element)}
          </span>
          <div className="flex items-center gap-1.5">
            {hasActiveT4 && (
              <span className="text-[9px] font-mono text-orange-400 opacity-80">T4</span>
            )}
          </div>
        </div>
        <p className={`text-base font-bold ${colors.text} leading-snug`}>
          {displayName}
        </p>
      </div>
      <div className="px-3 pb-3 flex flex-col gap-1 flex-1">
        <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
          <span>{kit.skills.length} skills</span>
          {kit.chain_composition?.chain_count != null && (
            <span>{kit.chain_composition.chain_count} chain{kit.chain_composition.chain_count !== 1 ? 's' : ''}</span>
          )}
        </div>
        {kit.cultural_tradition && kit.cultural_tradition !== 'NA' && (
          <div className="text-[9px] font-mono text-gray-600">
            {kit.cultural_tradition}{kit.period && kit.period !== 'NA' ? ` · ${kit.period}` : ''}
          </div>
        )}
        {meanCohesion !== null && (
          <div className="flex items-center justify-between text-[9px] font-mono text-gray-600 mt-0.5">
            <span>cohesion</span>
            <span className={meanCohesion >= 0.9 ? 'text-green-500' : meanCohesion >= 0.8 ? 'text-yellow-500' : 'text-gray-500'}>
              {meanCohesion.toFixed(3)}
            </span>
          </div>
        )}
        {faction && (
          <div className="mt-auto pt-1">
            <FactionBadge
              factionId={faction.faction_id}
              factionName={faction.faction_name}
              active={activeFactionId === faction.faction_id}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFactionClick(faction.faction_id);
              }}
            />
          </div>
        )}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// KitBrowser page — /kits
// ---------------------------------------------------------------------------

export function KitBrowser() {
  const [showHistorical, setShowHistorical] = useState(false);
  const { kits, factionMap, status, error, refresh, currentEventId, isHistorical } = useKitSpaceData({ showHistorical });

  const [elementFilter, setElementFilter] = useState<ElementFilter>('all');
  const [factionFilter, setFactionFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('element');

  const handleFactionClick = useCallback((factionId: string) => {
    setFactionFilter((prev) => (prev === factionId ? null : factionId));
  }, []);

  const displayKits = useMemo(() => {
    let filtered = kits;
    if (elementFilter !== 'all') {
      filtered = filtered.filter((k) => k.primary_element === elementFilter);
    }
    if (factionFilter !== null) {
      filtered = filtered.filter((k) => factionMap[k.kit_id]?.faction_id === factionFilter);
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
  }, [kits, elementFilter, factionFilter, factionMap, sortKey]);

  const featuredKits = useMemo(
    () => FEATURED_KIT_IDS.map((id) => kits.find((k) => k.kit_id === id) ?? null),
    [kits]
  );

  const handleElementToggle = useCallback((el: ElementFilter) => {
    setElementFilter((prev) => (prev === el ? 'all' : el));
  }, []);

  const handleHistoricalToggle = useCallback(() => {
    setShowHistorical((prev) => !prev);
    setElementFilter('all');
    setFactionFilter(null);
  }, []);

  if (status === 'idle' || status === 'loading') return <LoadingSpinner />;
  if (status === 'error') return <ErrorState message={error ?? 'Unknown error'} onRetry={refresh} />;

  const eventLabel = isHistorical
    ? `${HISTORICAL_KIT_EVENT_ID} (EAA-5 v2 — 25 kits)`
    : `${CURRENT_KIT_EVENT_ID} (QDX-5 full fire — ${kits.length} kits)`;

  const activeFilterCount = (elementFilter !== 'all' ? 1 : 0) + (factionFilter !== null ? 1 : 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-gray-200 tracking-wide">Kit Browser</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            {kits.length} kit{kits.length !== 1 ? 's' : ''} — {eventLabel}
          </p>
          {!isHistorical && (
            <p className="text-[10px] text-gray-700 mt-0.5">
              QDX-5 — B4.5 distribution · 3 factions · WS1A.4-lite flavor · multi-T4 selection
            </p>
          )}
          <p className="text-[10px] text-gray-700 mt-1">
            Click any kit to open the rich{' '}
            <Link to="/loadout" className="underline hover:text-gray-500">Loadout view</Link>.
          </p>
        </div>
        <button
          onClick={handleHistoricalToggle}
          className={`px-3 py-1.5 rounded text-xs font-mono transition-colors shrink-0 ${
            isHistorical
              ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              : 'bg-gray-900 text-gray-500 hover:text-gray-300 hover:bg-gray-800 border border-gray-800'
          }`}
        >
          {isHistorical ? 'Back to current (QDX-5)' : 'Historical (EAA-5 v2)'}
        </button>
      </div>

      {/* Issue 3: Featured Characters section */}
      {!isHistorical && featuredKits.some((k) => k !== null) && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-mono uppercase tracking-wider text-gray-500">Featured Characters</h2>
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-[9px] font-mono text-gray-700">gandalf-curated · QDX-5 top picks</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {featuredKits.map((kit, idx) =>
              kit ? (
                <FeaturedKitCard
                  key={kit.kit_id}
                  kit={kit}
                  isTop1={idx === 0}
                  factionMap={factionMap}
                  activeFactionId={factionFilter}
                  onFactionClick={handleFactionClick}
                />
              ) : (
                <div key={idx} className="rounded-lg border border-gray-800 bg-gray-900 flex items-center justify-center py-6">
                  <span className="text-[9px] font-mono text-gray-700">loading...</span>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* Controls strip */}
      <div className="space-y-3">
        {/* Issue 1 fix: Element filter — canonical-7+1 primary names */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-gray-600 font-mono mr-1 shrink-0">element:</span>
          <ElementToggle value="all" active={elementFilter === 'all'} onClick={() => handleElementToggle('all')} />
          {ALL_ELEMENTS.map((el) => (
            <ElementToggle
              key={el}
              value={el}
              active={elementFilter === el}
              onClick={() => handleElementToggle(el)}
            />
          ))}
        </div>

        {/* Issue 5B: Faction filter strip */}
        {Object.keys(factionMap).length > 0 && !isHistorical && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-gray-600 font-mono mr-1 shrink-0">faction:</span>
            <button
              onClick={() => setFactionFilter(null)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                factionFilter === null
                  ? 'bg-gray-700 text-gray-200'
                  : 'bg-gray-900 text-gray-500 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              all
            </button>
            {(['f001', 'f002', 'f003'] as const).map((fid) => {
              const factionName = Object.values(factionMap).find((f) => f.faction_id === fid)?.faction_name;
              if (!factionName) return null;
              const colors = FACTION_COLORS[fid];
              return (
                <button
                  key={fid}
                  onClick={() => setFactionFilter((prev) => (prev === fid ? null : fid))}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors border ${
                    factionFilter === fid
                      ? `${colors.badge} ${colors.text} ${colors.border}`
                      : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700'
                  }`}
                >
                  {factionName}
                </button>
              );
            })}
            {factionFilter !== null && (
              <button
                onClick={() => setFactionFilter(null)}
                className="text-[10px] font-mono text-gray-600 hover:text-gray-400 underline underline-offset-2"
              >
                clear
              </button>
            )}
          </div>
        )}

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
          {activeFilterCount > 0 && (
            <span className="text-[10px] text-gray-600 font-mono">
              {displayKits.length} of {kits.length} kits
            </span>
          )}
        </div>
      </div>

      {/* Kit grid */}
      {displayKits.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-600">No kits match the current filter.</p>
          <button
            onClick={() => { setElementFilter('all'); setFactionFilter(null); }}
            className="mt-2 text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayKits.map((kit) => (
            <KitCard
              key={kit.kit_id}
              kit={kit}
              factionMap={factionMap}
              activeFactionId={factionFilter}
              onFactionClick={handleFactionClick}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <footer className="pt-4 border-t border-gray-800">
        <p className="text-[10px] text-gray-700 font-mono leading-relaxed">
          Kit browser — cycle-18 recovered surface. Data from{' '}
          <code className="bg-gray-900 px-1 rounded">public/kit-space/kits/</code>
          . Event{' '}
          <code className="bg-gray-900 px-1 rounded">{currentEventId}</code>
          . Click any kit to open the rich Loadout view. Historical seasons (EAA-5 v2) accessible via toggle above.
        </p>
      </footer>
    </div>
  );
}
