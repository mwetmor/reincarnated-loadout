// Season002Marquee — marquee presentation for Season of the Ironsoil Wide-Front
// Rendered on /pitch route (Summary page) as the sole season display.
// Layout: single season header + 4 faction sections (group portrait + narrative + kit list with individual portraits)
// Style register: HD-2D hand-drawn pixel-art per canonical/story/style-register.md
// Source data: cycle14-season-002-faction-clusters.json + cycle14-season-002-wave-b-identities.json
// Image paths: public/pitch/season_002/factions/{cluster_id}_group.png
//              public/pitch/season_002/kits/{kit_id}.png
// Image gen: drax cascade-r4-v1 session — 4 group + 12 individual (top-3 per faction)

import type { Cycle14SeasonSummary, WaveBKit } from '../../data/cycle14Types';
import { ELEMENT_ACCENT, ELEMENT_ACCENT_FALLBACK } from '../../data/cycle14SeasonData';

interface Props {
  season: Cycle14SeasonSummary;
}

/** Format fractional share as percentage string. */
function pct(v: number | undefined): string {
  if (v === undefined) return '?';
  return `${Math.round(v * 100)}%`;
}

/** Return dominant element (highest share). */
function dominantElement(dist: Record<string, number | undefined>): string {
  return Object.entries(dist)
    .filter((e): e is [string, number] => e[1] !== undefined)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';
}

/** Sort element distribution entries descending. */
function sortedElements(dist: Record<string, number | undefined>): [string, number][] {
  return (Object.entries(dist) as [string, number | undefined][])
    .filter((e): e is [string, number] => e[1] !== undefined)
    .sort((a, b) => b[1] - a[1]);
}

// Top-N kits to show per faction (keeps page digestible; 33 total is too many for marquee UX)
// Cluster 1 has only 3 members — show all 3. Others: top-3 by order in member_kit_ids.
const KIT_DISPLAY_CAP = 3;

function FactionSection({
  clusterId,
  factionName,
  factionNarrative,
  factionTags,
  elementDist,
  bcSignature,
  culturalLineage,
  techLevel,
  kits,
}: {
  clusterId: number;
  factionName: string;
  factionNarrative: string;
  factionTags: string[];
  elementDist: Record<string, number | undefined>;
  bcSignature: { engagement_profile: string; damage_geometry: string };
  culturalLineage: string;
  techLevel: string;
  kits: WaveBKit[];
}) {
  const dominant = dominantElement(elementDist);
  const accent = ELEMENT_ACCENT[dominant] ?? ELEMENT_ACCENT_FALLBACK;
  const elements = sortedElements(elementDist);

  // Cap at KIT_DISPLAY_CAP for display (cluster 1 has exactly 3 so cap = all of them)
  const displayKits = kits.slice(0, KIT_DISPLAY_CAP);

  const groupImagePath = `/pitch/season_002/factions/${clusterId}_group.png`;
  const groupImageAlt = `${factionName} — faction group portrait`;

  return (
    <section className={`border ${accent.border} ${accent.bg} rounded-xl overflow-hidden mb-8`}>
      {/* Faction group portrait — full-width banner-style */}
      <div className="relative w-full aspect-[16/7] overflow-hidden bg-gray-950">
        <img
          src={groupImagePath}
          alt={groupImageAlt}
          className="w-full h-full object-cover object-center"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            const parent = (e.currentTarget as HTMLImageElement).parentElement;
            if (parent) {
              const placeholder = parent.querySelector('.img-placeholder') as HTMLElement | null;
              if (placeholder) placeholder.style.display = 'flex';
            }
          }}
        />
        {/* Placeholder shown until image loads */}
        <div
          className="img-placeholder hidden absolute inset-0 items-center justify-center"
          aria-hidden="true"
        >
          <span className="font-mono uppercase tracking-wide text-[9px] text-gray-700">
            group portrait — generating
          </span>
        </div>
        {/* Gradient overlay — bottom text legibility */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(3,7,18,0.92), transparent)' }}
          aria-hidden="true"
        />
        {/* Faction name overlay on portrait */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
          <p className="font-mono uppercase tracking-wide text-[9px] text-gray-500 mb-0.5">
            Cluster {clusterId} &middot; {culturalLineage.replace('_', ' ')} &middot; {techLevel}
          </p>
          <h3 className={`text-xl md:text-2xl font-bold leading-tight ${accent.text}`}>
            {factionName}
          </h3>
        </div>
      </div>

      {/* Faction narrative + metadata */}
      <div className="px-5 py-5">
        {/* BC signature + element distribution row */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="bg-gray-900/80 border border-gray-800 rounded px-2 py-0.5 font-mono text-[10px] text-gray-500">
            {bcSignature.engagement_profile}
          </span>
          <span className="bg-gray-900/80 border border-gray-800 rounded px-2 py-0.5 font-mono text-[10px] text-gray-500">
            {bcSignature.damage_geometry}
          </span>
          {elements.map(([elem, share]) => {
            const ea = ELEMENT_ACCENT[elem] ?? ELEMENT_ACCENT_FALLBACK;
            return (
              <span
                key={elem}
                className={`flex items-center gap-1 rounded px-2 py-0.5 ${ea.bg} border ${ea.border}`}
              >
                <span className={`text-[10px] font-medium ${ea.text} capitalize`}>{elem}</span>
                <span className="text-[10px] font-mono text-gray-600">{pct(share)}</span>
              </span>
            );
          })}
        </div>

        {/* Thematic tags */}
        {factionTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {factionTags.map(tag => (
              <span
                key={tag}
                className="text-[9px] font-mono text-gray-500 border border-gray-800 rounded px-1.5 py-0.5 bg-gray-900/40"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Faction identity narrative */}
        <p className="text-sm text-gray-300 leading-relaxed mb-5 max-w-prose">
          {factionNarrative}
        </p>

        {/* Kit list with individual portraits */}
        <div>
          <p className="font-mono uppercase tracking-wide text-[9px] text-gray-600 mb-3">
            {kits.length <= KIT_DISPLAY_CAP
              ? `${kits.length} kits`
              : `Featured kits (${KIT_DISPLAY_CAP} of ${kits.length})`}
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {displayKits.map(kit => {
              const kitImagePath = `/pitch/season_002/kits/${kit.kit_id}.png`;
              return (
                <li
                  key={kit.kit_id}
                  className="flex gap-3 bg-gray-950/60 border border-gray-800 rounded-lg p-3"
                >
                  {/* Individual kit portrait */}
                  <div className="flex-shrink-0 w-[56px] h-[72px] bg-gray-900 rounded border border-gray-800 overflow-hidden relative">
                    <img
                      src={kitImagePath}
                      alt={kit.kit_name_canonical}
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  {/* Kit name + narrative */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-semibold leading-snug ${accent.text} mb-1`}>
                      {kit.kit_name_canonical}
                    </p>
                    <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-4">
                      {kit.kit_identity_narrative}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Season002Marquee({ season }: Props) {
  const { faction_clusters, wave_b_kits_by_id, wave_s } = season;

  const seasonName = wave_s?.wave_s_season_name_canonical ?? 'Season of the Ironsoil Wide-Front';
  const thematicTags = wave_s?.wave_s_season_name_thematic_tags ?? [];

  // Sorted integer clusters only
  const integerClusters = faction_clusters
    .filter(c => typeof c.cluster_id === 'number')
    .sort((a, b) => (a.cluster_id as number) - (b.cluster_id as number));

  // Get cluster-membered kits for a given cluster_id, ordered by member_kit_ids
  function kitsForCluster(clusterId: number): WaveBKit[] {
    const cluster = integerClusters.find(c => c.cluster_id === clusterId);
    if (!cluster) return [];
    const result: WaveBKit[] = [];
    for (const kitId of cluster.member_kit_ids) {
      const kit = wave_b_kits_by_id.get(kitId);
      if (kit) result.push(kit);
    }
    return result;
  }

  const totalKits = integerClusters.reduce((sum, c) => sum + c.member_count, 0);

  return (
    <div>
      {/* Season header */}
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-6">
        <p className="font-mono uppercase tracking-wide text-xs text-gray-500 mb-1">
          Cycle 14 — Season 002 &middot; Marquee Presentation
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-100 leading-tight mb-2">
          {seasonName}
        </h2>
        {thematicTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {thematicTags.map(tag => (
              <span
                key={tag}
                className="text-[9px] font-mono text-amber-600/80 border border-amber-900/40 rounded px-2 py-0.5 bg-amber-950/20"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <p className="text-sm text-gray-400 leading-relaxed max-w-prose mb-4">
          Substrate-led generation. {integerClusters.length} factions emerged from Phase 5 GMM clustering
          across {totalKits} kits — faction identities authored by the engine from BC-axis signatures,
          cultural lineage, and element distribution. No designer-imposed archetypes.
        </p>

        {/* Stats row */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Factions', value: integerClusters.length },
            { label: 'Total kits', value: totalKits },
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
      </div>

      {/* 4 faction sections */}
      <div className="max-w-6xl mx-auto px-4">
        {integerClusters.map(cluster => (
          <FactionSection
            key={cluster.cluster_id}
            clusterId={cluster.cluster_id as number}
            factionName={cluster.faction_label_canonical}
            factionNarrative={cluster.faction_identity_narrative}
            factionTags={cluster.faction_thematic_tags}
            elementDist={cluster.element_distribution}
            bcSignature={cluster.modal_bc_axis_signature}
            culturalLineage={cluster.modal_cultural_lineage}
            techLevel={cluster.modal_tech_level}
            kits={kitsForCluster(cluster.cluster_id as number)}
          />
        ))}
      </div>
    </div>
  );
}
