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
  color_palette: number[];
  stat_distribution: StatDistribution;
  skills: Skill[];
  balance_metadata: BalanceMetadata;
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

export interface SeasonManifest {
  manifest_version: string;
  season_id: string;
  generated_at: string;
  season_theme_element: string;
  anchor: SeasonAnchor;
  elements: Record<string, ElementMapping>;
  summary?: {
    classes_generated: number;
    convergence_failures?: number;
    trial_defeat_rate_actual?: number;
  };
  validation_passed?: boolean;
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
