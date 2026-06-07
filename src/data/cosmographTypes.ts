/**
 * cosmographTypes.ts
 * TypeScript types for the elrond Phase 4 cosmograph packet.
 * Drax ingestion contract per cosmograph_README.md.
 *
 * These types correspond to the JSON-converted parquet files at
 * /public/data/cosmograph/ (produced by scripts/convert-cosmograph-data.py).
 */

// ─── primitive_registry.json ────────────────────────────────────────────────

export type ProvenanceTag =
  | 'active-v1.13'
  | 'retired-but-preserved'
  | 'CORE_14'
  | 'CORE_MARGINAL_2'
  | 'B11_EXPANSION'
  | 'B13_DEFENSIVE_MOBILITY'
  | 'rotating_flavor_pool_v1_2026-06-01'
  | 'architecture_A_taxonomy_sibling_v1_2026-06-01'
  | 'investment_pattern_v1.2_load-bearing'
  | 'investment_pattern_v1.2_canonical_locked_stub'
  | 'primary_attribute_v1'
  | 'deferred_placeholder_v1_2026-05-24'
  | 'race_set_tolkien_s1_illustrative_schema_only'
  | string; // catch-all for any additional tags

export interface PrimitiveEntry {
  primitive_id: string;
  primitive_family: string;
  primitive_label: string;
  substrate_fingerprint_json: string; // JSON string → parse on use
  element_coupling_json: string;      // JSON string → string[]
  attribute_coupling_json: string;    // JSON string → string[]
  canonical_source: string;
  provenance_tag: ProvenanceTag;
  bdi_weight: number;                 // [0.10, 1.00]
  embedding_x: number;
  embedding_y: number;
  visibility_at_default_zoom: boolean; // 77 true (first-class); 493 false (drill)
  is_simulated: boolean;              // All false (substrate is engine-canonical)
  notes: string;
}

// ─── kit_constellations.json ─────────────────────────────────────────────────

export interface KitConstellation {
  kit_id: string;                     // bc_cell_NNNN_simulated placeholder
  kit_name: string;                   // same as kit_id (D7 — no LLM names)
  kit_identity_narrative: string;     // "PROVISIONAL — engine has not yet composed this pattern."
  cell_status: 'PROVISIONAL';
  is_simulated: true;
  q_scores: null;
  gauntlet_pass_rate: null;
  pareto_rank: null;
  archive_status: null;
  elements_json: string;              // JSON string
  primary_element: string;
  kit_attribute: 'STR' | 'DEX' | 'INT' | 'WIS';
  sub_element_flavors_json: string;
  t4_strategies_json: string;
  skill_geometries_json: string;
  mechanic_primitives_json: string;
  weapon_form_tokens_json: string;
  cultural_traditions_json: string;
  chain_architecture: string;
  investment_scaling_pattern: string;
  skill_tree_positions_json: string;
  scaling_patterns_json: string;
  resource_model: string;
  primitive_set_json: string;         // JSON string → string[] of primitive_ids
  primitive_set_size: number;
  surface_B_element_class: 'physical' | 'caster';
  is_hybrid: boolean;
  centroid_x: number;
  centroid_y: number;
}

// ─── flag_enum_attachments.json ──────────────────────────────────────────────

export interface FlagEnumAttachment {
  kit_id: string;
  flag_set_json: string;  // JSON string → string[]
  flag_count: number;     // mean 15.6, range 14-20
}

// ─── region_labels.json ──────────────────────────────────────────────────────

export interface EmergentMechanicCluster {
  cluster_id: number;
  label: string;                    // e.g. "emergent::damage|close|high"
  centroid_x: number;
  centroid_y: number;
  member_count: number;
  dominant_effect_category: string; // Discipline #11 empirical: actual field name
  dominant_range: string;
  dominant_tempo: string;
  purity: number;
  member_primitive_ids: string[];
}

export interface RegionLabels {
  _meta: { version: string; phase: string };
  bc_bin_labels: {
    source: string;
    total_bins: number;
    axes: Record<string, unknown[]>;
  };
  skill_tree_tier_labels: { tiers: string[] };
  scaling_pattern_per_tier_labels: Record<string, unknown>;
  chain_architecture_labels: Record<string, unknown>;
  emergent_mechanic_family_labels: {
    status: string;
    methodology: Record<string, unknown>;
    cluster_count: number;
    clusters: EmergentMechanicCluster[];
  };
}

// ─── faction_overlays.json ───────────────────────────────────────────────────

export interface FactionOverlay {
  faction_id: string;
  faction_label_placeholder: string;  // e.g. "emergent::physical|STR|hyb22"
  member_count: number;
  member_kit_ids: string[];
  centroid: { x: number; y: number };
  spread: { std_x: number; std_y: number };
  polygon_convex_hull: [number, number][];
  element_distribution: Record<string, number>;
  modal_primary_element: string;
  modal_attribute: 'STR' | 'INT' | 'WIS' | 'DEX';
  hybrid_fraction: number;
  label_status: string;
}

export interface FactionOverlays {
  _meta: {
    algorithm: string;
    cluster_count: number;
    kit_count: number;
    label_status_all: string;
  };
  factions: FactionOverlay[];
}

// ─── Derived / computed types used by renderer ───────────────────────────────

/** Lasso resolution output */
export interface LassoMatch {
  kit: KitConstellation;
  coverage_fraction: number;
  density_score: number;
  weight_score: number;
  composite_score: number;
}

// ─── constellation_layout.json — pre-computed Mode B layout ─────────────────
// Generated by scripts/compute-constellation-layout.py at build time.
// Loaded lazily by Forge.tsx when constellation mode is selected.

/** One instance node within a constellation cluster (compact keys for JSON size) */
export interface ConstellationLayoutNode {
  p: string;   // primitive_id (compact 'p' to minimize JSON)
  x: number;   // world-space x
  y: number;   // world-space y
}

/** Centroid position for one kit constellation */
export interface ConstellationCentroid {
  kit_id: string;
  cx: number;        // world-space centroid x
  cy: number;        // world-space centroid y
  element: string;   // primary_element (for dot color at LOD)
  attribute: string; // kit_attribute (for dot label)
}

/** Full pre-computed Mode B layout, loaded from constellation_layout.json */
export interface ConstellationLayoutData {
  meta: {
    n_kits: number;
    n_primitives: number;
    world_w: number;    // logical world canvas width (px)
    world_h: number;    // logical world canvas height (px)
    max_constellation_radius: number;
    stage1_method: string;
    stage2_method: string;
    generated_by: string;
    umap_caveat: string;
    [key: string]: unknown;
  };
  centroids: ConstellationCentroid[];
  clusters: Record<string, ConstellationLayoutNode[]>;   // kit_id → instance nodes
}

/** Parsed flag set grouped by family */
export interface FlagFamilyGroup {
  groupLabel: string;
  flags: string[];
  chipStyle: 'earth' | 'capstone' | 'structural' | 'faded' | 'mechanical' | 'tactical' | 'default';
}
