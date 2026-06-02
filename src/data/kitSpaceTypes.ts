// kitSpaceTypes.ts — EAA-6 kit-space data shape for drax consumer
//
// Source-of-truth schema: reincarnated-engine/data/kit_space/chronicle/CHRONICLE_SCHEMA.md
// Joint design spec: agentic_orchestration/elrond/notes/2026-06-02-eaa-3-plus-4-joint-ingest-and-chronicle-spec.md
// MIGRATION.md: v1.8 (EAA-3 per-kit JSON) + v1.9 (EAA-4 chronicle)
//
// Consumer read-only — loadout reads kit_space output from public/kit-space/.
// Do NOT amend MIGRATION.md from consumer side; surface incompatibilities to KR (Gate-1 INFO-3).

// ---------------------------------------------------------------------------
// Kit-space per-kit skill shape (EAA-3 per-kit JSON; WS1A.4-lite enriched)
// ---------------------------------------------------------------------------

export interface KitSkill {
  id: string;
  name: string | null;
  role: string;
  canonical_element: string;
  tier: number;
  chain_id: string | null;
  energy_cost: number;
  cooldown_seconds: number;
  damage_multiplier: number;
  geometry_type: string | null;
  spatial_geometry_type: string | null;
  scaling_coefficient: number;
  bc_axis_contribution: Record<string, unknown>;
  chain_position: number | null;
  parent_skill_ids: string[];
  // WS1A.4-lite per-skill flavor decision metadata (EAA-1; additive; all nullable)
  ws1a4_flavor_decision?: boolean | null;
  ws1a4_flavor_word_used?: string | null;
  ws1a4_attempt_number?: number | null;
  ws1a4_is_fallback?: boolean | null;
  // Phase 5 narrative fields
  flavor_text?: string | null;
  effects?: string[];
  // Phase 5 cohesion metadata (all optional — present when phase5 pipeline ran)
  phase5_thematic_tags?: string[] | null;
  phase5_cohesion_score?: number | null;
  phase5_cohesion_breakdown?: Record<string, number> | null;
  phase5_attempt_number?: number | null;
  phase5_is_placeholder?: boolean | null;
  phase5_cache_hit?: boolean | null;
}

// ---------------------------------------------------------------------------
// Kit-space per-kit chain composition summary (subset of ClassGenerator output)
// NOTE: chain_composition in kit JSON = { chain_count: number } (ClassGenerator path)
// QDX-5 additive: bc_range / bc_tempo / bc_amplitude / bc_attribute / bc_proxy_density fields.
// Guard access: kitChainComposition?.chain_count ?? null
// ---------------------------------------------------------------------------

export interface KitChainComposition {
  chain_count: number;
  // QDX-5 additive — present on ClassGenerator Option B kits; absent on EAA-5 v2 kits
  bc_range?: string | null;
  bc_tempo?: string | null;
  bc_amplitude?: string | null;
  bc_attribute?: string | null;
  bc_proxy_density?: string | null;
}

// ---------------------------------------------------------------------------
// T4 selection shape (QDX-5 additive — multi-T4 per kit)
// CRITICAL per Note 2: always check is_active before rendering T4 as "selected"
// ---------------------------------------------------------------------------

export interface KitT4NarrationMetadata {
  has_mechanic_alteration?: boolean | null;
  alteration_type?: string | null;
  thematic_rationale?: string | null;
  manifestation?: string | null;
  spirit_guide_explainer_template?: string | null;
  narrative_hooks?: string[];
  secondary_alteration_types?: string[];
}

export interface KitT4Selection {
  candidate_id: string;
  category_a_strategy?: string | null;
  category_bc_strategy?: string | null;
  t4_category_bc?: string | null;
  is_class_wide_trade_off?: boolean | null;
  secondary_element?: string | null;
  magnitude_tier?: string | null;
  magnitude_midpoint?: number | null;
  parallel_chain_mode?: string | null;
  target_chain_id?: string | null;
  resolve_score?: number | null;
  create_score?: number | null;
  net_synergy_score?: number | null;
  synergy_eligible?: boolean | null;
  retries_used?: number | null;
  pattern_9_warn?: boolean | null;
  pattern_10_warn?: boolean | null;
  // NOTE 2 — CRITICAL: is_active=false means T4 is suppressed from player display
  // Rendering MUST check is_active === true before showing T4 details
  is_active: boolean;
  separability_pass?: boolean | null;
  t4_scope?: string | null;
  scope_downscale_factor?: number | null;
  scope_prior_weight?: number | null;
  scope_weighted_score?: number | null;
  spirit_guide_narration_metadata?: KitT4NarrationMetadata | null;
  thematic_rationale?: string | null;
  phase5_t4_narration_cohesion_score?: number | null;
  phase5_t4_narration_attempt_number?: number | null;
  phase5_t4_narration_is_fallback?: boolean | null;
  phase5_t4_narration_cache_hit?: boolean | null;
}

// ---------------------------------------------------------------------------
// Kit substrate trace (EAA-3 per-kit JSON substrate_trace field)
// ---------------------------------------------------------------------------

export interface KitSubstrateTrace {
  source: string;
  generation_seed?: number | null;
  archetype_tag?: string | null;
  energy_type?: string | null;
  role_orientation?: string | null;
  range_profile?: string | null;
  cultural_tradition?: string | null;
  period?: string | null;
}

// ---------------------------------------------------------------------------
// Lineage tags (shared shape between per-kit JSON and chronicle)
// ---------------------------------------------------------------------------

export interface LineageTags {
  kit_space_lineage?: string | null;
  engine_provenance?: string | null;
  substrate_provenance?: string | null;
  generation_cohort_date?: string | null;
}

// ---------------------------------------------------------------------------
// Main per-kit data shape (file: public/kit-space/kits/kit_<primary>_<seq6>.json)
// ---------------------------------------------------------------------------

export interface KitData {
  schema_version: string;
  kit_id: string;
  primary_element: string;
  // cultural_tradition and period: null in ClassGenerator path (EAA-8 INFO-1; pending EAA-8)
  cultural_tradition: string | null;
  period: string | null;
  // chain_composition: present with { chain_count } in ClassGenerator path
  chain_composition: KitChainComposition | null;
  // t4_selection: null when BC-axis gap prevents T4 narration (4/37 kits in QDX-5)
  // QDX-5 additive: KitT4Selection shape; check is_active before rendering as active T4
  t4_selection: KitT4Selection | null;
  supporting_chain: unknown | null;
  skills: KitSkill[];
  emergent_kit_concept?: string | null;
  substrate_trace?: KitSubstrateTrace | null;
  // Foreign key to chronicle event (CHRONICLE_SCHEMA.md § 6)
  kit_space_expansion_event_id: string;
  engine_version?: string | null;
  engine_version_full?: string | null;
  generation_timestamp?: string | null;
  lineage_tags?: LineageTags | null;
}

// ---------------------------------------------------------------------------
// Chronicle event shape (file: public/kit-space/kit_space_chronicle.json)
// Per CHRONICLE_SCHEMA.md § 4.2 + § 4.3
// ---------------------------------------------------------------------------

export interface KitSpaceChronicleLineageTags {
  kit_space_lineage?: string | null;
  engine_provenance?: string | null;
  substrate_provenance?: string | null;
  generation_cohort_date?: string | null;
}

export interface KitSpaceChronicleGenerationParameters {
  n_kits_target?: number | null;
  n_kits_actual?: number | null;
  seed?: number | null;
  element_assignment?: string | null;
  elements_rr?: string[] | null;
  ws1a4_lite_active?: boolean | null;
  ws1a4_active?: boolean | null;
  skip_theme_coalescence?: boolean | null;
  skip_cosmological_vocabulary?: boolean | null;
  generator?: string | null;
  ws1a4_flavor_rate?: number | null;
  ws1a4_total_cost_usd?: number | null;
  ws1a4_flavor_count?: number | null;
  ws1a4_canonical_count?: number | null;
  ws1a4_fallback_count?: number | null;
  ws1a4_physical_opt_out?: number | null;
  phase5_total_cost_usd?: number | null;
  total_llm_cost_usd?: number | null;
  // QDX-5 additive — QD-engine workflow fire parameters
  fire_script?: string | null;
  fire_mode?: string | null;
  generator_path?: string | null;
  n_kits_emitted?: number | null;
  n_pareto_survivors?: number | null;
  n_phase7_pass?: number | null;
  n_factions?: number | null;
  cohesion_min_factions?: number | null;
  wave_a_llm_active?: boolean | null;
  wave_b_llm_active?: boolean | null;
  t4_selection_active?: boolean | null;
  pm1_algorithm?: string | null;
  wave_b_template_repeat_detected?: boolean | null;
  pct_physical_actual?: number | null;
  pct_physical_target?: string | null;
  distribution_actual?: Record<string, number> | null;
  distribution_target?: Record<string, number> | null;
  llm_cost_breakdown?: Record<string, number> | null;
  qdx5_option_b4_5?: boolean | null;
  matt_gandalf_ratified_2026_06_02?: boolean | null;
}

export interface KitSpaceChronicleEvent {
  event_id: string;
  event_type: 'kit-space-expansion' | 'realm-expansion' | 'reserved-future' | string;
  event_timestamp: string;
  event_date_utc: string;
  event_scope: string;
  substrate_inputs_changed: string[];
  engine_version_sha: string;
  engine_version_full?: string | null;
  kit_ids_generated: string[];
  kit_count: number;
  skip_flags_active?: string[] | null;
  lineage_tags?: KitSpaceChronicleLineageTags | null;
  generation_parameters?: KitSpaceChronicleGenerationParameters | null;
  substrate_trace_summary?: Record<string, unknown> | null;
  notes?: string | null;
}

export interface KitSpaceChronicle {
  schema_version: string;
  schema_notes?: string | null;
  events: KitSpaceChronicleEvent[];
}
