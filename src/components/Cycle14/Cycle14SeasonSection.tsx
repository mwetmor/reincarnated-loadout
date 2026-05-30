// Cycle14SeasonSection — full season summary block for one Cycle 14 season
// Renders: season header + 4 faction cluster tiles + Wanderer placeholder + iteration state
// Used in: Summary tab (Pitch.tsx § 11.2)

import type { Cycle14SeasonSummary } from '../../data/cycle14Types';
import { FactionClusterTile } from './FactionClusterTile';

interface Props {
  season: Cycle14SeasonSummary;
}

export function Cycle14SeasonSection({ season }: Props) {
  const integerClusters = season.faction_clusters.filter(
    c => typeof c.cluster_id === 'number'
  );
  const wandererClusters = season.faction_clusters.filter(
    c => c.cluster_id === 'SINGLETON'
  );

  return (
    <section className="max-w-6xl mx-auto px-4 py-10 border-t border-gray-800">
      {/* Season header */}
      <div className="mb-6">
        <p className="font-mono uppercase tracking-wide text-xs text-gray-500 mb-1">
          Cycle 14 — Season 001
        </p>
        <p className="text-sm text-gray-400 max-w-prose">
          Substrate-led generation. Four factions emerged from Phase 5 cohesion coalescence
          on 34 validated kits across 18 BC cells. No designer-imposed archetypes —
          identity emerged from the substrate.
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
            <FactionClusterTile key={cluster.cluster_id} cluster={cluster} />
          ))}
        </div>
      )}

      {/* Wanderer tiles: post-gamora Amendment 1 close */}
      {wandererClusters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {wandererClusters.map(cluster => (
            <FactionClusterTile key="SINGLETON" cluster={cluster} />
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-gray-800 rounded-lg px-4 py-3 mb-6">
          <p className="font-mono uppercase tracking-wide text-[9px] text-gray-700 mb-0.5">
            Wanderer tile
          </p>
          <p className="text-[10px] text-gray-700">
            Lone Wanderer integration pending gamora Amendment 1 (cluster_id="SINGLETON" architecture).
            {/* TODO(drax): remove placeholder and surface Wanderer tiles when gamora Amendment 1 lands */}
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
            Pending § 12.1 hero pair selection (drax + galadriel) + § 12.2 image generation.
            {/* TODO(drax): wire hero_image_url after § 12.2 image extraction completes */}
          </p>
        </div>
      )}
    </section>
  );
}
