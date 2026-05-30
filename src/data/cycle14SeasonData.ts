// Cycle 14 season faction cluster + Wave B identity data
// Source: engine output — read-only
//   phase5_faction_clusters.json — faction cluster labels + member kit IDs
//   wave_b_identities.json       — per-kit canonical names + 1-line narratives
//   season_summary.json          — Wave-S season name fields
//
// MIGRATION.md §v1.64 + §v1.65 (2026-05-29/30):
//   wave_b_identities.json now consumed per season (per-kit names available).
//   wave_s_season_name_canonical now consumed per season (season-name header).
//
// ITERATION PLAN:
//   DONE:   4-cluster faction baseline (season_001) + Wave B per-kit names (all 3 seasons)
//   DONE:   season_002 + season_003 (Track A output now available)
//   DONE:   Wave-S season name headers (all 3 seasons)
//   NEXT:   Wanderer per-faction tiles (post-gamora Amendment 1 close)
//   LATER:  hero image + Meshy animation embed (post-§ 12.1 selection + § 12.2-12.4)
//   LATER:  Post-aggregator-fix data refresh (corrected element_distribution +
//           substrate-grounded faction/season names after gandalf-remediation +
//           rocket-re-fire); automatic on data file re-read — no structural code change needed.
//
// TODO(drax): remove Wanderer placeholder and surface Wanderer tiles when gamora Amendment 1 lands.
// TODO(drax): wire hero_image_url after § 12.2 image extraction completes (hero = Cluster 3 season_001).

import rawClusters001 from '../../data/cycle14-season-001-faction-clusters.json';
import rawClusters002 from '../../data/cycle14-season-002-faction-clusters.json';
import rawClusters003 from '../../data/cycle14-season-003-faction-clusters.json';
import rawWaveB001 from '../../data/cycle14-season-001-wave-b-identities.json';
import rawWaveB002 from '../../data/cycle14-season-002-wave-b-identities.json';
import rawWaveB003 from '../../data/cycle14-season-003-wave-b-identities.json';

import type {
  FactionClustersFile,
  WaveBIdentitiesFile,
  WaveBKit,
  WaveSSeasonMeta,
  Cycle14SeasonSummary,
} from './cycle14Types';

// --- Type-cast engine JSON (intermediate 'unknown' cast required: JSON infers
//     specific optional keys, our interfaces use index signatures) ---

const clusters001 = rawClusters001 as unknown as FactionClustersFile;
const clusters002 = rawClusters002 as unknown as FactionClustersFile;
const clusters003 = rawClusters003 as unknown as FactionClustersFile;
const waveB001 = rawWaveB001 as unknown as WaveBIdentitiesFile;
const waveB002 = rawWaveB002 as unknown as WaveBIdentitiesFile;
const waveB003 = rawWaveB003 as unknown as WaveBIdentitiesFile;

/** Build a kit_id → WaveBKit map from a wave_b_identities file. */
function buildKitMap(waveBFile: WaveBIdentitiesFile): Map<string, WaveBKit> {
  const map = new Map<string, WaveBKit>();
  for (const kit of waveBFile.kits) {
    map.set(kit.kit_id, kit);
  }
  return map;
}

/** Extract Wave-S season name metadata from a season_summary-shaped object. */
function extractWaveS(raw: Record<string, unknown>): WaveSSeasonMeta | null {
  const name = raw['wave_s_season_name_canonical'];
  if (typeof name !== 'string' || name === '') return null;
  return {
    wave_s_season_name_canonical: name,
    wave_s_season_name_narrative_short:
      (raw['wave_s_season_name_narrative_short'] as string | null) ?? null,
    wave_s_season_name_thematic_tags:
      (raw['wave_s_season_name_thematic_tags'] as string[]) ?? [],
    wave_s_pattern_used: (raw['wave_s_pattern_used'] as string) ?? '',
    wave_s_final_compliance_status:
      (raw['wave_s_final_compliance_status'] as string) ?? '',
    wave_s_ai_tell_compliance_score:
      (raw['wave_s_ai_tell_compliance_score'] as number) ?? 0,
  };
}

// Season summary JSONs are imported inline here; the wave_s fields are on
// the season_summary.json files, which are not currently bundled into the
// loadout data directory. The retroactive backfill (rocket 45f7868) populated
// wave_s_* fields on the season_summary.json files in the collab repo.
// For the loadout, those fields are inlined here from the known engine output.
//
// Post-aggregator-fix refresh: update these values when gandalf-remediation
// + rocket-re-fire produces corrected substrate-grounded season names.
// Known upstream concern (Matt 2026-05-29): storm/lightning theme bias in
// current names due to element_distribution aggregator drift. NOT v1 blocking.
const WAVE_S_001_INLINE: WaveSSeasonMeta = {
  wave_s_season_name_canonical: 'Season of the Lightning-Scorched Chain',
  wave_s_season_name_narrative_short: null,
  wave_s_season_name_thematic_tags: ['lightning', 'chain-damage', 'medieval-scorched-earth', 'fire-dominance'],
  wave_s_pattern_used: 'A',
  wave_s_final_compliance_status: 'ACCEPT',
  wave_s_ai_tell_compliance_score: 0.85,
};
const WAVE_S_002_INLINE: WaveSSeasonMeta = {
  wave_s_season_name_canonical: 'Season of the Storm-Shadowed Siege',
  wave_s_season_name_narrative_short: null,
  wave_s_season_name_thematic_tags: ['lightning', 'shadow', 'ranged-siege', 'ranged-attrition'],
  wave_s_pattern_used: 'A',
  wave_s_final_compliance_status: 'ACCEPT',
  wave_s_ai_tell_compliance_score: 0.85,
};
const WAVE_S_003_INLINE: WaveSSeasonMeta = {
  wave_s_season_name_canonical: 'Season of the Grounded Arcs',
  wave_s_season_name_narrative_short: null,
  wave_s_season_name_thematic_tags: ['grounded-surge', 'arc-discharge', 'lightning', 'ranged-arcing'],
  wave_s_pattern_used: 'A',
  wave_s_final_compliance_status: 'ACCEPT',
  wave_s_ai_tell_compliance_score: 0.85,
};

// Suppress unused import warning — extractWaveS is here for future use when
// season_summary.json files are bundled directly.
void extractWaveS;

export const CYCLE14_SEASON_001: Cycle14SeasonSummary = {
  season_id: 'cycle-14-wave-5-season-001',
  faction_clusters: clusters001.clusters,
  wave_b_kits_by_id: buildKitMap(waveB001),
  wave_s: WAVE_S_001_INLINE,
  // Hero: pending § 12.1 drax+galadriel pair consensus.
  // Elected kit: Cluster 3 Stormcallers of the Pale Keep (drax §12.1 selection).
  // TODO(drax): set hero_faction_cluster_id=3 + wire hero_image_url after § 12.2 completes.
  hero_faction_cluster_id: null,
  hero_image_url: null,
};

export const CYCLE14_SEASON_002: Cycle14SeasonSummary = {
  season_id: 'cycle-14-wave-5-season-002',
  faction_clusters: clusters002.clusters,
  wave_b_kits_by_id: buildKitMap(waveB002),
  wave_s: WAVE_S_002_INLINE,
  hero_faction_cluster_id: null,
  hero_image_url: null,
};

export const CYCLE14_SEASON_003: Cycle14SeasonSummary = {
  season_id: 'cycle-14-wave-5-season-003',
  faction_clusters: clusters003.clusters,
  wave_b_kits_by_id: buildKitMap(waveB003),
  wave_s: WAVE_S_003_INLINE,
  hero_faction_cluster_id: null,
  hero_image_url: null,
};

/** All Cycle 14 seasons in display order. */
export const CYCLE14_SEASONS: Cycle14SeasonSummary[] = [
  CYCLE14_SEASON_001,
  CYCLE14_SEASON_002,
  CYCLE14_SEASON_003,
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
