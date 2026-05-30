// FactionClusterTile — single faction cluster presentation tile
// Used in: Summary tab (Pitch.tsx § 11.2)
// Style register: hand-drawn pixel-art HD-2D-shaped (canonical/story/style-register.md)
// Data: read-only engine output from phase5_faction_clusters.json via cycle14SeasonData.ts

import type { FactionCluster } from '../../data/cycle14Types';
import { ELEMENT_ACCENT, ELEMENT_ACCENT_FALLBACK } from '../../data/cycle14SeasonData';

interface Props {
  cluster: FactionCluster;
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

export function FactionClusterTile({ cluster }: Props) {
  const dominant = dominantElement(cluster.element_distribution);
  const accent = ELEMENT_ACCENT[dominant] ?? ELEMENT_ACCENT_FALLBACK;

  // Sort elements by share descending for display; filter out undefined values
  const sortedElements = (Object.entries(cluster.element_distribution) as [string, number | undefined][])
    .filter((e): e is [string, number] => e[1] !== undefined)
    .sort((a, b) => b[1] - a[1]);

  return (
    <article
      className={`rounded-lg border ${accent.border} ${accent.bg} p-4 flex flex-col gap-3`}
      aria-label={`Faction: ${cluster.faction_label_canonical}`}
    >
      {/* Header row: cluster id badge + faction name */}
      <header className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-mono uppercase tracking-wide text-[9px] text-gray-600 mb-0.5">
            Cluster {cluster.cluster_id}
          </p>
          <h3 className={`text-sm font-semibold leading-snug ${accent.text}`}>
            {cluster.faction_label_canonical}
          </h3>
        </div>
        {/* Member count badge */}
        <span className="flex-shrink-0 text-[10px] font-mono text-gray-600 bg-gray-900/60 border border-gray-800 rounded px-1.5 py-0.5">
          {cluster.member_count} kits
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

      {/* Wave B kit names: pending engine Wave B implementation */}
      <p className="text-[9px] font-mono text-gray-700 italic">
        Per-kit names: pending Wave B engine implementation
        {/* TODO(drax): replace with Wave B kit name list when engine ships Wave B (rocket seam) */}
      </p>
    </article>
  );
}
