// Cycle14AnalyticsSection — Cycle 14 Wave 5 analytics surface for Analytics.tsx
// Consumes CYCLE14_SEASONS from cycle14SeasonData.ts (same data as /pitch Cycle14 section).
// Renders: per-season summary strip + cluster analytics (element dist, cohesion metrics, kit compliance).
//
// This component renders faithfully from engine output.
// No encounter simulation data for Cycle 14 — surfaced in Encounters.tsx as explicit gap.
//
// TODO(drax): when gamora runs gauntlet simulations for Cycle 14 seasons, extend this section
//             with per-kit gauntlet_pass_rate and per-cohort KPM bands (Dispatch F full scope).

import { CYCLE14_SEASONS, ELEMENT_ACCENT, ELEMENT_ACCENT_FALLBACK } from '../../data/cycle14SeasonData';
import type { FactionCluster, WaveBKit } from '../../data/cycle14Types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function round2(v: number): string {
  return v.toFixed(2);
}

/** Top N elements from a distribution, descending. */
function topElements(dist: Record<string, number | undefined>, n = 3): [string, number][] {
  return (Object.entries(dist) as [string, number | undefined][])
    .filter((e): e is [string, number] => e[1] !== undefined)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

// ── Season-level aggregate stats ───────────────────────────────────────────────

interface SeasonStats {
  seasonId: string;
  seasonName: string;
  clusterCount: number;
  totalKits: number;
  acceptRate: number;
  avgCompactness: number;
  avgCosineMax: number;
  elementDistribution: Record<string, number>;
}

function computeSeasonStats(): SeasonStats[] {
  return CYCLE14_SEASONS.map((season) => {
    const intClusters = season.faction_clusters.filter(c => typeof c.cluster_id === 'number');
    const totalKits = [...season.wave_b_kits_by_id.values()].length;
    const acceptKits = [...season.wave_b_kits_by_id.values()].filter(
      k => k.final_compliance_status === 'ACCEPT'
    ).length;

    // Aggregate element distribution across all clusters (weighted by member_count)
    const aggDist: Record<string, number> = {};
    let totalWeight = 0;
    for (const c of intClusters) {
      const w = c.member_count;
      totalWeight += w;
      for (const [elem, share] of Object.entries(c.element_distribution)) {
        if (share !== undefined) {
          aggDist[elem] = (aggDist[elem] ?? 0) + share * w;
        }
      }
    }
    if (totalWeight > 0) {
      for (const k of Object.keys(aggDist)) {
        aggDist[k] /= totalWeight;
      }
    }

    const avgCompactness = intClusters.length > 0
      ? intClusters.reduce((s, c) => s + c.cluster_compactness, 0) / intClusters.length
      : 0;
    const avgCosineMax = intClusters.length > 0
      ? intClusters.reduce((s, c) => s + c.cosine_similarity_max, 0) / intClusters.length
      : 0;

    return {
      seasonId: season.season_id,
      seasonName: season.wave_s?.wave_s_season_name_canonical ?? season.season_id,
      clusterCount: intClusters.length,
      totalKits,
      acceptRate: totalKits > 0 ? acceptKits / totalKits : 0,
      avgCompactness,
      avgCosineMax,
      elementDistribution: aggDist,
    };
  });
}

// ── ClusterRow — one cluster within a season ──────────────────────────────────

interface ClusterRowProps {
  cluster: FactionCluster;
  kits: WaveBKit[];
}

function ClusterRow({ cluster, kits }: ClusterRowProps) {
  const dominant = topElements(cluster.element_distribution, 1)[0];
  const accent = dominant ? (ELEMENT_ACCENT[dominant[0]] ?? ELEMENT_ACCENT_FALLBACK) : ELEMENT_ACCENT_FALLBACK;
  const top3 = topElements(cluster.element_distribution, 3);

  const acceptKits = kits.filter(k => k.final_compliance_status === 'ACCEPT').length;
  const fallbackKits = kits.filter(k => k.final_compliance_status === 'FALLBACK_SUBSTRATE_DERIVED').length;

  return (
    <div className={`rounded border ${accent.border} bg-gray-900/40 p-3 flex flex-col gap-2`}>
      {/* Cluster name + metadata row */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <p className="font-mono uppercase tracking-wide text-[9px] text-gray-600 mb-0.5">
            Cluster {cluster.cluster_id}
          </p>
          <p className={`text-xs font-semibold leading-snug ${accent.text}`}>
            {cluster.faction_label_canonical}
          </p>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <span className="text-[9px] font-mono text-gray-600 bg-gray-900/60 border border-gray-800 rounded px-1.5 py-0.5">
            {kits.length > 0 ? kits.length : cluster.member_count} kits
          </span>
          {cluster.phase7_gate_status === 'canonical' && (
            <span className="text-[9px] font-mono text-emerald-700 bg-emerald-950/40 border border-emerald-900/60 rounded px-1.5 py-0.5">
              canonical
            </span>
          )}
        </div>
      </div>

      {/* Element distribution — top 3 elements */}
      <div className="flex flex-wrap gap-1">
        {top3.map(([elem, share]) => {
          const ea = ELEMENT_ACCENT[elem] ?? ELEMENT_ACCENT_FALLBACK;
          return (
            <span
              key={elem}
              className={`text-[9px] font-mono rounded px-1.5 py-0.5 ${ea.bg} border ${ea.border} ${ea.text}`}
            >
              {elem} {pct(share)}
            </span>
          );
        })}
      </div>

      {/* BC axis + cohesion metrics row */}
      <div className="flex flex-wrap gap-1.5 text-[9px] font-mono text-gray-600">
        <span className="bg-gray-900/60 border border-gray-800 rounded px-1.5 py-0.5">
          {cluster.modal_bc_axis_signature.engagement_profile}
        </span>
        <span className="bg-gray-900/60 border border-gray-800 rounded px-1.5 py-0.5">
          {cluster.modal_bc_axis_signature.damage_geometry}
        </span>
        <span className="bg-gray-900/60 border border-gray-800 rounded px-1.5 py-0.5">
          compactness {round2(cluster.cluster_compactness)}
        </span>
        <span className="bg-gray-900/60 border border-gray-800 rounded px-1.5 py-0.5">
          cos-sim-max {round2(cluster.cosine_similarity_max)}
        </span>
      </div>

      {/* Kit compliance summary */}
      {kits.length > 0 && (
        <div className="flex gap-2 text-[9px] font-mono">
          <span className="text-emerald-700">{acceptKits} ACCEPT</span>
          {fallbackKits > 0 && (
            <span className="text-amber-700">{fallbackKits} FALLBACK</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── SeasonPanel — one season's cluster grid ────────────────────────────────────

interface SeasonPanelProps {
  stats: SeasonStats;
  seasonIdx: number;
}

function SeasonPanel({ stats, seasonIdx }: SeasonPanelProps) {
  const season = CYCLE14_SEASONS[seasonIdx];
  const intClusters = season.faction_clusters.filter(
    c => typeof c.cluster_id === 'number'
  ) as FactionCluster[];

  function kitsForCluster(clusterId: number): WaveBKit[] {
    const result: WaveBKit[] = [];
    for (const kit of season.wave_b_kits_by_id.values()) {
      if (kit.parent_cluster_id === clusterId) {
        result.push(kit);
      }
    }
    return result;
  }

  const seasonShort = season.season_id.match(/season-(\d+)$/)?.[1] ?? String(seasonIdx + 1);

  return (
    <div className="space-y-3">
      {/* Season header */}
      <div className="border-t border-gray-800 pt-4">
        <p className="font-mono uppercase tracking-wide text-[9px] text-gray-600 mb-0.5">
          Cycle 14 — Season {seasonShort}
        </p>
        <p className="text-sm font-semibold text-gray-200 leading-snug mb-2">
          {stats.seasonName}
        </p>

        {/* Season aggregate stat strip */}
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { label: 'Factions', value: stats.clusterCount },
            { label: 'Kits', value: stats.totalKits },
            { label: 'Accept rate', value: pct(stats.acceptRate) },
            { label: 'Avg compactness', value: round2(stats.avgCompactness) },
            { label: 'Avg cos-sim-max', value: round2(stats.avgCosineMax) },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-gray-900 border border-gray-800 rounded px-3 py-1.5 flex items-center gap-2"
            >
              <span className="text-sm font-semibold text-gray-200 tabular-nums">{value}</span>
              <span className="font-mono uppercase tracking-wide text-[9px] text-gray-600">{label}</span>
            </div>
          ))}
        </div>

        {/* Season aggregate element distribution */}
        <div className="flex flex-wrap gap-1 mb-1">
          {(Object.entries(stats.elementDistribution) as [string, number][])
            .sort((a, b) => b[1] - a[1])
            .map(([elem, share]) => {
              const ea = ELEMENT_ACCENT[elem] ?? ELEMENT_ACCENT_FALLBACK;
              return (
                <span
                  key={elem}
                  className={`text-[9px] font-mono rounded px-1.5 py-0.5 ${ea.bg} border ${ea.border} ${ea.text}`}
                >
                  {elem} {pct(share)}
                </span>
              );
            })}
        </div>
        <p className="font-mono text-[9px] text-gray-700 mb-3">
          Season aggregate element distribution (weighted by faction member count)
        </p>
      </div>

      {/* Cluster grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {intClusters.map(cluster => (
          <ClusterRow
            key={cluster.cluster_id}
            cluster={cluster}
            kits={kitsForCluster(cluster.cluster_id as number)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function Cycle14AnalyticsSection() {
  const seasonStats = computeSeasonStats();

  return (
    <section className="space-y-2">
      {/* Section header */}
      <div className="rounded-lg border border-violet-900/50 bg-violet-950/20 px-4 py-3 flex items-start gap-3">
        <span className="text-violet-500 text-base flex-shrink-0 mt-0.5">◈</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-violet-300">
            Cycle 14 — Substrate-Led Generation (Wave 5)
          </p>
          <p className="text-xs text-violet-400/70 mt-1 leading-relaxed">
            3 production seasons. Faction identities emerged from Phase 5 GMM clustering — no
            designer-imposed archetypes. Each cluster reflects a BC-axis signature + element
            distribution from the substrate. Wave B per-kit names authored by LLM from faction
            context. Phase 7 cohesion gate status:{' '}
            <span className="font-semibold text-emerald-600/80">canonical</span> (all 3 seasons passed).
          </p>
          <p className="text-[10px] font-mono text-violet-600/60 mt-1">
            Cohesion analytics below. Encounter simulation for Cycle 14 is deferred to Cycle 15+.
          </p>
        </div>
      </div>

      {/* 3-season cross-season summary strip */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        {seasonStats.map((s) => (
          <div key={s.seasonId} className="bg-gray-900 border border-gray-800 rounded-lg p-3 space-y-1">
            <p className="font-mono uppercase tracking-wide text-[9px] text-gray-600">
              {s.seasonId.match(/season-(\d+)$/)?.[1] ?? s.seasonId}
            </p>
            <p className="text-xs font-semibold text-gray-300 leading-snug line-clamp-2">
              {s.seasonName}
            </p>
            <p className="text-[9px] font-mono text-gray-600">
              {s.clusterCount} factions · {s.totalKits} kits · {pct(s.acceptRate)} ACCEPT
            </p>
          </div>
        ))}
      </div>

      {/* Per-season panels */}
      {seasonStats.map((stats, idx) => (
        <SeasonPanel key={stats.seasonId} stats={stats} seasonIdx={idx} />
      ))}

      {/* Footer note */}
      <p className="text-[9px] font-mono text-gray-700 pt-2 border-t border-gray-800">
        Data: Cycle 14 Wave 5 production seasons (cascade-r4 aggregator-fix refresh; MIGRATION.md §v1.66).
        Cohesion metrics: cluster_compactness = within-cluster BC-axis variance; cos-sim-max = maximum
        pairwise cosine similarity within cluster (lower = more distinct members).
        Encounter simulation: deferred to Cycle 15+ (no gauntlet sweep data for these seasons).
      </p>
    </section>
  );
}
