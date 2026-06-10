/**
 * runeAnchorTypes.ts — Phase 4 rune-per-primitive-group + two-tier selection types.
 *
 * Drax Phase 4, 2026-06-09. Per dispatch:
 *   2026-06-09-drax-forge-phase-4-AMENDMENT-rune-per-group-two-tier.md
 *
 * Architecture:
 *   Rune-anchor layer: 6 primitive-group rune anchors, each "looming largely" behind
 *     kit clusters as large atmospheric light-edge brush-stroke glyphs (no color;
 *     drawn by light only). Matt 2026-06-09 verbatim: "The rune sign should loom
 *     largely in the space behind the primitive cluster, with a glowing light
 *     highlighting the edges of the rune and without any color except having the
 *     brush strokes drawn by light."
 *
 *   Two-tier selection:
 *     Tier 1 — Player selects rune (commits to primitive group)
 *       Option α: tap/click
 *       Option β: gesture-draw (sign-as-input; Tal Rasha precedent)
 *       Option γ: both (shipped in Phase 4 per Tier 1 falsifiable-floor validation)
 *     Tier 2 — Within selected rune, player picks per-primitive values via icon buttons
 *       Placeholder icons flagged per Discipline #40 scaffold-with-pending-decision.
 *       Canonical per-primitive icon design DEFERRED to Pattern B session (Matt 2026-06-09 verbatim).
 *
 * Discipline #40 scaffold values flagged in this file:
 *   - primitiveGroup structure (6 groups; drax-discretion-substitutable)
 *   - rune assignments per group (cross-system candidates; drax-discretion)
 *   - visual_render_spec parameters (drax defaults; canonical lock deferred Pattern B)
 *   - per-primitive placeholder icons (canonical design deferred Pattern B)
 */

// ─── Primitive group definitions ──────────────────────────────────────────────

/**
 * A primitive group (Tier 1 unit of selection).
 *
 * SCAFFOLD: 6 groups below are drax-discretion-substitutable per dispatch § 1.2.
 * Canonical primitive-group lock DEFERRED to Pattern B with Matt post-Phase-4.
 * // TODO(drax): replace scaffold group structure with canonical group lock post-Pattern-B
 */
export type PrimitiveGroupId =
  | 'elements'
  | 'movement'
  | 'combat_geometry'
  | 'resource_economy'
  | 'attributes'
  | 'mechanic_altering';

/**
 * A per-primitive value within a group (Tier 2 selection target).
 */
export interface RunePrimitive {
  id: string;
  label: string;
  /** Placeholder icon — emoji or SVG identifier. PLACEHOLDER: pending canonical design Pattern B */
  // TODO(drax): replace placeholder icons with canonical icon design post-Pattern-B
  placeholder_icon: string;
  /** Control type determines the Tier 2 widget rendered */
  control_type: 'toggle' | 'slider' | 'icon_button';
  /** For sliders: min/max/step/unit */
  slider_range?: { min: number; max: number; step: number; unit: string };
}

/**
 * A primitive group — the Tier 1 rune unit.
 */
export interface RunePrimitiveGroup {
  id: PrimitiveGroupId;
  label: string;
  description: string;
  primitives: RunePrimitive[];
  rune: RuneDefinition;
}

// ─── Rune definitions ─────────────────────────────────────────────────────────

/**
 * A cross-cultural archaic rune assignment per primitive group.
 *
 * SCAFFOLD: rune candidates per dispatch § 1.2 table. Drax-discretion-substitutable.
 * Canonical rune-per-group lock DEFERRED to Pattern B post-Phase-4.
 * // TODO(drax): replace scaffold rune assignments with canonical rune lock post-Pattern-B
 */
export interface RuneDefinition {
  id: string;
  /** The glyph character (Unicode or SVG path) */
  glyph: string;
  /** Source glyph system */
  system: 'elder_futhark' | 'cuneiform' | 'i_ching' | 'enochian' | 'planetary_sigil' | 'alchemical';
  /** Native name in source system */
  native_name: string;
  /** Semantic meaning anchoring the cross-system selection */
  semantic_meaning: string;
  /** Cross-system justification for why this rune represents this primitive group */
  selection_rationale: string;
  /** Visual render parameters for this rune's atmospheric brush-stroke render */
  visual_render_spec: RuneVisualRenderSpec;
}

/**
 * Visual render parameters for the atmospheric light-edge brush-stroke effect.
 *
 * SCAFFOLD: all numeric parameters are drax defaults.
 * Canonical visual-register render-parameter lock DEFERRED to Pattern B post-Phase-4.
 * Composes with WS2 Niagara VFX UE-port scope authoring per dispatch § 9 trigger.
 * // TODO(drax): replace scaffold render parameters with canonical visual-register lock post-Pattern-B
 */
export interface RuneVisualRenderSpec {
  /** Outer atmospheric diffusion radius (world px) — the "looming" footprint extent */
  atmospheric_radius: number;
  /** Inner stroke glow radius — the rune's actual drawn extent */
  stroke_radius: number;
  /** Brush-stroke luminosity 0-1 */
  stroke_luminosity: number;
  /** Atmospheric diffusion alpha (faint ambient) */
  atmospheric_alpha: number;
  /** Inner stroke edge alpha */
  stroke_alpha: number;
  /** Light-edge highlight alpha (brightest edges of the rune) */
  edge_highlight_alpha: number;
  /** Number of brush-stroke "fiber" lines simulating handwritten calligraphy */
  stroke_fiber_count: number;
}

// ─── Layout types ─────────────────────────────────────────────────────────────

/**
 * One rune anchor entry as loaded from JSON (no group object — populated at render time).
 */
export interface RuneAnchorJson {
  group_id: PrimitiveGroupId;
  x: number;
  y: number;
  atmospheric_radius: number;
  stroke_radius: number;
}

/**
 * One rune anchor with group object populated (runtime-enriched).
 */
export interface RuneAnchor {
  group_id: PrimitiveGroupId;
  group: RunePrimitiveGroup;
  x: number;  // world-space center x
  y: number;  // world-space center y
  /** Atmospheric footprint radius — the outer extent of the rune's diffuse presence */
  atmospheric_radius: number;
  /** Stroke glyph radius — the rune's drawn extent (used for classifyLasso re-validation) */
  stroke_radius: number;
}

/** Full rune layer layout (as loaded from JSON) */
export interface RuneLayerLayoutData {
  meta: {
    world_w: number;
    world_h: number;
    group_count: number;
    kit_count: number;
    max_kit_radius: number;
    positioning_algorithm: string;
    generated_by: string;
    rune_bounding_box_note: string;  // Criterion 11: documented at Phase 4.1 milestone
    column_spacing_px: number;
    row_spacing_px: number;
    [key: string]: unknown;
  };
  /** Raw rune anchors from JSON — group object populated at runtime in RuneLayerCanvas */
  rune_anchors: RuneAnchorJson[];
  /** Kit centroids reused from Phase 3 (element-based) re-keyed to primitive-group proximity */
  centroids: RuneLayerCentroid[];
}

/** Kit centroid in rune-layer space */
export interface RuneLayerCentroid {
  kit_id: string;
  cx: number;
  cy: number;
  zone: 'primary' | 'outer' | 'buffer';
  element: string;
  attribute: string;
  /** Which primitive group this kit is most proximate to */
  primary_group: PrimitiveGroupId;
  hybrid_elements?: string[];
}
