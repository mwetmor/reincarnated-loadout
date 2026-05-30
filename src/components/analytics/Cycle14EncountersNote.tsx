// Cycle14EncountersNote — Cycle 14 encounter surface for Encounters.tsx
//
// Cycle 14 Wave 5 has NO encounter simulation data (gauntlet sweep was cohesion-judge only;
// no encounter_analytics.json produced). This component surfaces substrate-derived context
// from the faction cluster data — a forward-looking placeholder until Cycle 15+ encounter sims run.
//
// TODO(drax): replace substrate-derived placeholder with real encounter sim data when
//             gamora runs gauntlet sweeps for Cycle 14 seasons (Cycle 15+ timeline).

import { CYCLE14_SEASONS, ELEMENT_ACCENT, ELEMENT_ACCENT_FALLBACK } from '../../data/cycle14SeasonData';

/** Infer encounter difficulty expectation from BC axis engagement + damage geometry. */
function inferEncounterProfile(
  engagement: string,
  geometry: string
): { swarm: string; elite: string; boss: string } {
  // AOE geometries (chain, large-AOE, splash) → swarm advantage
  const isAoe = /chain|aoe|splash|wide/i.test(geometry);
  // Ranged engagement → safer on swarm/elite; close → boss specialist
  const isRanged = /ranged/i.test(engagement);
  const isClose = /close/i.test(engagement);

  return {
    swarm: isAoe ? 'favorable' : isRanged ? 'moderate' : 'challenging',
    elite: isRanged ? 'favorable' : 'moderate',
    boss: isClose && !isAoe ? 'favorable' : isAoe ? 'challenging' : 'moderate',
  };
}

const PROFILE_COLORS: Record<string, string> = {
  favorable: 'text-emerald-600',
  moderate: 'text-gray-500',
  challenging: 'text-amber-700',
};

export function Cycle14EncountersNote() {
  return (
    <div className="space-y-4 border-t border-gray-800 pt-6">
      {/* Header */}
      <div className="rounded-lg border border-amber-900/50 bg-amber-950/10 px-4 py-3 flex items-start gap-3">
        <span className="text-amber-700 text-base flex-shrink-0 mt-0.5">◈</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-300/80">
            Cycle 14 v1 — Encounter Sim Deferred to Cycle 15+
          </p>
          <p className="text-xs text-amber-500/60 mt-1 leading-relaxed">
            Cycle 14 Wave 5 ran cohesion-judge gating only — no gauntlet encounter sweep was
            executed. No encounter_analytics.json exists for these 3 seasons. The substrate-derived
            encounter profiles below are inferred from BC-axis signatures (engagement_profile +
            damage_geometry) and are directional only.
          </p>
          <p className="text-[9px] font-mono text-amber-700/50 mt-1">
            When gamora runs encounter simulations for Cycle 14 seasons, this placeholder will be
            replaced with real per-kit scatter data.
          </p>
        </div>
      </div>

      {/* Per-season faction encounter profiles */}
      {CYCLE14_SEASONS.map((season) => {
        const intClusters = season.faction_clusters.filter(
          c => typeof c.cluster_id === 'number'
        );
        const seasonShort = season.season_id.match(/season-(\d+)$/)?.[1] ?? season.season_id;
        const seasonName = season.wave_s?.wave_s_season_name_canonical ?? season.season_id;

        return (
          <div key={season.season_id} className="space-y-2">
            <div>
              <p className="font-mono uppercase tracking-wide text-[9px] text-gray-600 mb-0.5">
                Cycle 14 — Season {seasonShort}
              </p>
              <p className="text-xs font-semibold text-gray-400 leading-snug">{seasonName}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {intClusters.map(cluster => {
                const { engagement_profile, damage_geometry } = cluster.modal_bc_axis_signature;
                const profile = inferEncounterProfile(engagement_profile, damage_geometry);

                // Dominant element for accent
                const domEntry = Object.entries(cluster.element_distribution)
                  .filter((e): e is [string, number] => e[1] !== undefined)
                  .sort((a, b) => b[1] - a[1])[0];
                const accent = domEntry
                  ? (ELEMENT_ACCENT[domEntry[0]] ?? ELEMENT_ACCENT_FALLBACK)
                  : ELEMENT_ACCENT_FALLBACK;

                return (
                  <div
                    key={cluster.cluster_id}
                    className={`rounded border ${accent.border} bg-gray-900/40 p-3 space-y-2`}
                  >
                    {/* Cluster name */}
                    <div>
                      <p className="font-mono text-[9px] text-gray-600 uppercase tracking-wide mb-0.5">
                        Cluster {cluster.cluster_id}
                      </p>
                      <p className={`text-xs font-semibold leading-snug ${accent.text}`}>
                        {cluster.faction_label_canonical}
                      </p>
                    </div>

                    {/* BC axis */}
                    <div className="flex gap-1.5 flex-wrap text-[9px] font-mono">
                      <span className="bg-gray-900/60 border border-gray-800 rounded px-1.5 py-0.5 text-gray-600">
                        {engagement_profile}
                      </span>
                      <span className="bg-gray-900/60 border border-gray-800 rounded px-1.5 py-0.5 text-gray-600">
                        {damage_geometry}
                      </span>
                    </div>

                    {/* Inferred encounter expectations */}
                    <div>
                      <p className="font-mono uppercase tracking-wide text-[9px] text-gray-700 mb-1">
                        Inferred encounter expectations
                      </p>
                      <div className="grid grid-cols-3 gap-1 text-[9px] font-mono">
                        {(['swarm', 'elite', 'boss'] as const).map(slot => (
                          <div key={slot} className="flex flex-col items-center bg-gray-950/40 rounded py-1 px-0.5">
                            <span className="text-gray-700 uppercase tracking-wide text-[8px] mb-0.5">{slot}</span>
                            <span className={PROFILE_COLORS[profile[slot]] ?? 'text-gray-500'}>
                              {profile[slot]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-[8px] font-mono text-gray-800 leading-relaxed">
                      Substrate-derived inference · not simulation data
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Explanation of inference logic */}
      <div className="text-[9px] font-mono text-gray-700 bg-gray-900/30 border border-gray-800/40 rounded px-3 py-2 space-y-0.5">
        <p>
          <span className="text-gray-600">Inference logic:</span> swarm = favorable when damage_geometry is chain/AOE;
          elite = favorable for ranged engagement; boss = favorable for close-engagement without AOE.
        </p>
        <p>
          <span className="text-gray-600">Source:</span> modal_bc_axis_signature from
          phase5_faction_clusters.json (MIGRATION.md §v1.66). Not simulation output.
        </p>
        <p>
          <span className="text-gray-600">Cycle 15+ plan:</span> gamora encounter sweep will produce
          encounter_analytics.json with per-kit damage and win-rate data.
          This placeholder will be removed when that data ships.
        </p>
      </div>
    </div>
  );
}
