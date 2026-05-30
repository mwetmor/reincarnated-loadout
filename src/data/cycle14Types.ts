// Cycle 14 Wave 5 faction cluster data types
// Consumed by Summary tab (Pitch.tsx) — read-only engine output.
//
// CROSS-SEAM CONTRACT (gamora Amendment 1, 2026-05-29):
//   cluster_id: number | "SINGLETON"
//   - integer (1,2,3,...) = faction cluster from Phase 5 GMM clustering
//   - "SINGLETON" = Wanderer architecture (gamora dispatch; post-gamora close integration)
//
// MIGRATION.md §v1.64 + §v1.65 (2026-05-29/30): wave_b_identities.json now available per season.
//   wave_s_* fields now available in season_summary.json per season.
//
// TODO(drax): remove Wanderer placeholder and surface Wanderer tiles when gamora Amendment 1 lands.

export type ClusterId = number | 'SINGLETON';

export interface ElementDistribution {
  [element: string]: number | undefined; // fractional share 0.0–1.0; optional per element
}

export interface ModalBcAxisSignature {
  engagement_profile: string;  // e.g. "ranged" | "close" | "mid"
  damage_geometry: string;     // e.g. "chain" | "large-AOE" | "single-target"
}

/** Phase 5 faction cluster — engine output from phase5_faction_clusters.json */
export interface FactionCluster {
  cluster_id: ClusterId;
  season_id: string;
  member_kit_ids: string[];      // engine-format kit IDs; Wave B names absent until engine ships Wave B
  member_count: number;
  modal_cultural_lineage: string;
  modal_tech_level: string;
  modal_tone: string;
  element_distribution: ElementDistribution;
  modal_bc_axis_signature: ModalBcAxisSignature;
  pm1_algorithm: string;
  cluster_compactness: number;
  faction_label_placeholder: string;
  faction_label_canonical: string;   // human-readable faction name (Wave A LLM output)
  faction_identity_narrative: string; // 2-3 sentence faction identity prose
  faction_thematic_tags: string[];
  substrate_anchored_personages: null | string[]; // null at baseline; Wanderer-populated post-gamora
  cosine_similarity_max: number;
  diversity_flag: boolean;
  phase7_gate_status: string;        // "canonical" = passed cohesion gate
  primary_pair_flag: boolean;
}

/** Top-level wrapper for phase5_faction_clusters.json */
export interface FactionClustersFile {
  metadata: {
    season_id: string;
    phase: number;
    faction_visibility: string;
    wave_a_fired: boolean;
    cluster_count: number;
    relationship_count: number;
    llm_cost_usd: number;
    wave_b_kit_count: number;
    wave_b_cost_usd: number;
  };
  clusters: FactionCluster[];
}

/** Per-kit identity record from wave_b_identities.json (MIGRATION.md §v1.64) */
export interface WaveBKit {
  season_id: string;
  kit_id: string;
  parent_cluster_id: ClusterId;  // number | "SINGLETON"
  kit_name_canonical: string;
  kit_identity_narrative: string;
  ai_tell_compliance_score: number;
  cohesion_judge_confidence: number;
  final_compliance_status: 'ACCEPT' | 'FALLBACK_SUBSTRATE_DERIVED' | string;
  grep_compliance_pass: boolean;
  // other engine telemetry fields omitted; not displayed
}

/** Top-level wrapper for wave_b_identities.json (MIGRATION.md §v1.64) */
export interface WaveBIdentitiesFile {
  season_id: string;
  kit_count: number;
  generated_at: string;
  kits: WaveBKit[];
  remediated_at?: string;
  remediation_summary?: {
    nameless_before: number;
    accept_on_retry: number;
    fallback_substrate_derived: number;
    still_nameless: number;
    estimated_cost_usd: number;
  };
}

/** Wave-S season name fields from season_summary.json (MIGRATION.md §v1.64) */
export interface WaveSSeasonMeta {
  wave_s_season_name_canonical: string;
  /** Wanderer sub-narrative or null when wanderer_count == 0 */
  wave_s_season_name_narrative_short: string | null;
  wave_s_season_name_thematic_tags: string[];
  wave_s_pattern_used: string;
  wave_s_final_compliance_status: string;
  wave_s_ai_tell_compliance_score: number;
}

/** Season-level summary used by Summary tab */
export interface Cycle14SeasonSummary {
  season_id: string;
  faction_clusters: FactionCluster[];
  /**
   * Per-kit identities from wave_b_identities.json (MIGRATION.md §v1.64).
   * Indexed by kit_id for O(1) lookup in FactionClusterTile.
   */
  wave_b_kits_by_id: Map<string, WaveBKit>;
  /** Wave-S season name and metadata from season_summary.json (MIGRATION.md §v1.64) */
  wave_s: WaveSSeasonMeta | null;
  /** Hero selection: elected after § 12.1 drax+galadriel pair consensus.
   *  TODO(drax): wire hero image URL after § 12.2 completes.
   */
  hero_faction_cluster_id: ClusterId | null;
  hero_image_url: string | null;
}
