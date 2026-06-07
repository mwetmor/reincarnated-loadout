/**
 * ConstellationModeCanvas.tsx — Mode B (kit-as-bounded-constellation) rendering.
 *
 * Phase 2 — drax 2026-06-07, per dispatch § 4.
 * Scales Phase 1 (10-kit sample) to full 1000-kit corpus using pre-computed layout.
 *
 * Phase 2 architecture:
 * - Layout loaded from constellation_layout.json (Python pre-computed at build time).
 *   Gandalf-endorsed over Web Worker for full corpus (Phase 1 scale finding).
 * - World space: 9000×7000 px (logical canvas from layout.meta.world_w/h).
 * - Initial stage scale: fit-to-container (min of containerW/worldW, containerH/worldH).
 * - LOD: normalizedZoom = stage.scale.x / initialScale
 *     < 2.0 → dotsLayer only (1000 centroid dots, fast)
 *     ≥ 2.0 → starsLayer + boundsLayer (full constellation clusters)
 * - Lasso (star mode only):
 *     Lasso vertices captured in screen space → transformed to world space.
 *     Viewport-cull: only test nodes within visible world region + constellation buffer.
 *     Dedupe to unique primitive_ids → scoreKitsByPrimitiveSet (Phase 2 scoring fix).
 *
 * UMAP caveat (Gate-1 Finding 4 REFUTED per Phase 1):
 * UMAP centroid_x/y is degenerate for Mode B — all 1000 kit centroids span 43×56 px.
 * Layout uses element-sorted grid placement instead. See constellation_layout.json meta.
 * TODO(drax): replace grid layout with engine kit-to-kit similarity embedding when available.
 *
 * Substrate-coverage caveat (Phase 1 § 9 / dispatch § 8 Q1):
 * Phase 2 GREEN = RENDERING-UNIT READABILITY at full corpus. Does NOT validate
 * PROVISIONAL constellation primitive-coherence (Move B simulated kits, never
 * Pareto-balanced). Substrate validation defers to Phase B (real cycle 15+ kits).
 *
 * Phase A (Mode A, primitive-galaxy) preserved unchanged at ?view=primitive.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';
import type { CosmographData } from '../../data/cosmographData';
import type { ConstellationLayoutData, ConstellationLayoutNode } from '../../data/cosmographTypes';
import { scoreKitsByPrimitiveSet } from '../../utils/lassoResolution';
import type { LassoResolutionResult } from '../../utils/lassoResolution';

// ─── Constants ────────────────────────────────────────────────────────────────

/** LOD zoom threshold: below this, show dots; at or above, show full clusters */
const LOD_ZOOM_THRESHOLD = 2.0;

// ─── Element colors (shared with Mode A palette) ──────────────────────────────

const ELEMENT_COLORS: Record<string, number> = {
  fire:      0xE85520,
  water:     0x2299DD,
  earth:     0xA07040,
  wind:      0x88CC88,
  lightning: 0xAA66EE,
  holy:      0xDDAA33,
  shadow:    0x7744AA,
  physical:  0x8899AA,
};
const DEX_COLOR    = 0x44DDCC;
const NEUTRAL_COLOR = 0xCCDDEE;

function elementColor(element: string): number {
  return ELEMENT_COLORS[element] ?? NEUTRAL_COLOR;
}

function getNodeColorFromIds(
  primitiveId: string,
  primitiveFamily: string,
  elementCouplingJson: string,
  attributeCouplingJson: string,
): number {
  if (primitiveFamily === 'element') {
    return ELEMENT_COLORS[primitiveId.replace('element_', '')] ?? NEUTRAL_COLOR;
  }
  try {
    const ec = JSON.parse(elementCouplingJson) as string[];
    if (ec.length > 0) return ELEMENT_COLORS[ec[0]] ?? NEUTRAL_COLOR;
  } catch { /* skip */ }
  try {
    const ac = JSON.parse(attributeCouplingJson) as string[];
    if (ac.includes('DEX')) return DEX_COLOR;
    if (ac.includes('STR')) return ELEMENT_COLORS['physical'];
  } catch { /* skip */ }
  return NEUTRAL_COLOR;
}

function drawStar(g: PIXI.Graphics, x: number, y: number, radius: number, color: number, alpha: number): void {
  g.beginFill(color, alpha * 0.10);
  g.drawCircle(x, y, radius * 2.0);
  g.endFill();
  g.beginFill(color, alpha * 0.25);
  g.drawCircle(x, y, radius * 1.35);
  g.endFill();
  g.beginFill(color, alpha);
  g.drawCircle(x, y, radius);
  g.endFill();
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

// ─── Props ────────────────────────────────────────────────────────────────────

const MIN_CLICK_PX = 6;

interface ConstellationModeCanvasProps {
  data: CosmographData;
  layoutData: ConstellationLayoutData;
  onLassoResult: (result: LassoResolutionResult | null) => void;
  clearLassoRef?: React.MutableRefObject<(() => void) | null>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ConstellationModeCanvas({
  data,
  layoutData,
  onLassoResult,
  clearLassoRef,
}: ConstellationModeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const [interactionMode, setInteractionMode] = useState<'pointer' | 'lasso'>('pointer');
  const modeRef = useRef<'pointer' | 'lasso'>('pointer');
  const onLassoResultRef = useRef(onLassoResult);
  onLassoResultRef.current = onLassoResult;
  // LOD zoom state — used by lasso to know if stars are visible
  const normalizedZoomRef = useRef(1.0);

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
    const MAX_RADIUS = layoutData.meta.max_constellation_radius;

    // Fit-to-container scale
    const initialScale = Math.min(containerW / worldW, containerH / worldH);

    // Build primitive lookup for node coloring
    const primById = data.primitiveById;

    // Build centroid lookup
    const centroidByKitId = new Map<string, { cx: number; cy: number; element: string; attribute: string }>();
    for (const c of layoutData.centroids) {
      centroidByKitId.set(c.kit_id, { cx: c.cx, cy: c.cy, element: c.element, attribute: c.attribute });
    }

    // Collect first-class instance nodes (visibility_at_default_zoom=true) for lasso + rendering
    // Format: { nodeId, kit_id, primitive_id, x, y, visibility }
    interface RenderNode {
      nodeId: string;
      kit_id: string;
      primitive_id: string;
      x: number;
      y: number;
      visible: boolean;
    }
    const allNodes: RenderNode[] = [];
    for (const [kit_id, nodes] of Object.entries(layoutData.clusters)) {
      for (const node of nodes as ConstellationLayoutNode[]) {
        const prim = primById.get(node.p);
        allNodes.push({
          nodeId: `${kit_id}:${node.p}`,
          kit_id,
          primitive_id: node.p,
          x: node.x,
          y: node.y,
          visible: prim?.visibility_at_default_zoom ?? false,
        });
      }
    }
    const firstClassNodes = allNodes.filter(n => n.visible);
    console.info(
      `[ConstellationMode P2] Layout loaded — ` +
      `${layoutData.centroids.length} constellations · ` +
      `${allNodes.length} total instance nodes · ` +
      `${firstClassNodes.length} first-class visible`
    );

    // ── Pixi.js application ──────────────────────────────────────────────────
    const app = new PIXI.Application({
      width: containerW,
      height: containerH,
      backgroundColor: 0x020408,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    appRef.current = app;
    container.appendChild(app.view as HTMLCanvasElement);

    // Stage pan/zoom root — world coordinates
    const worldStage = new PIXI.Container();
    app.stage.addChild(worldStage);
    worldStage.scale.set(initialScale);
    // Center the world in the container
    worldStage.position.x = (containerW - worldW * initialScale) / 2;
    worldStage.position.y = (containerH - worldH * initialScale) / 2;

    // ── Background ──────────────────────────────────────────────────────────
    const bg = new PIXI.Graphics();
    bg.beginFill(0x020408, 1.0);
    bg.drawRect(0, 0, worldW, worldH);
    bg.endFill();
    worldStage.addChild(bg);

    // ── Dots layer (LOD: zoom < 2.0) — 1000 centroid dots ───────────────────
    const dotsLayer = new PIXI.Graphics();
    for (const c of layoutData.centroids) {
      const color = elementColor(c.element);
      // Outer soft glow
      dotsLayer.beginFill(color, 0.12);
      dotsLayer.drawCircle(c.cx, c.cy, 6);
      dotsLayer.endFill();
      // Inner dot
      dotsLayer.beginFill(color, 0.70);
      dotsLayer.drawCircle(c.cx, c.cy, 3.5);
      dotsLayer.endFill();
    }
    worldStage.addChild(dotsLayer);

    // ── Bounds layer (LOD: zoom >= 2.0) — constellation bounding rings ───────
    const boundsLayer = new PIXI.Graphics();
    boundsLayer.visible = false;
    for (const c of layoutData.centroids) {
      const color = elementColor(c.element);
      boundsLayer.lineStyle(0.6, color, 0.09);
      boundsLayer.beginFill(color, 0.012);
      boundsLayer.drawCircle(c.cx, c.cy, MAX_RADIUS);
      boundsLayer.endFill();
      boundsLayer.lineStyle(0);
    }
    worldStage.addChild(boundsLayer);

    // ── Stars layer (LOD: zoom >= 2.0) — full constellation clusters ─────────
    // Pre-draw all first-class instance nodes once at mount.
    // Pixi.js WebGL renders static Graphics efficiently; no per-frame updates needed.
    const t0 = performance.now();
    const starsLayer = new PIXI.Graphics();
    starsLayer.visible = false;

    for (const node of firstClassNodes) {
      const prim = primById.get(node.primitive_id);
      if (!prim) continue;
      const color = getNodeColorFromIds(
        node.primitive_id,
        prim.primitive_family,
        prim.element_coupling_json,
        prim.attribute_coupling_json,
      );
      const radius = prim.bdi_weight >= 0.85 ? 3.0 : prim.bdi_weight >= 0.70 ? 2.5 : 1.8;
      const alpha = 0.30 + 0.65 * prim.bdi_weight;
      drawStar(starsLayer, node.x, node.y, radius, color, alpha);
    }

    worldStage.addChild(starsLayer);
    const drawMs = performance.now() - t0;
    console.info(`[ConstellationMode P2] Stars pre-drawn in ${drawMs.toFixed(1)}ms — ${firstClassNodes.length} first-class nodes`);

    // ── Centroid dot labels (LOD: zoom >= 2.0) ───────────────────────────────
    // Small element·attr label at each centroid for orientation (same as Phase 1)
    const labelsContainer = new PIXI.Container();
    labelsContainer.visible = false;
    const labelStyle = new PIXI.TextStyle({
      fontFamily: 'ui-monospace, monospace',
      fontSize: 8,
      fill: 0x8899BB,
      align: 'center',
      letterSpacing: 0.4,
    });
    for (const c of layoutData.centroids) {
      const label = new PIXI.Text(`${c.element}·${c.attribute}`, labelStyle);
      label.x = c.cx - label.width / 2;
      label.y = c.cy + MAX_RADIUS + 3;
      label.alpha = 0.50;
      labelsContainer.addChild(label);
      // Centroid dot (small, inside the constellation)
      const dot = new PIXI.Graphics();
      dot.beginFill(elementColor(c.element), 0.4);
      dot.drawCircle(c.cx, c.cy, 2.0);
      dot.endFill();
      labelsContainer.addChild(dot);
    }
    worldStage.addChild(labelsContainer);

    // ── Lasso layer ──────────────────────────────────────────────────────────
    const lassoGraphics = new PIXI.Graphics();
    app.stage.addChild(lassoGraphics);   // screen space — NOT worldStage

    // ── Highlight layer ──────────────────────────────────────────────────────
    const highlightLayer = new PIXI.Graphics();
    worldStage.addChild(highlightLayer);

    const highlightKit = (kitId: string | null) => {
      highlightLayer.clear();
      if (!kitId) return;
      const c = centroidByKitId.get(kitId);
      if (!c) return;
      const color = elementColor(c.element);
      highlightLayer.lineStyle(1.5, color, 0.65);
      highlightLayer.beginFill(color, 0.04);
      highlightLayer.drawCircle(c.cx, c.cy, MAX_RADIUS);
      highlightLayer.endFill();
      highlightLayer.lineStyle(0);
    };

    // ── Watermark ────────────────────────────────────────────────────────────
    const wmStyle = new PIXI.TextStyle({
      fontFamily: 'ui-monospace, monospace',
      fontSize: 9,
      fill: 0x333355,
      letterSpacing: 1.5,
    });
    const wm = new PIXI.Text(
      `CONSTELLATION MODE · PHASE 2 · ${layoutData.centroids.length} KITS · ALL PROVISIONAL`,
      wmStyle
    );
    wm.x = containerW - wm.width - 12;
    wm.y = 10;
    wm.alpha = 0.50;
    app.stage.addChild(wm);

    // ── LOD hint ─────────────────────────────────────────────────────────────
    const hintStyle = new PIXI.TextStyle({ fontFamily: 'ui-monospace, monospace', fontSize: 9, fill: 0x445566, letterSpacing: 0.3 });
    const hint = new PIXI.Text('Mode B — kit-as-constellation · scroll to zoom · lasso visible at 2× zoom', hintStyle);
    hint.x = 12;
    hint.y = 12;
    hint.alpha = 0.45;
    app.stage.addChild(hint);

    // ── LOD toggle helper ─────────────────────────────────────────────────────
    const applyLOD = (nZoom: number) => {
      normalizedZoomRef.current = nZoom;
      const showClusters = nZoom >= LOD_ZOOM_THRESHOLD;
      dotsLayer.visible = !showClusters;
      starsLayer.visible = showClusters;
      boundsLayer.visible = showClusters;
      labelsContainer.visible = showClusters;
    };
    applyLOD(1.0);

    // ── FPS ticker ───────────────────────────────────────────────────────────
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
            `[ConstellationMode P2] FPS window ${fpsLogCount} — ` +
            `p5=${p5.toFixed(1)} median=${median.toFixed(1)} mean=${mean.toFixed(1)} ` +
            `(nZoom=${normalizedZoomRef.current.toFixed(2)})`
          );
        }
        fpsWindow = fpsWindow.slice(-10);
      }
    };
    app.ticker.add(fpsTicker);

    // ── Lasso state ───────────────────────────────────────────────────────────
    let lassoVertices: Array<{ x: number; y: number }> = [];
    let lassoActive = false;

    const drawLasso = () => {
      lassoGraphics.clear();
      if (lassoVertices.length < 2) return;
      lassoGraphics.lineStyle(1.0, 0x88AAFF, 0.7);
      lassoGraphics.moveTo(lassoVertices[0].x, lassoVertices[0].y);
      for (let i = 1; i < lassoVertices.length; i++) {
        lassoGraphics.lineTo(lassoVertices[i].x, lassoVertices[i].y);
      }
      lassoGraphics.lineTo(lassoVertices[0].x, lassoVertices[0].y);
    };

    // ── Transform screen coords → world coords ────────────────────────────────
    const screenToWorld = (sx: number, sy: number): { wx: number; wy: number } => ({
      wx: (sx - worldStage.position.x) / worldStage.scale.x,
      wy: (sy - worldStage.position.y) / worldStage.scale.y,
    });

    // ── Mode B lasso resolution ───────────────────────────────────────────────
    const resolveModeBLasso = (screenVerts: Array<{ x: number; y: number }>) => {
      if (screenVerts.length < 3) return;

      // Transform lasso vertices to world space
      const worldVerts = screenVerts.map(v => {
        const { wx, wy } = screenToWorld(v.x, v.y);
        return { x: wx, y: wy };
      });

      // Viewport-cull: only test nodes within the visible world region + buffer
      const visWorldLeft   = (0 - worldStage.position.x) / worldStage.scale.x;
      const visWorldTop    = (0 - worldStage.position.y) / worldStage.scale.y;
      const visWorldRight  = (containerW - worldStage.position.x) / worldStage.scale.x;
      const visWorldBottom = (containerH - worldStage.position.y) / worldStage.scale.y;
      const buf = MAX_RADIUS + 20;

      const capturedKitNodeIds = new Set<string>();
      for (const node of firstClassNodes) {
        // Viewport cull
        if (node.x < visWorldLeft - buf || node.x > visWorldRight + buf) continue;
        if (node.y < visWorldTop - buf || node.y > visWorldBottom + buf) continue;
        // Point-in-polygon test (world space)
        if (pointInPolygon(node.x, node.y, worldVerts)) {
          capturedKitNodeIds.add(node.nodeId);
        }
      }

      // Dedupe to unique primitive_ids (Gate-1 Finding 2 INFO):
      // kit_001:fire + kit_002:fire → one 'fire' vote
      const uniquePrimitiveIds = new Set<string>();
      for (const nodeId of capturedKitNodeIds) {
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
        });
        return;
      }

      // Score all 1000 kits against deduped primitive set (Phase 2 fix: uses correct world-space
      // detection, not Mode A embedding_x/y. scoreKitsByPrimitiveSet extracts scoring from resolveLasso).
      const result = scoreKitsByPrimitiveSet(
        uniquePrimitiveIds,
        data.kits,
        data.primitiveById,
        3,
      );

      console.info(
        `[ConstellationMode P2] Lasso resolved — ` +
        `${capturedKitNodeIds.size} instance nodes → ${uniquePrimitiveIds.size} unique prims → ` +
        `${result.matches.length} matches (top: ${result.matches[0]?.composite_score.toFixed(3) ?? 'none'})`
      );

      if (result.matches.length > 0) {
        highlightKit(result.matches[0].kit.kit_id);
      }
      onLassoResultRef.current(result);
    };

    // ── Native pointer events ─────────────────────────────────────────────────
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
        resolveModeBLasso(verts);
        return;
      }
      if (isDragging || wasPanning) { isDragging = false; return; }
      isDragging = false;
    };

    container.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);

    // ── Scroll zoom with LOD switch ────────────────────────────────────────────
    const ZOOM_MIN = 0.5;
    const ZOOM_MAX = 20.0;
    const ZOOM_FACTOR = 0.0012;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const oldScale = worldStage.scale.x;
      const newScale = Math.min(ZOOM_MAX * initialScale, Math.max(ZOOM_MIN * initialScale, oldScale * (1 - event.deltaY * ZOOM_FACTOR)));
      if (newScale === oldScale) return;

      const bounds = container.getBoundingClientRect();
      const cursorX = event.clientX - bounds.left;
      const cursorY = event.clientY - bounds.top;
      const ratio = newScale / oldScale;
      worldStage.position.x = cursorX - (cursorX - worldStage.position.x) * ratio;
      worldStage.position.y = cursorY - (cursorY - worldStage.position.y) * ratio;
      worldStage.scale.set(newScale);

      // LOD switch
      const nZoom = newScale / initialScale;
      applyLOD(nZoom);
    };
    container.addEventListener('wheel', onWheel, { passive: false });

    // ── Clear lasso ref ────────────────────────────────────────────────────────
    if (clearLassoRef) {
      clearLassoRef.current = () => {
        lassoGraphics.clear();
        lassoVertices = []; lassoActive = false;
        highlightLayer.clear();
        onLassoResultRef.current(null);
      };
    }

    console.info(
      `[ConstellationMode P2] Rendered — ` +
      `${layoutData.centroids.length} constellation dots (LOD 1.0×) · ` +
      `${firstClassNodes.length} first-class stars (LOD 2.0×+) · ` +
      `world ${worldW}×${worldH} px · initialScale=${initialScale.toFixed(4)}`
    );

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('wheel', onWheel);
      app.ticker.remove(fpsTicker);
      app.destroy(true, { children: true, texture: true, baseTexture: true });
      appRef.current = null;
    };
  }, [data, layoutData]);

  return (
    <div className="relative w-full h-full">
      {/* Interaction mode toolbar */}
      <div
        className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded border border-gray-700/60 bg-gray-900/85 px-1.5 py-1 backdrop-blur-sm"
        style={{ pointerEvents: 'auto' }}
      >
        <button
          onClick={() => handleModeToggle('pointer')}
          title="Pointer mode: drag to pan, scroll to zoom"
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
          pointer
        </button>
        <button
          onClick={() => handleModeToggle('lasso')}
          title="Lasso mode: zoom in to 2× then drag to select constellation"
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
        {interactionMode === 'lasso' && (
          <span className="text-[9px] text-gray-600 font-mono ml-0.5">
            (2×+ zoom to activate)
          </span>
        )}
      </div>

      {/* Pixi canvas container */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ cursor: interactionMode === 'lasso' ? 'crosshair' : 'grab' }}
      />
    </div>
  );
}
