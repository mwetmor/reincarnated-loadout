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
  effect_category: string;
  effects: SkillEffect[];
  tier: number;
  chain_id: string;
  chain_position: number;
  parent_skill_ids: string[];
  scaling_coefficient: number;
  energy_cost: number;
  cooldown_seconds: number;
  color_value: number;
}

export interface StatDistribution {
  strength: number;
  dexterity: number;
  intelligence: number;
  wisdom: number;
  vitality: number;
}

export interface BalanceMetadata {
  final_modifier: number;
  convergence_iterations: number;
  converged: boolean;
  actual_winrate: number;
  target_winrate: number;
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
export interface WeaponDescriptor {
  weapon_id: string;
  name: string;
  category: string;           // melee | polearm | ranged | firearm | shield | tome | banner | focus | horn | talisman
  source_library: string;     // substrate source (see source_library below)
  cultural_register: string;
  period: string;
  lineage: string | null;     // nullable per schema
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

export interface T4AlterationOutput {
  strategy_type: T4StrategyType;
  strategy_params: Record<string, string | number | boolean | null>;
  applied_axis_targets?: string[];             // BC axes predicted to shift
  eta_score?: number;                          // η-coefficient (0.0–1.0 range)
  thematic_rationale?: string | null;          // human-readable rationale; used as spirit-guide narration
}
