/**
 * Loadout — /loadout (and /) route
 *
 * cycle-18 consolidated repoint (Issues 1+2+3+5B):
 *   Issue 1 — UX fragmentation fix: this page now consumes public/kit-space/ (QDX-5 37-kit output).
 *             Old season-data view deprecated from active navigation; public/seasons/ JSONs preserved.
 *             /kit-space route redirects here (see App.tsx).
 *   Issue 2 — Visual hierarchy: primary canonical element = bright bordered flag via SUBSTRATE_COLORS.
 *             Flavor word = small grey muted secondary annotation only.
 *   Issue 3 — Featured Characters section at top of page (top-5 gandalf-curated kits;
 *             kit names read from JSON emergent_kit_concept at render time — NOT hardcoded).
 *   Issue 5B — Faction badge per kit card; faction filter operational.
 *             Data consumed from public/kit-space/faction_assignments.json via useKitSpaceData hook.
 *
 * LOCK O AMENDED compliance: NO new UI component shells created. All render helpers are
 * inline functions. Reuses existing SUBSTRATE_COLORS pattern from EAA-6/KitSpace.tsx.
 *
 * Backward-compat: historical EAA-5 v2 kits (kse_20260602_001) accessible via toggle.
 *
 * Data source: public/kit-space/ (synced from engine at Issue 1 data-staging).
 */

import { useState, useMemo, useCallback } from 'react';
import { useKitSpaceData, CURRENT_KIT_EVENT_ID, HISTORICAL_KIT_EVENT_ID } from '../hooks/useKitSpaceData';
import type { KitData, KitSkill, KitT4Selection, KitFactionMap } from '../data/kitSpaceTypes';
import { SUBSTRATE_COLORS, SUBSTRATE_GROUPING_LABEL } from '../data/courtTypes';

// ---------------------------------------------------------------------------
// Constants + helpers
// ---------------------------------------------------------------------------

// Kit-space adds "physical" element; extend substrate colors with a fallback
const KIT_ELEMENT_COLORS: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  ...SUBSTRATE_COLORS,
  physical: { bg: 'bg-gray-900', text: 'text-gray-300', border: 'border-gray-600', accent: 'bg-gray-500' },
};

// Faction accent colors — distinct per faction_id
const FACTION_COLORS: Record<string, { badge: string; text: string; border: string }> = {
  f001: { badge: 'bg-red-950',    text: 'text-red-300',    border: 'border-red-800'    }, // Iron Ground Crushers
  f002: { badge: 'bg-sky-950',    text: 'text-sky-300',    border: 'border-sky-800'    }, // Scattered Meridian Cannons
  f003: { badge: 'bg-lime-950',   text: 'text-lime-300',   border: 'border-lime-800'   }, // Earthen Siege Wardens
};

const ALL_ELEMENTS = ['fire', 'water', 'earth', 'wind', 'lightning', 'holy', 'shadow', 'physical'] as const;
type ElementFilter = (typeof ALL_ELEMENTS)[number] | 'all';

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

// Note 2 guard: check both non-null AND is_active === true before showing T4
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
// FactionBadge — Issue 5B: small colored badge per kit (reuses badge pattern)
// Click on faction badge = filter to that faction's kits (handled in parent)
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
// Issue 2: SkillElementFlag — primary canonical element as bright bordered flag
// Issue 2: FlavorWordAnnotation — flavor word as small grey muted secondary annotation
// ---------------------------------------------------------------------------

function SkillElementFlag({ element }: { element: string }) {
  const colors = getColors(element);
  return (
    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide ${colors.bg} ${colors.text} ${colors.border}`}>
      {element}
    </span>
  );
}

function FlavorWordAnnotation({ word }: { word: string }) {
  // Issue 2: demoted — small grey muted inline annotation, NOT bright/orange/symbol-emphasized
  return (
    <span className="text-[9px] font-mono text-gray-600 italic">
      {word}
    </span>
  );
}

// ---------------------------------------------------------------------------
// KitCard — card grid item (CourtBrowser CourtCard pattern)
// Issue 2: element flag prominent; flavor word demoted
// Issue 5B: faction badge rendered
// ---------------------------------------------------------------------------

function KitCard({
  kit,
  selected,
  factionMap,
  activeFactionId,
  onSelect,
  onFactionClick,
}: {
  kit: KitData;
  selected: boolean;
  factionMap: KitFactionMap;
  activeFactionId: string | null;
  onSelect: () => void;
  onFactionClick: (factionId: string) => void;
}) {
  const colors = getColors(kit.primary_element);
  const meanCohesion = computeMeanCohesion(kit.skills);
  const displayName = kit.emergent_kit_concept ?? formatKitId(kit.kit_id);
  const chainCount = kit.chain_composition?.chain_count ?? null;
  // Note 2: only show T4 indicator when is_active === true
  const hasActiveT4 = isT4Active(kit.t4_selection);
  const faction = factionMap[kit.kit_id] ?? null;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-lg border overflow-hidden flex flex-col transition-all duration-150 hover:brightness-110 focus:outline-none focus:ring-1 focus:ring-orange-500 ${
        selected ? `ring-1 ring-orange-500 ${colors.border}` : colors.border
      } ${colors.bg}`}
    >
      {/* Header strip */}
      <div className={`px-3 pt-3 pb-2`}>
        <div className="flex items-start justify-between gap-1 mb-1">
          {/* Issue 2: element as prominent bordered flag */}
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

        {/* Cohesion score */}
        {meanCohesion !== null && (
          <div className="flex items-center justify-between text-[9px] font-mono text-gray-600 mt-0.5">
            <span>cohesion</span>
            <span className={meanCohesion >= 0.9 ? 'text-green-500' : meanCohesion >= 0.8 ? 'text-yellow-500' : 'text-gray-500'}>
              {meanCohesion.toFixed(3)}
            </span>
          </div>
        )}

        {/* Issue 5B: faction badge */}
        {faction && (
          <div className="mt-auto pt-1">
            <FactionBadge
              factionId={faction.faction_id}
              factionName={faction.faction_name}
              active={activeFactionId === faction.faction_id}
              onClick={(e) => {
                e.stopPropagation();
                onFactionClick(faction.faction_id);
              }}
            />
          </div>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// FeaturedKitCard — Issue 3: larger card for featured characters section
// Reuses KitCard visual patterns (same element flag, faction badge, no new shell)
// ---------------------------------------------------------------------------

function FeaturedKitCard({
  kit,
  isTop1,
  factionMap,
  activeFactionId,
  selected,
  onSelect,
  onFactionClick,
}: {
  kit: KitData;
  isTop1: boolean;
  factionMap: KitFactionMap;
  activeFactionId: string | null;
  selected: boolean;
  onSelect: () => void;
  onFactionClick: (factionId: string) => void;
}) {
  const colors = getColors(kit.primary_element);
  const displayName = kit.emergent_kit_concept ?? formatKitId(kit.kit_id);
  const meanCohesion = computeMeanCohesion(kit.skills);
  const hasActiveT4 = isT4Active(kit.t4_selection);
  const faction = factionMap[kit.kit_id] ?? null;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-lg border overflow-hidden flex flex-col transition-all duration-150 hover:brightness-110 focus:outline-none ${
        isTop1
          ? `border-2 ${colors.border} ring-1 ring-yellow-500/40`
          : colors.border
      } ${colors.bg} ${selected ? 'ring-1 ring-orange-500' : ''}`}
    >
      {/* Top-1 star badge */}
      {isTop1 && (
        <div className="px-3 pt-2 pb-0">
          <span className="text-[10px] font-mono text-yellow-400 font-semibold tracking-widest">
            ★ TOP PICK
          </span>
        </div>
      )}

      {/* Header strip */}
      <div className={`px-3 pt-2 pb-2`}>
        <div className="flex items-start justify-between gap-1 mb-1.5">
          {/* Issue 2: element as prominent bordered flag */}
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

      {/* Stats */}
      <div className="px-3 pb-3 flex flex-col gap-1 flex-1">
        <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
          <span>{kit.skills.length} skills</span>
          {kit.chain_composition?.chain_count != null && (
            <span>{kit.chain_composition.chain_count} chain{kit.chain_composition.chain_count !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Cultural tradition / period — hide gracefully if null/NA */}
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

        {/* Issue 5B: faction badge */}
        {faction && (
          <div className="mt-auto pt-1">
            <FactionBadge
              factionId={faction.faction_id}
              factionName={faction.faction_name}
              active={activeFactionId === faction.faction_id}
              onClick={(e) => {
                e.stopPropagation();
                onFactionClick(faction.faction_id);
              }}
            />
          </div>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// T4SelectionPanel — renders active T4 selection (Note 2: only when is_active)
// ---------------------------------------------------------------------------

function T4SelectionPanel({ t4 }: { t4: KitT4Selection }) {
  const narration = t4.spirit_guide_narration_metadata;
  const alterationType = narration?.alteration_type ?? null;
  const rationale = t4.thematic_rationale ?? narration?.thematic_rationale ?? null;
  const manifestation = narration?.manifestation ?? null;
  const cohesion = t4.phase5_t4_narration_cohesion_score;

  return (
    <div className="mt-3 pt-3 border-t border-gray-800">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-orange-400">T4 Selection</span>
          {alterationType && (
            <span className="text-[10px] font-mono text-gray-300 font-medium">{alterationType}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[9px] font-mono text-gray-600">
          {t4.category_a_strategy && <span>{t4.category_a_strategy}</span>}
          {t4.category_bc_strategy && <span className="text-gray-700">/ {t4.category_bc_strategy}</span>}
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
        <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-3" title={manifestation}>{manifestation}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SkillRow — Issue 2: element flag prominent; flavor word demoted
// ---------------------------------------------------------------------------

function SkillRow({ skill }: { skill: KitSkill }) {
  const flavorWord = skill.ws1a4_flavor_word_used;

  return (
    <div className="py-2 border-b border-gray-800 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-gray-200">{skill.name ?? '—'}</span>
            {/* Issue 2: canonical element = bright bordered flag */}
            <SkillElementFlag element={skill.canonical_element} />
            {/* Issue 2: flavor word = small grey muted inline annotation (NOT orange/symbol) */}
            {flavorWord && (
              <FlavorWordAnnotation word={flavorWord} />
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

// ---------------------------------------------------------------------------
// KitDetailPanel — per-kit detail view (adapts existing SkillDetailPanel pattern)
// Issue 2: element flag prominent at kit + skill level
// Issue 5B: faction badge in header
// ---------------------------------------------------------------------------

function KitDetailPanel({
  kit,
  factionMap,
  onClose,
}: {
  kit: KitData;
  factionMap: KitFactionMap;
  onClose: () => void;
}) {
  const colors = getColors(kit.primary_element);
  const displayName = kit.emergent_kit_concept ?? formatKitId(kit.kit_id);
  const chainCount = kit.chain_composition?.chain_count ?? null;
  const activeT4 = isT4Active(kit.t4_selection) ? kit.t4_selection : null;
  const faction = factionMap[kit.kit_id] ?? null;

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
            <div className="flex items-center gap-2 mb-1">
              {/* Issue 2: element as prominent bordered flag in detail header */}
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide ${colors.bg} ${colors.text} ${colors.border}`}>
                {elementLabel(kit.primary_element)}
              </span>
              <span className="text-[9px] font-mono text-gray-500">{kit.kit_id}</span>
              {/* Issue 5B: faction badge in detail header */}
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
          {/* Issue 2: flavor rate in muted grey — annotation not emphasis */}
          {flavorRate > 0 && (
            <span className="text-gray-600">
              flavor {Math.round(flavorRate * 100)}%
            </span>
          )}
          {kit.t4_selection != null && !isT4Active(kit.t4_selection) && (
            <span className="text-gray-700 italic">t4 selected (inactive)</span>
          )}
        </div>

        {/* Null-field notices — graceful omission */}
        <div className="flex flex-wrap gap-2 mt-2">
          {kit.cultural_tradition == null && (
            <span className="text-[9px] font-mono text-gray-700 italic">cultural tradition: pending substrate enrichment</span>
          )}
          {kit.t4_selection == null && (
            <span className="text-[9px] font-mono text-gray-700 italic">t4 selection: BC-axis coverage gap</span>
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

        {/* T4 selection panel — Note 2: only when is_active */}
        {activeT4 && <T4SelectionPanel t4={activeT4} />}

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
// Loadout page — /loadout and / (default route)
// Issue 1: consumes public/kit-space/ (QDX-5 37-kit output)
// Issue 2: element flag prominence + flavor word demotion throughout
// Issue 3: Featured Characters section at top
// Issue 5B: faction badge + filter
// ---------------------------------------------------------------------------

export function Loadout() {
  // Note 3: default to current event (kse_20260602_008); toggle for historical
  const [showHistorical, setShowHistorical] = useState(false);
  const { kits, factionMap, status, error, refresh, currentEventId, isHistorical } = useKitSpaceData({ showHistorical });

  const [elementFilter, setElementFilter] = useState<ElementFilter>('all');
  const [factionFilter, setFactionFilter] = useState<string | null>(null); // Issue 5B
  const [sortKey, setSortKey] = useState<SortKey>('element');
  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);

  // Issue 5B: faction filter handler — click badge = filter to faction; click again = clear
  const handleFactionClick = useCallback((factionId: string) => {
    setFactionFilter((prev) => (prev === factionId ? null : factionId));
    setSelectedKitId(null);
  }, []);

  // Filtered + sorted kits (element filter + faction filter)
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

  // Issue 3: featured kits — look up from loaded kits by stable kit_id
  const featuredKits = useMemo(
    () => FEATURED_KIT_IDS.map((id) => kits.find((k) => k.kit_id === id) ?? null),
    [kits]
  );

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

  const handleHistoricalToggle = useCallback(() => {
    setShowHistorical((prev) => !prev);
    setSelectedKitId(null);
    setElementFilter('all');
    setFactionFilter(null);
  }, []);

  // ---- Render states ----

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
          <h1 className="text-lg font-semibold text-gray-200 tracking-wide">Loadout</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            {kits.length} kit{kits.length !== 1 ? 's' : ''} — {eventLabel}
          </p>
          {!isHistorical && (
            <p className="text-[10px] text-gray-700 mt-0.5">
              QDX-5 — B4.5 distribution · 3 factions · WS1A.4-lite flavor · multi-T4 selection
            </p>
          )}
        </div>
        {/* Historical access toggle — Path α preservation */}
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

      {/* ------------------------------------------------------------------ */}
      {/* Issue 3: Featured Characters section — top-5 gandalf-curated kits  */}
      {/* Names read from emergent_kit_concept at render time — NOT hardcoded */}
      {/* ------------------------------------------------------------------ */}
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
                  selected={selectedKitId === kit.kit_id}
                  onSelect={() => handleKitSelect(kit.kit_id)}
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

      {/* Detail panel (shown above grid when a kit is selected) */}
      {selectedKit && (
        <KitDetailPanel kit={selectedKit} factionMap={factionMap} onClose={handleDetailClose} />
      )}

      {/* Kit grid — adapts CourtBrowser card grid */}
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
              selected={selectedKitId === kit.kit_id}
              factionMap={factionMap}
              activeFactionId={factionFilter}
              onSelect={() => handleKitSelect(kit.kit_id)}
              onFactionClick={handleFactionClick}
            />
          ))}
        </div>
      )}

      {/* Footer — provenance note */}
      <footer className="pt-4 border-t border-gray-800">
        <p className="text-[10px] text-gray-700 font-mono leading-relaxed">
          Kit space — cycle-18 consolidated view. Data from{' '}
          <code className="bg-gray-900 px-1 rounded">public/kit-space/kits/</code>
          . Showing event{' '}
          <code className="bg-gray-900 px-1 rounded">{currentEventId}</code>
          . Historical seasons (EAA-5 v2) accessible via toggle above.
          Old season-data view deprecated from navigation; season JSONs preserved at{' '}
          <code className="bg-gray-900 px-1 rounded">public/seasons/</code>
          .
        </p>
      </footer>
    </div>
  );
}
