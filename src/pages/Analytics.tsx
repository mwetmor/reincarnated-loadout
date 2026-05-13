import { useAnalytics } from '../hooks/useAnalytics';
import { WinRateHistogram } from '../components/analytics/WinRateHistogram';
import { ArchetypeStackedBar } from '../components/analytics/ArchetypeStackedBar';
import { ModifierRangeChart } from '../components/analytics/ModifierRangeChart';
import { ElementPie } from '../components/analytics/ElementPie';
import { ConvergenceChart } from '../components/analytics/ConvergenceChart';
import { EnergyPie } from '../components/analytics/EnergyPie';

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
        <StatBadge label="Classes" value={analytics.totalClasses} />
        <StatBadge label="Archetypes" value={analytics.allArchetypes.length} />
      </div>

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
