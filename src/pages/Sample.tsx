import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { ClassData, SeasonManifest } from '../data/types';
import { resolveElementDisplay } from '../data/types';
import { ELEMENT_COLORS, SP_BUDGET, resolveArchetypeLabel } from '../data/constants';
import { useSeasonData } from '../hooks/useSeasonData';
import { synthesizeSampleLoadout } from '../utils/synthesizeSampleLoadout';
import { SkillTree } from '../components/SkillTree/SkillTree';
import { StatsPanel } from '../components/StatsPanel/StatsPanel';
import { GearGrid } from '../components/GearGrid/GearGrid';
import { SpiritGuide } from '../components/SpiritGuide/SpiritGuide';
import { Tag } from '../components/ui/Tag';
import { FlavorTip } from '../components/ui/FlavorTip';
import { ClassIcon, SeasonIcon } from '../components/ui/ClassIcon';
// M1 / M2 — weapon slots (Cycle 11, MIGRATION.md v1.3). Display page renders engine-emitted kit.
import { WeaponSlot } from '../components/WeaponSlot/WeaponSlot';
import { OffHandSlot } from '../components/WeaponSlot/OffHandSlot';
// Amendment 1 — design-mode toggle (engine generation run, 2026-05-25).
// Shared key with Loadout.tsx so toggle state persists across Loadout ↔ Sample navigation.
import { DesignModeToggle, DESIGN_MODE_STORAGE_KEY } from '../components/DesignMode/DesignModeToggle';
// Gear pool is now sourced per-season from useSeasonData (via season.gearPool).
// Hardcoded Yomi import removed — see useSeasonData.ts for per-season resolution logic.
// TODO(drax): remove this comment block when all seasons ship their own gear_pool.json.

function hexFromInt(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

function baselineAllocations(classData: ClassData): Record<string, number> {
  return Object.fromEntries(classData.skills.map((s) => [s.id, 1]));
}

// Parallel L-12 fix: build display entries from seasonal_elements (v1.5+)
// or canonical elements (pre-v1.5 fallback). Same logic as buildElementBadgeEntries
// in Loadout.tsx — kept local to Sample.tsx to avoid a premature abstraction.
function buildSampleElementEntries(manifest: SeasonManifest): Array<{
  groupingKey: string;
  canonicalKey: string;
  name: string;
  tags: string[];
}> {
  if (manifest.seasonal_elements && Object.keys(manifest.seasonal_elements).length > 0) {
    return Object.entries(manifest.seasonal_elements).map(([groupingKey, entry]) => ({
      groupingKey,
      canonicalKey: entry.canonical_slot,
      name: entry.name,
      tags: entry.tags ?? [],
    }));
  }
  const CANONICAL_ORDER = ['fire', 'wind', 'water', 'earth'] as const;
  return CANONICAL_ORDER.flatMap((canonical) => {
    const entry = manifest.elements[canonical];
    if (!entry) return [];
    return [{ groupingKey: canonical, canonicalKey: canonical, name: entry.name, tags: entry.tags ?? [] }];
  });
}

function ElementMappingRow({ manifest }: { manifest: SeasonManifest }) {
  const entries = buildSampleElementEntries(manifest);
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <span className="text-xs text-gray-600 font-mono mr-0.5">Season elements:</span>
      {entries.map(({ groupingKey, canonicalKey, name, tags }) => {
        const colors = ELEMENT_COLORS[canonicalKey] ?? ELEMENT_COLORS['physical'];
        const tagList = tags.join(' · ');
        return (
          <span
            key={groupingKey}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-mono ${colors.bg} ${colors.text} ${colors.border}`}
          >
            <span className="text-gray-600">{groupingKey}</span>
            <span className="text-gray-600 mx-0.5">→</span>
            <span className="font-semibold">{name}</span>
            {tagList && (
              <span onClick={(e) => e.stopPropagation()}>
                <FlavorTip mode="modal" title={`${name} — ${groupingKey}`} className="ml-0.5">
                  {tagList}
                </FlavorTip>
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function SampleClassHeader({
  classData,
  manifest,
  allClasses,
  onClassChange,
  designMode,
  onDesignModeToggle,
}: {
  classData: ClassData;
  manifest: SeasonManifest;
  allClasses: ClassData[];
  onClassChange: (id: string) => void;
  designMode: boolean;
  onDesignModeToggle: (next: boolean) => void;
}) {
  // Parallel L-13 fix (same pattern): prefer seasonal_dominant_element (v1.5+);
  // fall through resolveElementDisplay (never returns raw canonical-four).
  const dominantElementName = classData.seasonal_dominant_element
    ?? resolveElementDisplay(classData.dominant_element, manifest, `class:${classData.id}`);
  const bm = classData.balance_metadata;
  const anchor = manifest.anchor;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <ClassIcon classId={classData.id} size={32} className="rounded" />
            <h1 className="text-xl font-bold text-gray-100">
              {classData.name ?? classData.id}
            </h1>
            {classData.flavor_text && (
              <FlavorTip mode="modal" title={classData.name ?? classData.id}>
                {classData.flavor_text}
              </FlavorTip>
            )}
          </div>
          {/* L-11 parallel fix: resolveArchetypeLabel substitutes seasonal name for v1.5+ */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Tag>{resolveArchetypeLabel(classData.archetype_tag, manifest)}</Tag>
            <Tag element={classData.dominant_element}>{dominantElementName}</Tag>
            <Tag>{classData.role_orientation}</Tag>
            <Tag>{classData.range_profile}</Tag>
            <Tag>{classData.energy_type}</Tag>
          </div>
          {classData.color_palette?.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mt-2">
              <span className="text-[10px] text-gray-700 font-mono mr-0.5">palette</span>
              {classData.color_palette.map((n, i) => (
                <span
                  key={i}
                  title={hexFromInt(n)}
                  className="w-3 h-3 rounded-sm border border-gray-800 flex-shrink-0"
                  style={{ backgroundColor: hexFromInt(n) }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Balance stats — null-safe: Phase 5 balance_metadata lacks these fields.
            TODO(drax): remove ?? fallbacks when engine aligns Phase 5 balance_metadata. */}
        <div className="flex gap-3 text-right flex-shrink-0">
          <div className="text-center">
            <p className="text-xs font-mono text-gray-100 font-semibold">
              {bm.actual_winrate != null ? `${(bm.actual_winrate * 100).toFixed(1)}%` : '—'}
            </p>
            <p className="text-[10px] font-mono text-gray-600">WR (baseline)</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-mono text-gray-100 font-semibold">
              {bm.convergence_iterations != null ? bm.convergence_iterations : '—'}
            </p>
            <p className="text-[10px] font-mono text-gray-600">Iterations</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-mono text-gray-400 font-semibold">
              {bm.final_modifier != null ? bm.final_modifier.toFixed(4) : '—'}
            </p>
            <p className="text-[10px] font-mono text-gray-600">Modifier</p>
          </div>
        </div>
      </div>

      <div className="py-2 px-3 rounded-lg bg-gray-900/50 border border-gray-800 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <SeasonIcon seasonKey={manifest.season_id} size={20} />
          <span className="text-[10px] text-gray-600 font-mono">{manifest.season_id}</span>
        </div>
        <ElementMappingRow manifest={manifest} />
        <div className="flex items-start gap-1.5">
          <p className="text-[10px] text-gray-600 font-mono flex-1">
            <span className="text-gray-500">Anchor:</span>{' '}
            <span className="text-gray-400">{anchor.name}</span>
            {' · '}
            <span className="italic">{anchor.description}</span>
          </p>
          {anchor.description.length > 40 && (
            <FlavorTip mode="modal" title={anchor.name} className="flex-shrink-0">
              {anchor.description}
            </FlavorTip>
          )}
        </div>
      </div>

      {/* Class picker + design-mode toggle row */}
      <div className="flex flex-wrap items-center gap-3">
        {allClasses.length > 1 && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <label className="text-xs text-gray-600 font-mono flex-shrink-0">Class:</label>
            <select
              value={classData.id}
              onChange={(e) => onClassChange(e.target.value)}
              className="flex-1 max-w-xs bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded px-2 py-1 focus:outline-none focus:border-violet-500"
            >
              {allClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {/* L-11 parallel fix: resolveArchetypeLabel for class picker */}
                  {c.name ?? c.id} — {resolveArchetypeLabel(c.archetype_tag, manifest)}
                </option>
              ))}
            </select>
          </div>
        )}
        {/* Amendment 1 — design-mode toggle (engine generation run, 2026-05-25).
            Shared key with Loadout.tsx: toggle state persists across Loadout ↔ Sample navigation.
            Dispatch G fix: hidden on mobile (sm:flex) — design tool not needed on player mobile
            surface; was rendering mid-header on small screens, obscuring character/class name
            focus area. Visible at sm+ (640px+) where layout has room for it. */}
        <DesignModeToggle
          designMode={designMode}
          onToggle={onDesignModeToggle}
          className="flex-shrink-0 hidden sm:flex"
        />
      </div>
    </div>
  );
}

export function Sample() {
  const { defaultSeason, selectableSeasons } = useSeasonData();

  // Amendment 1 — design-mode toggle state (engine generation run, 2026-05-25).
  // Shared localStorage key with Loadout.tsx ("drax_design_mode") so toggle state
  // persists when user navigates between Loadout and Sample pages.
  const [designMode, setDesignMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DESIGN_MODE_STORAGE_KEY) === 'true';
    } catch {
      return false; // SSR / storage unavailable — default Player-mode
    }
  });

  function handleDesignModeToggle(next: boolean) {
    setDesignMode(next);
    try {
      localStorage.setItem(DESIGN_MODE_STORAGE_KEY, String(next));
    } catch {
      // Storage unavailable — in-memory only (still works for session)
    }
  }

  // Season picker: default to sample-season; user can switch to any real season.
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(
    defaultSeason?.seasonId ?? null
  );

  const season = selectedSeasonId
    ? (selectableSeasons.find((s) => s.seasonId === selectedSeasonId) ?? defaultSeason)
    : defaultSeason;

  // Block 3: filter retired classes from class-select UI (canonical-6 transition, drax v1.17)
  const classes = (season?.classes ?? []).filter((c) => !c.is_retired);

  const [selectedClassId, setSelectedClassId] = useState<string | null>(classes[0]?.id ?? null);

  const classData: ClassData | null =
    classes.find((c) => c.id === selectedClassId) ?? classes[0] ?? null;

  // Computed values (only used when season/classData exist)
  const allocations = (season && classData) ? baselineAllocations(classData) : {};
  const totalSP = classData?.skills.length ?? 0;
  const gearPool = season?.gearPool ?? [];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const synthesizedGear = useMemo(
    () => (classData ? synthesizeSampleLoadout(classData, gearPool) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [classData?.id, season?.seasonId]
  );

  // Placeholder indicator: detect seasons with placeholder skill content.
  // Detection per MIGRATION.md § v2.2: manifest.placeholder_skill_content === true
  // OR (if present) skills[0].phase5_is_placeholder === true.
  const isPlaceholderSeason =
    season?.manifest?.placeholder_skill_content === true ||
    (classData?.skills?.length > 0 && classData.skills[0].phase5_is_placeholder === true);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Season archive view */}
      {(!season || !classData) && (
        <div className="py-16 text-center text-gray-600 font-mono">
          No season data found.
        </div>
      )}
      {season && classData && (
      <>
      {/* Season picker */}
      {selectableSeasons.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600 font-mono flex-shrink-0">Season:</label>
          <select
            value={season?.seasonId ?? ''}
            onChange={(e) => {
              setSelectedSeasonId(e.target.value);
              setSelectedClassId(null); // reset class on season change
            }}
            className="flex-1 max-w-xs bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded px-2 py-1 focus:outline-none focus:border-violet-500"
          >
            {selectableSeasons.map((s) => (
              <option key={s.seasonId} value={s.seasonId}>
                {s.seasonId} — {s.manifest.anchor?.name ?? s.manifest.season_theme_element}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Placeholder skill content indicator (MIGRATION.md § v2.2 + § v2.3 + § v1.67).
          Visible when manifest.placeholder_skill_content === true.
          Applies to Cycle 13 (Phase 5 pending) and Cycle 14 Wave 5 (skill gen pending Cycle 15+). */}
      {isPlaceholderSeason && (
        <div
          className="rounded-lg border border-amber-800/60 bg-amber-950/30 px-4 py-3 flex items-start gap-3"
          data-testid="placeholder-season-indicator"
        >
          <span className="text-amber-500 text-base flex-shrink-0 mt-0.5">◌</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-400">
              Skills are substrate-derived placeholders
            </p>
            <p className="text-xs text-amber-500/80 mt-1 leading-relaxed">
              Kit identities, faction clusters, and balance metadata (win rates, quality vectors,
              cohort) are real engine output. Skill names and descriptions are substrate-derived
              placeholders — full skill tree generation requires a Cycle 15+ engine run.
            </p>
          </div>
        </div>
      )}

      {/* Engine Baseline Banner */}
      <div className="rounded-lg border border-violet-800 bg-violet-950/40 px-4 py-3 flex items-start gap-3">
        <span className="text-violet-400 text-lg flex-shrink-0 mt-0.5">◈</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-violet-300">Engine Baseline View</p>
          <p className="text-xs text-violet-400/80 mt-1 leading-relaxed">
            Every skill at rank 1. Gear shown is the highest fit-score selection from the
            season gear pool — real engine output, assigned by energy type × role orientation ×
            range profile. Seasons without a gear pool show no gear (expected for milestone
            generations). This is the converged state the balance loop tuned against; win rate
            was calculated from this configuration.{' '}
            <Link to="/" className="underline hover:text-violet-300 transition-colors">
              Switch to Loadout
            </Link>{' '}
            to customize.
          </p>
        </div>
      </div>

      <SampleClassHeader
        classData={classData}
        manifest={season.manifest}
        allClasses={classes}
        onClassChange={setSelectedClassId}
        designMode={designMode}
        onDesignModeToggle={handleDesignModeToggle}
      />

      {/* M1 / M2 — Weapon slots (Cycle 11, MIGRATION.md v1.3).
          Display page shows engine-emitted weapon kit (main_weapon + secondary_item).
          WeaponSlot + OffHandSlot are null-safe: section collapses when both null
          (pre-substrate-binding seasons). Cultural / period / quality-tier badges
          (Amendment 2) are woven into WeaponSlot — always visible on display page. */}
      {(classData.main_weapon || classData.secondary_item) && (
        <section className="space-y-2">
          <h2 className="text-xs font-mono text-gray-500 uppercase tracking-wide">
            Weapons
          </h2>
          {/* M1 — main weapon (Amendment 2: WeaponBadges woven into WeaponSlot) */}
          <WeaponSlot weapon={classData.main_weapon} label="Main Weapon" />
          {/* M2 — off-hand (null-safe; SHOW_OFF_HAND_SLOT gate in OffHandSlot) */}
          <OffHandSlot secondaryItem={classData.secondary_item} />
        </section>
      )}

      <section>
        <h2 className="text-xs font-mono text-gray-500 uppercase tracking-wide mb-3">
          Skill Tree — {classData.skills.length} skills · {totalSP} / {SP_BUDGET} SP (baseline)
        </h2>
        {/* Read-only tree: all tiers unlocked (since rank 1 everywhere satisfies thresholds),
            invest/divest are no-ops */}
        <SkillTree
          classData={classData}
          manifest={season.manifest}
          allocations={allocations}
          isTierUnlocked={() => true}
          canInvestSkill={() => ({ ok: false, reason: 'Read-only baseline view' })}
          canDivestSkill={() => ({ ok: false, reason: 'Read-only baseline view' })}
          onInvest={() => {}}
          onDivest={() => {}}
          designMode={designMode}
        />
      </section>

      <StatsPanel
        classData={classData}
        totalSP={totalSP}
        remainingSP={SP_BUDGET - totalSP}
      />

      <GearGrid mode="sample" synthesized={synthesizedGear} />
      <SpiritGuide />

      <div className="pt-2 border-t border-gray-800 flex items-center justify-between gap-4">
        <p className="text-xs text-gray-700 font-mono">
          Read-only — all controls disabled in baseline view
        </p>
        <Link
          to="/"
          className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-mono"
        >
          → Open in Loadout
        </Link>
      </div>

      </>
      )}
    </div>
  );
}
