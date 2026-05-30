// cycle14Adapter.ts — Cycle 14 Wave 5 → SeasonData adapter
//
// PURPOSE: Transforms Cycle 14 Wave 5 faction cluster + kit identity data into
// the SeasonData / ClassData / SeasonManifest shapes consumed by the existing
// /loadout and /sample pages via useSeasonData.
//
// This is a drax-side bridge. Engine-side canonical emit (manifest.json + classes/*.json)
// is a Cycle 15+ star-lord target. When star-lord emits those artifacts, this adapter
// is replaced by adding the seasons to the glob in useSeasonData.ts.
//
// TODO(star-lord): emit manifest.json + classes/*.json for cycle-14-wave-5-season-{001,002,003}
//                  so this adapter can be removed and seasons load via glob. (Cycle 15+ pipeline)
//
// SCHEMA CONTRACT:
//   Input:  Cycle14SeasonSummary (faction_clusters + wave_b_kits_by_id + wave_s metadata)
//   Output: SeasonData[]  — compatible with useSeasonData selectableSeasons
//
// GRANULARITY DECISION:
//   Each WaveBKit → one ClassData.
//   Rationale: /loadout shows "one class = one build playstyle"; 54 kits per season maps
//   directly to that granularity. Faction cluster provides element + BC-axis context per kit.
//
// SUBSTRATE-DERIVED FILLS (where Cycle 14 data is present):
//   - id: kit_id from WaveBKit (exact engine ID)
//   - name: kit_name_canonical from WaveBKit (LLM-generated)
//   - flavor_text: kit_identity_narrative from WaveBKit (LLM-generated)
//   - dominant_element: top element from parent cluster's element_distribution
//   - range_profile: decoded from kit_id BC axis field (melee/mid/ranged)
//   - archetype_tag: derived from kit_id attribute + cluster BC axis
//   - energy_type: derived from kit_id attribute (str/dex → stamina; int/wis → mana)
//   - role_orientation: derived from cluster damage_geometry (AOE/chain → control; single-target → damage)
//
// ENGINE-EMISSION GAPS (TODO(star-lord) annotated inline):
//   - skills: placeholder array — no per-skill data in Wave 5 artifacts
//   - balance_metadata: no gauntlet results for Wave 5 (encounter sim deferred to Cycle 15+)
//   - stat_distribution: placeholder based on attribute field from kit_id
//   - color_palette: empty (no palette generation in Wave 5)

import type { ClassData, SeasonData, SeasonManifest, Skill, StatDistribution } from './types';
import type { Cycle14SeasonSummary, FactionCluster, WaveBKit } from './cycle14Types';
import { CYCLE14_SEASONS } from './cycle14SeasonData';

// ---- Kit ID decoder ----
// Format: S{n}_endgame_bc_{range}_{tempo}_{amplitude}_{attribute}_none_{seed}
// Example: S1_endgame_bc_melee_high_flat_dex_none_s0
interface DecodedKitId {
  range_profile: 'melee' | 'mid' | 'ranged';
  tempo: 'high' | 'medium' | 'low';
  amplitude: 'flat' | 'spiky' | 'variable';
  attribute: 'str' | 'dex' | 'int' | 'wis' | 'vit';
}

function decodeKitId(kitId: string): DecodedKitId {
  // Split on '_', skip season prefix + 'endgame' + 'bc', then positional
  // S1_endgame_bc_RANGE_TEMPO_AMPLITUDE_ATTR_none_sX
  const parts = kitId.split('_');
  // parts[0]=S1, parts[1]=endgame, parts[2]=bc, parts[3]=range, parts[4]=tempo, parts[5]=amplitude, parts[6]=attr
  const rawRange = parts[3] ?? 'ranged';
  const rawTempo = parts[4] ?? 'medium';
  const rawAmplitude = parts[5] ?? 'variable';
  const rawAttr = parts[6] ?? 'str';

  const range_profile: DecodedKitId['range_profile'] =
    rawRange === 'melee' ? 'melee' :
    rawRange === 'mid' ? 'mid' : 'ranged';

  const tempo: DecodedKitId['tempo'] =
    rawTempo === 'high' ? 'high' :
    rawTempo === 'low' ? 'low' : 'medium';

  const amplitude: DecodedKitId['amplitude'] =
    rawAmplitude === 'flat' ? 'flat' :
    rawAmplitude === 'spiky' ? 'spiky' : 'variable';

  const attribute: DecodedKitId['attribute'] =
    (rawAttr === 'str' || rawAttr === 'dex' || rawAttr === 'int' || rawAttr === 'wis' || rawAttr === 'vit')
      ? rawAttr : 'str';

  return { range_profile, tempo, amplitude, attribute };
}

// Derive energy_type from kit_id attribute field.
// str/dex → stamina (physical fighters); int/wis → mana (casters); vit → stamina (tank)
function deriveEnergyType(attr: DecodedKitId['attribute']): string {
  return (attr === 'int' || attr === 'wis') ? 'mana' : 'stamina';
}

// Derive archetype_tag from attribute + cluster damage_geometry.
// This is substrate-derived: reflects BC axis intent, not engine-validated balance.
// TODO(star-lord): replace with per-kit archetype_tag when classes/*.json emitted.
function deriveArchetypeTag(attr: DecodedKitId['attribute'], damageGeometry: string): string {
  const isCaster = attr === 'int' || attr === 'wis';
  const isAOE = damageGeometry === 'large-AOE' || damageGeometry === 'aoe';
  const isChain = damageGeometry === 'chain';
  if (isCaster && isAOE) return 'aoe_mage';
  if (isCaster && isChain) return 'chain_mage';
  if (isCaster) return 'mage';
  if (isAOE) return 'aoe_warrior';
  if (isChain) return 'chain_fighter';
  return 'fighter';
}

// Derive role_orientation from cluster damage_geometry.
// TODO(star-lord): replace with per-kit role_orientation when classes/*.json emitted.
function deriveRoleOrientation(damageGeometry: string, engagementProfile: string): string {
  if (damageGeometry === 'large-AOE' || damageGeometry === 'aoe') return 'control';
  if (damageGeometry === 'chain') return 'hybrid';
  if (engagementProfile === 'ranged') return 'damage';
  return 'damage';
}

// Top element from a cluster's element_distribution.
function dominantElement(cluster: FactionCluster): string {
  const entries = Object.entries(cluster.element_distribution)
    .filter(([, v]) => typeof v === 'number') as [string, number][];
  if (entries.length === 0) return 'physical';
  entries.sort(([, a], [, b]) => b - a);
  return entries[0][0];
}

// Derive stat_distribution: weight the primary attribute stat heavily, rest minimal.
// TODO(star-lord): replace with engine-emitted per-kit stat_distribution.
function deriveStatDistribution(attr: DecodedKitId['attribute']): StatDistribution {
  const base: StatDistribution = { strength: 10, dexterity: 10, intelligence: 10, wisdom: 10, vitality: 10 };
  const attrMap: Record<string, keyof StatDistribution> = {
    str: 'strength', dex: 'dexterity', int: 'intelligence', wis: 'wisdom', vit: 'vitality'
  };
  const key = attrMap[attr];
  if (key) base[key] = 100;
  return base;
}

// Build a single placeholder skill for display.
// Renders an "engine-emission pending" tag inline.
// TODO(star-lord): replace with per-kit skills when classes/*.json emitted for Cycle 14 seasons.
function buildPlaceholderSkills(kitId: string, dominant: string): Skill[] {
  const decoded = decodeKitId(kitId);
  return [{
    id: `${kitId}_placeholder_skill`,
    name: null, // TODO(star-lord): emit skill name when classes/*.json available for Cycle 14
    // flavor_text used to surface the engine-emission gap inline within the skill card
    flavor_text: `[engine-emission pending] BC profile: ${decoded.range_profile} · ${decoded.tempo}-tempo · ${decoded.amplitude} amplitude · ${dominant}-dominant. Skill data requires star-lord to emit classes/*.json for Cycle 14 seasons (Cycle 15+ pipeline).`,
    role: 'primary_attack',
    canonical_element: dominant,
    effect_category: 'placeholder',
    effects: [],
    tier: 1,
    chain_id: 'chain_A',
    chain_position: 1,
    parent_skill_ids: [],
    energy_cost: 0,
    cooldown_seconds: 0,
    color_value: null,
    phase5_is_placeholder: true,
  }];
}

// Build a ClassData from a WaveBKit + its parent FactionCluster.
function kitToClassData(kit: WaveBKit, cluster: FactionCluster): ClassData {
  const decoded = decodeKitId(kit.kit_id);
  const dominant = dominantElement(cluster);
  const damageGeo = cluster.modal_bc_axis_signature.damage_geometry;
  const engagementProfile = cluster.modal_bc_axis_signature.engagement_profile;

  return {
    id: kit.kit_id,
    name: kit.kit_name_canonical,
    title_completion: kit.kit_name_canonical,
    flavor_text: kit.kit_identity_narrative,
    archetype_tag: deriveArchetypeTag(decoded.attribute, damageGeo),
    energy_type: deriveEnergyType(decoded.attribute),
    role_orientation: deriveRoleOrientation(damageGeo, engagementProfile),
    range_profile: decoded.range_profile,
    dominant_element: dominant,
    color_palette: [],
    stat_distribution: deriveStatDistribution(decoded.attribute),
    skills: buildPlaceholderSkills(kit.kit_id, dominant),
    // TODO(star-lord): replace placeholder balance_metadata with gauntlet results
    // when encounter sim runs for Cycle 14 seasons (Cycle 15+ pipeline).
    balance_metadata: {
      final_modifier: null,
      convergence_iterations: null,
      converged: null,
      actual_winrate: null,
      target_winrate: null,
    },
    is_retired: false,
    source_library: cluster.faction_label_canonical,
    engine_version: null, // Cycle 14 Wave 5 does not emit v2.0 class artifacts
    // BC target cell derived from kit_id substrate
    bc_target_cell: {
      range: decoded.range_profile,
      tempo: decoded.tempo,
      amplitude: decoded.amplitude,
      attribute: decoded.attribute,
      proxy_density: null,
    },
  };
}

// Build the top-level elements map for a season manifest.
// Uses the union of all cluster element_distributions, weighted by member_count.
// Produces canonical-four-keyed entries (fire/wind/water/earth) where present;
// maps other elements (physical, lightning, holy, shadow) to the "physical" slot.
// TODO(star-lord): replace with engine-emitted elements mapping from manifest.json.
function buildSeasonElements(clusters: FactionCluster[]): Record<string, { element_id: string; name: string; tags: string[]; is_new?: boolean }> {
  // Weighted aggregation across all clusters
  const totals: Record<string, number> = {};
  let totalWeight = 0;
  for (const cluster of clusters) {
    const w = cluster.member_count;
    totalWeight += w;
    for (const [el, share] of Object.entries(cluster.element_distribution)) {
      if (typeof share === 'number') {
        totals[el] = (totals[el] ?? 0) + share * w;
      }
    }
  }
  // Normalize
  const normalized: Record<string, number> = {};
  for (const [el, total] of Object.entries(totals)) {
    normalized[el] = totalWeight > 0 ? total / totalWeight : 0;
  }

  // Map to canonical-four slots where possible; others bucket to "physical"
  const CANONICAL_SLOTS = ['fire', 'wind', 'water', 'earth', 'physical', 'lightning', 'holy', 'shadow'] as const;
  const result: Record<string, { element_id: string; name: string; tags: string[]; is_new?: boolean }> = {};

  for (const el of CANONICAL_SLOTS) {
    if (normalized[el] && normalized[el] > 0) {
      result[el] = {
        element_id: el,
        name: el,
        tags: [`${(normalized[el] * 100).toFixed(0)}% avg share`],
      };
    }
  }

  // Fallback: at minimum add fire+earth as structural anchors if no elements found
  if (Object.keys(result).length === 0) {
    result['fire'] = { element_id: 'fire', name: 'fire', tags: [] };
    result['earth'] = { element_id: 'earth', name: 'earth', tags: [] };
  }

  return result;
}

// Build a SeasonManifest from a Cycle14SeasonSummary.
function buildSeasonManifest(summary: Cycle14SeasonSummary): SeasonManifest {
  const waveSName = summary.wave_s?.wave_s_season_name_canonical ?? summary.season_id;
  const thematicTags = summary.wave_s?.wave_s_season_name_thematic_tags ?? [];
  const dominantTag = thematicTags[0] ?? 'cycle-14';

  return {
    manifest_version: 'cycle14-adapter-v1',
    season_id: summary.season_id,
    // Use Wave-S name as the "anchor" — this is the player-visible season name
    anchor: {
      id: summary.season_id,
      name: waveSName,
      category: 'cycle_14_wave_5',
      description: thematicTags.length > 0
        ? thematicTags.join(' · ')
        : 'Cycle 14 Wave 5 — substrate-led generation',
    },
    // TODO(star-lord): replace generated_at with engine-emitted manifest timestamp.
    // Season suffix (001/002/003) used to produce distinct timestamps for chronological sort.
    generated_at: (() => {
      const match = summary.season_id.match(/season-(\d+)$/);
      const n = match ? parseInt(match[1], 10) : 1;
      return `2026-05-30T04:47:${String(n * 7).padStart(2, '0')}.000000+00:00`;
    })(),
    season_theme_element: dominantTag,
    elements: buildSeasonElements(summary.faction_clusters),
    // No summary block for Cycle 14 (no gauntlet run)
    summary: {
      classes_generated: summary.faction_clusters.reduce((s, c) => s + c.member_count, 0),
    },
    // Cycle 14 Wave 5 skills are placeholders — surface existing indicator
    placeholder_skill_content: true,
    cycle_14_refresh_pending: true,
  };
}

// Build a SeasonData from a Cycle14SeasonSummary.
// This is the full adapter output for one season.
export function buildCycle14SeasonData(summary: Cycle14SeasonSummary): SeasonData {
  const manifest = buildSeasonManifest(summary);

  // Build cluster map for O(1) lookup
  const clusterById = new Map<number | 'SINGLETON', FactionCluster>();
  for (const cluster of summary.faction_clusters) {
    clusterById.set(cluster.cluster_id, cluster);
  }

  // Convert each accepted WaveBKit to a ClassData
  const classes: ClassData[] = [];
  for (const kit of summary.wave_b_kits_by_id.values()) {
    // Only surface ACCEPT kits (filter FALLBACK_SUBSTRATE_DERIVED for quality)
    if (kit.final_compliance_status !== 'ACCEPT') continue;
    const cluster = clusterById.get(kit.parent_cluster_id as number | 'SINGLETON');
    if (!cluster) continue;
    classes.push(kitToClassData(kit, cluster));
  }

  // Sort by kit_id for deterministic ordering
  classes.sort((a, b) => a.id.localeCompare(b.id));

  return {
    seasonId: summary.season_id,
    manifest,
    classes,
    gearPool: [], // TODO(star-lord): emit gear_pool.json for Cycle 14 seasons (Cycle 15+ pipeline)
  };
}

// Pre-built SeasonData for all 3 Cycle 14 seasons — consumed by useSeasonData extension.
// Built once at module load time (static data; no fetch required).
export const CYCLE14_SEASON_DATA: SeasonData[] = CYCLE14_SEASONS.map(buildCycle14SeasonData);
