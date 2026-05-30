// Cycle 14 season_001 faction cluster data
// Source: engine Path X output — phase5_faction_clusters.json (read-only)
// Consumed by: Summary tab (Pitch.tsx § 11.2 faction tile section)
//
// ITERATION PLAN:
//   NOW:    4-cluster faction baseline (season_001 from Path X)
//   NEXT:   Wanderer per-faction tiles (post-gamora Amendment 1 close)
//   LATER:  season_002 + season_003 (post-Track-A rocket production)
//   LATER:  hero image + Meshy animation embed (post-§ 12.1 selection + § 12.2-12.4)
//
// This module is the single point of truth for cycle-14 loadout data.
// When new seasons land from Track A, add them to CYCLE14_SEASONS below.

import rawClusters from '../../data/cycle14-season-001-faction-clusters.json';
import type { FactionClustersFile, Cycle14SeasonSummary } from './cycle14Types';

// JSON has optional element keys (e.g. {fire:1.0} not {fire:1.0,earth:0,...}).
// The intermediate 'unknown' cast is required — the JSON type inferred by TS
// has specific element keys as optional vs our index signature with undefined.
const parsed = rawClusters as unknown as FactionClustersFile;

export const CYCLE14_SEASON_001: Cycle14SeasonSummary = {
  season_id: 'cycle-14-wave-5-season-001',
  faction_clusters: parsed.clusters,
  // Wave B per-kit names: pending engine Wave B implementation.
  // TODO(drax): remove null when engine ships Wave B per-kit naming (rocket seam).
  wave_b_kit_names: null,
  // Hero: pending § 12.1 drax+galadriel pair consensus.
  // TODO(drax): set hero_faction_cluster_id + hero_image_url after § 12.2 completes.
  hero_faction_cluster_id: null,
  hero_image_url: null,
};

/** All Cycle 14 seasons in display order. */
export const CYCLE14_SEASONS: Cycle14SeasonSummary[] = [
  CYCLE14_SEASON_001,
  // season_002 and season_003: pending Track A (rocket; blocked on gamora)
  // TODO(drax): add CYCLE14_SEASON_002, CYCLE14_SEASON_003 when Track A lands.
];

/** Tailwind accent color classes per canonical element name.
 *  Extended from pitchData.ts SUBSTRATE_ACCENT to cover Cycle 14 elements. */
export const ELEMENT_ACCENT: Record<string, { text: string; bg: string; border: string }> = {
  fire:      { text: 'text-red-400',    bg: 'bg-red-900/30',    border: 'border-red-800/60'    },
  water:     { text: 'text-cyan-400',   bg: 'bg-cyan-950/30',   border: 'border-cyan-800/60'   },
  earth:     { text: 'text-amber-600',  bg: 'bg-stone-900/30',  border: 'border-stone-700/60'  },
  wind:      { text: 'text-slate-300',  bg: 'bg-slate-900/30',  border: 'border-slate-700/60'  },
  lightning: { text: 'text-yellow-300', bg: 'bg-yellow-950/30', border: 'border-yellow-700/60' },
  holy:      { text: 'text-amber-200',  bg: 'bg-amber-950/30',  border: 'border-amber-700/60'  },
  shadow:    { text: 'text-purple-400', bg: 'bg-gray-900/50',   border: 'border-purple-900/60' },
  physical:  { text: 'text-gray-400',   bg: 'bg-gray-900/30',   border: 'border-gray-700/60'   },
};

/** Fallback for unknown elements. */
export const ELEMENT_ACCENT_FALLBACK = { text: 'text-gray-400', bg: 'bg-gray-900/30', border: 'border-gray-700/60' };
