/**
 * LassoLayer.ts
 * Pixi.js lasso polygon rendering for /forge cosmograph.
 *
 * Per dispatch § 5.1:
 * - stage.on('pointerdown') initiates lasso draw
 * - Free-form polygon vertices captured at pointer-move (throttled to ~60Hz via RAF)
 * - Lasso polygon rendered as dotted line during draw (PROVISIONAL constellation aesthetic)
 * - pointerup closes lasso → triggers resolution callback
 * - Each new draw clears the prior selection
 *
 * Coordinate space: all lasso vertices stored in UMAP space (cosmograph coordinates)
 * for direct pass-through to lassoResolution.ts (which operates in UMAP space).
 *
 * Discipline #1 math: point-in-polygon is O(570 × V); V ≤ ~50 typical lasso vertices = <1ms.
 *
 * Phase 5b coord-transform fix:
 * FederatedPointerEvent.globalX/Y is in Pixi global space (CSS-pixel, pre-stage-transform).
 * After Phase 5 zoom+pan, stage has non-identity scale+position. All pointer coords must
 * be converted to stage-local space before feeding into toUMAP. Stage-local is the space
 * that lassoGraphics (a stage child) draws in, and is what toCanvas outputs.
 * Formula: stageLocalX = (globalX - stage.position.x) / stage.scale.x
 * Verified: at zoom=1, pan=0 this is identity (no behavior change). At zoom≠1 or pan≠0,
 * lasso polygon vertices align with pointer position.
 */

import * as PIXI from 'pixi.js';
import type { ProjectionState } from './coordinateProjection';
import { toCanvas, toUMAP } from './coordinateProjection';
import type { Point } from '../../utils/lassoResolution';

// ─── Visual constants ─────────────────────────────────────────────────────────

// Lasso border: dotted bright translucent line (PROVISIONAL aesthetic)
const LASSO_BORDER_COLOR  = 0xAABBDD;
const LASSO_BORDER_ALPHA  = 0.70;
const LASSO_BORDER_WIDTH  = 1.2;
const LASSO_FILL_COLOR    = 0x3344AA;
const LASSO_FILL_ALPHA    = 0.08;
const LASSO_CLOSE_COLOR   = 0x88AAFF;
const LASSO_CLOSE_ALPHA   = 0.55;

// Dot pattern for lasso border (PROVISIONAL dotted style)
const DASH_LEN = 3.0;
const GAP_LEN  = 4.0;

// Minimum drag distance before we start recording vertices (px)
const MIN_DRAG_PX = 4;

// Minimum vertex distance to record a new vertex (UMAP units)
const MIN_VERTEX_DIST_UMAP = 0.05;

// ─── Coord transform: Pixi global → stage-local ──────────────────────────────
// Pixi FederatedPointerEvent.globalX/Y is in CSS-pixel space (pre-stage-transform).
// Stage children (including lassoGraphics) draw in stage-local space.
// toUMAP / toCanvas operate in stage-local space (proj was computed from stage-local dims).
// This helper applies the inverse of the stage transform to get stage-local coords.

function toStageLocal(
  globalX: number,
  globalY: number,
  stage: PIXI.Container
): { x: number; y: number } {
  return {
    x: (globalX - stage.position.x) / stage.scale.x,
    y: (globalY - stage.position.y) / stage.scale.y,
  };
}

// ─── Dashed line utility ──────────────────────────────────────────────────────

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
  let t = 0;

  while (t < len) {
    const dashEnd = Math.min(t + dash, len);
    g.moveTo(x1 + ux * t, y1 + uy * t);
    g.lineTo(x1 + ux * dashEnd, y1 + uy * dashEnd);
    t += dash + gap;
  }
}

// ─── LassoState ──────────────────────────────────────────────────────────────

interface LassoState {
  active: boolean;
  startCanvasX: number;
  startCanvasY: number;
  verticesUMAP: Point[]; // polygon vertices in UMAP coordinate space
  lastCanvasX: number;
  lastCanvasY: number;
}

// ─── LassoLayer ──────────────────────────────────────────────────────────────

export interface LassoLayerCallbacks {
  /** Called when lasso closes with >= 3 vertices. vertices are in UMAP space. */
  onLassoClose: (verticesUMAP: Point[]) => void;
  /** Called when lasso is cleared (new draw starts). */
  onLassoClear: () => void;
}

/**
 * Attaches lasso interaction to the Pixi stage.
 *
 * Returns a cleanup function to detach event listeners.
 * The lasso layer Graphics object is added to app.stage.
 *
 * @param isLassoModeActive - called on each pointer event; lasso handlers no-op when returns false.
 *   Allows the caller to gate lasso behavior based on current interaction mode (pointer vs lasso).
 */
export function attachLassoLayer(
  app: PIXI.Application,
  proj: ProjectionState,
  callbacks: LassoLayerCallbacks,
  isLassoModeActive: () => boolean = () => true
): { lassoGraphics: PIXI.Graphics; detach: () => void } {
  const lassoGraphics = new PIXI.Graphics();
  app.stage.addChild(lassoGraphics);

  const state: LassoState = {
    active: false,
    startCanvasX: 0,
    startCanvasY: 0,
    verticesUMAP: [],
    lastCanvasX: 0,
    lastCanvasY: 0,
  };

  // ── Render the current lasso polygon ──────────────────────────────────────
  function redrawLasso(closePolygon: boolean = false): void {
    lassoGraphics.clear();

    if (state.verticesUMAP.length < 2) return;

    // Convert UMAP vertices back to canvas for drawing
    const canvasVerts = state.verticesUMAP.map(v => toCanvas(v.x, v.y, proj));

    // Fill
    const flatVerts = canvasVerts.flatMap(v => [v.x, v.y]);
    if (closePolygon && canvasVerts.length >= 3) {
      lassoGraphics.beginFill(LASSO_FILL_COLOR, LASSO_FILL_ALPHA);
      lassoGraphics.drawPolygon(flatVerts);
      lassoGraphics.endFill();
    }

    // Dotted border
    if (closePolygon) {
      lassoGraphics.lineStyle(LASSO_CLOSE_WIDTH(), LASSO_CLOSE_COLOR, LASSO_CLOSE_ALPHA);
    } else {
      lassoGraphics.lineStyle(LASSO_BORDER_WIDTH, LASSO_BORDER_COLOR, LASSO_BORDER_ALPHA);
    }

    for (let i = 0; i < canvasVerts.length - 1; i++) {
      drawDashedLine(
        lassoGraphics,
        canvasVerts[i].x, canvasVerts[i].y,
        canvasVerts[i + 1].x, canvasVerts[i + 1].y
      );
    }

    // Closing segment (last → first)
    if (canvasVerts.length >= 3) {
      const last = canvasVerts[canvasVerts.length - 1];
      const first = canvasVerts[0];
      drawDashedLine(lassoGraphics, last.x, last.y, first.x, first.y);
    }

    lassoGraphics.lineStyle(0);
  }

  function LASSO_CLOSE_WIDTH() { return LASSO_BORDER_WIDTH * 1.5; }

  // ── pointerdown: start lasso ───────────────────────────────────────────────
  function onPointerDown(event: PIXI.FederatedPointerEvent): void {
    if (!isLassoModeActive()) return;

    // Clear any prior lasso
    if (state.active || state.verticesUMAP.length > 0) {
      state.verticesUMAP = [];
      lassoGraphics.clear();
      callbacks.onLassoClear();
    }

    state.active = true;
    // startCanvas / lastCanvas track global (DOM-pixel) coords for drag-distance check (screen-space)
    state.startCanvasX = event.globalX;
    state.startCanvasY = event.globalY;
    state.lastCanvasX = event.globalX;
    state.lastCanvasY = event.globalY;

    // Record first vertex in UMAP space via stage-local coords (Phase 5b fix)
    const stageLocal = toStageLocal(event.globalX, event.globalY, app.stage);
    const umap = toUMAP(stageLocal.x, stageLocal.y, proj);
    state.verticesUMAP = [umap];
  }

  // ── pointermove: extend lasso ──────────────────────────────────────────────
  function onPointerMove(event: PIXI.FederatedPointerEvent): void {
    if (!isLassoModeActive() || !state.active) return;

    const cx = event.globalX;
    const cy = event.globalY;

    // Check minimum drag distance from start in global (screen-pixel) space — intentional:
    // MIN_DRAG_PX is a screen-space threshold regardless of zoom level.
    const dxFromStart = cx - state.startCanvasX;
    const dyFromStart = cy - state.startCanvasY;
    const distFromStart = Math.sqrt(dxFromStart * dxFromStart + dyFromStart * dyFromStart);
    if (distFromStart < MIN_DRAG_PX && state.verticesUMAP.length <= 1) return;

    // Convert to stage-local before toUMAP (Phase 5b coord-transform fix)
    const stageLocal = toStageLocal(cx, cy, app.stage);
    const umap = toUMAP(stageLocal.x, stageLocal.y, proj);

    // Throttle: only add vertex if moved enough in UMAP space
    if (state.verticesUMAP.length > 0) {
      const last = state.verticesUMAP[state.verticesUMAP.length - 1];
      const du = umap.x - last.x;
      const dv = umap.y - last.y;
      const dist = Math.sqrt(du * du + dv * dv);
      if (dist < MIN_VERTEX_DIST_UMAP) return;
    }

    state.verticesUMAP.push(umap);
    state.lastCanvasX = cx;
    state.lastCanvasY = cy;

    redrawLasso(false);
  }

  // ── pointerup: close lasso, fire resolution ────────────────────────────────
  function onPointerUp(_event: PIXI.FederatedPointerEvent): void {
    if (!isLassoModeActive() || !state.active) return;
    state.active = false;

    if (state.verticesUMAP.length < 3) {
      // Degenerate lasso (click, not drag) — treat as clear
      lassoGraphics.clear();
      state.verticesUMAP = [];
      callbacks.onLassoClose([]); // empty → lassoResolution returns emptyLasso=true
      return;
    }

    // Render closed polygon
    redrawLasso(true);

    // Fire resolution
    const t0 = performance.now();
    callbacks.onLassoClose([...state.verticesUMAP]);
    const elapsed = performance.now() - t0;
    console.info(
      `[LassoLayer] Lasso closed: ${state.verticesUMAP.length} vertices · ` +
      `resolution callback fired in ${elapsed.toFixed(1)}ms`
    );
  }

  // Attach to stage
  app.stage.on('pointerdown', onPointerDown);
  app.stage.on('pointermove', onPointerMove);
  app.stage.on('pointerup', onPointerUp);
  app.stage.on('pointerupoutside', onPointerUp);

  function detach(): void {
    app.stage.off('pointerdown', onPointerDown);
    app.stage.off('pointermove', onPointerMove);
    app.stage.off('pointerup', onPointerUp);
    app.stage.off('pointerupoutside', onPointerUp);
    lassoGraphics.clear();
  }

  return { lassoGraphics, detach };
}

/**
 * Clear the lasso polygon graphics.
 * Called on "Clear" button press from SidePanel.
 */
export function clearLasso(lassoGraphics: PIXI.Graphics): void {
  lassoGraphics.clear();
}
