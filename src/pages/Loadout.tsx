/**
 * Loadout — /loadout (and /) route
 *
 * cycle-18 recovery-2 (SECOND LOCK L): restored rich per-character view per Matt
 * 2026-06-02 directive. Mirrors Sample.tsx structure but consumes kit-space data
 * via useKitSpaceData (NOT useSeasonData). Default kit = kit_shadow_000007
 * ("Duskweaver of the Eclipsed Meridian"), the top-1 gandalf-curated pick.
 *
 * Kit selector: dropdown at top, switches between all 37 kits.
 * URL param ?kit=kit_shadow_000007 supported — KitBrowser links here with the
 * selected kit pre-loaded.
 *
 * Issue 1 fix: element selector uses canonical-7+1 primary names (Fire/Water/Earth/
 * Wind/Lightning/Holy/Shadow/Physical) — NOT flavor pool words.
 *
 * Issue 2 fix: equipment displayed per kit via substrate_trace (weapon identity)
 * and t4_selection (T4 architecture). Gear_representative is NOT present on kit-space
 * kits (it requires a full season-manifest run). Substrate trace + T4 are surfaced.
 * Graceful "—" shown for full gear grid (pending EAA-8 gear generation for kit space).
 *
 * Data shape gaps vs Sample.tsx (season-manifest ClassData):
 *   - main_weapon / secondary_item: NOT in kit JSON. Substrate weapon identity shown
 *     via substrate_trace fields instead. WeaponSlot component not used (incompatible
 *     shape). TODO(drax): remove override when EAA-8 ships weapon descriptors per kit.
 *   - gear_representative: NOT in kit JSON. GearGrid + Cycle14GearDisplay not rendered.
 *     TODO(drax): remove override when EAA-8 ships gear_representative per kit.
 *   - stat_distribution: NOT in kit JSON. StatsPanel not rendered.
 *     TODO(drax): remove override when engine ships stat_distribution per kit.
 *   - balance_metadata (winrate / modifier): NOT in kit JSON. Omitted gracefully.
 *     TODO(drax): remove override when engine ships per-kit balance_metadata.
 *   - SpiritGuide: rendered (no data required — it's a placeholder card per current
 *     SpiritGuide.tsx implementation).
 *   - DesignModeToggle: preserved with shared localStorage key.
 *
 * T4 display: kit JSON has t4_selection (KitT4Selection shape) — rendered via inline
 * T4SelectionPanel adapted from cycle-18 Loadout.tsx. NOT using Cycle14T4Panel (which
 * expects ClassData-shaped T4Candidate[] arrays — incompatible shape).
 *
 * Skills display: inline SkillRow pattern (adapted from cycle-18 Loadout.tsx). NOT
 * using SkillTree (requires SeasonManifest for element name resolution — incompatible).
 *
 * LOCK O AMENDED: no new component shells. All render helpers inline. Reuses
 * DesignModeToggle, SpiritGuide, FlavorTip, Tag from existing component library.
 * Additive route page per EAA-6/7 precedent.
 */

import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useKitSpaceData, CURRENT_KIT_EVENT_ID } from '../hooks/useKitSpaceData';
import type { KitData, KitSkill, KitT4Selection, KitFactionMap } from '../data/kitSpaceTypes';
import { SUBSTRATE_COLORS } from '../data/courtTypes';
import { SpiritGuide } from '../components/SpiritGuide/SpiritGuide';
import { Tag } from '../components/ui/Tag';
import { FlavorTip } from '../components/ui/FlavorTip';
import { DesignModeToggle, DESIGN_MODE_STORAGE_KEY } from '../components/DesignMode/DesignModeToggle';
import { EquippedSlotsGrid } from '../components/GearGrid/EquippedSlotsGrid';
import type { SerializedLoadout } from '../data/serializedLoadout';

// ---------------------------------------------------------------------------
// Constants + helpers
// ---------------------------------------------------------------------------

const KIT_ELEMENT_COLORS: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  ...SUBSTRATE_COLORS,
  physical: { bg: 'bg-gray-900', text: 'text-gray-300', border: 'border-gray-600', accent: 'bg-gray-500' },
};

// Issue 1 fix: canonical-7+1 primary element names (NOT flavor pool words)
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

const FACTION_COLORS: Record<string, { badge: string; text: string; border: string }> = {
  f001: { badge: 'bg-red-950',  text: 'text-red-300',  border: 'border-red-800'  },
  f002: { badge: 'bg-sky-950',  text: 'text-sky-300',  border: 'border-sky-800'  },
  f003: { badge: 'bg-lime-950', text: 'text-lime-300', border: 'border-lime-800' },
};

// Default kit: top-1 gandalf-curated pick
const DEFAULT_KIT_ID = 'kit_shadow_000007';

function getColors(element: string) {
  return KIT_ELEMENT_COLORS[element] ?? KIT_ELEMENT_COLORS['physical'];
}

// Issue 1 fix: canonical primary element label (NOT flavor grouping label)
function primaryElementLabel(element: string): string {
  return CANONICAL_ELEMENT_LABEL[element] ?? element.charAt(0).toUpperCase() + element.slice(1);
}

function formatKitId(kitId: string): string {
  const parts = kitId.split('_');
  if (parts.length === 3) {
    const seq = parseInt(parts[2], 10);
    return `${parts[1].charAt(0).toUpperCase() + parts[1].slice(1)} #${seq}`;
  }
  return kitId;
}

function computeMeanCohesion(skills: KitSkill[]): number | null {
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
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-500 font-mono">Loading loadout...</p>
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
// SkillRow — skill display adapted for kit-space KitSkill shape.
// Issue 1 fix: canonical element label (primary name, not flavor word).
// ---------------------------------------------------------------------------

function SkillRow({ skill, designMode }: { skill: KitSkill; designMode: boolean }) {
  const colors = getColors(skill.canonical_element);
  const flavorWord = skill.ws1a4_flavor_word_used;

  return (
    <div className="py-2 border-b border-gray-800 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-gray-200">{skill.name ?? '—'}</span>
            {/* Issue 1 fix: canonical primary element name as bordered flag */}
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide ${colors.bg} ${colors.text} ${colors.border}`}>
              {primaryElementLabel(skill.canonical_element)}
            </span>
            {/* Flavor word: demoted — small grey muted annotation (NOT primary emphasis) */}
            {flavorWord && (
              <span className="text-[9px] font-mono text-gray-600 italic">{flavorWord}</span>
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
          {designMode && (
            <div className="mt-1 flex flex-wrap gap-x-3 text-[9px] font-mono text-gray-700">
              <span>dmg ×{skill.damage_multiplier.toFixed(2)}</span>
              <span>scale ×{skill.scaling_coefficient.toFixed(2)}</span>
              {skill.geometry_type && <span>{skill.geometry_type}</span>}
            </div>
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

// ---------------------------------------------------------------------------
// T4SelectionPanel — renders active T4 selection from kit's t4_selection field.
// Adapted from cycle-18 Loadout.tsx T4SelectionPanel.
// ---------------------------------------------------------------------------

function T4SelectionPanel({ t4 }: { t4: KitT4Selection }) {
  const narration = t4.spirit_guide_narration_metadata;
  const alterationType = narration?.alteration_type ?? null;
  const rationale = t4.thematic_rationale ?? narration?.thematic_rationale ?? null;
  const manifestation = narration?.manifestation ?? null;
  const cohesion = t4.phase5_t4_narration_cohesion_score;

  return (
    <div className="rounded-lg border border-violet-800/60 bg-violet-950/25 px-4 py-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold bg-violet-900/40 text-violet-400 border-violet-700/60">
            T4 Selection
          </span>
          {alterationType && (
            <span className="text-[10px] font-mono text-gray-300 font-medium">{alterationType}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[9px] font-mono text-gray-600">
          {t4.category_a_strategy && <span>{t4.category_a_strategy.replace(/_/g, ' ')}</span>}
          {t4.category_bc_strategy && <span className="text-gray-700">/ {t4.category_bc_strategy.replace(/_/g, ' ')}</span>}
          {cohesion != null && (
            <span className={cohesion >= 0.9 ? 'text-green-500' : cohesion >= 0.8 ? 'text-yellow-500' : 'text-gray-500'}>
              {cohesion.toFixed(2)}
            </span>
          )}
        </div>
      </div>
      {rationale && (
        <p className="text-[10px] text-gray-400 leading-relaxed mb-1.5 italic">{rationale}</p>
      )}
      {manifestation && (
        <p className="text-[10px] text-gray-500 leading-relaxed">{manifestation}</p>
      )}
      {/* Scope + scores row */}
      <div className="mt-2 flex flex-wrap gap-x-4 text-[9px] font-mono text-gray-700">
        {t4.t4_scope && <span>scope: {t4.t4_scope.replace(/_/g, ' ')}</span>}
        {t4.net_synergy_score != null && <span>synergy: {t4.net_synergy_score}</span>}
        {t4.resolve_score != null && <span>resolve: {t4.resolve_score}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SubstratePanel — surfaces kit substrate_trace fields as gear/weapon proxy.
// Issue 2 fix: equipment section. Full WeaponDescriptor not available on kit JSON;
// substrate_trace provides weapon identity. GearGrid/Cycle14GearDisplay not rendered
// (gear_representative absent from kit JSON — pending EAA-8).
// TODO(drax): remove when EAA-8 ships weapon descriptors + gear_representative per kit.
// ---------------------------------------------------------------------------

function SubstratePanel({ kit, designMode }: { kit: KitData; designMode: boolean }) {
  const trace = kit.substrate_trace;
  const chain = kit.chain_composition;

  if (!trace) {
    return (
      <div className="py-3 px-4 rounded-lg border border-dashed border-gray-800 text-[10px] font-mono text-gray-700">
        No substrate trace available.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Weapon identity from substrate (proxy for WeaponSlot — see TODO above) */}
      <div className="py-2 px-3 rounded-lg bg-gray-900/50 border border-gray-800">
        <p className="text-[10px] text-gray-600 font-mono mb-1.5">Main Weapon (substrate-bound)</p>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] font-mono text-gray-400">
          <span className="text-gray-300 font-semibold">{trace.archetype_tag?.replace(/_/g, ' ') ?? '—'}</span>
          <span>energy: {trace.energy_type ?? '—'}</span>
          {chain?.bc_range && <span>range: {chain.bc_range}</span>}
          {chain?.bc_attribute && <span>attribute: {chain.bc_attribute}</span>}
        </div>
        {(trace.cultural_tradition || trace.period) && (
          <div className="mt-1 text-[9px] font-mono text-gray-600">
            {trace.cultural_tradition && trace.cultural_tradition !== 'null' ? trace.cultural_tradition : '—'}
            {trace.period && trace.period !== 'null' ? ` · ${trace.period}` : ''}
          </div>
        )}
        {(!trace.cultural_tradition || trace.cultural_tradition === 'null') && (
          <p className="mt-1 text-[9px] font-mono text-gray-700 italic">
            cultural tradition: pending substrate enrichment (EAA-8)
          </p>
        )}
      </div>

      {/* Gear grid placeholder — pending EAA-8 gear_representative per kit */}
      {/* TODO(drax): remove when EAA-8 ships gear_representative per kit. */}
      <div className="rounded-lg border border-dashed border-gray-800 bg-gray-900/20 px-4 py-4">
        <p className="text-xs font-mono text-gray-600 mb-1">Gear Representative — pending EAA-8</p>
        <p className="text-[10px] font-mono text-gray-700 leading-relaxed">
          Full gear representative (11 slots) requires EAA-8 engine run. Season-manifest
          classes carry <code className="bg-gray-900/60 px-0.5 rounded">gear_representative</code>;
          kit-space kits do not yet include this field.
        </p>
        {designMode && (
          <div className="mt-2 flex flex-wrap gap-x-4 text-[9px] font-mono text-gray-700">
            {trace.role_orientation && <span>role: {trace.role_orientation}</span>}
            {trace.range_profile && <span>range_profile: {trace.range_profile}</span>}
            <span>source: {trace.source}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KitHeader — top section mirroring SampleClassHeader from Sample.tsx
// ---------------------------------------------------------------------------

function KitHeader({
  kit,
  allKits,
  factionMap,
  designMode,
  onDesignModeToggle,
  onKitChange,
}: {
  kit: KitData;
  allKits: KitData[];
  factionMap: KitFactionMap;
  designMode: boolean;
  onDesignModeToggle: (next: boolean) => void;
  onKitChange: (id: string) => void;
}) {
  const colors = getColors(kit.primary_element);
  const displayName = kit.emergent_kit_concept ?? formatKitId(kit.kit_id);
  const chainCount = kit.chain_composition?.chain_count ?? null;
  const meanCohesion = computeMeanCohesion(kit.skills);
  const faction = factionMap[kit.kit_id] ?? null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-100">
              {displayName}
            </h1>
            {kit.emergent_kit_concept && (
              <FlavorTip mode="modal" title={displayName}>
                {kit.kit_id}
              </FlavorTip>
            )}
          </div>
          {/* Kit identity tags */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {/* Issue 1 fix: primary element = canonical name (Fire/Shadow/etc.) NOT flavor word */}
            <Tag element={kit.primary_element}>{primaryElementLabel(kit.primary_element)}</Tag>
            {kit.substrate_trace?.archetype_tag && (
              <Tag>{kit.substrate_trace.archetype_tag.replace(/_/g, ' ')}</Tag>
            )}
            {kit.substrate_trace?.energy_type && (
              <Tag>{kit.substrate_trace.energy_type}</Tag>
            )}
            {kit.chain_composition?.bc_range && (
              <Tag>{kit.chain_composition.bc_range}</Tag>
            )}
            {kit.chain_composition?.bc_attribute && (
              <Tag>{kit.chain_composition.bc_attribute}</Tag>
            )}
            {faction && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-mono uppercase tracking-wide ${
                FACTION_COLORS[faction.faction_id]?.badge ?? 'bg-gray-900'
              } ${
                FACTION_COLORS[faction.faction_id]?.text ?? 'text-gray-400'
              } ${
                FACTION_COLORS[faction.faction_id]?.border ?? 'border-gray-700'
              }`}>
                {faction.faction_name}
              </span>
            )}
          </div>
        </div>

        {/* Cohesion + chain stats */}
        <div className="flex gap-3 text-right flex-shrink-0">
          <div className="text-center">
            <p className="text-xs font-mono text-gray-100 font-semibold">
              {kit.skills.length}
            </p>
            <p className="text-[10px] font-mono text-gray-600">Skills</p>
          </div>
          {chainCount !== null && (
            <div className="text-center">
              <p className="text-xs font-mono text-gray-100 font-semibold">
                {chainCount}
              </p>
              <p className="text-[10px] font-mono text-gray-600">Chain{chainCount !== 1 ? 's' : ''}</p>
            </div>
          )}
          {meanCohesion !== null && (
            <div className="text-center">
              <p className={`text-xs font-mono font-semibold ${meanCohesion >= 0.9 ? 'text-green-400' : meanCohesion >= 0.8 ? 'text-yellow-400' : 'text-gray-400'}`}>
                {meanCohesion.toFixed(3)}
              </p>
              <p className="text-[10px] font-mono text-gray-600">Cohesion</p>
            </div>
          )}
        </div>
      </div>

      {/* Kit metadata strip — mirrors season anchor strip in Sample.tsx */}
      <div className="py-2 px-3 rounded-lg bg-gray-900/50 border border-gray-800 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide ${colors.bg} ${colors.text} ${colors.border}`}>
            {primaryElementLabel(kit.primary_element)}
          </span>
          <span className="text-[10px] text-gray-600 font-mono">{kit.kit_id}</span>
          <span className="text-[10px] text-gray-700 font-mono">{CURRENT_KIT_EVENT_ID}</span>
        </div>
        {/* BC axis summary */}
        {kit.chain_composition && (
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] font-mono text-gray-500">
            {kit.chain_composition.bc_range && <span>range: <span className="text-gray-400">{kit.chain_composition.bc_range}</span></span>}
            {kit.chain_composition.bc_tempo && <span>tempo: <span className="text-gray-400">{kit.chain_composition.bc_tempo}</span></span>}
            {kit.chain_composition.bc_amplitude && <span>amplitude: <span className="text-gray-400">{kit.chain_composition.bc_amplitude}</span></span>}
            {kit.chain_composition.bc_proxy_density && kit.chain_composition.bc_proxy_density !== 'none' && (
              <span>density: <span className="text-gray-400">{kit.chain_composition.bc_proxy_density}</span></span>
            )}
          </div>
        )}
        {/* Provenance */}
        {kit.generation_timestamp && (
          <p className="text-[9px] text-gray-700 font-mono">
            generated: {kit.generation_timestamp.slice(0, 10)}
            {kit.engine_version && ` · engine: ${kit.engine_version}`}
            {kit.lineage_tags?.substrate_provenance && ` · ${kit.lineage_tags.substrate_provenance}`}
          </p>
        )}
      </div>

      {/* Kit selector + design-mode toggle row */}
      <div className="flex flex-wrap items-center gap-3">
        {allKits.length > 1 && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <label className="text-xs text-gray-600 font-mono flex-shrink-0">Kit:</label>
            <select
              value={kit.kit_id}
              onChange={(e) => onKitChange(e.target.value)}
              className="flex-1 max-w-sm bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded px-2 py-1 focus:outline-none focus:border-violet-500"
            >
              {allKits.map((k) => (
                <option key={k.kit_id} value={k.kit_id}>
                  {k.emergent_kit_concept ?? formatKitId(k.kit_id)} — {primaryElementLabel(k.primary_element)}
                </option>
              ))}
            </select>
          </div>
        )}
        <DesignModeToggle
          designMode={designMode}
          onToggle={onDesignModeToggle}
          className="flex-shrink-0 hidden sm:flex"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loadout — /loadout and / (default route)
// Rich per-character view, kit-space data, Issue 1 + 2 fixes.
// ---------------------------------------------------------------------------

export function Loadout() {
  const [searchParams] = useSearchParams();
  const initialKitId = searchParams.get('kit') ?? DEFAULT_KIT_ID;

  const { kits, factionMap, status, error, refresh } = useKitSpaceData();

  // Amendment 1 — design-mode toggle (shared localStorage key with Sample.tsx)
  const [designMode, setDesignMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DESIGN_MODE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  function handleDesignModeToggle(next: boolean) {
    setDesignMode(next);
    try {
      localStorage.setItem(DESIGN_MODE_STORAGE_KEY, String(next));
    } catch {
      // Storage unavailable — in-memory only
    }
  }

  // Stable sorted kit list for the dropdown
  const sortedKits = useMemo(() => {
    return [...kits].sort((a, b) => {
      const el = a.primary_element.localeCompare(b.primary_element);
      return el !== 0 ? el : a.kit_id.localeCompare(b.kit_id);
    });
  }, [kits]);

  // Selected kit: initialise from ?kit= param or default; falls back to first loaded
  const [selectedKitId, setSelectedKitId] = useState<string>(initialKitId);

  // After kits load: verify selected id is valid (user may have arrived via URL param
  // before kits loaded). If kit not found, fall back to default or first kit.
  const kit: KitData | null = useMemo(() => {
    if (!kits.length) return null;
    return (
      kits.find((k) => k.kit_id === selectedKitId) ??
      kits.find((k) => k.kit_id === DEFAULT_KIT_ID) ??
      kits[0]
    );
  }, [kits, selectedKitId]);

  // Group skills by tier for tiered skill tree display
  const skillsByTier = useMemo(() => {
    if (!kit) return {};
    const groups: Record<number, KitSkill[]> = {};
    for (const skill of kit.skills) {
      if (!groups[skill.tier]) groups[skill.tier] = [];
      groups[skill.tier].push(skill);
    }
    return groups;
  }, [kit]);

  const tiers = useMemo(
    () => Object.keys(skillsByTier).map(Number).sort((a, b) => a - b),
    [skillsByTier]
  );

  const activeT4 = kit && isT4Active(kit.t4_selection) ? kit.t4_selection : null;

  // ---- Render states ----

  if (status === 'idle' || status === 'loading') return <LoadingSpinner />;
  if (status === 'error') return <ErrorState message={error ?? 'Unknown error'} onRetry={refresh} />;

  if (!kit) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-gray-600 font-mono">
        Kit not found.{' '}
        <Link to="/kits" className="underline hover:text-gray-400">Browse all kits</Link>
      </div>
    );
  }

  const colors = getColors(kit.primary_element);
  const isPlaceholderKit = kit.skills.some((s) => s.phase5_is_placeholder === true);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Placeholder skill content indicator */}
      {isPlaceholderKit && (
        <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 px-4 py-3 flex items-start gap-3">
          <span className="text-amber-500 text-base flex-shrink-0 mt-0.5">◌</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-400">
              Skills are substrate-derived placeholders
            </p>
            <p className="text-xs text-amber-500/80 mt-1 leading-relaxed">
              Kit identity and T4 architecture are real engine output. Skill names and
              descriptions are substrate-derived placeholders pending Cycle 15+ skill
              generation.
            </p>
          </div>
        </div>
      )}

      {/* Engine banner — mirrors Sample.tsx baseline banner */}
      <div className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${colors.border} bg-gray-950/60`}>
        <span className={`text-lg flex-shrink-0 mt-0.5 ${colors.text}`}>◈</span>
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${colors.text}`}>Kit Space — {kit.emergent_kit_concept ?? formatKitId(kit.kit_id)}</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            QDX-5 kit-space output (kse_20260602_008). B4.5 substrate-selection · WS1A.4-lite
            flavor · multi-T4 selection. Gear representative pending EAA-8.{' '}
            <Link to="/kits" className="underline hover:text-gray-400 transition-colors">
              Browse all kits
            </Link>{' '}
            or{' '}
            <Link to="/sample" className="underline hover:text-gray-400 transition-colors">
              view season-manifest baseline
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Kit header — character identity, selector, design-mode toggle */}
      <KitHeader
        kit={kit}
        allKits={sortedKits}
        factionMap={factionMap}
        designMode={designMode}
        onDesignModeToggle={handleDesignModeToggle}
        onKitChange={setSelectedKitId}
      />

      {/* Issue 2: Equipment section — substrate weapon proxy + gear placeholder */}
      <section className="space-y-2">
        <h2 className="text-xs font-mono text-gray-500 uppercase tracking-wide">
          Equipment
        </h2>
        <SubstratePanel kit={kit} designMode={designMode} />

        {/* Path B Step 1a (drax seam 4): serialized 10-slot equipped surface.
            Consumes the engine's serialize_loadout() form (10 canonical keys, empties → null);
            tolerant of legacy 4-key shapes. Kit-space JSON does not yet carry a serialized
            loadout (gear pending EAA-8), so this renders all 10 slots cleanly empty for now —
            it activates automatically once the kit carries a serialized_loadout / loadout field.
            TODO(drax): drop the `?? null` fallback once EAA-8 ships a serialized loadout per kit. */}
        <EquippedSlotsGrid
          loadout={
            ((kit as unknown as {
              serialized_loadout?: SerializedLoadout | null;
              loadout?: SerializedLoadout | null;
            }).serialized_loadout ??
              (kit as unknown as { loadout?: SerializedLoadout | null }).loadout) ??
            null
          }
        />
      </section>

      {/* Skill Tree — tiered display mirroring Sample.tsx SkillTree structure */}
      <section>
        <h2 className="text-xs font-mono text-gray-500 uppercase tracking-wide mb-3">
          Skill Tree — {kit.skills.length} skills
        </h2>
        <div className="rounded-lg border border-gray-800 bg-gray-900/20">
          {tiers.length === 0 ? (
            <div className="px-4 py-6 text-center text-[10px] font-mono text-gray-700">No skills.</div>
          ) : (
            tiers.map((tier) => (
              <div key={tier} className="px-4 py-3 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-600">
                    Tier {tier}
                  </span>
                  <div className="flex-1 h-px bg-gray-800" />
                  <span className="text-[9px] font-mono text-gray-700">
                    {skillsByTier[tier].length} skill{skillsByTier[tier].length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div>
                  {skillsByTier[tier].map((skill) => (
                    <SkillRow key={skill.id} skill={skill} designMode={designMode} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* T4 Architecture — active T4 selection from kit JSON */}
      {activeT4 ? (
        <section className="space-y-2">
          <h2 className="text-xs font-mono text-gray-500 uppercase tracking-wide">
            T4 Architecture
          </h2>
          <T4SelectionPanel t4={activeT4} />
        </section>
      ) : kit.t4_selection != null ? (
        <section>
          <h2 className="text-xs font-mono text-gray-500 uppercase tracking-wide mb-2">
            T4 Architecture
          </h2>
          <div className="rounded-lg border border-gray-800 bg-gray-900/20 px-4 py-3">
            <p className="text-[10px] font-mono text-gray-700 italic">
              T4 selected (inactive) — BC-axis coverage gap suppressed display.
              {designMode && kit.t4_selection.candidate_id && (
                <span className="ml-1 text-gray-800">candidate: {kit.t4_selection.candidate_id}</span>
              )}
            </p>
          </div>
        </section>
      ) : (
        <section>
          <h2 className="text-xs font-mono text-gray-500 uppercase tracking-wide mb-2">
            T4 Architecture
          </h2>
          <div className="rounded-lg border border-gray-800 bg-gray-900/20 px-4 py-3">
            <p className="text-[10px] font-mono text-gray-700 italic">
              No T4 selection — BC-axis coverage gap (4/37 kits in QDX-5).
            </p>
          </div>
        </section>
      )}

      {/* Spirit Guide — placeholder card (no kit-specific data needed) */}
      <SpiritGuide />

      {/* Footer */}
      <div className="pt-2 border-t border-gray-800 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-xs text-gray-700 font-mono">
          Kit-space view — QDX-5 engine output.
        </p>
        <div className="flex items-center gap-4">
          <Link to="/kits" className="text-xs text-gray-600 hover:text-gray-400 transition-colors font-mono">
            Browse all kits
          </Link>
          <Link to="/sample" className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-mono">
            Season-manifest baseline
          </Link>
        </div>
      </div>

    </div>
  );
}
