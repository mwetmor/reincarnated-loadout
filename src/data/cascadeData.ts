/**
 * cascadeData.ts — Phase 5 spirit-guide-driven elicitation cascade data.
 *
 * Drax Phase 5, 2026-06-10. Per dispatch:
 *   2026-06-10-drax-forge-phase-5-amendment-cycling-text-list-ui.md
 *
 * Authority: Earth-Avatar Creation Moment Architecture § 12 (canonical lock 2026-06-10,
 *   commit 861403d). Specifically:
 *   § 12.3 — 7 Tier 1 anchor options (CANONICAL LIST)
 *   § 12.4 — Cycling-preview UX vocabulary (CANONICAL)
 *   § 12.5 — Nested cascade structure
 *   § 12.7 — Substrate-truth-wins discipline
 *   § 12.9 — Spirit guide voice patterns
 *   § 12.13 — Open refinement deferred (Tier 2/3 vocabulary; spatial layout)
 *
 * Discipline #40 scaffold flags:
 *   - Tier 2/3 question strings: SCAFFOLD pending Pattern B canonical ratification per § 12.13
 *   - Sky cluster spatial layout: SCAFFOLD (drax discretion within § 12.3; canonical lock deferred)
 *
 * D7: All spirit guide voice patterns are fully templated (no raw LLM dialogue).
 * D8: Mobile-friendly; touch-cycling natively supported.
 */

// ─── Tier 1 anchor definitions (CANONICAL per § 12.3) ─────────────────────────

/**
 * 7 Tier 1 anchor options as canonically defined in § 12.3.
 * Labels are CANONICAL. Sky cluster responses are CANONICAL.
 * This list is NOT scaffold — it is the § 12 canonical lock.
 */
export interface Tier1Anchor {
  id: string;
  /** Text label displayed on iPad — CANONICAL per § 12.3 */
  label: string;
  /** Brief description of what the player is committing to */
  description: string;
  /** Sky region ID that illuminates on soft-preview of this anchor */
  sky_region_id: string;
  /** Sky cluster response description per § 12.3 */
  sky_response: string;
  /** What player commits to if chosen */
  commitment: string;
  /** Sky region spatial position (world px) — SCAFFOLD per § 12.13 open refinement */
  // TODO(drax): replace scaffold spatial layout with canonical cosmograph spatial lock post-Pattern-B
  region_x: number;
  region_y: number;
  region_radius: number;
}

// World dimensions mirror rune_layer_layout.json
const WORLD_W = 11000;
const WORLD_H = 8500;

/**
 * 7 Tier 1 anchors.
 * Labels + sky_response + commitment: CANONICAL per § 12.3.
 * Spatial positions (region_x, region_y): SCAFFOLD per § 12.13.
 *
 * Spatial layout strategy (drax discretion within § 12.3 + style-register coherence):
 *   7 regions arranged in a loose arc across the cosmograph world.
 *   The 6 existing rune-group anchors occupy a 3×2 grid.
 *   The 7 sky cluster regions are overlaid as conceptual zones — they illuminate
 *   the EXISTING kit cluster distribution by element/attribute affinity.
 *   Positions center each sky region over the relevant kit-cluster neighborhood.
 *
 *   Layout rationale (surfaces in Phase 5.5 close report per Discipline #41):
 *     Race/ancestry → top-left (attributes/physical cluster zone)
 *     Element/flow → top-center (elements cluster zone)
 *     Weapon/craft → top-right (combat_geometry cluster zone)
 *     Power/mastery → middle-right (mechanic_altering cluster zone)
 *     Style/way → center (large mid-canvas zone covering target-pattern axis)
 *     Harvest/rewards → bottom-left (resource_economy cluster zone)
 *     Horizon/goal → bottom-center (movement/progression cluster zone)
 *
 * // SCAFFOLD: pending Pattern B canonical ratification per § 12.13
 */
export const TIER1_ANCHORS: Tier1Anchor[] = [
  {
    id: 'race_ancestry',
    label: 'Race / ancestry',
    description: 'Your lineage shapes your path — the inherited gifts of your people',
    sky_region_id: 'sky_race',
    sky_response: 'Race-tribal sub-clusters illuminate',
    commitment: 'Race becomes precedent; cosmograph focuses race-tribal region',
    region_x: WORLD_W * 0.17,
    region_y: WORLD_H * 0.25,
    region_radius: 1600,
  },
  {
    id: 'element_flow',
    label: 'Element / flow',
    description: 'The elemental force that flows through your form',
    sky_region_id: 'sky_element',
    sky_response: 'Element-cluster region illuminates; elemental colors saturate',
    commitment: 'Element becomes precedent; cosmograph focuses element-cluster region',
    region_x: WORLD_W * 0.50,
    region_y: WORLD_H * 0.25,
    region_radius: 1800,
  },
  {
    id: 'weapon_craft',
    label: 'Weapon / craft',
    description: 'The instrument through which your spirit acts upon the world',
    sky_region_id: 'sky_weapon',
    sky_response: 'Weapon-form cluster region illuminates',
    commitment: 'Weapon-form-family becomes precedent',
    region_x: WORLD_W * 0.83,
    region_y: WORLD_H * 0.25,
    region_radius: 1600,
  },
  {
    id: 'power_mastery',
    label: 'Power / mastery',
    description: 'The peak capability you seek to command',
    sky_region_id: 'sky_power',
    sky_response: 'T4-strategy / endgame-power clusters illuminate',
    commitment: 'T4-strategic direction becomes precedent',
    region_x: WORLD_W * 0.83,
    region_y: WORLD_H * 0.75,
    region_radius: 1600,
  },
  {
    id: 'style_way',
    label: 'Style / way',
    description: 'How you move through encounters — your pattern of engagement',
    sky_region_id: 'sky_style',
    sky_response: 'Target-Pattern + Depth-vs-Breadth identity-axis clusters illuminate',
    commitment: 'Experiential identity-axis direction becomes precedent',
    region_x: WORLD_W * 0.50,
    region_y: WORLD_H * 0.50,
    region_radius: 2000,
  },
  {
    id: 'harvest_rewards',
    label: 'Harvest / rewards',
    description: 'What you seek to gather from the world',
    sky_region_id: 'sky_harvest',
    sky_response: 'Speedfarming + Loot-Focus sub-clusters illuminate',
    commitment: 'Loot-Focus becomes precedent',
    region_x: WORLD_W * 0.17,
    region_y: WORLD_H * 0.75,
    region_radius: 1600,
  },
  {
    id: 'horizon_goal',
    label: 'Horizon / goal',
    description: 'The stage of progression you are building toward',
    sky_region_id: 'sky_horizon',
    sky_response: 'Progression-Stage clusters illuminate',
    commitment: 'Progression-Stage becomes precedent',
    region_x: WORLD_W * 0.50,
    region_y: WORLD_H * 0.75,
    region_radius: 1600,
  },
];

export const TIER1_ANCHOR_BY_ID = new Map(TIER1_ANCHORS.map(a => [a.id, a]));

// ─── Cascade layer definitions ─────────────────────────────────────────────────

/** A single option in a cascade layer */
export interface CascadeOption {
  id: string;
  /** Text label displayed in the cycling list */
  label: string;
  /** Short description shown when this option is highlighted */
  description: string;
  /** Sky region illuminated on soft-preview (may be sub-region of parent Tier 1 region) */
  sky_hint?: string;
}

/** A cascade layer with its guiding question + options */
export interface CascadeLayer {
  id: string;
  /** The cascade layer depth (0 = Tier 1 from spirit guide opening; 1 = Tier 2; etc.) */
  depth: number;
  /** Prerequisite anchor commitment to reach this layer (null for Tier 1) */
  parent_anchor_id: string | null;
  /**
   * Spirit guide question for this layer.
   * SCAFFOLD: Tier 2/3 questions are draft vocabulary per § 12.13 open refinement.
   * <!-- SCAFFOLD: pending Pattern B canonical ratification per § 12.13 -->
   */
  question: string;
  /** Options the player cycles through */
  options: CascadeOption[];
}

/**
 * Spirit guide voice templates per § 12.9.
 * All voices are CANONICAL structure (D7 compliant).
 * Tier 1 opening question is CANONICAL per § 12.3.
 * Tier 2/3 commit responses use templated structure with bracketed blanks.
 * <!-- SCAFFOLD: Tier 2/3 specific phrasing pending Pattern B per § 12.13 -->
 */
export const SPIRIT_GUIDE_VOICE = {
  /** Tier 1 opening — CANONICAL per § 12.3 */
  tier1_opening: "What is most important for your journey this season?",

  /** Tier 1 commit response — templated; [anchor] filled at runtime */
  tier1_commit: (anchorLabel: string, tier2Question: string) =>
    `You are drawn to ${anchorLabel}. ${tier2Question}`,

  /** Tier 2 commit response — templated; [tier2Label] and [tier3Question] filled at runtime */
  tier2_commit: (tier2Label: string, tier3Question: string) =>
    `${tier2Label} takes shape. ${tier3Question}`,

  /** Final emergence — templated; kit identity filled at runtime */
  final_emergence: (kitName: string, precedent: string, commits: string) =>
    `Your form emerges as ${kitName}. Within ${precedent}, your path — ${commits} — projects most closely toward this form. Accept, or refine?`,

  /** Substrate gap encounter — templated */
  substrate_gap: (matchedKit: string, preservedPrecedent: string, emergentPrimitive: string) =>
    `Your spirit's path projects no exact match in this season's pattern. Nearest available form: ${matchedKit} — your ${preservedPrecedent} is preserved, your direction emerges as ${emergentPrimitive}. Accept or refine?`,

  /** Refine prompt (step back) */
  refine_prompt: "Your path remains open. Which thread do you wish to revisit?",
} as const;

/**
 * Tier 2 cascade layers, keyed by Tier 1 anchor id.
 *
 * SCAFFOLD: All Tier 2/3 question strings below are draft vocabulary per § 12.13 open refinement.
 * <!-- SCAFFOLD: pending Pattern B canonical ratification per § 12.13 -->
 *
 * The player receives the Tier 2 question corresponding to their Tier 1 commitment.
 * Pre-display coverage filter (§ 12.7): in a full implementation, options shown at Tier 2
 * should be filtered to those with non-zero substrate coverage given the Tier 1 precedent.
 * Phase 5 prototype: all options shown (coverage filter flagged as Discipline #18.2 hotspot).
 */
export const TIER2_LAYERS: Record<string, CascadeLayer> = {
  // ── Race / ancestry ──────────────────────────────────────────────────────────
  race_ancestry: {
    id: 'race_t2',
    depth: 1,
    parent_anchor_id: 'race_ancestry',
    // <!-- SCAFFOLD: pending Pattern B canonical ratification per § 12.13 -->
    question: "Which tradition calls to you?",
    options: [
      { id: 'human',    label: 'Human / wanderer',   description: 'Adaptable; master of no single path' },
      { id: 'dwarven',  label: 'Dwarven / forge-kin', description: 'Stone-born; weapon and craft mastery' },
      { id: 'elven',    label: 'Elven / sky-kin',     description: 'Ancient lineage; flow and element attunement' },
      { id: 'beastkin', label: 'Beastkin / wild',     description: 'Primal instinct; movement and strike' },
      { id: 'construct', label: 'Construct / bound',  description: 'Shaped by will; mechanic and resource mastery' },
    ],
  },

  // ── Element / flow ──────────────────────────────────────────────────────────
  element_flow: {
    id: 'element_t2',
    depth: 1,
    parent_anchor_id: 'element_flow',
    // <!-- SCAFFOLD: pending Pattern B canonical ratification per § 12.13 -->
    question: "Which current runs through your form?",
    options: [
      { id: 'fire',      label: 'Fire',      description: 'Burning force; damage and momentum' },
      { id: 'water',     label: 'Water',     description: 'Flowing control; slowing and redirection' },
      { id: 'earth',     label: 'Earth',     description: 'Grounded force; barrier and persistence' },
      { id: 'wind',      label: 'Wind',      description: 'Swift motion; speed and displacement' },
      { id: 'lightning', label: 'Lightning', description: 'Instant strike; chain and shock patterns' },
      { id: 'holy',      label: 'Holy',      description: 'Radiant force; pure and amplified' },
      { id: 'shadow',    label: 'Shadow',    description: 'Hidden force; ambush and diminishment' },
      { id: 'physical',  label: 'Physical',  description: 'Raw impact; direct and unmediated' },
    ],
  },

  // ── Weapon / craft ──────────────────────────────────────────────────────────
  weapon_craft: {
    id: 'weapon_t2',
    depth: 1,
    parent_anchor_id: 'weapon_craft',
    // <!-- SCAFFOLD: pending Pattern B canonical ratification per § 12.13 -->
    question: "What form does your craft take?",
    options: [
      { id: 'blade',   label: 'Blade',        description: 'Single-edge precision; cuts deep' },
      { id: 'staff',   label: 'Staff / focus', description: 'Channels flow; amplifies elemental force' },
      { id: 'bow',     label: 'Bow / ranged',  description: 'Distance and accuracy; persistent pressure' },
      { id: 'hammer',  label: 'Hammer / heavy', description: 'Crushing weight; area and stagger' },
      { id: 'dagger',  label: 'Dagger / fast', description: 'Speed and repeat; many strikes' },
      { id: 'grimoire', label: 'Grimoire / cast', description: 'Summoned form; complex geometry' },
    ],
  },

  // ── Power / mastery ─────────────────────────────────────────────────────────
  power_mastery: {
    id: 'power_t2',
    depth: 1,
    parent_anchor_id: 'power_mastery',
    // <!-- SCAFFOLD: pending Pattern B canonical ratification per § 12.13 -->
    question: "What expression of power calls to you?",
    options: [
      { id: 'burst',      label: 'Burst / spike',     description: 'Overwhelming force in moments' },
      { id: 'sustained',  label: 'Sustained / press', description: 'Relentless pressure over time' },
      { id: 'control',    label: 'Control / domain',  description: 'Shape the field; deny and displace' },
      { id: 'resilience', label: 'Resilience / endure', description: 'Outlast; absorb; persist' },
    ],
  },

  // ── Style / way ─────────────────────────────────────────────────────────────
  style_way: {
    id: 'style_t2',
    depth: 1,
    parent_anchor_id: 'style_way',
    // <!-- SCAFFOLD: pending Pattern B canonical ratification per § 12.13 -->
    question: "How do you move through your fights?",
    options: [
      { id: 'single_target', label: 'One target at a time', description: 'Focus; maximum impact per target' },
      { id: 'aoe',           label: 'Many at once',          description: 'Sweep; shape the crowd' },
      { id: 'depth',         label: 'Deep mastery',          description: 'Few powerful tools; know them fully' },
      { id: 'breadth',       label: 'Wide toolkit',          description: 'Flexible; answer any situation' },
    ],
  },

  // ── Harvest / rewards ────────────────────────────────────────────────────────
  harvest_rewards: {
    id: 'harvest_t2',
    depth: 1,
    parent_anchor_id: 'harvest_rewards',
    // <!-- SCAFFOLD: pending Pattern B canonical ratification per § 12.13 -->
    question: "What do you seek to gather?",
    options: [
      { id: 'speed_farm',  label: 'Speed of harvest',    description: 'Rapid clears; many in the time of one' },
      { id: 'rare_drops',  label: 'Rare and powerful',   description: 'Chase the exceptional; quality over count' },
      { id: 'progression', label: 'Ascension materials', description: 'Fuel for becoming; climb the tier' },
    ],
  },

  // ── Horizon / goal ───────────────────────────────────────────────────────────
  horizon_goal: {
    id: 'horizon_t2',
    depth: 1,
    parent_anchor_id: 'horizon_goal',
    // <!-- SCAFFOLD: pending Pattern B canonical ratification per § 12.13 -->
    question: "Where does your horizon lie this season?",
    options: [
      { id: 'early',    label: 'Early climb',       description: 'Build the foundation; first tier mastery' },
      { id: 'mid',      label: 'Mid-season push',   description: 'Breaking through; crossing into power' },
      { id: 'pinnacle', label: 'Pinnacle / endgame', description: 'Already there; optimize the peak' },
    ],
  },
};

/**
 * Tier 3 cascade layers, keyed by Tier 2 option id.
 * Only a subset have Tier 3; others proceed directly to final emergence.
 *
 * SCAFFOLD: All Tier 3 question strings are draft vocabulary per § 12.13 open refinement.
 * <!-- SCAFFOLD: pending Pattern B canonical ratification per § 12.13 -->
 */
export const TIER3_LAYERS: Record<string, CascadeLayer> = {
  // Element → Fire → attack geometry
  fire: {
    id: 'fire_t3',
    depth: 2,
    parent_anchor_id: 'fire',
    // <!-- SCAFFOLD: pending Pattern B canonical ratification per § 12.13 -->
    question: "Does the fire erupt or flow?",
    options: [
      { id: 'fire_burst', label: 'Erupts — burst and scatter', description: 'Instant; wide; consuming' },
      { id: 'fire_flow',  label: 'Flows — trailing burn',      description: 'Persistent; field-shaping; attrition' },
    ],
  },

  // Element → Water → pattern
  water: {
    id: 'water_t3',
    depth: 2,
    parent_anchor_id: 'water',
    // <!-- SCAFFOLD: pending Pattern B canonical ratification per § 12.13 -->
    question: "Does the water control or drown?",
    options: [
      { id: 'water_control', label: 'Controls — slow and redirect', description: 'Field shape; delay; reroute' },
      { id: 'water_drown',   label: 'Drowns — sustained pressure', description: 'Envelop; deplete; persist' },
    ],
  },

  // Element → Lightning → delivery
  lightning: {
    id: 'lightning_t3',
    depth: 2,
    parent_anchor_id: 'lightning',
    // <!-- SCAFFOLD: pending Pattern B canonical ratification per § 12.13 -->
    question: "Does the lightning strike once or cascade?",
    options: [
      { id: 'lightning_single', label: 'Strikes — decisive and final', description: 'Maximum single-target' },
      { id: 'lightning_chain',  label: 'Cascades — arc to arc',         description: 'Spread; multiply; chain' },
    ],
  },

  // Race → Dwarven → focus
  dwarven: {
    id: 'dwarven_t3',
    depth: 2,
    parent_anchor_id: 'dwarven',
    // <!-- SCAFFOLD: pending Pattern B canonical ratification per § 12.13 -->
    question: "What does the forge produce?",
    options: [
      { id: 'dwarven_weapon', label: 'The weapon — forged for war',    description: 'Physical mastery; combat geometry' },
      { id: 'dwarven_ward',   label: 'The ward — shaped for endurance', description: 'Resilience; barrier; persistence' },
    ],
  },

  // Power → Burst → magnitude vs frequency
  burst: {
    id: 'burst_t3',
    depth: 2,
    parent_anchor_id: 'burst',
    // <!-- SCAFFOLD: pending Pattern B canonical ratification per § 12.13 -->
    question: "Does the burst land once or again and again?",
    options: [
      { id: 'burst_one',     label: 'One overwhelming moment',     description: 'Single devastating strike' },
      { id: 'burst_repeated', label: 'Rapid bursts in sequence',   description: 'Stacking; many peaks close together' },
    ],
  },
};

// ─── Kit-emergence scaffold data ──────────────────────────────────────────────

/**
 * Kit emergence descriptor for final emergence narration.
 * In production: nearest-kit-centroid lookup against BC space honoring precedent.
 * Phase 5 prototype: simplified scaffold descriptors.
 *
 * SCAFFOLD: kit-to-cascade mapping is provisional (no real BC-space lookup in Phase 5).
 * Production implementation requires star-lord's nearest-centroid API or client-side
 * BC-space lookup from kit corpus.
 * // TODO(drax): replace scaffold kit-emergence with real nearest-kit-centroid lookup post-engine-API
 */
export interface KitEmergenceResult {
  kit_id: string;
  kit_name: string;
  precedent_description: string;
  output_primitives: string;
}

/**
 * Synthesized emergence descriptors for the 7 Tier 1 anchor paths.
 * Labeled "synthesized for visualization" — not real engine output.
 * Per drax role definition: synthesized visualizations labeled explicitly are acceptable.
 *
 * // TODO(drax): replace synthesized emergence with real nearest-kit-centroid lookup post-engine-API
 */
export const SCAFFOLD_KIT_EMERGENCE: Record<string, KitEmergenceResult[]> = {
  race_ancestry: [
    { kit_id: 'scaffold_race_human', kit_name: 'Wanderer of the Open Road', precedent_description: 'Human / wanderer lineage', output_primitives: 'adaptive form, variable element, movement-focus' },
    { kit_id: 'scaffold_race_dwarven', kit_name: 'Forgewright of the Burning Anvil', precedent_description: 'Dwarven / forge-kin lineage', output_primitives: 'STR primary, physical or fire element, weapon-craft mastery' },
  ],
  element_flow: [
    { kit_id: 'scaffold_element_fire', kit_name: 'Ashen Striker', precedent_description: 'Fire / flow precedent', output_primitives: 'fire element, burst damage, INT or STR scaling' },
    { kit_id: 'scaffold_element_water', kit_name: 'Tidecaller', precedent_description: 'Water / flow precedent', output_primitives: 'water element, control, WIS scaling' },
    { kit_id: 'scaffold_element_lightning', kit_name: 'Arcstep Conduit', precedent_description: 'Lightning / flow precedent', output_primitives: 'lightning element, chain strike, DEX scaling' },
  ],
  weapon_craft: [
    { kit_id: 'scaffold_weapon_blade', kit_name: 'Edgewalker', precedent_description: 'Blade / craft precedent', output_primitives: 'blade weapon, single-target, DEX or STR scaling' },
    { kit_id: 'scaffold_weapon_staff', kit_name: 'Channeler of the Deep Current', precedent_description: 'Staff / focus craft precedent', output_primitives: 'staff weapon, elemental amplification, INT scaling' },
  ],
  power_mastery: [
    { kit_id: 'scaffold_power_burst', kit_name: 'Cataclyst', precedent_description: 'Power / burst mastery', output_primitives: 'spike damage, T4 strategy: maximum single-target' },
    { kit_id: 'scaffold_power_control', kit_name: 'Fieldwarden', precedent_description: 'Power / control mastery', output_primitives: 'field control, T4 strategy: domain denial' },
  ],
  style_way: [
    { kit_id: 'scaffold_style_single', kit_name: 'Precise One', precedent_description: 'Style / single-target way', output_primitives: 'target-pattern: focused, single-hit peak' },
    { kit_id: 'scaffold_style_aoe', kit_name: 'Sweeper', precedent_description: 'Style / AOE way', output_primitives: 'target-pattern: crowd, area geometry' },
  ],
  harvest_rewards: [
    { kit_id: 'scaffold_harvest_speed', kit_name: 'Blitz Runner', precedent_description: 'Harvest / speed precedent', output_primitives: 'speedfarm build, movement speed, rapid clear geometry' },
    { kit_id: 'scaffold_harvest_rare', kit_name: 'Loot Seeker', precedent_description: 'Harvest / rare precedent', output_primitives: 'loot-focus build, single-target peak for boss encounters' },
  ],
  horizon_goal: [
    { kit_id: 'scaffold_horizon_early', kit_name: 'Ascendant Initiate', precedent_description: 'Horizon / early-climb precedent', output_primitives: 'early-stage scaling, resource-efficient, generalist' },
    { kit_id: 'scaffold_horizon_pinnacle', kit_name: 'Apex Form', precedent_description: 'Horizon / pinnacle precedent', output_primitives: 'T4-optimized, peak scaling, specialized geometry' },
  ],
};
