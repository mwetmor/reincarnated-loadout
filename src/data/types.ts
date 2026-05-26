export interface SkillEffect {
  name: string;
  params: Record<string, number | string>;
}

export interface Skill {
  id: string;
  name: string | null;
  flavor_text: string | null;
  role: string;
  canonical_element: string;
  // Stage 3 cipher migration additive field (MIGRATION.md v1.2). Present on manifest v1.5+
  // seasons. null / absent on pre-Stage-3 seasons. Use: seasonal_element ?? canonical_element.
  seasonal_element?: string | null;
  effect_category?: string;
  // Phase 5 skills emit effects as string[] (narrative descriptions) instead of SkillEffect[]
  // (structured {name, params} objects). Guard at render time via isStringEffects() helper.
  // TODO(drax): remove dual-type when engine unifies Skill.effects schema (rocket Cycle 13+).
  effects: SkillEffect[] | string[];
  tier: number;
  chain_id: string;
  // chain_position absent on Phase 5 skills. Guard sort: a.chain_position ?? 0.
  chain_position?: number | null;
  // parent_skill_ids absent on Phase 5 skills. Guard: skill.parent_skill_ids ?? [].
  parent_skill_ids?: string[];
  // scaling_coefficient absent on Phase 5 skills. Guard: skill.scaling_coefficient ?? 0.
  scaling_coefficient?: number | null;
  energy_cost: number;
  cooldown_seconds: number;
  // color_value absent on Phase 5 skills. Guard: skill.color_value ?? 0.
  color_value?: number | null;
}

export interface StatDistribution {
  strength: number;
  dexterity: number;
  intelligence: number;
  wisdom: number;
  vitality: number;
}

export interface BalanceMetadata {
  // All fields optional — Phase 5 generation run balance_metadata is a generation-params
  // blob that does NOT include these fields. Guard all access: bm.final_modifier ?? 0.
  // TODO(drax): remove optionality when engine aligns Phase 5 balance_metadata shape to
  // BalanceMetadata contract (rocket seam; schema-completion Cycle 13+ queue item).
  final_modifier?: number | null;
  convergence_iterations?: number | null;
  converged?: boolean | null;
  actual_winrate?: number | null;
  target_winrate?: number | null;
}

export interface ClassData {
  id: string;
  name: string | null;
  title_completion: string | null;
  flavor_text: string | null;
  archetype_tag: string;
  energy_type: string;
  role_orientation: string;
  range_profile: string;
  dominant_element: string;
  // Stage 3 cipher migration additive field (MIGRATION.md v1.2). Present on manifest v1.5+
  // seasons. null / absent on pre-Stage-3 seasons. Use: seasonal_dominant_element ?? dominant_element.
  seasonal_dominant_element?: string | null;
  color_palette: number[];
  stat_distribution: StatDistribution;
  skills: Skill[];
  balance_metadata: BalanceMetadata;
  // is_retired: canonical-6 transition flag — rocket v1.17 backfilled on hybrid_mage classes.
  // When true: class is excluded from class-select UI in Loadout.tsx and Sample.tsx.
  // Optional for older seasons; missing === false (not retired).
  is_retired?: boolean;
  retirement_reason?: string;
  // Cycle 11 schema extensions (star-lord Wave 1, MIGRATION.md v1.3). All nullable.
  // null = pre-substrate-binding season. Guard all access with null-check.
  main_weapon?: WeaponDescriptor | null;
  secondary_item?: WeaponDescriptor | null;
  source_library?: string | null;
  // t4_alteration_output: Algorithm §8 alteration descriptor. Null until rocket §8 ships.
  // Shape per star-lord MIGRATION.md v1.3. All subfields optional-guarded — null is always valid.
  // Tier 2 framing: INTENT METADATA only; not combat-arithmetic until Cycle 12 Layer 6.
  t4_alteration_output?: T4AlterationOutput | null;
  // Cycle 11 rocket Wave 2a field (MIGRATION.md [2026-05-25]).
  // Derived from stat_distribution top-2 stats at generation time.
  // Always exactly 2 stat name strings on newly-generated (Cycle-11+) classes.
  // ABSENT KEY (not null) on pre-Cycle-11 legacy seasons — guard with ?? [].
  attribute_coupling?: string[];

  // ---- Engine generation run design-mode fields (Amendment 1, 2026-05-25) ----
  // PlayerClassV2 engine-layer fields (MIGRATION.md § v1.4-layer-2). All nullable.
  // Absent on pre-Cycle-12 classes (engine_version != "v2.0"). Design-mode degrades to "—".

  // Named bearer + mythological match (Sketch F anchor forms; engine-internal identity).
  // Populated only on 4 Sketch F anchor forms (Hattori Hanzō / Lu Bu / Moctezuma / Gilgamesh).
  named_bearer?: string | null;
  named_mythological_match?: string | null;

  // BC-target cell identity (Layer 2 subspace generator output; 5-tuple).
  bc_target_cell?: BcTargetCell | null;

  // Mechanical substrate triple (Layer 9 L9 opportunity-scan; element + weapon_kind + profile).
  mechanical_substrate_triple?: MechanicalSubstrateTriple | null;

  // Converged modifier (Layer 4 W1.13 multi-dim convergence output; float).
  // None pre-Layer-4; always float post-Layer-4 on v2.0 classes.
  converged_modifier?: number | null;

  // Engine version discriminator — "v2.0" on new-engine classes, absent/null on legacy.
  engine_version?: string | null;
}

export interface SeasonAnchor {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface ElementMapping {
  element_id: string;
  name: string;
  tags: string[];
  is_new?: boolean;
}

// Stage 3 cipher migration: grouping-layer keyed entry (MIGRATION.md v1.2).
// Present in manifest.seasonal_elements on manifest_version 1.5+ seasons.
// Keyed by "ignition" | "suffusion" | "bulwark" | "displacement".
// canonical_slot links back to the internal canonical-four key (internal use only).
export interface SeasonalElementMapping extends ElementMapping {
  canonical_slot: string;
}

export interface SeasonManifest {
  manifest_version: string;
  season_id: string;
  generated_at: string;
  season_theme_element: string;
  anchor: SeasonAnchor;
  // Canonical-four keyed element map. DEPRECATED for player-visible display (MIGRATION.md v1.2).
  // Still present for backward compat. Use seasonal_elements for player-visible rendering
  // when manifest_version >= "1.5".
  elements: Record<string, ElementMapping>;
  // Stage 3 additive: grouping-layer keyed (ignition/suffusion/bulwark/displacement).
  // Present on manifest_version 1.5+ seasons. Null / absent on older seasons.
  // This is the primary lookup for player-visible element name resolution on v1.5+ seasons.
  seasonal_elements?: Record<string, SeasonalElementMapping> | null;
  summary?: {
    classes_generated: number;
    convergence_failures?: number;
    trial_defeat_rate_actual?: number;
  };
  validation_passed?: boolean;
}

// ---- Field-presence assertion helpers (R11(b) JSON load boundary) ----
// Fail-loud if a v1.5+ manifest is missing seasonal_elements.
// Logs a WARN but does not throw (degraded rendering is preferable to crash).
export function assertManifestSeasonalFields(manifest: SeasonManifest): void {
  const v = manifest.manifest_version;
  // Compare as strings: "1.5" >= "1.5" check via numeric parse
  const majorMinor = parseFloat(v ?? '0');
  if (majorMinor >= 1.5 && !manifest.seasonal_elements) {
    console.warn(
      `[drax cipher] WARN: manifest_version=${v} (>= 1.5) is missing seasonal_elements. ` +
      'Player-visible element names will fall back to canonical-four. ' +
      'Verify engine export re-generated with Stage 3 code (star-lord/v1.3-form-bias-stage-3-cipher-migration).'
    );
  }
}

// Resolve player-visible element name from a manifest.
// For v1.5+ manifests: looks up seasonal name by canonical slot key via manifest.seasonal_elements.
// Fallback chain: seasonal_elements lookup → elements lookup → "Unknown".
// NEVER returns a raw canonical-four string when a manifest is provided — hardened per L-02/L-13 fix.
export function resolveElementDisplay(
  canonical: string,
  manifest: SeasonManifest,
  context = 'element'
): string {
  // Prefer seasonal_elements (v1.5+): find the entry whose canonical_slot matches
  if (manifest.seasonal_elements) {
    const seasonal = Object.values(manifest.seasonal_elements).find(
      (e) => e.canonical_slot === canonical
    );
    if (seasonal?.name) return seasonal.name;
  }
  // Fallback: manifest.elements (pre-v1.5 or when seasonal not found)
  const classic = manifest.elements[canonical]?.name;
  if (classic) return classic;
  // Fail-loud: both missing
  console.warn(
    `[drax cipher] WARN: resolveElementDisplay(${context}="${canonical}") — ` +
    'both seasonal_elements and elements lookups failed. Rendering "Unknown". ' +
    'Verify season data includes element mapping for this canonical slot.'
  );
  return 'Unknown';
}

export interface SeasonData {
  seasonId: string;
  manifest: SeasonManifest;
  classes: ClassData[];
  /** Per-season gear pool. Empty array for seasons without gear_pool.json.
   *  Yomi (season_002328) is the only season with a real pool currently.
   *  TODO(drax): remove Yomi-fallback logic in useSeasonData when engine ships gear_pool for new seasons. */
  gearPool: GearPoolEntry[];
}

// v1.1 schema (star-lord/season-002328-gear-pool-stats, MIGRATION.md v1.1)
export interface GearStats {
  bonus_hp: number;
  bonus_armor: number;
  bonus_crit_chance: number;
  bonus_damage_flat: number;
  bonus_damage_percent: number;
  bonus_mana_regen: number;
  elemental_resistances: Record<string, number>;
  block_chance: number;
  block_value: number;
}

export interface GearRolledEffect {
  effect_type: string;
  element: string | null;
  trigger: string;
  magnitude: number;
}

export interface GearPoolEntry {
  gear_id: string;
  slot: string;
  handedness: string;
  tier: string;
  dominant_element: string | null;
  // Stage 3 cipher migration additive field (MIGRATION.md v1.2). Present on manifest v1.5+
  // seasons. null / absent on pre-Stage-3 seasons. Use: seasonal_dominant_element ?? dominant_element.
  seasonal_dominant_element?: string | null;
  power_score: number;
  fit_energy_type: Record<string, number>;
  fit_range_profile: Record<string, number>;
  fit_role_orientation: Record<string, number>;
  color_value: number;
  color_palette: number[];
  color_signature: string | null;   // null for most items (engine doesn't always populate)
  name: string;
  flavor_text: string | null;       // null for ~60% of items
  visual_prompt: string | null;     // null for ~60% of items
  stat_requirements: Record<string, number> | null;
  // v1.1 additions — guard stats?.bonus_hp ?? 0 (null if exporter lacked catalog)
  stats: GearStats | null;
  rolled_effects: GearRolledEffect[];
  ability_modifiers: Record<string, number>;
}

export interface LoadoutSlot {
  displaySlot: string;
  engineSlot: string;
  item: GearPoolEntry;
}

export interface BuildState {
  version: number;
  classId: string;
  seasonId: string;
  allocations: Record<string, number>;
  savedAt: string;
}

// ---- Cycle 11 schema extensions (star-lord Wave 1, MIGRATION.md v1.3) ----
// Additive fields on ClassData — all nullable; guard every access with null-check.
// Pre-substrate-binding seasons emit null for main_weapon / secondary_item / source_library.

// Weapon descriptor (main_weapon / secondary_item). Shape per ExportWeaponDescriptor.
// v2 engine canonical contract (L9 substrate refactor): weapon_id / name / category / period /
// cultural_register are guaranteed. source_library and lineage are optional — absent on some
// v2 engine emissions (e.g. Phase 5 regen output). weapon_id may be integer in engine emit
// (rendered as string by JS; not displayed in UI so type is string | number for forward compat).
// TODO(drax): remove string|number union when engine normalizes weapon_id to string (Cycle 13+).
export interface WeaponDescriptor {
  weapon_id: string | number;
  name: string;
  category: string;           // melee | polearm | ranged | firearm | shield | tome | banner | focus | horn | talisman
  source_library?: string | null;  // substrate source; optional — absent on some v2 engine emissions
  cultural_register: string;
  period: string;
  lineage?: string | null;    // nullable per schema; optional — absent on some v2 engine emissions
  // Amendment 2 — cultural / period / quality-tier badges (engine generation run, 2026-05-25).
  // Populated on v2.0 forms; absent on pre-Cycle-12 weapons. All nullable.
  cultural_lineage_canonical?: string | null;    // e.g. "european" / "east_asian" / "mesoamerican"
  historical_period_canonical?: string | null;   // e.g. "classical" / "medieval" / "contemporary" / "mythological"
  quality_tier?: string | null;                  // S / A / B / C — INFORMATIONAL quality grade, NOT ARPG drop rarity
}

// ---- Engine generation run schema extensions (Amendment 1 — design-mode fields, 2026-05-25) ----
// PlayerClassV2 engine-layer fields (MIGRATION.md § v1.4-layer-2). All nullable.
// Pre-Cycle-12 classes (engine_version != "v2.0") lack these fields; design-mode degrades to "—".

// BC-target cell identity — frozen(range, tempo, amplitude, attribute, proxy_density).
// See MIGRATION.md § v1.4-layer-2 BcTargetCell dataclass.
export interface BcTargetCell {
  range: string;
  tempo: string;
  amplitude: string;
  attribute: string;
  proxy_density?: string | null;
}

// Mechanical substrate triple — typed (element, weapon_kind, weapon_mechanical_profile).
// See MIGRATION.md § v1.4-layer-2 MechanicalSubstrateTriple. WARN-2: element only (not cultural).
export interface MechanicalSubstrateTriple {
  element: string;
  weapon_kind: string;
  weapon_mechanical_profile: string;
}

// T4 alteration output — Algorithm §8 intent metadata (MIGRATION.md v1.3).
// Tier 2 framing: INTENT METADATA only. Not wired to combat arithmetic until Cycle 12 Layer 6.
// All fields optional-guarded; consumer must null-check before use.
// strategy_type enum values per rocket §8 dispatch (v1 strategies).
export type T4StrategyType =
  | 'RESOURCE_CONVERSION'
  | 'TRADE_OFF'
  | 'ELEMENT_CONVERSION'
  | 'DEFENSIVE_CONVERSION'
  | 'GEOMETRY_COLLAPSE'
  | string; // forward-compat: allow unknown strategies from future rocket versions

// Cycle 12 Layer 6 — Spirit Guide narration metadata (MIGRATION.md § v1.4-layer-6).
// Emitted by t4_wireup.py emit_cross_seam_fields() per § 9 explainer pattern.
// All fields optional-guarded — null is always valid for pre-L6 classes.
//
// Phase 5 amendment 2026-05-26: alteration_type and manifestation semantics updated.
// See canonical/story/phase-5-t4-narration-amendment-2026-05-26.md § 2.1 for full disambiguation.
export interface NarrationMetadata {
  has_mechanic_alteration: boolean;
  alteration_type?: string | null;               // Phase 5: per-kit narrated label (e.g. "Wrath Turned Rampart"); pre-Phase-5: strategy type enum pass-through
  thematic_rationale?: string | null;            // engine-generated rationale prose (richer than Cycle 11 static); ~15-30 words; why this alteration fits this kit
  manifestation?: string | null;                 // Phase 5 amendment 2026-05-26: kinetic+sensory prose (~25-50 words); what the T4 alteration looks/feels like in play. NOTE: semantically distinct from top-level t4_alteration_output.manifestation (tier-label enum); that field is preserved for tier-label semantics and is not mirrored here.
  spirit_guide_explainer_template?: string | null; // e.g. "resource_cost_shift"
  narrative_hooks?: string[];                    // thematic tags (e.g. ["sacrifice", "blood_magic"])
  secondary_alteration_types?: string[];         // non-signature alteration types
}

export interface T4AlterationOutput {
  strategy_type: T4StrategyType;
  strategy_params: Record<string, string | number | boolean | null>;
  applied_axis_targets?: string[];             // BC axes predicted to shift
  eta_score?: number;                          // η-coefficient (0.0–1.0 range)
  thematic_rationale?: string | null;          // human-readable rationale; Cycle 11 static-template
  // Cycle 12 Layer 6 enrichment (MIGRATION.md § v1.4-layer-6). Null on pre-L6 classes.
  // Fallback chain in T4AlterationPanel: narration_metadata → thematic_rationale → § 9 template voice.
  spirit_guide_narration_metadata?: NarrationMetadata | null;
}
