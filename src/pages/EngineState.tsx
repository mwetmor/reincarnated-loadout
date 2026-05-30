// EngineState — /state-of-engine route
// Phase α: dynamic React dashboard consuming engine JSON output per season.
// Phase β (trigger buttons, cascade fire, live log streaming, abort) and
// Phase γ (runner decentralization) are OUT OF SCOPE.
// See canonical/story/2026-05-30-pi-engine-control-dashboard-recognition.md
//
// Mount point: Option A — new /state-of-engine route.
// /planning/state-of-engine static HTML continues as historical reference.
//
// Data: fetched from public/engine-state/season-{001,002,003}/ at runtime.
// phase2_kit_candidates.json is lazy-loaded by EngineStateBackwardTrace only.

import { useState } from 'react';
import { useEngineStateData } from '../hooks/useEngineStateData';
import { EngineStatePageHeader } from '../components/EngineState/EngineStatePageHeader';
import { EngineStateKpiGrid } from '../components/EngineState/EngineStateKpiGrid';
import { EngineStatePipelineFlow } from '../components/EngineState/EngineStatePipelineFlow';
import { EngineStatePhaseDeepDive } from '../components/EngineState/EngineStatePhaseDeepDive';
import { EngineStateFactionEmergence } from '../components/EngineState/EngineStateFactionEmergence';
import { EngineStateBackwardTrace } from '../components/EngineState/EngineStateBackwardTrace';
import { EngineStateObservations } from '../components/EngineState/EngineStateObservations';
import type { SeasonId } from '../data/engineStateTypes';
import { ENGINE_SEASON_IDS, ENGINE_SEASON_LABELS } from '../data/engineStateTypes';

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-500 font-mono">Loading engine state...</p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3 max-w-md text-center">
        <p className="text-sm text-red-400 font-mono">Error loading engine state</p>
        <p className="text-xs text-gray-500">{message}</p>
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

interface SeasonSelectorProps {
  selected: SeasonId;
  onChange: (id: SeasonId) => void;
}

function SeasonSelector({ selected, onChange }: SeasonSelectorProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {ENGINE_SEASON_IDS.map((id) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
            selected === id
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {ENGINE_SEASON_LABELS[id]}
        </button>
      ))}
    </div>
  );
}

interface DashboardContentProps {
  seasonSlug: SeasonId;
  onRefresh: () => void;
}

function DashboardContent({ seasonSlug, onRefresh }: DashboardContentProps) {
  const { data, status, error, refresh } = useEngineStateData(seasonSlug);

  const handleRefresh = () => {
    refresh();
    onRefresh();
  };

  if (status === 'idle' || status === 'loading') return <LoadingSpinner />;
  if (status === 'error' || !data) return <ErrorState message={error ?? 'Unknown error'} onRetry={handleRefresh} />;

  const { summary, phase4, clusters, waveBIdentities, phase7Verdicts } = data;

  return (
    <div className="bg-[#fafaf7] min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-8 pb-16">
        <EngineStatePageHeader summary={summary} />
        <EngineStateKpiGrid summary={summary} />
        <EngineStatePipelineFlow summary={summary} />
        <EngineStatePhaseDeepDive summary={summary} phase4={phase4} clusters={clusters} />
        <EngineStateFactionEmergence
          clusters={clusters}
          waveBIdentities={waveBIdentities}
          phase7Verdicts={phase7Verdicts}
        />
        <EngineStateBackwardTrace
          seasonSlug={seasonSlug}
          phase7Verdicts={phase7Verdicts}
          clusters={clusters}
          waveBIdentities={waveBIdentities}
          phase4={phase4}
        />
        <EngineStateObservations summary={summary} phase7Verdicts={phase7Verdicts} />

        <footer className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400 font-mono leading-relaxed">
            Dynamic dashboard — built from production artifacts in{' '}
            <code className="bg-gray-100 px-1 rounded">
              agentic_orchestration/cycle-14-wave-5-{seasonSlug}/
            </code>
            . Real production data; no mocks.
            Phase α — status surface only. Phase β control plane preserved as recognition record.
          </p>
        </footer>
      </div>
    </div>
  );
}

export function EngineState() {
  const [seasonSlug, setSeasonSlug] = useState<SeasonId>('season-003');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSeasonChange = (id: SeasonId) => {
    setSeasonSlug(id);
  };

  const handleRefresh = () => {
    setRefreshKey((n) => n + 1);
  };

  return (
    <div>
      {/* Control bar */}
      <div className="sticky top-12 z-40 border-b border-gray-200 bg-white/95 backdrop-blur px-4 sm:px-8 py-2">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-3">
          <SeasonSelector selected={seasonSlug} onChange={handleSeasonChange} />
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          >
            <span>↻</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>
      <DashboardContent key={`${seasonSlug}-${refreshKey}`} seasonSlug={seasonSlug} onRefresh={handleRefresh} />
    </div>
  );
}
