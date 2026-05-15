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
  color_signature: string;
  name: string;
  flavor_text: string;
  visual_prompt: string;
  stat_requirements: Record<string, number> | null;
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
