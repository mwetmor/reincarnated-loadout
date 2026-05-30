// EngineStateFactionEmergence — N faction clusters per season's actual count
// Renders Phase 5 emergence section. Cluster count varies per season (3 or 4).
// Phase α: status surface only.

import type { Phase5FactionClustersFile, WaveBIdentitiesFile, Phase7KitVerdictsFile } from '../../data/engineStateTypes';
import { ELEMENT_ACCENT, ELEMENT_ACCENT_FALLBACK } from '../../data/cycle14SeasonData';

// Static border-left color map for Tailwind purge safety (cannot use string.replace() at runtime)
const ELEMENT_BORDER_LEFT: Record<string, string> = {
  fire:      'border-l-red-800',
  water:     'border-l-cyan-800',
  earth:     'border-l-stone-700',
  wind:      'border-l-slate-700',
  lightning: 'border-l-yellow-700',
  holy:      'border-l-amber-700',
  shadow:    'border-l-purple-900',
  physical:  'border-l-gray-700',
};

interface Props {
  clusters: Phase5FactionClustersFile;
  waveBIdentities: WaveBIdentitiesFile;
  phase7Verdicts: Phase7KitVerdictsFile;
}

function pct(v: number | undefined): string {
  if (v === undefined || v == null) return '?';
  return `${Math.round(v * 100)}%`;
}

export function EngineStateFactionEmergence({ clusters, waveBIdentities, phase7Verdicts }: Props) {
  const clusterCount = clusters.clusters.length;

  // Build kit → cluster membership map from wave_b
  const kitsByCluster = new Map<string | number, typeof waveBIdentities.kits>();
  for (const kit of waveBIdentities.kits) {
    const cid = kit.parent_cluster_id;
    if (!kitsByCluster.has(cid)) kitsByCluster.set(cid, []);
    kitsByCluster.get(cid)!.push(kit);
  }

  // Build shipped kit set from phase7 verdicts
  const shippedKitIds = new Set(
    phase7Verdicts.kit_verdicts
      .filter((v) => v.verdict === 'SHIPPED-WORTHY')
      .map((v) => v.kit_id)
  );

  return (
    <section className="my-8">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">§ 3</span>
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">
          Phase 5 emergence — {clusterCount} faction{clusterCount !== 1 ? 's' : ''} surfaced
        </h2>
      </div>
      <p className="text-sm text-gray-400 mb-4 max-w-[70ch]">
        PM-1 GMM-BIC clustering on the {clusters.metadata.cluster_count ?? clusterCount}-kit archive produced {clusterCount} substrate-led factions.
        Wave A LLM named each from cluster modal lineage + element distribution + BC signature.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {clusters.clusters.map((cluster) => {
          const clusterKits = kitsByCluster.get(cluster.cluster_id) ?? [];
          const sortedElements = Object.entries(cluster.element_distribution)
            .filter((e): e is [string, number] => e[1] != null)
            .sort(([, a], [, b]) => b - a);
          const dominant = sortedElements[0]?.[0] ?? 'physical';
          const accent = ELEMENT_ACCENT[dominant] ?? ELEMENT_ACCENT_FALLBACK;
          const borderLeft = ELEMENT_BORDER_LEFT[dominant] ?? 'border-l-gray-700';

          // Phase 7 gate status: determine if cluster kits are all held
          const isHeld = cluster.phase7_gate_status !== 'canonical';
          const shippedInCluster = clusterKits.filter((k) => shippedKitIds.has(k.kit_id)).length;

          return (
            <div
              key={cluster.cluster_id}
              className={`bg-white rounded-lg border border-gray-200 border-l-4 ${borderLeft} p-5 ${isHeld ? 'opacity-75' : ''}`}
            >
              <div className="flex items-start justify-between mb-2 gap-2">
                <h3 className={`text-base font-bold leading-snug ${accent.text}`}>
                  Cluster {cluster.cluster_id} — {cluster.faction_label_canonical}
                </h3>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[10px] font-mono text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                    n = {cluster.member_count}
                  </span>
                  {isHeld && (
                    <span className="text-[9px] font-mono uppercase text-red-500 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                      HELD
                    </span>
                  )}
                  {!isHeld && shippedInCluster > 0 && (
                    <span className="text-[9px] font-mono uppercase text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                      {shippedInCluster} shipped
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                {cluster.faction_identity_narrative}
              </p>

              <div className="grid text-xs gap-y-1.5 mb-3" style={{ gridTemplateColumns: '90px 1fr' }}>
                <span className="text-[9px] font-mono uppercase text-gray-400">Modal BC</span>
                <span className="text-gray-700">
                  {cluster.modal_bc_axis_signature.engagement_profile} × {cluster.modal_bc_axis_signature.damage_geometry}
                </span>
                <span className="text-[9px] font-mono uppercase text-gray-400">Lineage</span>
                <span className="text-gray-700">
                  {cluster.modal_cultural_lineage.replace('_', ' ')} × {cluster.modal_tech_level}
                </span>
                <span className="text-[9px] font-mono uppercase text-gray-400">Compactness</span>
                <span className="text-gray-700 font-mono">{cluster.cluster_compactness.toFixed(3)}</span>
              </div>

              {/* Element distribution pills */}
              <div className="mb-3">
                <p className="text-[9px] font-mono uppercase tracking-wide text-gray-400 mb-1">Element distribution</p>
                <div className="flex flex-wrap gap-1">
                  {sortedElements.map(([elem, share]) => {
                    const ea = ELEMENT_ACCENT[elem] ?? ELEMENT_ACCENT_FALLBACK;
                    return (
                      <span key={elem} className={`text-[10px] font-mono rounded px-1.5 py-0.5 ${ea.bg} ${ea.text} border ${ea.border}`}>
                        {elem} {pct(share)}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Thematic tags */}
              {cluster.faction_thematic_tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {cluster.faction_thematic_tags.map((tag) => (
                    <span key={tag} className="text-[9px] font-mono text-gray-500 border border-gray-200 rounded px-1.5 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Phase 7 gate status */}
              {isHeld && (
                <div className="text-[10px] text-red-500 font-mono border-t border-gray-100 pt-2 mt-2">
                  Phase 7: Cohesion PASS / Mechanical FAIL → 0 shipped
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
