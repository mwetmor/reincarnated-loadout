// FactionClusterTile — single faction cluster presentation tile
// Used in: Summary tab (Pitch.tsx § 11.2)
// Style register: hand-drawn pixel-art HD-2D-shaped (canonical/story/style-register.md)
// Data: read-only engine output from phase5_faction_clusters.json + wave_b_identities.json
// MIGRATION.md §v1.64: per-kit names now displayed (replaces "pending Wave B" placeholder).

import type { FactionCluster, WaveBKit } from '../../data/cycle14Types';
import { ELEMENT_ACCENT, ELEMENT_ACCENT_FALLBACK } from '../../data/cycle14SeasonData';

interface Props {
  cluster: FactionCluster;
  /** Per-kit identity records for this cluster's members (from wave_b_identities.json). */
  kitsByCluster: WaveBKit[];
}

/** Format a fractional share (0.0–1.0) as a percentage string. */
function pct(v: number | undefined): string {
  if (v === undefined) return '?';
  return `${Math.round(v * 100)}%`;
}

/** Return the dominant element (highest share) in a distribution. */
function dominantElement(dist: Record<string, number | undefined>): string {
  return Object.entries(dist)
    .filter((e): e is [string, number] => e[1] !== undefined)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';
}

export function FactionClusterTile({ cluster, kitsByCluster }: Props) {
  const dominant = dominantElement(cluster.element_distribution);
  const accent = ELEMENT_ACCENT[dominant] ?? ELEMENT_ACCENT_FALLBACK;

  // Sort elements by share descending for display; filter out undefined values
  const sortedElements = (Object.entries(cluster.element_distribution) as [string, number | undefined][])
    .filter((e): e is [string, number] => e[1] !== undefined)
    .sort((a, b) => b[1] - a[1]);

  const isWanderer = cluster.cluster_id === 'SINGLETON';

  return (
    <article
      className={`rounded-lg border ${accent.border} ${accent.bg} p-4 flex flex-col gap-3`}
      aria-label={`Faction: ${cluster.faction_label_canonical}`}
    >
      {/* Header row: cluster id badge + faction name */}
      <header className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-mono uppercase tracking-wide text-[9px] text-gray-600 mb-0.5">
            {isWanderer ? 'Wanderer' : `Cluster ${cluster.cluster_id}`}
          </p>
          <h3 className={`text-sm font-semibold leading-snug ${accent.text}`}>
            {cluster.faction_label_canonical}
          </h3>
        </div>
        {/* Member count badge: use wave_b kit count as authoritative display count
            (wave_b parent_cluster_id is authoritative per MIGRATION.md §v1.64;
             SINGLETON kits may be excluded from faction member_count). */}
        <span className="flex-shrink-0 text-[10px] font-mono text-gray-600 bg-gray-900/60 border border-gray-800 rounded px-1.5 py-0.5">
          {kitsByCluster.length > 0 ? kitsByCluster.length : cluster.member_count} kits
        </span>
      </header>

      {/* Faction identity narrative */}
      <p className="text-xs text-gray-400 leading-relaxed">
        {cluster.faction_identity_narrative}
      </p>

      {/* BC signature + cultural lineage row */}
      <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
        <span className="bg-gray-900/60 border border-gray-800 rounded px-1.5 py-0.5 text-gray-500">
          {cluster.modal_bc_axis_signature.engagement_profile}
        </span>
        <span className="bg-gray-900/60 border border-gray-800 rounded px-1.5 py-0.5 text-gray-500">
          {cluster.modal_bc_axis_signature.damage_geometry}
        </span>
        <span className="bg-gray-900/60 border border-gray-800 rounded px-1.5 py-0.5 text-gray-500">
          {cluster.modal_cultural_lineage.replace('_', ' ')}
        </span>
        <span className="bg-gray-900/60 border border-gray-800 rounded px-1.5 py-0.5 text-gray-500">
          {cluster.modal_tech_level}
        </span>
      </div>

      {/* Element distribution bar */}
      <div>
        <p className="font-mono uppercase tracking-wide text-[9px] text-gray-600 mb-1">
          Element distribution
        </p>
        <div className="flex gap-1 flex-wrap">
          {sortedElements.map(([elem, share]) => {
            const elemAccent = ELEMENT_ACCENT[elem] ?? ELEMENT_ACCENT_FALLBACK;
            return (
              <div
                key={elem}
                className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${elemAccent.bg} border ${elemAccent.border}`}
              >
                <span className={`text-[10px] font-medium ${elemAccent.text} capitalize`}>
                  {elem}
                </span>
                <span className="text-[10px] font-mono text-gray-600">
                  {pct(share)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Thematic tags */}
      {cluster.faction_thematic_tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {cluster.faction_thematic_tags.map(tag => (
            <span
              key={tag}
              className="text-[9px] font-mono text-gray-600 border border-gray-800 rounded px-1.5 py-0.5 bg-gray-900/40"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Per-kit names and 1-line narratives (Wave B — MIGRATION.md §v1.64) */}
      {kitsByCluster.length > 0 ? (
        <div>
          <p className="font-mono uppercase tracking-wide text-[9px] text-gray-600 mb-1.5">
            Kits
          </p>
          <ul className="flex flex-col gap-2">
            {kitsByCluster.map(kit => (
              <li key={kit.kit_id} className="border-l border-gray-800 pl-2">
                <p className={`text-[11px] font-semibold leading-snug ${accent.text} mb-0.5`}>
                  {kit.kit_name_canonical}
                </p>
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  {kit.kit_identity_narrative}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        // No wave_b kits matched this cluster (should not occur post-remediation)
        <p className="text-[9px] font-mono text-gray-800 italic">
          No per-kit names matched for this cluster.
        </p>
      )}
    </article>
  );
}
