// Cycle14SeasonSection — full season summary block for one Cycle 14 season
// Renders: season-name header + stats row + faction cluster tiles + Wanderer placeholder + hero slot
// Used in: Summary tab (Pitch.tsx § 11.2)
// MIGRATION.md §v1.64: season_name_canonical now displayed in header.
//                      Per-kit names now passed to FactionClusterTile.

import type { Cycle14SeasonSummary, WaveBKit } from '../../data/cycle14Types';
import { FactionClusterTile } from './FactionClusterTile';

interface Props {
  season: Cycle14SeasonSummary;
  /** Display index (1-based) for labeling when season name absent. */
  displayIndex: number;
}

/** Season ID short label: "cycle-14-wave-5-season-001" → "Season 001" */
function seasonShortLabel(seasonId: string): string {
  const match = seasonId.match(/season-(\d+)$/);
  return match ? `Season ${match[1]}` : seasonId;
}

export function Cycle14SeasonSection({ season, displayIndex }: Props) {
  const integerClusters = season.faction_clusters.filter(
    c => typeof c.cluster_id === 'number'
  );
  const wandererClusters = season.faction_clusters.filter(
    c => c.cluster_id === 'SINGLETON'
  );

  /** Get kits for a given cluster_id from the wave_b lookup map. */
  function kitsForCluster(clusterId: number | 'SINGLETON'): WaveBKit[] {
    const result: WaveBKit[] = [];
    for (const kit of season.wave_b_kits_by_id.values()) {
      if (kit.parent_cluster_id === clusterId) {
        result.push(kit);
      }
    }
    return result;
  }

  const seasonLabel = season.wave_s?.wave_s_season_name_canonical
    ?? `Cycle 14 — Season ${displayIndex}`;
  const thematicTags = season.wave_s?.wave_s_season_name_thematic_tags ?? [];
  const shortLabel = seasonShortLabel(season.season_id);

  return (
    <section className="max-w-6xl mx-auto px-4 py-10 border-t border-gray-800">
      {/* Season header — Wave-S name canonical (MIGRATION.md §v1.64) */}
      <div className="mb-6">
        <p className="font-mono uppercase tracking-wide text-xs text-gray-500 mb-1">
          Cycle 14 — {shortLabel}
        </p>
        <h2 className="text-base md:text-lg font-semibold text-gray-100 leading-snug mb-1">
          {seasonLabel}
        </h2>
        {/* Thematic tags for this season */}
        {thematicTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5 mb-2">
            {thematicTags.map(tag => (
              <span
                key={tag}
                className="text-[9px] font-mono text-gray-500 border border-gray-800 rounded px-1.5 py-0.5 bg-gray-900/40"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {/* NOTE: season names have storm/lightning bias due to element_distribution
            aggregator drift (Matt 2026-05-29); corrected names land post-gandalf-remediation
            + rocket-re-fire. NOT v1 blocking — surface current names now, iterate later.
            TODO(drax): remove this note when corrected season names land. */}
        <p className="text-sm text-gray-500 max-w-prose">
          Substrate-led generation. {integerClusters.length} faction{integerClusters.length !== 1 ? 's' : ''} emerged
          from Phase 5 cohesion coalescence. No designer-imposed archetypes — identity from the substrate.
        </p>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-3 mb-6">
        {[
          { label: 'Factions', value: integerClusters.length },
          { label: 'Total kits', value: season.faction_clusters.reduce((s, c) => s + c.member_count, 0) },
          { label: 'Gate status', value: 'Canonical' },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 flex items-center gap-2.5 min-h-[44px]"
          >
            <span className="font-semibold text-base text-gray-100 tabular-nums">{value}</span>
            <span className="font-mono uppercase tracking-wide text-[10px] text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Faction cluster tiles — 2-col on md+, 1-col on mobile */}
      {integerClusters.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {integerClusters.map(cluster => (
            <FactionClusterTile
              key={cluster.cluster_id}
              cluster={cluster}
              kitsByCluster={kitsForCluster(cluster.cluster_id as number)}
            />
          ))}
        </div>
      )}

      {/* Wanderer tiles: post-gamora Amendment 1 close */}
      {wandererClusters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {wandererClusters.map(cluster => (
            <FactionClusterTile
              key="SINGLETON"
              cluster={cluster}
              kitsByCluster={kitsForCluster('SINGLETON')}
            />
          ))}
        </div>
      ) : kitsForCluster('SINGLETON').length > 0 ? (
        /* Wanderer kits exist in wave_b but no SINGLETON cluster in faction JSON —
           render a Wanderer tile directly from wave_b data. */
        <div className="mb-6">
          <p className="font-mono uppercase tracking-wide text-[9px] text-gray-600 mb-1.5">
            Wanderers
          </p>
          <div className="border border-gray-800 rounded-lg p-4 flex flex-col gap-2">
            {kitsForCluster('SINGLETON').map(kit => (
              <div key={kit.kit_id} className="border-l border-gray-800 pl-2">
                <p className="text-[11px] font-semibold text-gray-300 mb-0.5">
                  {kit.kit_name_canonical}
                </p>
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  {kit.kit_identity_narrative}
                </p>
              </div>
            ))}
          </div>
          {/* TODO(drax): replace with full Wanderer tile when gamora Amendment 1 (cluster_id="SINGLETON" architecture) lands */}
        </div>
      ) : (
        <div className="border border-dashed border-gray-800 rounded-lg px-4 py-3 mb-6">
          <p className="font-mono uppercase tracking-wide text-[9px] text-gray-700 mb-0.5">
            Wanderer tile
          </p>
          <p className="text-[10px] text-gray-700">
            No Wanderer kits in this season. Wanderer integration pending gamora Amendment 1 (cluster_id="SINGLETON" architecture).
            {/* TODO(drax): remove placeholder when gamora Amendment 1 lands */}
          </p>
        </div>
      )}

      {/* Hero slot: pending § 12.1 pair selection */}
      {season.hero_image_url ? (
        <div className="mt-4">
          <p className="font-mono uppercase tracking-wide text-[9px] text-gray-600 mb-2">
            Seasonal hero
          </p>
          <img
            src={season.hero_image_url}
            alt="Seasonal hero"
            className="rounded-lg border border-gray-800 max-h-64 object-contain"
          />
        </div>
      ) : (
        <div className="border border-dashed border-gray-800 rounded-lg px-4 py-3 mt-4">
          <p className="font-mono uppercase tracking-wide text-[9px] text-gray-700 mb-0.5">
            Seasonal hero image
          </p>
          <p className="text-[10px] text-gray-700">
            Pending § 12.2 image generation (hero elected: Cluster 3 Stormcallers of the Pale Keep, season_001).
            {/* TODO(drax): wire hero_image_url after § 12.2 image extraction completes */}
          </p>
        </div>
      )}
    </section>
  );
}
