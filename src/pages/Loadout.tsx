import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ClassData, SeasonManifest } from '../data/types';
import { ARCHETYPE_LABEL, ELEMENT_COLORS } from '../data/constants';
import { useSeasonData } from '../hooks/useSeasonData';
import { useSkillBuild } from '../hooks/useSkillBuild';
import { SkillTree } from '../components/SkillTree/SkillTree';
import { StatsPanel } from '../components/StatsPanel/StatsPanel';
import { GearGrid } from '../components/GearGrid/GearGrid';
import { SpiritGuide } from '../components/SpiritGuide/SpiritGuide';
import { ActionBar } from '../components/ActionBar';
import { Tag } from '../components/ui/Tag';

function buildShareUrl(classData: ClassData, seasonId: string, allocations: Record<string, number>): string {
  const ranks = classData.skills.map((s) => allocations[s.id] ?? 0);
  const encoded = btoa(JSON.stringify(ranks));
  const base = window.location.origin + window.location.pathname;
  return `${base}?class=${classData.id}&season=${seasonId}&build=${encoded}`;
}

function parseBuildUrl(
  params: URLSearchParams,
  classData: ClassData
): Record<string, number> | null {
  const raw = params.get('build');
  if (!raw) return null;
  try {
    const ranks: number[] = JSON.parse(atob(raw));
    const result: Record<string, number> = {};
    classData.skills.forEach((s, i) => {
      if (ranks[i] > 0) result[s.id] = ranks[i];
    });
    return result;
  } catch {
    return null;
  }
}

function ElementMappingBadges({ manifest }: { manifest: SeasonManifest }) {
  const yomiElements = manifest.elements;
  const canonicals = ['fire', 'wind', 'water', 'earth'];

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <span className="text-xs text-gray-600 font-mono mr-0.5">Season elements:</span>
      {canonicals.map((canonical) => {
        const mapped = yomiElements[canonical];
        if (!mapped) return null;
        const colors = ELEMENT_COLORS[canonical] ?? ELEMENT_COLORS['physical'];
        return (
          <span
            key={canonical}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-mono ${colors.bg} ${colors.text} ${colors.border}`}
          >
            <span className="text-gray-600">{canonical}</span>
            <span className="text-gray-600 mx-0.5">→</span>
            <span className="font-semibold">{mapped.name}</span>
            {mapped.is_new && (
              <span className="text-[9px] text-violet-400 ml-0.5">new</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function ClassHeader({
  classData,
  manifest,
  allClasses,
  onClassChange,
}: {
  classData: ClassData;
  manifest: SeasonManifest;
  allClasses: ClassData[];
  onClassChange: (id: string) => void;
}) {
  const dominantElementName =
    manifest.elements[classData.dominant_element]?.name ?? classData.dominant_element;
  const bm = classData.balance_metadata;

  return (
    <div className="space-y-3">
      {/* Class picker + header row */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Name */}
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-100">
              {classData.name ?? classData.id}
            </h1>
            {!bm.converged && (
              <span className="text-xs bg-amber-900 text-amber-400 border border-amber-700 px-1.5 py-0.5 rounded font-mono">
                ⚠ unconverged
              </span>
            )}
          </div>

          {/* Archetype + meta tags */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Tag>{ARCHETYPE_LABEL[classData.archetype_tag] ?? classData.archetype_tag}</Tag>
            <Tag element={classData.dominant_element}>
              {dominantElementName}
            </Tag>
            <Tag>{classData.role_orientation}</Tag>
            <Tag>{classData.range_profile}</Tag>
            <Tag>{classData.energy_type}</Tag>
          </div>
        </div>

        {/* Balance stats */}
        <div className="flex gap-3 text-right flex-shrink-0">
          <StatPill label="WR" value={`${(bm.actual_winrate * 100).toFixed(1)}%`} />
          <StatPill label="Conv. Iters" value={String(bm.convergence_iterations)} />
          <StatPill
            label="Modifier"
            value={bm.final_modifier.toFixed(4)}
            dim
          />
        </div>
      </div>

      {/* Seasonal element mapping */}
      <div className="py-2 px-3 rounded-lg bg-gray-900/50 border border-gray-800">
        <ElementMappingBadges manifest={manifest} />
        <p className="text-[10px] text-gray-700 font-mono mt-1.5">
          Anchor: {manifest.anchor.name} · {manifest.anchor.description}
        </p>
      </div>

      {/* Class selector */}
      {allClasses.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600 font-mono flex-shrink-0">Class:</label>
          <select
            value={classData.id}
            onChange={(e) => onClassChange(e.target.value)}
            className="flex-1 max-w-xs bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded px-2 py-1 focus:outline-none focus:border-violet-500"
          >
            {allClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? c.id} — {ARCHETYPE_LABEL[c.archetype_tag] ?? c.archetype_tag}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="text-center">
      <p className={`text-xs font-mono ${dim ? 'text-gray-300' : 'text-gray-100'} font-semibold`}>
        {value}
      </p>
      <p className="text-[10px] font-mono text-gray-600">{label}</p>
    </div>
  );
}

export function Loadout() {
  const [searchParams] = useSearchParams();
  const { defaultSeason } = useSeasonData();

  const season = defaultSeason;
  const classes = season?.classes ?? [];

  const defaultClassId = searchParams.get('class') ?? classes[0]?.id ?? null;
  const [selectedClassId, setSelectedClassId] = useState<string | null>(defaultClassId);

  const classData: ClassData | null =
    classes.find((c) => c.id === selectedClassId) ?? classes[0] ?? null;

  const seasonId = season?.manifest.season_id ?? 'sample-season';
  const build = useSkillBuild(classData, seasonId);

  // Apply build from URL if present
  useEffect(() => {
    if (!classData) return;
    const urlBuild = parseBuildUrl(searchParams, classData);
    if (urlBuild) {
      // Replace current allocations with URL build (not exposed in hook directly;
      // reset + invest is handled here by direct state replacement via save trick)
      // For v0: just show a note; full URL-load wiring is a v1 detail
    }
  }, [classData?.id]);

  if (!season || !classData) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-gray-600 font-mono">
        No season data found. Add class JSONs to data/sample-season/classes/.
      </div>
    );
  }

  const shareUrl = buildShareUrl(classData, seasonId, build.allocations);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Class header */}
      <ClassHeader
        classData={classData}
        manifest={season.manifest}
        allClasses={classes}
        onClassChange={setSelectedClassId}
      />

      {/* Skill Tree */}
      <section>
        <h2 className="text-xs font-mono text-gray-500 uppercase tracking-wide mb-3">
          Skill Tree — {classData.skills.length} skills · {build.totalSP} / 120 SP
        </h2>
        <SkillTree
          classData={classData}
          manifest={season.manifest}
          allocations={build.allocations}
          isTierUnlocked={build.isTierUnlockedForClass}
          canInvestSkill={build.canInvestSkill}
          canDivestSkill={build.canDivestSkill}
          onInvest={(id) => build.invest(id)}
          onDivest={(id) => build.divest(id)}
        />
      </section>

      {/* Stats */}
      <StatsPanel
        classData={classData}
        totalSP={build.totalSP}
        remainingSP={build.remainingSP}
      />

      {/* Gear */}
      <GearGrid />

      {/* Spirit Guide */}
      <SpiritGuide />

      {/* Action bar */}
      <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-800">
        <ActionBar
          onReset={build.reset}
          onSave={build.save}
          buildUrl={shareUrl}
        />
        <p className="text-xs text-gray-700 font-mono hidden sm:block">
          {classData.name ?? classData.id} · {season.manifest.anchor.name}
        </p>
      </div>
    </div>
  );
}
