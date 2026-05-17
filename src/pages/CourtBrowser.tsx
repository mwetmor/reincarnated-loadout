/**
 * CourtBrowser — D17 Court of Forms browser surface.
 *
 * Displays the player's accumulated Court of ascended forms across seasons.
 * Consumes court.json (Path A static export, MIGRATION.md §v1.2).
 *
 * Features:
 *   - Card grid: one card per CourtForm
 *   - Substrate filter (fire / water / earth / wind / lightning / holy / shadow)
 *   - Search by name (form_name)
 *   - Sort: season ASC/DESC, substrate, name
 *   - N=5 recency indicator (most recently ascended forms)
 *   - Substrate sprite thumbnails via vfx-manifest.json v1.1 thumbnail_frame.file paths
 *   - Substrate color coding per v0.28 palette (SUBSTRATE_COLORS)
 *   - Empty state for first-time players (no Court entries yet)
 *
 * Cross-seam: drax-loadout D17, MIGRATION.md §v1.2.
 */

import { useState, useMemo, useCallback } from 'react';
import { useCourtData } from '../hooks/useCourtData';
import type { CourtForm } from '../data/courtTypes';
import {
  SUBSTRATE_COLORS,
  SUBSTRATE_GROUPING_LABEL,
  PATH_TAKEN_LABEL,
  COURT_ROLE_LABEL,
} from '../data/courtTypes';

// ---------------------------------------------------------------------------
// Thumbnail paths from vfx-manifest.json v1.1 thumbnail_frame.file
// All paths relative to reincarnated-demo/public/assets/
// Displayed via <img src=...> — will only resolve if demo assets are co-served.
// In loadout-only context, images gracefully degrade to substrate color fallback.
// ---------------------------------------------------------------------------

const SUBSTRATE_THUMBNAIL: Record<string, string> = {
  fire:      '/assets/chierit/fire_knight/gifs/08_sp_atk.gif',
  water:     '/assets/chierit/water_priestess/gif_samples/sp_atk.gif',
  earth:     '/assets/chierit/ground_monk/gif_samples/sp_atk.gif',
  wind:      '/assets/chierit/wind_hashashin/gif_samples/sp_atk.gif',
  lightning: '/assets/chierit/lightning_ronin/gif_samples/sp_atk.gif',
  holy:      '/assets/Holy_Spell_Effects_Creativekind/Preview/Spell 4_gold_red.gif',
  shadow:    '/assets/chierit/shadow_stalker/gif_samples/e_idle.gif',
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_SUBSTRATES = ['fire', 'water', 'earth', 'wind', 'lightning', 'holy', 'shadow'] as const;
type SubstrateFilter = (typeof ALL_SUBSTRATES)[number] | 'all';

type SortKey = 'season_asc' | 'season_desc' | 'substrate' | 'name';

const SORT_LABELS: Record<SortKey, string> = {
  season_asc:  'Season (oldest first)',
  season_desc: 'Season (newest first)',
  substrate:   'Substrate',
  name:        'Name',
};

// N=5 most recent forms get a recency indicator (gandalf earth-self §6.2/8.5)
const RECENCY_N = 5;

// ---------------------------------------------------------------------------
// CourtBrowser page
// ---------------------------------------------------------------------------

export function CourtBrowser() {
  const courtState = useCourtData();

  const [substrateFilter, setSubstrateFilter] = useState<SubstrateFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('season_asc');

  // Derive the set of season_numbers that are the N=5 most recent
  const recentSeasonNumbers = useMemo(() => {
    if (courtState.status !== 'ready') return new Set<number>();
    const sorted = [...courtState.forms].sort((a, b) => b.season_number - a.season_number);
    return new Set(sorted.slice(0, RECENCY_N).map((f) => f.season_number));
  }, [courtState]);

  // Apply filter + search + sort
  const displayForms = useMemo(() => {
    if (courtState.status !== 'ready') return [];

    let filtered = courtState.forms;

    if (substrateFilter !== 'all') {
      filtered = filtered.filter((f) => f.substrate === substrateFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((f) => f.form_name.toLowerCase().includes(q));
    }

    const sorted = [...filtered];
    switch (sortKey) {
      case 'season_asc':
        sorted.sort((a, b) => a.season_number - b.season_number);
        break;
      case 'season_desc':
        sorted.sort((a, b) => b.season_number - a.season_number);
        break;
      case 'substrate':
        sorted.sort((a, b) => a.substrate.localeCompare(b.substrate));
        break;
      case 'name':
        sorted.sort((a, b) => a.form_name.localeCompare(b.form_name));
        break;
    }

    return sorted;
  }, [courtState, substrateFilter, searchQuery, sortKey]);

  const handleSubstrateToggle = useCallback((s: SubstrateFilter) => {
    setSubstrateFilter((prev) => (prev === s ? 'all' : s));
  }, []);

  const handleClearSearch = useCallback(() => setSearchQuery(''), []);

  // ---- Render states ----

  if (courtState.status === 'loading') {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-gray-600 font-mono">Loading Court of Forms…</p>
      </div>
    );
  }

  if (courtState.status === 'error') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="rounded-lg border border-red-900 bg-red-950/40 p-4">
          <p className="text-sm text-red-400 font-mono">Court data error: {courtState.message}</p>
          <p className="text-xs text-gray-600 mt-1">
            Ensure court.json is present at /public/data/court.json (Path A export).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-200 tracking-wide">Court of Forms</h1>
        <p className="text-xs text-gray-600 mt-0.5">
          {courtState.status === 'ready'
            ? `${courtState.forms.length} form${courtState.forms.length === 1 ? '' : 's'} in your Court`
            : 'Your Court awaits its first ascension'}
        </p>
      </div>

      {/* Controls strip */}
      <div className="space-y-3">
        {/* Substrate filter toggles */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-gray-600 font-mono mr-1 shrink-0">substrate:</span>
          <SubstrateToggle
            value="all"
            active={substrateFilter === 'all'}
            onClick={() => handleSubstrateToggle('all')}
          />
          {ALL_SUBSTRATES.map((s) => (
            <SubstrateToggle
              key={s}
              value={s}
              active={substrateFilter === s}
              onClick={() => handleSubstrateToggle(s)}
            />
          ))}
        </div>

        {/* Search + sort row */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name…"
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500 font-mono"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 text-xs"
                aria-label="Clear search"
              >
                clear
              </button>
            )}
          </div>

          {/* Sort selector */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-400 focus:outline-none focus:border-gray-500 font-mono shrink-0"
          >
            {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty state or card grid */}
      {courtState.status === 'empty' ? (
        <CourtEmptyState />
      ) : displayForms.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-600">No forms match your current filter.</p>
          <button
            onClick={() => { setSubstrateFilter('all'); setSearchQuery(''); }}
            className="mt-2 text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayForms.map((form) => (
            <CourtCard
              key={`${form.earth_self_id}-s${form.season_number}`}
              form={form}
              isRecent={recentSeasonNumbers.has(form.season_number)}
            />
          ))}
        </div>
      )}

      {/* Result count below grid (when filtered) */}
      {courtState.status === 'ready' && displayForms.length > 0 &&
        (substrateFilter !== 'all' || searchQuery.trim()) && (
        <p className="text-xs text-gray-700 font-mono">
          Showing {displayForms.length} of {courtState.forms.length} forms
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CourtEmptyState
// ---------------------------------------------------------------------------

function CourtEmptyState() {
  return (
    <div className="py-16 text-center space-y-3 max-w-md mx-auto">
      <div className="text-gray-700 text-4xl select-none">◈</div>
      <p className="text-sm text-gray-500 leading-relaxed">
        Your Court will populate as you ascend forms across seasons.
      </p>
      <p className="text-xs text-gray-700 leading-relaxed">
        Each season is a life-lived; each form a self-tried. When you ascend,
        that form takes its station here — remembered, named, yours.
      </p>
      <p className="text-xs text-gray-800 mt-4 font-mono">
        Path A export: update /public/data/court.json to see your Court.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SubstrateToggle button
// ---------------------------------------------------------------------------

function SubstrateToggle({
  value,
  active,
  onClick,
}: {
  value: SubstrateFilter;
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

  const colors = SUBSTRATE_COLORS[value];
  const label = SUBSTRATE_GROUPING_LABEL[value] ?? value;

  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors border ${
        active
          ? `${colors.bg} ${colors.text} ${colors.border}`
          : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// CourtCard
// ---------------------------------------------------------------------------

function CourtCard({ form, isRecent }: { form: CourtForm; isRecent: boolean }) {
  const colors = SUBSTRATE_COLORS[form.substrate] ?? SUBSTRATE_COLORS['shadow'];
  const groupingLabel = SUBSTRATE_GROUPING_LABEL[form.substrate] ?? form.substrate;
  const roleLabel = COURT_ROLE_LABEL[form.role] ?? form.role;
  const pathLabel = PATH_TAKEN_LABEL[form.path_taken] ?? form.path_taken;
  const iconicSkill = form.skills.find((s) => s.is_iconic) ?? form.skills[0];
  const thumbnailSrc = SUBSTRATE_THUMBNAIL[form.substrate];

  return (
    <div
      className={`relative rounded-lg border ${colors.border} ${colors.bg} overflow-hidden flex flex-col transition-all duration-150 hover:brightness-110`}
    >
      {/* Recency indicator — top-right ribbon for N=5 most recent forms */}
      {isRecent && (
        <div
          className={`absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${colors.accent} text-gray-950`}
          title="One of your most recently ascended forms"
        >
          recent
        </div>
      )}

      {/* Thumbnail area */}
      <div className={`relative h-24 flex items-center justify-center overflow-hidden bg-gray-950/60`}>
        {thumbnailSrc && (
          <img
            src={thumbnailSrc}
            alt={`${form.substrate} substrate`}
            className="h-full w-auto object-contain opacity-70 mix-blend-screen pointer-events-none select-none"
            loading="lazy"
            onError={(e) => {
              // Gracefully degrade: hide broken image, substrate color bg still shows
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        {/* Substrate label overlay */}
        <div className="absolute bottom-1 left-1.5">
          <span className={`text-[9px] font-mono uppercase tracking-widest ${colors.text} opacity-70`}>
            {groupingLabel}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-1.5 p-3 flex-1">
        {/* Form name (LLM-generated, displayed in full per C3) */}
        <p className={`text-sm font-semibold ${colors.text} leading-snug`}>
          {form.form_name}
        </p>

        {/* Season + archetype row */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs text-gray-500 font-mono">
            Season {form.season_number}
          </span>
          <span className="text-[10px] text-gray-600 font-mono truncate max-w-[120px]" title={form.archetype_name}>
            {form.archetype_name.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Role + class_role_function */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-block text-[9px] font-mono px-1.5 py-0.5 rounded border ${colors.border} ${colors.text} opacity-80 uppercase tracking-wide`}>
            {roleLabel}
          </span>
          <span className="text-[9px] font-mono text-gray-600 uppercase tracking-wide">
            {form.class_role_function}
          </span>
        </div>

        {/* Iconic skill */}
        {iconicSkill && (
          <div className="mt-0.5 pt-1.5 border-t border-gray-800">
            <p className="text-[10px] text-gray-600 font-mono uppercase tracking-wide mb-0.5">
              {iconicSkill.is_iconic ? 'iconic skill' : 'skill'}
            </p>
            <p className="text-xs text-gray-400 leading-snug truncate" title={iconicSkill.name}>
              {iconicSkill.name}
            </p>
            <p className="text-[9px] text-gray-600 font-mono mt-0.5">
              {iconicSkill.geometry_type} · {iconicSkill.role.replace(/_/g, ' ')}
            </p>
          </div>
        )}

        {/* Path taken */}
        <div className="mt-auto pt-1.5">
          <span className="text-[9px] text-gray-700 font-mono">{pathLabel}</span>
        </div>
      </div>

      {/* Court resonance — collapsed bottom strip on hover via CSS group */}
      <div className={`px-3 py-2 border-t border-gray-800/60`}>
        <p className="text-[9px] text-gray-700 font-mono leading-relaxed line-clamp-2" title={form.court_resonance}>
          {form.court_resonance}
        </p>
      </div>
    </div>
  );
}
