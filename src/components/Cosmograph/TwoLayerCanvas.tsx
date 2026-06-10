/**
 * TwoLayerCanvas.tsx — Phase 3 two-layer + buffer-space cosmograph.
 *
 * Drax Phase 3, 2026-06-09. Per dispatch 2026-06-09-drax-forge-phase-3-two-layer-buffer-space-prototype.md.
 *
 * Architecture:
 *   Layer 1 — Primitive-anchor layer: 8 element-family anchors, rendered as
 *              large nebula-cloud structures. Visually distinct from kit-clusters
 *              via SIZE + SHAPE + TONE (large diffuse glow vs small tight cluster).
 *   Layer 2 — Kit-cluster layer: 1000 kit centroids grouped by element proximity.
 *              LOD: dots at < 2.0× zoom; star clusters at ≥ 2.0× zoom.
 *   Buffer space: Deliberate empty-space between anchor regions.
 *              Hybrid kits (cross-element) live in buffer zones as discoverable content.
 *
 * Lasso semantics (criterion 5+6, dispatch § 1.3):
 *   - Within-anchor lasso: tight radius within one element region → related kits (coherent substrate)
 *   - Cross-buffer lasso: wider radius spanning the empty-space buffer → cross-substrate combinations
 *   - Buffer-only lasso: lasso in the empty-space between anchors → surfaces hybrid/rare kits
 *   These three modes emerge naturally from lasso scale+position without explicit toggle.
 *
 * Criterion 12 compliance:
 *   - Primitive-anchors render as figurative nebula-cloud structures (NOT abstract symbolic glyphs)
 *   - Input model: lasso spatial-selection only (NO sign-gesture/symbol-tracing input)
 *   - Branch A (glyph-as-primitive-anchor) is DEFERRED per Tal Rasha recognition record 2026-06-09
 *
 * Positioning algorithm baseline (Phase 3.1-3.2):
 *   Fixed-anchor + radial projection (k-means anchor variant — per dispatch § 1.4 table).
 *   Alternative: force-directed with buffer repulsion (Phase 3.3, via toggle).
 *
 * Mobile-responsive: touch events supported per D8 mobile-friendly-from-day-one.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';
import type { CosmographData } from '../../data/cosmographData';
import type { TwoLayerLayoutData, TwoLayerCentroid, TwoLayerAnchor } from '../../data/twoLayerTypes';
import type { ConstellationLayoutData, ConstellationLayoutNode } from '../../data/cosmographTypes';
import { scoreKitsByPrimitiveSet } from '../../utils/lassoResolution';
import type { LassoResolutionResult } from '../../utils/lassoResolution';

// ─── Constants ────────────────────────────────────────────────────────────────

const LOD_ZOOM_THRESHOLD = 2.0;   // Below: centroid dots. At/above: full star clusters.
const MIN_CLICK_PX = 6;

// ─── Element colors (shared with Phase 2 palette) ─────────────────────────────

const ELEMENT_COLORS_HEX: Record<string, number> = {
  fire:      0xE85520,
  water:     0x2299DD,
  earth:     0xA07040,
  wind:      0x88CC88,
  lightning: 0xAA66EE,
  holy:      0xDDAA33,
  shadow:    0x7744AA,
  physical:  0x8899AA,
};
const NEUTRAL_COLOR = 0xCCDDEE;
const DEX_COLOR = 0x44DDCC;

function elementColor(element: string): number {
  return ELEMENT_COLORS_HEX[element] ?? NEUTRAL_COLOR;
}

// ─── Node color from primitive properties ────────────────────────────────────

function getNodeColor(
  primitiveId: string,
  primitiveFamily: string,
  elementCouplingJson: string,
  attributeCouplingJson: string,
): number {
  if (primitiveFamily === 'element') {
    return ELEMENT_COLORS_HEX[primitiveId.replace('element_', '')] ?? NEUTRAL_COLOR;
  }
  try {
    const ec = JSON.parse(elementCouplingJson) as string[];
    if (ec.length > 0) return ELEMENT_COLORS_HEX[ec[0]] ?? NEUTRAL_COLOR;
  } catch { /* skip */ }
  try {
    const ac = JSON.parse(attributeCouplingJson) as string[];
    if (ac.includes('DEX')) return DEX_COLOR;
    if (ac.includes('STR')) return ELEMENT_COLORS_HEX['physical'];
  } catch { /* skip */ }
  return NEUTRAL_COLOR;
}

// ─── Drawing utilities ────────────────────────────────────────────────────────

function drawStarGlow(g: PIXI.Graphics, x: number, y: number, radius: number, color: number, alpha: number): void {
  g.beginFill(color, alpha * 0.08);
  g.drawCircle(x, y, radius * 2.2);
  g.endFill();
  g.beginFill(color, alpha * 0.20);
  g.drawCircle(x, y, radius * 1.4);
  g.endFill();
  g.beginFill(color, alpha);
  g.drawCircle(x, y, radius);
  g.endFill();
}

/**
 * Draw a primitive-anchor nebula cloud.
 * Large diffuse glow (outer) + denser core (inner) + bright center.
 * Visual register is categorically distinct from kit clusters (much larger; more diffuse).
 * No abstract symbolic glyphs — figurative nebula/cloud register only (criterion 12a).
 */
function drawAnchorNebula(g: PIXI.Graphics, anchor: TwoLayerAnchor): void {
  const color = parseInt(anchor.color.replace('#', ''), 16);
  const cx = anchor.x;
  const cy = anchor.y;
  const outerR = anchor.outer_glow_radius;  // ~260px
  const innerR = anchor.inner_radius;        // ~130px

  // Outermost diffuse glow — very faint
  g.beginFill(color, 0.04);
  g.drawCircle(cx, cy, outerR);
  g.endFill();

  // Middle haze
  g.beginFill(color, 0.09);
  g.drawCircle(cx, cy, outerR * 0.72);
  g.endFill();

  // Core nebula
  g.beginFill(color, 0.15);
  g.drawCircle(cx, cy, innerR);
  g.endFill();

  // Dense core
  g.beginFill(color, 0.28);
  g.drawCircle(cx, cy, innerR * 0.55);
  g.endFill();

  // Bright center point
  g.beginFill(color, 0.75);
  g.drawCircle(cx, cy, innerR * 0.18);
  g.endFill();
  g.beginFill(0xFFFFFF, 0.40);
  g.drawCircle(cx, cy, innerR * 0.07);
  g.endFill();

  // Outer boundary ring (faint; defines anchor territory visually)
  g.lineStyle(0.8, color, 0.18);
  g.drawCircle(cx, cy, outerR);
  g.lineStyle(0);
}

// ─── Point-in-polygon (ray casting) ──────────────────────────────────────────

function pointInPolygon(px: number, py: number, vertices: Array<{ x: number; y: number }>): boolean {
  let inside = false;
  const n = vertices.length;
  let j = n - 1;
  for (let i = 0; i < n; i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
    j = i;
  }
  return inside;
}

// ─── Lasso classification ─────────────────────────────────────────────────────

/**
 * Classify lasso by its relationship to anchor regions.
 * Returns the semantic mode based on lasso scale + position (criterion 5+6):
 *   'within-anchor'  — lasso center near an anchor; mostly captures that anchor's kits
 *   'cross-buffer'   — lasso center in buffer; spans multiple anchor regions
 *   'buffer-only'    — lasso entirely in buffer zone; no anchor nearby
 */
function classifyLasso(
  lassoVertices: Array<{ x: number; y: number }>,
  anchors: TwoLayerAnchor[],
): 'within-anchor' | 'cross-buffer' | 'buffer-only' {
  if (lassoVertices.length < 2) return 'buffer-only';

  // Compute lasso centroid
  const cx = lassoVertices.reduce((s, v) => s + v.x, 0) / lassoVertices.length;
  const cy = lassoVertices.reduce((s, v) => s + v.y, 0) / lassoVertices.length;

  // Lasso bounding radius (approximate)
  const lassoR = Math.max(
    ...lassoVertices.map(v => Math.sqrt((v.x - cx) ** 2 + (v.y - cy) ** 2))
  );

  // Distance from lasso centroid to each anchor
  let minAnchorDist = Infinity;
  let nearAnchorCount = 0;
  for (const anchor of anchors) {
    const dist = Math.sqrt((cx - anchor.x) ** 2 + (cy - anchor.y) ** 2);
    if (dist < minAnchorDist) minAnchorDist = dist;
    // Anchor "nearby" if lasso overlaps with its kit zone (kit_zone_outer_r ~1050)
    if (dist < 1200 + lassoR) nearAnchorCount++;
  }

  if (nearAnchorCount >= 2 && lassoR > 600) return 'cross-buffer';
  if (minAnchorDist < 1100 || nearAnchorCount >= 1) return 'within-anchor';
  return 'buffer-only';
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TwoLayerCanvasProps {
  data: CosmographData;
  layoutData: TwoLayerLayoutData;
  constellationLayoutData: ConstellationLayoutData;  // For star-instance nodes at zoom-in
  onLassoResult: (result: LassoResolutionResult | null, lassoMode: string) => void;
  clearLassoRef?: React.MutableRefObject<(() => void) | null>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TwoLayerCanvas({
  data,
  layoutData,
  constellationLayoutData,
  onLassoResult,
  clearLassoRef,
}: TwoLayerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const [interactionMode, setInteractionMode] = useState<'pointer' | 'lasso'>('pointer');
  const modeRef = useRef<'pointer' | 'lasso'>('pointer');
  const onLassoResultRef = useRef(onLassoResult);
  onLassoResultRef.current = onLassoResult;
  const normalizedZoomRef = useRef(1.0);

  // Lasso mode info (updated after each lasso resolve)
  const [lastLassoMode, setLastLassoMode] = useState<string | null>(null);

  const handleModeToggle = useCallback((m: 'pointer' | 'lasso') => {
    modeRef.current = m;
    setInteractionMode(m);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    const worldW = layoutData.meta.world_w;
    const worldH = layoutData.meta.world_h;
    const MAX_KIT_RADIUS = layoutData.meta.max_kit_radius;

    // Fit-to-container scale
    const initialScale = Math.min(containerW / worldW, containerH / worldH);

    // Build primitive lookup
    const primById = data.primitiveById;

    // Build two-layer centroid lookup (for highlight)
    const centroidByKitId = new Map<string, TwoLayerCentroid>();
    for (const c of layoutData.centroids) {
      centroidByKitId.set(c.kit_id, c);
    }

    // Build star instance nodes from Phase 2 constellation layout (reuse Phase 2 cluster geometry)
    // We re-use the Phase 2 per-kit sunflower-spiral instance node positions,
    // but TRANSLATE them to the Phase 3 centroid positions.
    interface RenderNode {
      nodeId: string;
      kit_id: string;
      primitive_id: string;
      x: number;  // Phase 3 world-space x (translated to Phase 3 centroid)
      y: number;  // Phase 3 world-space y
      zone: 'primary' | 'outer' | 'buffer';
    }

    const allStarNodes: RenderNode[] = [];

    // Phase 2 layout uses different world coords. Translate each kit's nodes
    // from Phase 2 centroid to Phase 3 centroid.
    const p2CentroidByKitId = new Map<string, { cx: number; cy: number }>();
    for (const c of constellationLayoutData.centroids) {
      p2CentroidByKitId.set(c.kit_id, { cx: c.cx, cy: c.cy });
    }

    let nodesBuilt = 0;
    for (const twoLayerCentroid of layoutData.centroids) {
      const kit_id = twoLayerCentroid.kit_id;
      const p2Centroid = p2CentroidByKitId.get(kit_id);
      const p2Nodes = constellationLayoutData.clusters[kit_id];
      if (!p2Nodes || !p2Centroid) continue;

      // Translation delta: move Phase 2 centroid to Phase 3 centroid
      const dx = twoLayerCentroid.cx - p2Centroid.cx;
      const dy = twoLayerCentroid.cy - p2Centroid.cy;

      for (const node of p2Nodes as ConstellationLayoutNode[]) {
        const prim = primById.get(node.p);
        if (!prim?.visibility_at_default_zoom) continue;
        allStarNodes.push({
          nodeId: `${kit_id}:${node.p}`,
          kit_id,
          primitive_id: node.p,
          x: node.x + dx,
          y: node.y + dy,
          zone: twoLayerCentroid.zone,
        });
        nodesBuilt++;
      }
    }

    console.info(
      `[TwoLayer P3] Star nodes built: ${nodesBuilt} ` +
      `(translated from Phase 2 cluster geometry to Phase 3 centroids)`
    );

    // ── Pixi.js application ──────────────────────────────────────────────────
    const app = new PIXI.Application({
      width: containerW,
      height: containerH,
      backgroundColor: 0x010206,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    appRef.current = app;
    container.appendChild(app.view as HTMLCanvasElement);

    // Stage pan/zoom root
    const worldStage = new PIXI.Container();
    app.stage.addChild(worldStage);
    worldStage.scale.set(initialScale);
    worldStage.position.x = (containerW - worldW * initialScale) / 2;
    worldStage.position.y = (containerH - worldH * initialScale) / 2;

    // ── Background ──────────────────────────────────────────────────────────
    const bg = new PIXI.Graphics();
    bg.beginFill(0x010206, 1.0);
    bg.drawRect(0, 0, worldW, worldH);
    bg.endFill();
    worldStage.addChild(bg);

    // ── LAYER 1: Primitive-anchor nebula clouds ─────────────────────────────
    // These are the "regional marker" structures. Large, diffuse, non-symbolic.
    // Always visible (no LOD cutoff) — the anchors provide orientation at any zoom.
    const anchorLayer = new PIXI.Graphics();
    for (const anchor of layoutData.anchors) {
      drawAnchorNebula(anchorLayer, anchor);
    }
    worldStage.addChild(anchorLayer);

    // Anchor labels — element name at center, small text
    const anchorLabels = new PIXI.Container();
    const anchorLabelStyle = new PIXI.TextStyle({
      fontFamily: 'ui-monospace, monospace',
      fontSize: 11,
      fill: 0xCCDDEE,
      align: 'center',
      letterSpacing: 1.5,
      fontWeight: 'bold',
    });
    const anchorSubLabelStyle = new PIXI.TextStyle({
      fontFamily: 'ui-monospace, monospace',
      fontSize: 8,
      fill: 0x556677,
      align: 'center',
      letterSpacing: 0.8,
    });
    for (const anchor of layoutData.anchors) {
      const color = parseInt(anchor.color.replace('#', ''), 16);
      const mainLabel = new PIXI.Text(anchor.element.toUpperCase(), {
        ...anchorLabelStyle,
        fill: color,
      });
      mainLabel.x = anchor.x - mainLabel.width / 2;
      mainLabel.y = anchor.y - mainLabel.height / 2;
      anchorLabels.addChild(mainLabel);

      // Sub-label: zone kit count
      const subLabel = new PIXI.Text(
        `${anchor.zone_kit_count + anchor.outer_kit_count} kits`,
        anchorSubLabelStyle
      );
      subLabel.x = anchor.x - subLabel.width / 2;
      subLabel.y = anchor.y + 16;
      anchorLabels.addChild(subLabel);
    }
    worldStage.addChild(anchorLabels);

    // ── LAYER 2: Kit-cluster dots (LOD: zoom < 2.0) ─────────────────────────
    // Centroid dots for overview. Color = element. Zone encoded via brightness:
    //   primary: full brightness
    //   outer: slightly dimmer (near buffer edge)
    //   buffer: pulsing accent color (cross-element hybrid content)
    const dotsLayer = new PIXI.Graphics();
    const DOT_OUTER_R = 28;  // world px glow
    const DOT_INNER_R = 13;  // world px inner dot

    for (const c of layoutData.centroids) {
      const color = elementColor(c.element);
      const isBuffer = c.zone === 'buffer';
      const isOuter = c.zone === 'outer';
      const glowAlpha = isBuffer ? 0.35 : isOuter ? 0.12 : 0.15;
      const dotAlpha = isBuffer ? 0.90 : isOuter ? 0.60 : 0.75;

      // Buffer kits: dual-element color blending (show both element colors)
      if (isBuffer && c.hybrid_elements && c.hybrid_elements.length >= 2) {
        const c1 = elementColor(c.hybrid_elements[0]);
        const c2 = elementColor(c.hybrid_elements[1]);
        dotsLayer.beginFill(c1, 0.18);
        dotsLayer.drawCircle(c.cx, c.cy, DOT_OUTER_R);
        dotsLayer.endFill();
        dotsLayer.beginFill(c2, 0.18);
        dotsLayer.drawCircle(c.cx - 4, c.cy - 4, DOT_OUTER_R * 0.7);
        dotsLayer.endFill();
        dotsLayer.beginFill(c1, dotAlpha * 0.6);
        dotsLayer.drawCircle(c.cx, c.cy, DOT_INNER_R);
        dotsLayer.endFill();
        dotsLayer.beginFill(c2, dotAlpha * 0.6);
        dotsLayer.drawCircle(c.cx + 3, c.cy + 3, DOT_INNER_R * 0.7);
        dotsLayer.endFill();
      } else {
        dotsLayer.beginFill(color, glowAlpha);
        dotsLayer.drawCircle(c.cx, c.cy, DOT_OUTER_R);
        dotsLayer.endFill();
        dotsLayer.beginFill(color, dotAlpha);
        dotsLayer.drawCircle(c.cx, c.cy, DOT_INNER_R);
        dotsLayer.endFill();
      }
    }
    worldStage.addChild(dotsLayer);

    // ── Star layer (LOD: zoom >= 2.0) — full constellation clusters ──────────
    const starsLayer = new PIXI.Graphics();
    starsLayer.visible = false;

    const t0 = performance.now();
    for (const node of allStarNodes) {
      const prim = primById.get(node.primitive_id);
      if (!prim) continue;
      const color = getNodeColor(
        node.primitive_id,
        prim.primitive_family,
        prim.element_coupling_json,
        prim.attribute_coupling_json,
      );
      const radius = prim.bdi_weight >= 0.85 ? 3.0 : prim.bdi_weight >= 0.70 ? 2.5 : 1.8;
      const alpha = 0.28 + 0.60 * prim.bdi_weight;
      // Buffer-zone kits rendered slightly brighter (discoverable content emphasis)
      const alphaMultiplier = node.zone === 'buffer' ? 1.2 : 1.0;
      drawStarGlow(starsLayer, node.x, node.y, radius, color, Math.min(1.0, alpha * alphaMultiplier));
    }

    worldStage.addChild(starsLayer);
    console.info(`[TwoLayer P3] Stars drawn in ${(performance.now() - t0).toFixed(1)}ms — ${allStarNodes.length} nodes`);

    // ── Bounds layer (LOD: zoom >= 2.0) — kit cluster bounding rings ─────────
    const boundsLayer = new PIXI.Graphics();
    boundsLayer.visible = false;
    for (const c of layoutData.centroids) {
      const color = elementColor(c.element);
      const alpha = c.zone === 'buffer' ? 0.06 : 0.03;
      boundsLayer.lineStyle(0.5, color, alpha * 4);
      boundsLayer.beginFill(color, alpha);
      boundsLayer.drawCircle(c.cx, c.cy, MAX_KIT_RADIUS);
      boundsLayer.endFill();
      boundsLayer.lineStyle(0);
    }
    worldStage.addChild(boundsLayer);

    // ── LOD toggle ────────────────────────────────────────────────────────────
    const applyLOD = (nZoom: number) => {
      normalizedZoomRef.current = nZoom;
      const showClusters = nZoom >= LOD_ZOOM_THRESHOLD;
      dotsLayer.visible = !showClusters;
      starsLayer.visible = showClusters;
      boundsLayer.visible = showClusters;
    };
    applyLOD(1.0);

    // ── FPS ticker ────────────────────────────────────────────────────────────
    let fpsWindow: number[] = [];
    let fpsLogCount = 0;
    const fpsTicker = () => {
      fpsWindow.push(app.ticker.FPS);
      if (fpsWindow.length >= 300) {
        fpsLogCount++;
        const sorted = [...fpsWindow].sort((a, b) => a - b);
        const p5 = sorted[Math.floor(sorted.length * 0.05)];
        const median = sorted[Math.floor(sorted.length / 2)];
        const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;
        if (fpsLogCount <= 5) {
          console.info(
            `[TwoLayer P3] FPS window ${fpsLogCount} — ` +
            `p5=${p5.toFixed(1)} median=${median.toFixed(1)} mean=${mean.toFixed(1)} ` +
            `(nZoom=${normalizedZoomRef.current.toFixed(2)})`
          );
        }
        fpsWindow = fpsWindow.slice(-10);
      }
    };
    app.ticker.add(fpsTicker);

    // ── Highlight layer ───────────────────────────────────────────────────────
    const highlightLayer = new PIXI.Graphics();
    worldStage.addChild(highlightLayer);

    const highlightKit = (kitId: string | null) => {
      highlightLayer.clear();
      if (!kitId) return;
      const c = centroidByKitId.get(kitId);
      if (!c) return;
      const color = elementColor(c.element);
      highlightLayer.lineStyle(1.5, color, 0.70);
      highlightLayer.beginFill(color, 0.05);
      highlightLayer.drawCircle(c.cx, c.cy, MAX_KIT_RADIUS + 8);
      highlightLayer.endFill();
      highlightLayer.lineStyle(0);
    };

    // ── Lasso layer (screen-space) ────────────────────────────────────────────
    const lassoGraphics = new PIXI.Graphics();
    app.stage.addChild(lassoGraphics);

    // ── Watermark ─────────────────────────────────────────────────────────────
    const wmStyle = new PIXI.TextStyle({
      fontFamily: 'ui-monospace, monospace',
      fontSize: 9,
      fill: 0x223344,
      letterSpacing: 1.5,
    });
    const wm = new PIXI.Text(
      `TWO-LAYER · PHASE 3 · ${layoutData.centroids.length} KITS · ALL PROVISIONAL`,
      wmStyle
    );
    wm.x = containerW - wm.width - 12;
    wm.y = 10;
    wm.alpha = 0.60;
    app.stage.addChild(wm);

    // ── Hint ──────────────────────────────────────────────────────────────────
    const hintStyle = new PIXI.TextStyle({ fontFamily: 'ui-monospace, monospace', fontSize: 9, fill: 0x334455, letterSpacing: 0.3 });
    const hint = new PIXI.Text(
      'Phase 3 — two-layer + buffer-space · scroll to zoom · lasso at 2× zoom · nebula = element anchor · dot = kit',
      hintStyle
    );
    hint.x = 12;
    hint.y = 12;
    hint.alpha = 0.50;
    app.stage.addChild(hint);

    // ── Lasso state ───────────────────────────────────────────────────────────
    let lassoVertices: Array<{ x: number; y: number }> = [];
    let lassoActive = false;

    // Screen-to-world coordinate transform
    const screenToWorld = (sx: number, sy: number) => ({
      wx: (sx - worldStage.position.x) / worldStage.scale.x,
      wy: (sy - worldStage.position.y) / worldStage.scale.y,
    });

    const drawLasso = () => {
      lassoGraphics.clear();
      if (lassoVertices.length < 2) return;
      // Color the lasso based on mode hint (classified after release; use neutral while drawing)
      lassoGraphics.lineStyle(1.0, 0x88AAFF, 0.75);
      lassoGraphics.moveTo(lassoVertices[0].x, lassoVertices[0].y);
      for (let i = 1; i < lassoVertices.length; i++) {
        lassoGraphics.lineTo(lassoVertices[i].x, lassoVertices[i].y);
      }
      lassoGraphics.lineTo(lassoVertices[0].x, lassoVertices[0].y);
    };

    // Two-layer lasso resolution
    const resolveTwoLayerLasso = (screenVerts: Array<{ x: number; y: number }>) => {
      if (screenVerts.length < 3) return;

      // Transform to world space
      const worldVerts = screenVerts.map(v => {
        const { wx, wy } = screenToWorld(v.x, v.y);
        return { x: wx, y: wy };
      });

      // Classify lasso mode (criterion 5+6 semantic mode from scale+position)
      const lassoMode = classifyLasso(worldVerts, layoutData.anchors);

      // Viewport cull
      const visWorldLeft   = (0 - worldStage.position.x) / worldStage.scale.x;
      const visWorldTop    = (0 - worldStage.position.y) / worldStage.scale.y;
      const visWorldRight  = (containerW - worldStage.position.x) / worldStage.scale.x;
      const visWorldBottom = (containerH - worldStage.position.y) / worldStage.scale.y;
      const buf = MAX_KIT_RADIUS + 20;

      const capturedNodeIds = new Set<string>();
      for (const node of allStarNodes) {
        if (node.x < visWorldLeft - buf || node.x > visWorldRight + buf) continue;
        if (node.y < visWorldTop - buf || node.y > visWorldBottom + buf) continue;
        if (pointInPolygon(node.x, node.y, worldVerts)) {
          capturedNodeIds.add(node.nodeId);
        }
      }

      // Dedupe to unique primitive_ids
      const uniquePrimitiveIds = new Set<string>();
      for (const nodeId of capturedNodeIds) {
        const colonIdx = nodeId.indexOf(':');
        if (colonIdx > 0) uniquePrimitiveIds.add(nodeId.slice(colonIdx + 1));
      }

      if (uniquePrimitiveIds.size === 0) {
        onLassoResultRef.current({
          lassoPrimitiveIds: new Set(),
          matches: [],
          emptyLasso: true,
          ambiguous: false,
          noBestMatch: false,
        }, lassoMode);
        setLastLassoMode(lassoMode);
        return;
      }

      const result = scoreKitsByPrimitiveSet(
        uniquePrimitiveIds,
        data.kits,
        data.primitiveById,
        3,
      );

      console.info(
        `[TwoLayer P3] Lasso resolved (${lassoMode}) — ` +
        `${capturedNodeIds.size} nodes → ${uniquePrimitiveIds.size} unique prims → ` +
        `${result.matches.length} matches (top: ${result.matches[0]?.composite_score.toFixed(3) ?? 'none'})`
      );

      if (result.matches.length > 0) {
        highlightKit(result.matches[0].kit.kit_id);
      }
      onLassoResultRef.current(result, lassoMode);
      setLastLassoMode(lassoMode);
    };

    // ── Pointer events (mouse + touch) ────────────────────────────────────────
    let pointerDownX = 0, pointerDownY = 0;
    let panLastX = 0, panLastY = 0;
    let isDragging = false, isPanning = false;

    const getContainerPos = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      return { cx: e.clientX - rect.left, cy: e.clientY - rect.top };
    };

    const onPointerDown = (e: PointerEvent) => {
      const { cx, cy } = getContainerPos(e);
      pointerDownX = cx; pointerDownY = cy;
      panLastX = cx; panLastY = cy;
      isDragging = false; isPanning = false;
      if (modeRef.current === 'lasso' && normalizedZoomRef.current >= LOD_ZOOM_THRESHOLD) {
        lassoVertices = [{ x: cx, y: cy }];
        lassoActive = true;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.buttons === 0) return;
      const { cx, cy } = getContainerPos(e);
      const dx = cx - pointerDownX, dy = cy - pointerDownY;
      if (!isDragging && Math.sqrt(dx * dx + dy * dy) >= MIN_CLICK_PX) {
        isDragging = true;
        if (modeRef.current === 'pointer') isPanning = true;
      }
      if (isPanning) {
        worldStage.position.x += cx - panLastX;
        worldStage.position.y += cy - panLastY;
        panLastX = cx; panLastY = cy;
      }
      if (lassoActive && modeRef.current === 'lasso') {
        lassoVertices.push({ x: cx, y: cy });
        drawLasso();
      }
    };

    const onPointerUp = (_e: PointerEvent) => {
      const wasPanning = isPanning;
      isPanning = false;
      if (modeRef.current === 'lasso' && lassoActive) {
        lassoActive = false;
        const verts = [...lassoVertices];
        lassoVertices = [];
        resolveTwoLayerLasso(verts);
        return;
      }
      if (isDragging || wasPanning) { isDragging = false; return; }
      isDragging = false;
    };

    container.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);

    // ── Scroll zoom ────────────────────────────────────────────────────────────
    const ZOOM_MIN = 0.5;
    const ZOOM_MAX = 20.0;
    const ZOOM_FACTOR = 0.0012;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const oldScale = worldStage.scale.x;
      const newScale = Math.min(
        ZOOM_MAX * initialScale,
        Math.max(ZOOM_MIN * initialScale, oldScale * (1 - event.deltaY * ZOOM_FACTOR))
      );
      if (newScale === oldScale) return;

      const bounds = container.getBoundingClientRect();
      const cursorX = event.clientX - bounds.left;
      const cursorY = event.clientY - bounds.top;
      const ratio = newScale / oldScale;
      worldStage.position.x = cursorX - (cursorX - worldStage.position.x) * ratio;
      worldStage.position.y = cursorY - (cursorY - worldStage.position.y) * ratio;
      worldStage.scale.set(newScale);
      applyLOD(newScale / initialScale);
    };
    container.addEventListener('wheel', onWheel, { passive: false });

    // ── Touch pinch zoom (mobile) ──────────────────────────────────────────────
    let lastTouchDist = 0;
    let lastTouchMidX = 0, lastTouchMidY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0], t2 = e.touches[1];
        lastTouchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        lastTouchMidX = (t1.clientX + t2.clientX) / 2;
        lastTouchMidY = (t1.clientY + t2.clientY) / 2;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0], t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;

        if (lastTouchDist > 0) {
          const scaleFactor = dist / lastTouchDist;
          const oldScale = worldStage.scale.x;
          const newScale = Math.min(ZOOM_MAX * initialScale, Math.max(ZOOM_MIN * initialScale, oldScale * scaleFactor));

          const bounds = container.getBoundingClientRect();
          const cursorX = midX - bounds.left;
          const cursorY = midY - bounds.top;
          const ratio = newScale / oldScale;
          worldStage.position.x = cursorX - (cursorX - worldStage.position.x) * ratio;
          worldStage.position.y = cursorY - (cursorY - worldStage.position.y) * ratio;
          worldStage.scale.set(newScale);
          applyLOD(newScale / initialScale);
        }

        // Pan with pinch midpoint drift
        worldStage.position.x += midX - lastTouchMidX;
        worldStage.position.y += midY - lastTouchMidY;

        lastTouchDist = dist;
        lastTouchMidX = midX;
        lastTouchMidY = midY;
      }
    };

    const onTouchEnd = (_e: TouchEvent) => {
      lastTouchDist = 0;
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);

    // ── Clear lasso ref ────────────────────────────────────────────────────────
    if (clearLassoRef) {
      clearLassoRef.current = () => {
        lassoGraphics.clear();
        lassoVertices = []; lassoActive = false;
        highlightLayer.clear();
        onLassoResultRef.current(null, 'clear');
      };
    }

    console.info(
      `[TwoLayer P3] Rendered — ` +
      `${layoutData.anchors.length} element anchors (Layer 1) · ` +
      `${layoutData.centroids.length} kit centroids (Layer 2) · ` +
      `world ${worldW}×${worldH}px · initialScale=${initialScale.toFixed(4)}`
    );

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      app.ticker.remove(fpsTicker);
      app.destroy(true, { children: true, texture: true, baseTexture: true });
      appRef.current = null;
    };
  }, [data, layoutData, constellationLayoutData]);

  return (
    <div className="relative w-full h-full">
      {/* Interaction mode toolbar */}
      <div
        className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded border border-gray-700/60 bg-gray-900/90 px-2 py-1.5 backdrop-blur-sm"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Mode toggle */}
        <button
          onClick={() => handleModeToggle('pointer')}
          title="Pointer mode: drag to pan, scroll to zoom, pinch on touch"
          className={
            'flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono transition-colors ' +
            (interactionMode === 'pointer'
              ? 'bg-indigo-700/80 text-indigo-100'
              : 'text-gray-500 hover:text-gray-300')
          }
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
            <polygon points="1,1 1,9 4,6 6,9 7,8.5 5,5.5 8,5" />
          </svg>
          pan
        </button>
        <button
          onClick={() => handleModeToggle('lasso')}
          title="Lasso mode: zoom in to 2× then drag to select. Tight lasso = related kits. Wide cross-buffer = unusual combinations."
          className={
            'flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono transition-colors ' +
            (interactionMode === 'lasso'
              ? 'bg-indigo-700/80 text-indigo-100'
              : 'text-gray-500 hover:text-gray-300')
          }
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <ellipse cx="5" cy="4.5" rx="3.5" ry="3" />
            <line x1="5" y1="7.5" x2="5" y2="9.5" />
          </svg>
          lasso
        </button>

        {/* Lasso mode hint */}
        {interactionMode === 'lasso' && (
          <span className="text-[9px] text-gray-600 font-mono ml-0.5">
            (zoom 2×+ to activate)
          </span>
        )}

        {/* Last lasso mode indicator */}
        {lastLassoMode && interactionMode === 'lasso' && (
          <span className={
            'text-[9px] font-mono px-1 py-0.5 rounded ' +
            (lastLassoMode === 'within-anchor'
              ? 'bg-indigo-900/60 text-indigo-300'
              : lastLassoMode === 'cross-buffer'
              ? 'bg-amber-900/60 text-amber-300'
              : 'bg-purple-900/60 text-purple-300')
          }>
            {lastLassoMode === 'within-anchor' ? 'within-anchor' :
             lastLassoMode === 'cross-buffer' ? 'cross-buffer' :
             'buffer-only'}
          </span>
        )}
      </div>

      {/* Legend: zone types */}
      <div
        className="absolute bottom-3 left-3 z-10 flex flex-col gap-1 rounded border border-gray-800/60 bg-gray-900/85 px-2.5 py-2 backdrop-blur-sm text-[9px] font-mono text-gray-500"
        style={{ pointerEvents: 'none' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 opacity-70 flex-shrink-0" />
          <span>Nebula = element anchor (Layer 1)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 opacity-70 flex-shrink-0" />
          <span>Dot = kit cluster (Layer 2, primary zone)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 opacity-70 flex-shrink-0" />
          <span className="text-purple-400/80">Dual-dot = hybrid kit (buffer zone, discoverable)</span>
        </div>
        <div className="text-gray-700 mt-0.5">Empty space between nebulas = buffer territory</div>
      </div>

      {/* Pixi canvas container */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ cursor: interactionMode === 'lasso' ? 'crosshair' : 'grab', touchAction: 'none' }}
      />
    </div>
  );
}
