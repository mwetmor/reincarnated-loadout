/**
 * ConstellationLayer.ts
 * Pixi.js rendering for Phase 3 constellation layer.
 *
 * Renders 1000 PROVISIONAL kit constellations per cull-by-default architecture:
 *   - Default zoom: 1000 centroid dim-points only (no MST lines)
 *   - On zoom-in (zoom > 1.5×): MST lines for in-viewport kits
 *   - On lasso hover: MST lines for lasso-resolved kits
 *   - On faction-highlight: MST lines for selected faction's kits
 *
 * All lines: DOTTED style (visually communicates PROVISIONAL status per dispatch § 4.1).
 * Line color: faint white with surface_B_element_class tint:
 *   - "physical" → cool neutral (0x8899AA tint)
 *   - "caster"   → warm tinted (0xBBAA88 tint)
 *
 * Discipline #1 math: 1000 kits × 33 edges = ~33K segments total.
 * Worst-case faction-highlight: ~143 kits × 33 ≈ 4,700 segments — within envelope.
 * Default-zoom centroid render: 1000 dim-points — near-zero cost.
 *
 * No kit_name labels rendered — Option B amendment compliance (D7).
 */

import * as PIXI from 'pixi.js';
import type { KitConstellation } from '../../data/cosmographTypes';
import type { MSTEdge } from '../../utils/mstConstellation';
import type { ProjectionState } from './coordinateProjection';
import { toCanvas } from './coordinateProjection';

// ─── Style constants ──────────────────────────────────────────────────────────

const CENTROID_RADIUS = 1.5;
const CENTROID_ALPHA = 0.28;
const CENTROID_COLOR = 0x6677AA;

// DOTTED line-style (Pixi Graphics manual dash)
const LINE_WIDTH = 0.5;
const LINE_ALPHA_PHYSICAL = 0.18;
const LINE_ALPHA_CASTER   = 0.22;
const LINE_COLOR_PHYSICAL  = 0x8899CC;
const LINE_COLOR_CASTER    = 0xBBAA88;
const DASH_LEN   = 2.5;
const GAP_LEN    = 4.0;

/** Draw a dashed line between two canvas points using Pixi Graphics moveTo/lineTo. */
function drawDashedLine(
  g: PIXI.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dash: number = DASH_LEN,
  gap: number = GAP_LEN
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;

  const ux = dx / len;
  const uy = dy / len;
  let drawn = false;
  let t = 0;

  while (t < len) {
    const dashEnd = Math.min(t + dash, len);
    const sx = x1 + ux * t;
    const sy = y1 + uy * t;
    const ex = x1 + ux * dashEnd;
    const ey = y1 + uy * dashEnd;

    if (!drawn) {
      g.moveTo(sx, sy);
    } else {
      g.moveTo(sx, sy);
    }
    g.lineTo(ex, ey);
    drawn = true;
    t += dash + gap;
  }
}

// ─── Centroid dim-point layer ─────────────────────────────────────────────────

/**
 * Draw 1000 centroid dim-points (default zoom state).
 * Returns a Graphics object added to app.stage.
 */
export function renderConstellationCentroids(
  app: PIXI.Application,
  kits: KitConstellation[],
  proj: ProjectionState
): PIXI.Graphics {
  const g = new PIXI.Graphics();

  for (const kit of kits) {
    const { x, y } = toCanvas(kit.centroid_x, kit.centroid_y, proj);
    g.beginFill(CENTROID_COLOR, CENTROID_ALPHA);
    g.drawCircle(x, y, CENTROID_RADIUS);
    g.endFill();
  }

  app.stage.addChild(g);
  return g;
}

// ─── MST line layer ───────────────────────────────────────────────────────────

/**
 * Draw MST constellation lines for a specified set of kits.
 * Clears and redraws into the provided Graphics object.
 *
 * @param g - pre-created Graphics object to draw into (caller manages lifecycle)
 * @param kitIds - set of kit_ids to render lines for (faction subset, lasso subset, viewport subset)
 * @param kitMap - kit_id → KitConstellation lookup
 * @param mstEdgeMap - kit_id → MSTEdge[] (UMAP space)
 * @param proj - current coordinate projection
 */
export function drawConstellationLines(
  g: PIXI.Graphics,
  kitIds: Set<string>,
  kitMap: Map<string, KitConstellation>,
  mstEdgeMap: Map<string, MSTEdge[]>,
  proj: ProjectionState
): void {
  g.clear();

  for (const kitId of kitIds) {
    const kit = kitMap.get(kitId);
    const edges = mstEdgeMap.get(kitId);
    if (!kit || !edges || edges.length === 0) continue;

    const isCaster = kit.surface_B_element_class === 'caster';
    const lineColor = isCaster ? LINE_COLOR_CASTER : LINE_COLOR_PHYSICAL;
    const lineAlpha = isCaster ? LINE_ALPHA_CASTER : LINE_ALPHA_PHYSICAL;

    g.lineStyle(LINE_WIDTH, lineColor, lineAlpha);

    for (const edge of edges) {
      const p1 = toCanvas(edge.x1, edge.y1, proj);
      const p2 = toCanvas(edge.x2, edge.y2, proj);
      drawDashedLine(g, p1.x, p1.y, p2.x, p2.y);
    }

    g.lineStyle(0);
  }
}

/**
 * Create the MST line Graphics layer and add it to app.stage.
 * Returns it so the caller can clear/redraw as interactions change.
 */
export function createConstellationLineLayer(app: PIXI.Application): PIXI.Graphics {
  const g = new PIXI.Graphics();
  app.stage.addChild(g);
  return g;
}

// ─── Kit spatial index for viewport culling ───────────────────────────────────

/**
 * Return kit_ids whose centroid falls within the canvas viewport.
 * Used for zoom-in culling: only render MST lines for in-viewport kits.
 */
export function getKitsInViewport(
  kits: KitConstellation[],
  proj: ProjectionState,
  viewportWidth: number,
  viewportHeight: number,
  padding: number = 50
): Set<string> {
  const result = new Set<string>();
  for (const kit of kits) {
    const { x, y } = toCanvas(kit.centroid_x, kit.centroid_y, proj);
    if (
      x >= -padding &&
      x <= viewportWidth + padding &&
      y >= -padding &&
      y <= viewportHeight + padding
    ) {
      result.add(kit.kit_id);
    }
  }
  return result;
}
