/**
 * FactionHaloLayer.ts
 * Pixi.js rendering for Phase 3 faction halo layer.
 *
 * Draws 7 translucent convex-hull polygons for emergent attribute-group factions
 * per dispatch § 4.3 + elrond Finding 2 (substrate-honest: factions cluster by
 * attribute group, not by per-element identity).
 *
 * Halo color encoding by modal_attribute (Discipline #41 — substrate-led):
 *   STR-modal → warm amber / steel (0xCC8833)
 *   INT-modal → blue-violet (0x6655CC)
 *   WIS-modal → green-gold (0x779944)
 *
 * Opacity: 0.10-0.15 (subtle context; not competing with stars or constellations).
 * Faction label rendered at computed centroid (mean of hull vertices, since
 * centroid_x/centroid_y are null in delivered packet — empirical Discipline #11).
 *
 * Per dispatch § 4.4: DO NOT manufacture per-element halos. Attribute-group
 * factional structure rendered as substrate says it.
 */

import * as PIXI from 'pixi.js';
import type { FactionOverlay } from '../../data/cosmographTypes';
import type { ProjectionState } from './coordinateProjection';
import { toCanvas } from './coordinateProjection';
import { hullCentroid } from '../../utils/mstConstellation';

// ─── Faction color palette (attribute-group, per dispatch § 4.3) ──────────────

function getFactionHaloColor(modalAttribute: string): number {
  switch (modalAttribute) {
    case 'STR': return 0xCC8833; // warm amber/steel
    case 'INT': return 0x6655CC; // blue-violet
    case 'WIS': return 0x779944; // green-gold
    case 'DEX': return 0x44DDCC; // teal accent (rare — consistent with star DEX color)
    default:    return 0x8899AA; // neutral fallback
  }
}

// ─── Faction halo polygon rendering ──────────────────────────────────────────

/**
 * Render all 7 faction convex-hull halos.
 * Returns the Graphics container for potential show/hide toggle.
 */
export function renderFactionHalos(
  app: PIXI.Application,
  factions: FactionOverlay[],
  proj: ProjectionState
): PIXI.Container {
  const container = new PIXI.Container();

  for (const faction of factions) {
    if (!faction.polygon_convex_hull || faction.polygon_convex_hull.length < 3) continue;

    const color = getFactionHaloColor(faction.modal_attribute);
    const g = new PIXI.Graphics();

    // Convert hull from UMAP → canvas coordinates
    const canvasHull: number[] = [];
    for (const [hx, hy] of faction.polygon_convex_hull) {
      const { x, y } = toCanvas(hx, hy, proj);
      canvasHull.push(x, y);
    }

    // Filled translucent polygon (0.12 opacity — subtle context layer)
    g.beginFill(color, 0.12);
    g.lineStyle(0.8, color, 0.35);
    g.drawPolygon(canvasHull);
    g.endFill();
    g.lineStyle(0);

    container.addChild(g);
  }

  app.stage.addChild(container);
  return container;
}

// ─── Faction label rendering ──────────────────────────────────────────────────

/**
 * Render faction label placeholders at each faction's centroid.
 * Labels show "[Emergent] {faction_label_placeholder}" per dispatch § 4.3.
 * Centroid: uses faction.centroid.{x,y} from packet (Discipline #11 empirical:
 * centroid is a nested {x,y} object, not top-level centroid_x/centroid_y).
 * Falls back to mean of hull vertices if centroid is null.
 */
export function renderFactionLabels(
  app: PIXI.Application,
  factions: FactionOverlay[],
  proj: ProjectionState
): PIXI.Container {
  const container = new PIXI.Container();

  const labelStyle = new PIXI.TextStyle({
    fontFamily: 'ui-monospace, monospace',
    fontSize: 8,
    fill: 0x8899BB,
    align: 'center',
    letterSpacing: 0.3,
  });

  for (const faction of factions) {
    if (!faction.polygon_convex_hull || faction.polygon_convex_hull.length === 0) continue;

    // Use packet centroid if present, else compute from hull (Discipline #11)
    const rawCentroid = faction.centroid as { x: number; y: number } | null;
    const centroid = (rawCentroid && rawCentroid.x != null)
      ? rawCentroid
      : hullCentroid(faction.polygon_convex_hull);
    const { x, y } = toCanvas(centroid.x, centroid.y, proj);

    const color = getFactionHaloColor(faction.modal_attribute);
    const labelText = `[Emergent] ${faction.faction_label_placeholder}`;

    const label = new PIXI.Text(labelText, {
      ...labelStyle,
      fill: color,
    });
    label.x = x - label.width / 2;
    label.y = y - label.height / 2;
    label.alpha = 0.50;

    container.addChild(label);
  }

  app.stage.addChild(container);
  return container;
}
