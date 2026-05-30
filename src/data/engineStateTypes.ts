// Engine State Dashboard — data types
// Consumed by pages/EngineState.tsx + component tree under components/EngineState/
// Source files (fetched from public/engine-state/season-{001,002,003}/ at runtime):
//   season_summary.json         — KPI block + Wave-S name
//   phase4_archive_insertion.json — archive insertion results (Pareto)
//   phase5_faction_clusters.json  — faction cluster labels + member kit IDs
//   phase5_faction_relationships.json — cluster relationships (currently empty objects)
//   wave_b_identities.json       — per-kit canonical names + narratives
//   phase7_kit_verdicts.json     — pre-extracted Phase 7 verdict data from kit_archive.db
//   phase2_kit_candidates.json   — Phase 2 kit generation data (2.7 MB; lazy-loaded for BackwardTrace)
//
// Disc #11 empirical spot-check (2026-05-30) findings:
//   - season_summary.json: flat dict; 32 keys; season-001 has 4 clusters (not 3 from HTML);
//     season_003 HTML showed 3 but actual data = diff season.
//   - phase4_archive_insertion.json: wrapped dict { season_id, phase, accepted_count, ... insertion_results[] }
//   - phase5_faction_clusters.json: { metadata, clusters[] }; cluster has 23 keys including
//     faction_label_canonical, element_distribution, modal_bc_axis_signature
//   - phase5_faction_relationships.json: { metadata, relationships[] }; all items are empty {}
//   - wave_b_identities.json: { season_id, kit_count, kits[] }; kit has kit_id, kit_name_canonical,
//     parent_cluster_id, kit_identity_narrative, ai_tell_compliance_score
//   - phase7_kit_verdicts.json: pre-extracted; { season_id, kit_verdicts[], shipped_count, highest_cohesion_kit_id }
//   - phase2_kit_candidates.json: { metadata, kits[] }; 2.7 MB; each kit has bc_tuple, element,
//     chain_composition, gear_representative, skills[], cultural_lineage_canonical, etc.
//
// Phase α is STATUS SURFACE ONLY. No Phase β/γ concerns here.
// TODO(drax): remove this file and replace with live API types when Phase β ships.

// ---- season_summary.json ----

export interface EngineSeasonSummary {
  season_id: string;
  generation_pass: boolean;
  smoke: boolean;
  phase2_kit_count: number;
  phase3_passing_kit_count: number;
  phase4_accepted_count: number;
  phase4_rejected_count: number;
  phase5_cluster_count: number;
  phase5_llm_cost_usd: number;
  phase7_kits_evaluated: number;
  phase7_shipped_worthy: number;
  phase7_acceptance_rate: number;
  degeneracy_triggered: boolean;
  degeneracy_reason: string;
  wall_clock_seconds: number;
  generated_at: string;
  kit_archive_db: string;
  staging_root: string;
  wave_s_season_name_canonical: string;
  wave_s_season_name_narrative_short: string | null;
  wave_s_season_name_thematic_tags: string[];
  wave_s_pattern_used: string;
  wave_s_substrate_signals_referenced: string[];
  wave_s_llm_call_id: string | null;
  wave_s_cost_usd: number | null;
  wave_s_final_compliance_status: string;
  wave_s_ai_tell_compliance_score: number;
  wave_s_grep_compliance_pass: boolean;
  wave_s_regeneration_fired: boolean;
  wave_s_regeneration_reason: string | null;
  wave_s_error: string | null;
  wave_s_remediated_at: string | null;
}

// ---- phase4_archive_insertion.json ----

export interface Phase4InsertionResult {
  kit_id: string;
  bc_cell_id: string;
  disposition: 'ACCEPT' | 'REJECT' | string;
  reject_reason: string;
  quality_vector: [number, number, number, number, number];
  mg1_dominated: boolean;
  mg1_pareto_rank: number;
  mg2_diversity_score: number;
  mg3_duplicate_flag: boolean;
  mg4_novelty_score: number;
  wall_time_ms: number;
  is_variant_row: boolean;
  t4_strategy: string | null;
  invest_profile: string | null;
}

export interface Phase4ArchiveFile {
  season_id: string;
  phase: number;
  accepted_count: number;
  rejected_count: number;
  total_kits: number;
  base_kit_count: number;
  variant_row_count: number;
  variant_accepted_count: number;
  insertion_results: Phase4InsertionResult[];
}

// ---- phase5_faction_clusters.json ----

export interface Phase5ClusterMetadata {
  season_id: string;
  remediation?: string;
  remediated_at?: string;
  phase?: number;
  faction_visibility?: string;
  wave_a_fired?: boolean;
  cluster_count?: number;
  relationship_count?: number;
  llm_cost_usd?: number;
  wave_b_kit_count?: number;
  wave_b_cost_usd?: number;
}

export interface EngineStateBcAxisSignature {
  engagement_profile: string;
  damage_geometry: string;
}

export interface EngineStateCluster {
  cluster_id: number | string;
  season_id: string;
  member_kit_ids: string[];
  member_count: number;
  modal_cultural_lineage: string;
  modal_tech_level: string;
  modal_tone: string;
  element_distribution: Record<string, number>;
  modal_bc_axis_signature: EngineStateBcAxisSignature;
  pm1_algorithm: string;
  cluster_compactness: number;
  faction_label_placeholder: string;
  faction_label_canonical: string;
  faction_identity_narrative: string;
  faction_thematic_tags: string[];
  substrate_anchored_personages: null | string[];
  cosine_similarity_max: number;
  diversity_flag: boolean;
  phase7_gate_status: string;
  primary_pair_flag: boolean;
  gb_selection_rationale?: string;
  pairwise_distance_distribution?: number[];
}

export interface Phase5FactionClustersFile {
  metadata: Phase5ClusterMetadata;
  clusters: EngineStateCluster[];
}

// ---- wave_b_identities.json ----

export interface EngineStateWaveBKit {
  season_id: string;
  kit_id: string;
  parent_cluster_id: number | string;
  kit_name_canonical: string;
  kit_identity_narrative: string;
  ai_tell_compliance_score: number;
  cohesion_judge_confidence: number;
  final_compliance_status: string;
  grep_compliance_pass: boolean;
}

export interface WaveBIdentitiesFile {
  season_id: string;
  kit_count: number;
  generated_at: string;
  kits: EngineStateWaveBKit[];
  remediated_at?: string;
}

// ---- phase7_kit_verdicts.json (pre-extracted from SQLite) ----

export interface Phase7KitVerdict {
  kit_id: string;
  cluster_id: string | number;
  cohort: string;
  gauntlet_pass_rate: number;
  kit_cohesion_score: number | null;
  cluster_compactness: number | null;
  mechanical_pass: number;
  cohesion_pass: number;
  verdict: string;
  disposition: string;
  phase7_gate_status: string;
  diversity_flag: number | null;
  band_distance: number;
  cohort_midpoint: number;
}

export interface Phase7KitVerdictsFile {
  season_id: string;
  kit_verdicts: Phase7KitVerdict[];
  shipped_count: number;
  highest_cohesion_kit_id: string | null;
}

// ---- phase2_kit_candidates.json (lazy-loaded for BackwardTrace) ----

export interface Phase2BcTuple {
  range: string;
  tempo: string;
  amplitude: string;
  attribute: string;
  proxy_density: string;
}

export interface Phase2ChainComposition {
  t4_chains: number;
  supporting_chains: number;
  total_chains: number;
}

export interface Phase2Kit {
  character_id: string;
  bc_cell_id: string;
  bc_tuple: Phase2BcTuple;
  element: string;
  resource_model: string;
  cohort_archetype: string;
  class_chain_count: number;
  chain_composition: Phase2ChainComposition;
  substrate_sample_idx: number;
  cultural_lineage_canonical: string;
  historical_period_canonical: string;
  register_canonical: string;
  is_hybrid: boolean;
  secondary_element: string | null;
  wr_bracket_pass: boolean;
  // gear_representative and skills omitted for BackwardTrace (too large to type fully)
  [key: string]: unknown;
}

export interface Phase2KitCandidatesFile {
  metadata: {
    season_id: string;
    phase: number;
    kit_count: number;
    kit_ids: string[];
  };
  kits: Phase2Kit[];
}

// ---- Aggregated per-season engine state (built from all files) ----

export type SeasonId = 'season-001' | 'season-002' | 'season-003';

export const ENGINE_SEASON_IDS: SeasonId[] = ['season-001', 'season-002', 'season-003'];

export const ENGINE_SEASON_LABELS: Record<SeasonId, string> = {
  'season-001': 'Season 001',
  'season-002': 'Season 002',
  'season-003': 'Season 003',
};

/** All engine-state data fetched for a given season (excluding phase2_kit_candidates which is lazy). */
export interface EngineSeasonData {
  seasonSlug: SeasonId;
  summary: EngineSeasonSummary;
  phase4: Phase4ArchiveFile;
  clusters: Phase5FactionClustersFile;
  waveBIdentities: WaveBIdentitiesFile;
  phase7Verdicts: Phase7KitVerdictsFile;
}
