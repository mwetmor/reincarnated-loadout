// Cycle14LoadoutSection — Cycle 14 v1 kit identity browser for Loadout + Sample pages
//
// Context: Cycle 14 Wave 5 seasons exist as faction clusters + wave B identities JSON only.
// The manifest.json + classes/*.json format required for useSeasonData (skill tree rendering)
// does not exist for these seasons. Full loadout/skill-tree integration is deferred.
//
// This component surfaces the available Cycle 14 data: per-season faction clusters and
// per-kit canonical names + narratives. It is rendered below each page's existing season content.
//
// TODO(drax): replace this section with full skill-tree integration when star-lord emits
//             manifest.json + classes/*.json per Cycle 14 season. Routing via KR → star-lord.
//
// MIGRATION.md §v1.64 + §v1.65: wave_b_identities.json + wave_s season names consumed here.

import { useState } from 'react';
import { CYCLE14_SEASONS } from '../../data/cycle14SeasonData';
import { FactionClusterTile } from './FactionClusterTile';
import type { WaveBKit } from '../../data/cycle14Types';

/** Season ID → short display label. "cycle-14-wave-5-season-001" → "Season 001" */
function seasonShortLabel(seasonId: string): string {
  const match = seasonId.match(/season-(\d+)$/);
  return match ? `Season ${match[1]}` : seasonId;
}

/** Get all wave_b kits for a given cluster_id within a season. */
function kitsForCluster(season: typeof CYCLE14_SEASONS[0], clusterId: number | 'SINGLETON'): WaveBKit[] {
  const result: WaveBKit[] = [];
  for (const kit of season.wave_b_kits_by_id.values()) {
    if (kit.parent_cluster_id === clusterId) {
      result.push(kit);
    }
  }
  return result;
}

export function Cycle14LoadoutSection() {
  // Tab state: which season is currently shown (index into CYCLE14_SEASONS)
  const [activeIdx, setActiveIdx] = useState(0);
  const season = CYCLE14_SEASONS[activeIdx];

  const integerClusters = season.faction_clusters.filter(
    (c) => typeof c.cluster_id === 'number'
  );
  const wandererClusters = season.faction_clusters.filter(
    (c) => c.cluster_id === 'SINGLETON'
  );
  const totalKits = season.faction_clusters.reduce((s, c) => s + c.member_count, 0);

  return (
    <div className="space-y-4 border-t border-gray-800 pt-6 mt-4">
      {/* Header callout */}
      <div className="rounded-lg border border-violet-900/50 bg-violet-950/10 px-4 py-3 flex items-start gap-3">
        <span className="text-violet-500 text-base flex-shrink-0 mt-0.5">◈</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-violet-300/80">
            Cycle 14 Wave 5 — Kit Identity Preview
          </p>
          <p className="text-xs text-violet-400/60 mt-1 leading-relaxed">
            3 seasons · 162 kits total (54 per season). Faction clusters and per-kit canonical
            names + narratives from Wave A/B LLM output. Skill tree integration deferred — requires
            star-lord to emit manifest.json + classes/ per Cycle 14 season (Cycle 15+ pipeline).
          </p>
          <p className="text-[10px] font-mono text-violet-600/60 mt-1.5">
            Substrate-derived — not playable loadout data
          </p>
        </div>
      </div>

      {/* Season tab strip */}
      <div className="flex gap-1 flex-wrap">
        {CYCLE14_SEASONS.map((s, i) => {
          const label = s.wave_s?.wave_s_season_name_canonical ?? `Cycle 14 — Season ${i + 1}`;
          const shortLabel = seasonShortLabel(s.season_id);
          const isActive = i === activeIdx;
          return (
            <button
              key={s.season_id}
              onClick={() => setActiveIdx(i)}
              className={[
                'px-3 py-1.5 rounded text-xs font-mono transition-colors border',
                isActive
                  ? 'bg-violet-950/40 border-violet-800/60 text-violet-300'
                  : 'bg-gray-900/40 border-gray-800 text-gray-600 hover:text-gray-400 hover:border-gray-700',
              ].join(' ')}
              title={label}
            >
              {shortLabel}
            </button>
          );
        })}
      </div>

      {/* Season header */}
      <div>
        <p className="font-mono uppercase tracking-wide text-[9px] text-gray-600 mb-1">
          Cycle 14 — {seasonShortLabel(season.season_id)}
        </p>
        <h3 className="text-base font-semibold text-gray-100 leading-snug mb-1">
          {season.wave_s?.wave_s_season_name_canonical ?? `Cycle 14 Season ${activeIdx + 1}`}
        </h3>
        {(season.wave_s?.wave_s_season_name_thematic_tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {(season.wave_s?.wave_s_season_name_thematic_tags ?? []).map((tag) => (
              <span
                key={tag}
                className="text-[9px] font-mono text-gray-500 border border-gray-800 rounded px-1.5 py-0.5 bg-gray-900/40"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Season stats strip */}
        <div className="flex flex-wrap gap-2 mt-2">
          {[
            { label: 'Factions', value: integerClusters.length },
            { label: 'Kits', value: totalKits },
            { label: 'Gate', value: 'Canonical' },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-gray-900 border border-gray-800 rounded px-3 py-1.5 flex items-center gap-2"
            >
              <span className="font-semibold text-sm text-gray-100 tabular-nums">{value}</span>
              <span className="font-mono uppercase tracking-wide text-[9px] text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Faction cluster tiles grid */}
      {integerClusters.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integerClusters.map((cluster) => (
            <FactionClusterTile
              key={cluster.cluster_id}
              cluster={cluster}
              kitsByCluster={kitsForCluster(season, cluster.cluster_id as number)}
            />
          ))}
        </div>
      )}

      {/* Wanderer tiles or placeholder */}
      {wandererClusters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wandererClusters.map((cluster) => (
            <FactionClusterTile
              key="SINGLETON"
              cluster={cluster}
              kitsByCluster={kitsForCluster(season, 'SINGLETON')}
            />
          ))}
        </div>
      ) : kitsForCluster(season, 'SINGLETON').length > 0 ? (
        <div>
          <p className="font-mono uppercase tracking-wide text-[9px] text-gray-600 mb-1.5">
            Wanderers
          </p>
          <div className="border border-gray-800 rounded-lg p-4 flex flex-col gap-2">
            {kitsForCluster(season, 'SINGLETON').map((kit) => (
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
        </div>
      ) : null}

      {/* Data gap note */}
      <div className="rounded border border-gray-800 bg-gray-900/30 px-3 py-2.5">
        <p className="text-[10px] font-mono text-gray-600 leading-relaxed">
          <span className="text-gray-500">Skill tree gap:</span> Cycle 14 seasons have no
          manifest.json + classes/ data in the loadout bundle. Full character loadout view
          (skill trees, balance metadata, gear pool) requires star-lord to emit per-season
          class artifacts. Surfaced to KR for routing → star-lord (Cycle 15+ pipeline).
        </p>
      </div>
    </div>
  );
}
