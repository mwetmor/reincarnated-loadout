import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { ClassData, GearCatalog, SeasonManifest } from '../data/types';
import { ARCHETYPE_LABEL, ELEMENT_COLORS, SP_BUDGET } from '../data/constants';
import { useSeasonData } from '../hooks/useSeasonData';
import { synthesizeSampleLoadout } from '../utils/synthesizeSampleLoadout';
import { SkillTree } from '../components/SkillTree/SkillTree';
import { StatsPanel } from '../components/StatsPanel/StatsPanel';
import { GearGrid } from '../components/GearGrid/GearGrid';
import { SpiritGuide } from '../components/SpiritGuide/SpiritGuide';
import { Tag } from '../components/ui/Tag';
import { FlavorTip } from '../components/ui/FlavorTip';
import { ClassIcon, SeasonIcon } from '../components/ui/ClassIcon';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import gearCatalogRaw from '../../data/sample-season/gear/catalog.json';
const gearCatalog = gearCatalogRaw as GearCatalog;

function hexFromInt(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

function baselineAllocations(classData: ClassData): Record<string, number> {
  return Object.fromEntries(classData.skills.map((s) => [s.id, 1]));
}

function ElementMappingRow({ manifest }: { manifest: SeasonManifest }) {
  const canonicals = ['fire', 'wind', 'water', 'earth'];
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <span className="text-xs text-gray-600 font-mono mr-0.5">Season elements:</span>
      {canonicals.map((canonical) => {
        const mapped = manifest.elements[canonical];
        if (!mapped) return null;
        const colors = ELEMENT_COLORS[canonical] ?? ELEMENT_COLORS['physical'];
        const tagList = mapped.tags?.join(' · ');
        return (
          <span
            key={canonical}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-mono ${colors.bg} ${colors.text} ${colors.border}`}
          >
            <span className="text-gray-600">{canonical}</span>
            <span className="text-gray-600 mx-0.5">→</span>
            <span className="font-semibold">{mapped.name}</span>
            {tagList && (
              <span onClick={(e) => e.stopPropagation()}>
                <FlavorTip mode="modal" title={`${mapped.name} — ${canonical}`} className="ml-0.5">
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
}: {
  classData: ClassData;
  manifest: SeasonManifest;
  allClasses: ClassData[];
  onClassChange: (id: string) => void;
}) {
  const dominantElementName =
    manifest.elements[classData.dominant_element]?.name ?? classData.dominant_element;
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
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Tag>{ARCHETYPE_LABEL[classData.archetype_tag] ?? classData.archetype_tag}</Tag>
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

        <div className="flex gap-3 text-right flex-shrink-0">
          <div className="text-center">
            <p className="text-xs font-mono text-gray-100 font-semibold">
              {(bm.actual_winrate * 100).toFixed(1)}%
            </p>
            <p className="text-[10px] font-mono text-gray-600">WR (baseline)</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-mono text-gray-100 font-semibold">
              {bm.convergence_iterations}
            </p>
            <p className="text-[10px] font-mono text-gray-600">Iterations</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-mono text-gray-400 font-semibold">
              {bm.final_modifier.toFixed(4)}
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

export function Sample() {
  const { defaultSeason } = useSeasonData();
  const season = defaultSeason;
  const classes = season?.classes ?? [];

  const [selectedClassId, setSelectedClassId] = useState<string | null>(classes[0]?.id ?? null);

  const classData: ClassData | null =
    classes.find((c) => c.id === selectedClassId) ?? classes[0] ?? null;

  if (!season || !classData) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-gray-600 font-mono">
        No season data found.
      </div>
    );
  }

  const allocations = baselineAllocations(classData);
  const totalSP = classData.skills.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const synthesizedGear = useMemo(
    () => synthesizeSampleLoadout(classData, gearCatalog),
    [classData.id]
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Engine Baseline Banner */}
      <div className="rounded-lg border border-violet-800 bg-violet-950/40 px-4 py-3 flex items-start gap-3">
        <span className="text-violet-400 text-lg flex-shrink-0 mt-0.5">◈</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-violet-300">Engine Baseline View</p>
          <p className="text-xs text-violet-400/80 mt-1 leading-relaxed">
            Every skill at rank 1. Gear shown is synthesized based on class affinity (range,
            archetype) for visualization — in-game loot will be rolled with effects from the
            season's effect pool. This is the converged state the balance loop tuned against;
            win rate was calculated from this configuration.{' '}
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
      />

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
    </div>
  );
}
