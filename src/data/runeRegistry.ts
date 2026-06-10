/**
 * runeRegistry.ts — Phase 4 rune-per-primitive-group definitions.
 *
 * Drax Phase 4, 2026-06-09. Per dispatch:
 *   2026-06-09-drax-forge-phase-4-AMENDMENT-rune-per-group-two-tier.md
 *
 * 6 primitive groups scaffold (drax-discretion-substitutable per § 1.2):
 *   1. Elements        — fire / water / earth / wind / lightning / holy / shadow / physical
 *   2. Movement        — speed (slider) + type (leap / teleport / dash / glide / step)
 *   3. Combat geometry — shape (single-target / AOE / line / cone / chain / multi-spawn)
 *   4. Resource economy — resource type + economy pattern
 *   5. Attributes      — STR / INT / WIS / DEX primary
 *   6. Mechanic-altering — passive-type families
 *
 * Rune selections per group (cross-system; drax-discretion per dispatch § 1.2):
 *   1. Elements        — I Ching Bagua ☰ (creative/heaven; elemental forces)
 *   2. Movement        — Norse Elder Futhark Raidho ᚱ (riding / journey / motion)
 *   3. Combat geometry — Norse Elder Futhark Eihwaz ᛇ (yew / axis / form)
 *   4. Resource economy — Norse Elder Futhark Fehu ᚠ (wealth / resource flow)
 *   5. Attributes      — Norse Elder Futhark Uruz ᚢ (raw strength / vital force)
 *   6. Mechanic-altering — Norse Elder Futhark Othala ᛟ (inheritance / fundamental nature)
 *
 * Semantic rep-audit per Discipline #25 (gandalf reviews at Vercel preview milestone):
 *   Each rune's embedded semantic content tested against primitive group's symbolic role.
 *
 * SCAFFOLD values — ALL flagged per Discipline #40:
 *   - Group structure (6 groups; canonical lock deferred Pattern B)
 *   - Rune per group (candidates used; canonical rune lock deferred Pattern B)
 *   - Per-primitive placeholder icons (canonical icon design deferred Pattern B)
 *   - visual_render_spec parameters (canonical render-parameter lock deferred Pattern B)
 *
 * TODO(drax): replace all SCAFFOLD values with canonical locks post-Pattern-B session
 */

import type { RunePrimitiveGroup } from './runeAnchorTypes';

// ─── SCAFFOLD: Visual render spec defaults ────────────────────────────────────
// These are drax default values for the atmospheric rune render.
// Canonical visual-register render-parameter lock DEFERRED to Pattern B.
// TODO(drax): replace scaffold render parameters with canonical visual-register lock post-Pattern-B

const DEFAULT_RUNE_RENDER = {
  atmospheric_radius: 1800,  // world px — "looming behind" at ~7× the Phase 3 nebula outer glow
  stroke_radius: 900,         // world px — the rune's drawn glyph extent
  stroke_luminosity: 0.88,
  atmospheric_alpha: 0.022,   // very faint ambient presence
  stroke_alpha: 0.55,
  edge_highlight_alpha: 0.85, // bright light-edges
  stroke_fiber_count: 18,     // brush-stroke fiber lines
};

// ─── SCAFFOLD: 6 Primitive Groups with Rune Assignments ──────────────────────

export const RUNE_PRIMITIVE_GROUPS: RunePrimitiveGroup[] = [

  // ── Group 1: Elements ────────────────────────────────────────────────────────
  {
    id: 'elements',
    label: 'Elements',
    description: 'The elemental forces that define a spirit\'s nature',
    primitives: [
      // SCAFFOLD: placeholder icons — canonical icon design DEFERRED to Pattern B
      // TODO(drax): replace placeholder icons with canonical icon design post-Pattern-B
      { id: 'fire',      label: 'Fire',      placeholder_icon: '🔥', control_type: 'icon_button' },
      { id: 'water',     label: 'Water',     placeholder_icon: '💧', control_type: 'icon_button' },
      { id: 'earth',     label: 'Earth',     placeholder_icon: '⬡',  control_type: 'icon_button' },
      { id: 'wind',      label: 'Wind',      placeholder_icon: '🌀', control_type: 'icon_button' },
      { id: 'lightning', label: 'Lightning', placeholder_icon: '⚡', control_type: 'icon_button' },
      { id: 'holy',      label: 'Holy',      placeholder_icon: '✦',  control_type: 'icon_button' },
      { id: 'shadow',    label: 'Shadow',    placeholder_icon: '◈',  control_type: 'icon_button' },
      { id: 'physical',  label: 'Physical',  placeholder_icon: '⚔',  control_type: 'icon_button' },
    ],
    rune: {
      // SCAFFOLD: I Ching Qián ☰ (Heaven / creative principle / elemental origin)
      // Semantic match: "heaven" in I Ching framing is the active creative principle from which all
      // elemental manifestation flows. The trigram ☰ (three unbroken lines) reads as pure yang energy —
      // the originating force. For the Elements group, this anchors the "source" of all elemental
      // differentiation without pre-committing to any single element.
      // Alternative candidates per dispatch § 1.2: DINGIR (Sumerian — divine), Norse Algiz ᛉ (protection/divine)
      // TODO(drax): canonical rune-per-group lock deferred to Pattern B
      id: 'rune_elements',
      glyph: '☰',
      system: 'i_ching',
      native_name: 'Qián / Heaven',
      semantic_meaning: 'Creative principle; originating force; the source from which elemental differentiation flows',
      selection_rationale: 'I Ching Qián (☰, three unbroken yang lines) represents the Heaven trigram — the active creative principle from which all elemental forces manifest. In the context of a primitive-group anchor for Elements, it reads as the ur-source of elemental identity without privileging any specific element. The trigram\'s geometric simplicity (three horizontal strokes) also renders clearly at large scale as a recognizable glyph-sign.',
      visual_render_spec: {
        ...DEFAULT_RUNE_RENDER,
        atmospheric_radius: 1900,
        stroke_radius: 950,
        edge_highlight_alpha: 0.90,
      },
    },
  },

  // ── Group 2: Movement ────────────────────────────────────────────────────────
  {
    id: 'movement',
    label: 'Movement',
    description: 'How a spirit moves through space — speed and style',
    primitives: [
      // SCAFFOLD: placeholder icons
      // TODO(drax): replace placeholder icons with canonical icon design post-Pattern-B
      {
        id: 'movement_speed',
        label: 'Speed',
        placeholder_icon: '⇝',
        control_type: 'slider',
        slider_range: { min: 1, max: 10, step: 1, unit: '' },
      },
      { id: 'movement_leap',     label: 'Leap-Strike',   placeholder_icon: '🦘', control_type: 'icon_button' },
      { id: 'movement_teleport', label: 'Teleport',      placeholder_icon: '⬡',  control_type: 'icon_button' },
      { id: 'movement_dash',     label: 'Dash',          placeholder_icon: '▷▷', control_type: 'icon_button' },
      { id: 'movement_glide',    label: 'Glide',         placeholder_icon: '〜', control_type: 'icon_button' },
      { id: 'movement_step',     label: 'Step',          placeholder_icon: '◇',  control_type: 'icon_button' },
    ],
    rune: {
      // SCAFFOLD: Norse Elder Futhark Raidho ᚱ (riding / journey / purposeful motion)
      // Semantic match: Raidho (ᚱ) in Elder Futhark tradition means "riding" — purposeful directional
      // movement, journey, the rhythm of travel. Closely maps to the Movement group's identity as
      // the category that defines HOW a spirit traverses space. The rune's angular diagonal stroke
      // reads as forward momentum.
      // TODO(drax): canonical rune-per-group lock deferred to Pattern B
      id: 'rune_movement',
      glyph: 'ᚱ',
      system: 'elder_futhark',
      native_name: 'Raidho',
      semantic_meaning: 'Riding; journey; purposeful directional motion; the rhythm of travel',
      selection_rationale: 'Raidho (ᚱ) is the Elder Futhark rune of riding and journey — purposeful, directional, rhythmic movement. Maps directly to the Movement primitive group\'s core semantic: how the spirit moves. The angular diagonal stroke of Raidho suggests forward momentum and is visually distinct from the horizontal-stacked I Ching glyphs.',
      visual_render_spec: {
        ...DEFAULT_RUNE_RENDER,
        atmospheric_radius: 1750,
        stroke_radius: 875,
      },
    },
  },

  // ── Group 3: Combat Geometry ─────────────────────────────────────────────────
  {
    id: 'combat_geometry',
    label: 'Combat Geometry',
    description: 'The shape of a spirit\'s attack — how force distributes in space',
    primitives: [
      // SCAFFOLD: placeholder icons
      // TODO(drax): replace placeholder icons with canonical icon design post-Pattern-B
      { id: 'geo_single',      label: 'Single Target', placeholder_icon: '◎', control_type: 'icon_button' },
      { id: 'geo_aoe',         label: 'AOE',           placeholder_icon: '⊙', control_type: 'icon_button' },
      { id: 'geo_line',        label: 'Line',          placeholder_icon: '⟹', control_type: 'icon_button' },
      { id: 'geo_cone',        label: 'Cone',          placeholder_icon: '△', control_type: 'icon_button' },
      { id: 'geo_chain',       label: 'Chain',         placeholder_icon: '⛓', control_type: 'icon_button' },
      { id: 'geo_multi_spawn', label: 'Multi-Spawn',   placeholder_icon: '❊', control_type: 'icon_button' },
    ],
    rune: {
      // SCAFFOLD: Norse Elder Futhark Eihwaz ᛇ (yew / axis / form-bearing structure)
      // Semantic match: Eihwaz (ᛇ) means the yew tree — a central vertical axis, the world-tree
      // analog, a form that defines spatial structure. For Combat Geometry it maps to the concept
      // of how force is shaped and directed through space — the geometry of the strike.
      // TODO(drax): canonical rune-per-group lock deferred to Pattern B
      id: 'rune_combat_geometry',
      glyph: 'ᛇ',
      system: 'elder_futhark',
      native_name: 'Eihwaz',
      semantic_meaning: 'Yew; central axis; form-bearing spatial structure; the shape through which force flows',
      selection_rationale: 'Eihwaz (ᛇ) is the Elder Futhark rune of the yew tree — a vertical axis that defines spatial structure and form. Maps to Combat Geometry as the spatial shaping principle. The rune\'s vertical stroke with diagonal branches reads as a targeting axis. Semantically: Eihwaz connotes enduring form and direction, appropriate for a group that determines how strikes are geometrically distributed.',
      visual_render_spec: {
        ...DEFAULT_RUNE_RENDER,
        atmospheric_radius: 1700,
        stroke_radius: 850,
      },
    },
  },

  // ── Group 4: Resource Economy ────────────────────────────────────────────────
  {
    id: 'resource_economy',
    label: 'Resource Economy',
    description: 'The currency of action — how a spirit spends and replenishes its power',
    primitives: [
      // SCAFFOLD: placeholder icons
      // TODO(drax): replace placeholder icons with canonical icon design post-Pattern-B
      { id: 'res_mana',     label: 'Mana',    placeholder_icon: '◈', control_type: 'icon_button' },
      { id: 'res_energy',   label: 'Energy',  placeholder_icon: '⚡', control_type: 'icon_button' },
      { id: 'res_stamina',  label: 'Stamina', placeholder_icon: '❤', control_type: 'icon_button' },
      { id: 'res_fury',     label: 'Fury',    placeholder_icon: '🔥', control_type: 'icon_button' },
    ],
    rune: {
      // SCAFFOLD: Norse Elder Futhark Fehu ᚠ (wealth / cattle / flowing resource)
      // Semantic match: Fehu (ᚠ) means "cattle" in Proto-Germanic — but its semantic load is
      // wealth, flowing abundance, resource circulation. The rune is about resources that move,
      // accumulate, and are spent. Maps directly to Resource Economy.
      // TODO(drax): canonical rune-per-group lock deferred to Pattern B
      id: 'rune_resource_economy',
      glyph: 'ᚠ',
      system: 'elder_futhark',
      native_name: 'Fehu',
      semantic_meaning: 'Wealth; flowing resource; circulation of abundance; the economy of power',
      selection_rationale: 'Fehu (ᚠ) is the Elder Futhark rune of wealth and flowing resources — the mobile, circulating abundance that defines economic activity. Maps to Resource Economy as the primary semantic. Fehu\'s branching upper strokes suggest flow/outward energy. Historically it represents both material resources and the vital energy (önd) that circulates through living things — appropriate for a group covering mana/energy/stamina/fury.',
      visual_render_spec: {
        ...DEFAULT_RUNE_RENDER,
        atmospheric_radius: 1700,
        stroke_radius: 850,
      },
    },
  },

  // ── Group 5: Attributes ──────────────────────────────────────────────────────
  {
    id: 'attributes',
    label: 'Attributes',
    description: 'The core nature of a spirit — strength, wisdom, intellect, dexterity',
    primitives: [
      // SCAFFOLD: placeholder icons
      // TODO(drax): replace placeholder icons with canonical icon design post-Pattern-B
      { id: 'attr_str', label: 'STR', placeholder_icon: '⚔', control_type: 'icon_button' },
      { id: 'attr_int', label: 'INT', placeholder_icon: '✦', control_type: 'icon_button' },
      { id: 'attr_wis', label: 'WIS', placeholder_icon: '◎', control_type: 'icon_button' },
      { id: 'attr_dex', label: 'DEX', placeholder_icon: '◈', control_type: 'icon_button' },
    ],
    rune: {
      // SCAFFOLD: Norse Elder Futhark Uruz ᚢ (aurochs / raw vitality / primal nature)
      // Semantic match: Uruz (ᚢ) means the aurochs — the primordial wild ox, raw physical
      // power and vital force. In Elder Futhark tradition it represents intrinsic nature,
      // the body's elemental strength, the raw constitution of a being. Maps to Attributes
      // as the group that captures a spirit's fundamental nature-scores.
      // TODO(drax): canonical rune-per-group lock deferred to Pattern B
      id: 'rune_attributes',
      glyph: 'ᚢ',
      system: 'elder_futhark',
      native_name: 'Uruz',
      semantic_meaning: 'Aurochs; raw vitality; primal nature; intrinsic constitution of a being',
      selection_rationale: 'Uruz (ᚢ) is the Elder Futhark rune of the aurochs — raw primal vital force, the intrinsic constitution. Maps to the Attributes group as the foundational descriptor of what a spirit IS (STR/INT/WIS/DEX) rather than what it DOES. The downward-angled stroke suggests gravitational rootedness — the attributes are the base from which all capability derives.',
      visual_render_spec: {
        ...DEFAULT_RUNE_RENDER,
        atmospheric_radius: 1750,
        stroke_radius: 875,
      },
    },
  },

  // ── Group 6: Mechanic-Altering ───────────────────────────────────────────────
  {
    id: 'mechanic_altering',
    label: 'Mechanic-Altering',
    description: 'Passive modifications that change the fundamental rules of combat',
    primitives: [
      // SCAFFOLD: placeholder icons
      // TODO(drax): replace placeholder icons with canonical icon design post-Pattern-B
      { id: 'passive_on_hit',     label: 'On-Hit Effect',     placeholder_icon: '◇', control_type: 'icon_button' },
      { id: 'passive_on_crit',    label: 'On-Crit Effect',    placeholder_icon: '✦', control_type: 'icon_button' },
      { id: 'passive_cooldown',   label: 'Cooldown Mod',      placeholder_icon: '⏱', control_type: 'icon_button' },
      { id: 'passive_aura',       label: 'Aura',              placeholder_icon: '⊙', control_type: 'icon_button' },
      { id: 'passive_counter',    label: 'Counter',           placeholder_icon: '↺', control_type: 'icon_button' },
      { id: 'passive_transform',  label: 'Transformation',    placeholder_icon: '⬡', control_type: 'icon_button' },
    ],
    rune: {
      // SCAFFOLD: Norse Elder Futhark Othala ᛟ (ancestral heritage / inherited law / fundamental rules)
      // Semantic match: Othala (ᛟ) means ancestral estate — the inherited fundamental nature of
      // a thing, the rules that come with it by right of being. For Mechanic-Altering passives,
      // this maps to modifying the inherited rules of combat — changing what "always applies."
      // TODO(drax): canonical rune-per-group lock deferred to Pattern B
      id: 'rune_mechanic_altering',
      glyph: 'ᛟ',
      system: 'elder_futhark',
      native_name: 'Othala',
      semantic_meaning: 'Ancestral heritage; inherited law; the fundamental rules of a being\'s nature',
      selection_rationale: 'Othala (ᛟ) is the Elder Futhark rune of the ancestral estate — inherited rules, the fundamental laws that govern a being\'s operation. Maps to Mechanic-Altering as the group that modifies baseline combat rules through passive effects. The diamond-and-legs form of Othala suggests a grounded structural foundation being modified from the base.',
      visual_render_spec: {
        ...DEFAULT_RUNE_RENDER,
        atmospheric_radius: 1700,
        stroke_radius: 850,
      },
    },
  },

];

/** Map from group id to group definition */
export const RUNE_GROUP_BY_ID = new Map(
  RUNE_PRIMITIVE_GROUPS.map(g => [g.id, g])
);
