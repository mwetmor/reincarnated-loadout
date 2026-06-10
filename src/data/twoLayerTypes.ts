/**
 * twoLayerTypes.ts — Phase 3 two-layer + buffer-space cosmograph types.
 *
 * Drax Phase 3, 2026-06-09. Per dispatch 2026-06-09-drax-forge-phase-3-two-layer-buffer-space-prototype.md.
 *
 * Architecture:
 *   Layer 1 — Primitive-anchor layer: 8 element-family anchors, rendered as
 *              large nebula-cloud structures with distinct visual register.
 *   Layer 2 — Kit-cluster layer: 1000 kit centroids, spatially proximate to
 *              their element anchor per substrate-vector proximity.
 *   Buffer space — Deliberate empty-space buffer between anchor regions,
 *                  populated by hybrid kits (cross-substrate) as discoverable content.
 *
 * Criterion 12 compliance (dispatch § 4):
 *   - Primitive-anchors render as figurative nebula-cloud structures (NOT abstract symbolic glyphs)
 *   - Input model: lasso spatial-selection only (NO sign-gesture/symbol-tracing)
 *   - Branch A (glyph-as-primitive-anchor) is DEFERRED per Tal Rasha recognition record 2026-06-09
 */

/** One primitive-anchor entry (Layer 1) */
export interface TwoLayerAnchor {
  anchor_id: string;    // e.g. 'anchor_fire'
  element: string;      // e.g. 'fire'
  x: number;            // world-space center x
  y: number;            // world-space center y
  inner_radius: number; // nebula core radius
  outer_glow_radius: number; // outer glow extent
  color: string;        // hex color string
  zone_kit_count: number;
  outer_kit_count: number;
}

/** One kit centroid entry (Layer 2) */
export interface TwoLayerCentroid {
  kit_id: string;
  cx: number;           // world-space centroid x
  cy: number;           // world-space centroid y
  zone: 'primary' | 'outer' | 'buffer'; // placement zone
  element: string;      // primary element (for dot color)
  attribute: string;    // kit attribute (STR/DEX/INT/WIS)
  hybrid_elements?: string[]; // for buffer-zone kits: the two elements
}

/** Full two-layer layout data */
export interface TwoLayerLayoutData {
  meta: {
    world_w: number;
    world_h: number;
    anchor_count: number;
    kit_count: number;
    max_kit_radius: number;
    anchor_inner_r: number;
    anchor_outer_r: number;
    kit_zone_inner_r: number;
    kit_zone_outer_r: number;
    high_pss_outer_r: number;
    buffer_zone_max_r: number;
    positioning_algorithm: string;
    generated_by: string;
    buffer_content_note: string;
    anchor_subset_choice: string;
    anchor_subset_rationale: string;
    column_spacing_px: number;
    row_spacing_px: number;
    [key: string]: unknown;
  };
  anchors: TwoLayerAnchor[];
  centroids: TwoLayerCentroid[];
}
