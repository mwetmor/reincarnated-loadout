import { useAnalytics } from '../hooks/useAnalytics';
import { WinRateHistogram } from '../components/analytics/WinRateHistogram';
import { ArchetypeStackedBar } from '../components/analytics/ArchetypeStackedBar';
import { ModifierRangeChart } from '../components/analytics/ModifierRangeChart';
import { ElementPie } from '../components/analytics/ElementPie';
import { ConvergenceChart } from '../components/analytics/ConvergenceChart';
import { EnergyPie } from '../components/analytics/EnergyPie';
import { StatRadarChart } from '../components/analytics/StatRadarChart';
import { SeasonTimelineChart } from '../components/analytics/SeasonTimelineChart';
import { SkillTierChart } from '../components/analytics/SkillTierChart';
import { SeasonSummaryCards } from '../components/analytics/SeasonSummaryCards';
import { SubstrateHeatmap } from '../components/analytics/SubstrateHeatmap';

export function Analytics() {
  const analytics = useAnalytics();

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-gray-600 font-mono">Loading season data…</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Summary strip */}
      <div className="flex flex-wrap gap-3">
        <StatBadge label="Seasons" value={analytics.totalSeasons} />
        <StatBadge label="Kits" value={analytics.totalClasses} />
        <StatBadge label="Archetypes" value={analytics.allArchetypes.length} />
        {analytics.newSubstrateSet.length > 0 && (
          <NewSubstratesBadge substrates={analytics.newSubstrateSet} />
        )}
      </div>

      {/* Canonical-7 narrative callout */}
      {analytics.newSubstrateSet.length > 0 && (
        <div className="rounded-lg border border-violet-800/50 bg-violet-950/30 px-4 py-3 flex items-start gap-3">
          <span className="text-violet-400 text-base flex-shrink-0 mt-0.5">◈</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-violet-300">Canonical-7 Substrate Expansion</p>
            <p className="text-xs text-violet-400/80 mt-1 leading-relaxed">
              Seasons 002011–002015 (standard-demo-regen-2026-05-17) introduce{' '}
              <span className="font-semibold">{analytics.newSubstrateSet.join(', ')}</span> as
              fully supported dominant elements alongside the historical canonical-4
              (fire, water, earth, wind) and physical. Historical seasons 001001–001005
              and Yomi (002328) are preserved below for comparison.
            </p>
          </div>
        </div>
      )}

      {/* Per-season summary cards — all 10 seasons at a glance */}
      <SeasonSummaryCards cards={analytics.seasonSummaryCards} />

      {/* Substrate heatmap — cross-season comparison */}
      <SubstrateHeatmap
        rows={analytics.substrateHeatmap}
        substrates={analytics.allSubstrates}
        newSubstrateSet={analytics.newSubstrateSet}
      />

      {/* Tier 1 — Row 1: Win-rate histogram + Element pie */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <WinRateHistogram data={analytics.winRateBins} />
        <ElementPie data={analytics.elementSlices} />
      </div>

      {/* Tier 1 — Row 2: Archetype by season (full width) */}
      <ArchetypeStackedBar
        data={analytics.archetypeBySeasonRows}
        archetypes={analytics.allArchetypes}
      />

      {/* Tier 1 — Row 3: Modifier range (full width, tall) */}
      <ModifierRangeChart data={analytics.modifierRanges} />

      {/* Tier 2 — Row 4: Convergence + Energy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EnergyPie data={analytics.energySlices} />
        <ConvergenceChart data={analytics.iterRanges} />
      </div>

      {/* Tier 3 — Row 5: Season timeline (full width) */}
      <SeasonTimelineChart data={analytics.seasonTimeline} />

      {/* Tier 3 — Row 6: Stat radar + Skill tier composition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatRadarChart entries={analytics.statRadarEntries} globalAvg={analytics.globalStatAvg} />
        <SkillTierChart data={analytics.skillTierBars} />
      </div>
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex flex-col gap-0.5 min-w-[5rem]">
      <span className="text-xs text-gray-500 font-mono uppercase tracking-wide">{label}</span>
      <span className="text-xl font-semibold text-gray-200 tabular-nums">{value}</span>
    </div>
  );
}

function NewSubstratesBadge({ substrates }: { substrates: string[] }) {
  return (
    <div className="bg-violet-950/40 border border-violet-800 rounded-lg px-4 py-3 flex flex-col gap-0.5">
      <span className="text-xs text-violet-500 font-mono uppercase tracking-wide">New substrates</span>
      <span className="text-sm font-semibold text-violet-300 tabular-nums">
        {substrates.join(' · ')}
      </span>
    </div>
  );
}
