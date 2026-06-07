/**
 * ConstellationModeCanvas.tsx — Mode B (kit-as-bounded-constellation) rendering.
 *
 * A/B spike Phase 1 — drax 2026-06-07, per dispatch § 3.2-3.4.
 *
 * Mode B architecture (per cosmograph-pivot § 9, dispatch § 2.1):
 * - Each kit renders as a BOUNDED LOCAL CLUSTER of per-kit primitive instances.
 * - Kit_001:fire and Kit_002:fire are separate per-kit copies of the same fire primitive.
 * - Constellation centroids are placed via force-directed inter-kit layout (NOT UMAP positions).
 *   NOTE: UMAP centroid_x/y is degenerate for Mode B — all 1000 kit centroids span 43×56 px,
 *   which is smaller than one MAX_CONSTELLATION_RADIUS. Inter-constellation layout uses a
 *   shared-primitive-fraction spring-embedder instead.
 * - Intra-constellation: per-kit stars arranged within MAX_CONSTELLATION_RADIUS via force layout.
 * - No edges rendered at Phase 1 baseline (per dispatch § 2.4 lean-(ii)).
 * - Centroid-attraction observation: UMAP seeds are NOT used as Mode B centroid seeds.
 *   See TODO(drax) in constellationModeLayout.ts for the engine-gap this compensates for.
 *
 * Sample cohort selection (Phase 1, 10 kits per dispatch § 3.1):
 * - kit_bc_cell_0014_simulated — fire, INT, 37 prims (cross-element rep 1)
 * - kit_bc_cell_0094_simulated — fire, INT, 34 prims (cross-element rep 2)
 * - kit_bc_cell_0032_simulated — water, INT, 30 prims (cross-element rep 3)
 * - kit_bc_cell_0177_simulated — water, INT, 36 prims (cross-element rep 4)
 * - kit_bc_cell_0001_simulated — physical/STR/hybrid, 40 prims (hybrid kit 1)
 * - kit_bc_cell_0020_simulated — physical/STR/hybrid, 38 prims (hybrid kit 2)
 * - kit_bc_cell_0000_simulated — physical, STR, 34 prims (attribute-group STR rep)
 * - kit_bc_cell_0002_simulated — wind, WIS, 36 prims (attribute-group WIS rep)
 * - kit_bc_cell_0150_simulated — physical, STR, 27 prims (small primitive count)
 * - kit_bc_cell_0096_simulated — water/hybrid, INT, 43 prims (large primitive count)
 *
 * Lasso in Mode B:
 * - Lasso polygon captures per-kit instance nodes within it
 * - Deduped to unique primitive_ids BEFORE composite-score (Gate-1 Finding 2 INFO)
 * - Side panel shows matched kit(s) from the deduped resolution
 *
 * Framing audit per § 8 Q1 amendment:
 * - GREEN verdict = RENDERING-UNIT READABILITY only
 * - Does NOT validate PROVISIONAL constellation primitive-coherence
 * - Substrate-coverage validation OUT OF SCOPE for this spike
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';
import type { CosmographData } from '../../data/cosmographData';
import type { KitConstellation } from '../../data/cosmographTypes';
import {
  computeConstellationModeLayout,
  dedupeInstanceNodes,
  MAX_CONSTELLATION_RADIUS,
  type InstanceNode,
  type ConstellationCentroidPos,
} from '../../utils/constellationModeLayout';
import { resolveLasso } from '../../utils/lassoResolution';
import type { LassoResolutionResult } from '../../utils/lassoResolution';

// ─── Phase 1 sample cohort ────────────────────────────────────────────────────

const PHASE1_SAMPLE_KIT_IDS = new Set([
  'kit_bc_cell_0014_simulated',  // fire, INT, 37 — cross-element pair fire-1
  'kit_bc_cell_0094_simulated',  // fire, INT, 34 — cross-element pair fire-2
  'kit_bc_cell_0032_simulated',  // water, INT, 30 — cross-element pair water-1
  'kit_bc_cell_0177_simulated',  // water, INT, 36 — cross-element pair water-2
  'kit_bc_cell_0001_simulated',  // physical/STR/hybrid, 40 — hybrid-1
  'kit_bc_cell_0020_simulated',  // physical/STR/hybrid, 38 — hybrid-2
  'kit_bc_cell_0000_simulated',  // physical, STR, 34 — STR attribute rep
  'kit_bc_cell_0002_simulated',  // wind, WIS, 36 — WIS attribute rep
  'kit_bc_cell_0150_simulated',  // physical, STR, 27 — small prim count
  'kit_bc_cell_0096_simulated',  // water/hybrid, INT, 43 — large prim count
]);

// ─── Element colors (same palette as CosmographCanvas Mode A) ────────────────

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
const DEX_COLOR = 0x44DDCC;
const NEUTRAL_COLOR = 0xCCDDEE;

function getNodeColor(node: InstanceNode): number {
  // 1. Element primitives: id suffix
  if (node.primitive_family === 'element') {
    const elemName = node.primitive_id.replace('element_', '');
    return ELEMENT_COLORS[elemName] ?? NEUTRAL_COLOR;
  }
  // 2. Element-coupled
  try {
    const ec = JSON.parse(node.element_coupling_json) as string[];
    if (ec.length > 0) return ELEMENT_COLORS[ec[0]] ?? NEUTRAL_COLOR;
  } catch { /* skip */ }
  // 3. DEX/STR coupled
  try {
    const ac = JSON.parse(node.attribute_coupling_json) as string[];
    if (ac.includes('DEX')) return DEX_COLOR;
    if (ac.includes('STR')) return ELEMENT_COLORS['physical'];
  } catch { /* skip */ }
  return NEUTRAL_COLOR;
}

function getNodeRadius(node: InstanceNode): number {
  if (node.provenance_tag === 'retired-but-preserved') return 1.2;
  if (node.primitive_family === 'T4_strategy' && node.bdi_weight >= 0.85) return 4.0;
  if (node.bdi_weight >= 0.85) return 3.0;
  if (node.bdi_weight >= 0.70) return 2.5;
  return 1.8;
}

function drawStar(
  g: PIXI.Graphics,
  x: number, y: number,
  radius: number, color: number, alpha: number
): void {
  // Outer bloom
  g.beginFill(color, alpha * 0.12);
  g.drawCircle(x, y, radius * 2.0);
  g.endFill();
  // Mid glow
  g.beginFill(color, alpha * 0.28);
  g.drawCircle(x, y, radius * 1.35);
  g.endFill();
  // Core
  g.beginFill(color, alpha);
  g.drawCircle(x, y, radius);
  g.endFill();
}

// ─── Kit element → label color ────────────────────────────────────────────────

function kitLabelColor(kit: KitConstellation): number {
  return ELEMENT_COLORS[kit.primary_element] ?? NEUTRAL_COLOR;
}

// ─── Constellation bounding ring drawing ─────────────────────────────────────

function drawConstellationBound(
  g: PIXI.Graphics,
  cx: number, cy: number,
  color: number,
  alpha: number = 0.10
): void {
  g.lineStyle(0.5, color, alpha);
  g.beginFill(color, alpha * 0.15);
  g.drawCircle(cx, cy, MAX_CONSTELLATION_RADIUS);
  g.endFill();
  g.lineStyle(0);
}

// ─── Lasso interaction ────────────────────────────────────────────────────────

const MIN_CLICK_PX = 6;

// ─── Props ────────────────────────────────────────────────────────────────────

interface ConstellationModeCanvasProps {
  data: CosmographData;
  onLassoResult: (result: LassoResolutionResult | null) => void;
  clearLassoRef?: React.MutableRefObject<(() => void) | null>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ConstellationModeCanvas({
  data,
  onLassoResult,
  clearLassoRef,
}: ConstellationModeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const [loadMessage, setLoadMessage] = useState<string>('Computing Mode B layout…');

  const [interactionMode, setInteractionMode] = useState<'pointer' | 'lasso'>('pointer');
  const modeRef = useRef<'pointer' | 'lasso'>('pointer');
  const onLassoResultRef = useRef(onLassoResult);
  onLassoResultRef.current = onLassoResult;

  const handleModeToggle = useCallback((m: 'pointer' | 'lasso') => {
    modeRef.current = m;
    setInteractionMode(m);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Filter to Phase 1 sample cohort
    const sampleKits = data.kits.filter(k => PHASE1_SAMPLE_KIT_IDS.has(k.kit_id));

    setLoadMessage(`Computing Mode B layout — ${sampleKits.length} constellations…`);

    // Compute layout (force-directed centroid placement + intra-constellation layout)
    const t0 = performance.now();
    const layout = computeConstellationModeLayout(sampleKits, data.primitiveById, w, h);
    const layoutMs = performance.now() - t0;

    console.info(
      `[ConstellationMode Phase 1] Layout computed in ${layoutMs.toFixed(1)}ms — ` +
      `${layout.instanceNodes.length} instance nodes (${sampleKits.length} constellations × ~${Math.round(layout.instanceNodes.length / sampleKits.length)} prims/kit)`
    );

    // Create Pixi application
    const app = new PIXI.Application({
      width: w,
      height: h,
      backgroundColor: 0x020408,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    appRef.current = app;
    container.appendChild(app.view as HTMLCanvasElement);

    // ── Background ────────────────────────────────────────────────────────────
    const bg = new PIXI.Graphics();
    bg.beginFill(0x020408, 1.0);
    bg.drawRect(0, 0, w, h);
    bg.endFill();
    app.stage.addChild(bg);

    // ── Stage 1: Constellation bounding rings (Mode B clarity aid) ───────────
    // Faint circles showing each constellation's MAX_CONSTELLATION_RADIUS bound.
    // Visual cue: "this bounded region = one kit"
    const boundLayer = new PIXI.Graphics();
    const centroidByKitId = new Map<string, ConstellationCentroidPos>();
    for (const c of layout.centroids) centroidByKitId.set(c.kit_id, c);

    for (const kit of sampleKits) {
      const c = centroidByKitId.get(kit.kit_id)!;
      const color = kitLabelColor(kit);
      drawConstellationBound(boundLayer, c.cx, c.cy, color, 0.08);
    }
    app.stage.addChild(boundLayer);

    // ── Stage 2: Per-kit instance stars ──────────────────────────────────────
    const starLayer = new PIXI.Graphics();

    for (const node of layout.instanceNodes) {
      const color = getNodeColor(node);
      const radius = getNodeRadius(node);
      const alpha = 0.30 + 0.65 * node.bdi_weight;

      // Only render first-class primitives by default (same rules as Mode A)
      if (!node.visibility_at_default_zoom) continue;

      drawStar(starLayer, node.x, node.y, radius, color, alpha);
    }
    app.stage.addChild(starLayer);

    // ── Stage 3: Constellation centroid labels ────────────────────────────────
    // Small element + attribute label at each centroid for orientation
    const labelStyle = new PIXI.TextStyle({
      fontFamily: 'ui-monospace, monospace',
      fontSize: 8,
      fill: 0x8899BB,
      align: 'center',
      letterSpacing: 0.4,
    });

    for (const kit of sampleKits) {
      const c = centroidByKitId.get(kit.kit_id)!;
      const labelText = `${kit.primary_element}·${kit.kit_attribute}`;
      const label = new PIXI.Text(labelText, labelStyle);
      label.x = c.cx - label.width / 2;
      label.y = c.cy + MAX_CONSTELLATION_RADIUS + 4;
      label.alpha = 0.55;
      app.stage.addChild(label);

      // Centroid dot
      const dot = new PIXI.Graphics();
      const dotColor = kitLabelColor(kit);
      dot.beginFill(dotColor, 0.4);
      dot.drawCircle(c.cx, c.cy, 2.5);
      dot.endFill();
      app.stage.addChild(dot);
    }

    // ── Lasso layer ───────────────────────────────────────────────────────────
    const lassoGraphics = new PIXI.Graphics();
    app.stage.addChild(lassoGraphics);

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
      // Close
      lassoGraphics.lineTo(lassoVertices[0].x, lassoVertices[0].y);
    };

    // ── Highlight layer (selected constellation) ──────────────────────────────
    const highlightLayer = new PIXI.Graphics();
    app.stage.addChild(highlightLayer);

    const highlightConstellation = (kitId: string | null) => {
      highlightLayer.clear();
      if (!kitId) return;
      const kit = sampleKits.find(k => k.kit_id === kitId);
      if (!kit) return;
      const c = centroidByKitId.get(kitId)!;
      const color = kitLabelColor(kit);
      // Bright ring
      highlightLayer.lineStyle(1.5, color, 0.6);
      highlightLayer.beginFill(color, 0.04);
      highlightLayer.drawCircle(c.cx, c.cy, MAX_CONSTELLATION_RADIUS);
      highlightLayer.endFill();
      highlightLayer.lineStyle(0);
    };

    // ── Interaction hint ──────────────────────────────────────────────────────
    const hintStyle = new PIXI.TextStyle({
      fontFamily: 'ui-monospace, monospace',
      fontSize: 9,
      fill: 0x445566,
      letterSpacing: 0.3,
    });
    const hint = new PIXI.Text('Mode B — kit-as-constellation · use toolbar to switch lasso/pointer · lasso to select', hintStyle);
    hint.x = 12;
    hint.y = 12;
    hint.alpha = 0.45;
    app.stage.addChild(hint);

    // ── PROVISIONAL watermark ─────────────────────────────────────────────────
    const wmStyle = new PIXI.TextStyle({
      fontFamily: 'ui-monospace, monospace',
      fontSize: 10,
      fill: 0x444466,
      letterSpacing: 1.5,
    });
    const wm = new PIXI.Text('CONSTELLATION MODE · PHASE 1 SAMPLE · 10 KITS · ALL PROVISIONAL', wmStyle);
    wm.x = w - wm.width - 12;
    wm.y = 10;
    wm.alpha = 0.45;
    app.stage.addChild(wm);

    // ── FPS ticker ────────────────────────────────────────────────────────────
    let fpsWindow: number[] = [];
    let fpsLogCount = 0;
    const fpsTicker = () => {
      fpsWindow.push(app.ticker.FPS);
      if (fpsWindow.length >= 300) {
        fpsLogCount++;
        const sorted = [...fpsWindow].sort((a, b) => a - b);
        const min = sorted[0];
        const median = sorted[Math.floor(sorted.length / 2)];
        const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;
        if (fpsLogCount <= 3) {
          console.info(
            `[ConstellationMode Phase 1] FPS window ${fpsLogCount} — ` +
            `min=${min.toFixed(1)} median=${median.toFixed(1)} mean=${mean.toFixed(1)}`
          );
        }
        fpsWindow = fpsWindow.slice(-10);
      }
    };
    app.ticker.add(fpsTicker);

    // ── Native pointer events ─────────────────────────────────────────────────
    let pointerDownX = 0;
    let pointerDownY = 0;
    let panLastX = 0;
    let panLastY = 0;
    let isDragging = false;
    let isPanning = false;

    app.stage.eventMode = 'static';
    app.stage.hitArea = new PIXI.Rectangle(0, 0, w, h);

    const getCanvasPos = (e: PointerEvent): { cx: number; cy: number } => {
      const rect = container.getBoundingClientRect();
      return { cx: e.clientX - rect.left, cy: e.clientY - rect.top };
    };

    // ── Lasso resolution in Mode B ────────────────────────────────────────────
    const resolveModeBLasso = (vertices: Array<{ x: number; y: number }>) => {
      if (vertices.length < 3) return;

      // 1. Find which per-kit instance nodes fall within lasso
      const capturedNodeIds = new Set<string>();
      for (const node of layout.instanceNodes) {
        // Use only first-class stars (same as Mode A primitive resolution)
        if (!node.visibility_at_default_zoom) continue;
        if (pointInPolygon(node.x, node.y, vertices)) {
          capturedNodeIds.add(node.nodeId);
        }
      }

      // 2. DEDUPE to unique primitive_ids (Gate-1 Finding 2 INFO)
      // kit_001:fire + kit_002:fire → one 'fire' primitive vote
      const uniquePrimitiveIds = dedupeInstanceNodes(capturedNodeIds);

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

      // 3. Run standard composite-score resolution against ALL 1000 kits
      // (not just the sample — resolution targets the full corpus)
      const result = resolveLasso({
        lassoPolygon: vertices,
        primitives: data.primitives,
        kits: data.kits,
        primitiveById: data.primitiveById,
        topN: 3,
      });

      // Override lassoPrimitiveIds with the deduped set for correct scoring
      const correctedResult = {
        ...result,
        lassoPrimitiveIds: uniquePrimitiveIds,
      };

      console.info(
        `[ConstellationMode Phase 1] Mode B lasso resolved — ` +
        `${capturedNodeIds.size} instance nodes captured → ` +
        `${uniquePrimitiveIds.size} unique primitives (deduped) → ` +
        `${correctedResult.matches.length} matches (top score: ${correctedResult.matches[0]?.composite_score.toFixed(3) ?? 'none'})`
      );

      // Highlight the best-matched kit if it's in our sample
      if (correctedResult.matches.length > 0) {
        const topKitId = correctedResult.matches[0].kit.kit_id;
        highlightConstellation(PHASE1_SAMPLE_KIT_IDS.has(topKitId) ? topKitId : null);
      }

      onLassoResultRef.current(correctedResult);
    };

    const onNativePointerDown = (e: PointerEvent) => {
      const { cx, cy } = getCanvasPos(e);
      pointerDownX = cx;
      pointerDownY = cy;
      panLastX = cx;
      panLastY = cy;
      isDragging = false;
      isPanning = false;

      if (modeRef.current === 'lasso') {
        lassoVertices = [{ x: cx, y: cy }];
        lassoActive = true;
      }
    };

    const onNativePointerMove = (e: PointerEvent) => {
      if (e.buttons === 0) return;
      const { cx, cy } = getCanvasPos(e);
      const dx = cx - pointerDownX;
      const dy = cy - pointerDownY;

      if (!isDragging && Math.sqrt(dx * dx + dy * dy) >= MIN_CLICK_PX) {
        isDragging = true;
        if (modeRef.current === 'pointer') isPanning = true;
      }

      if (isPanning && modeRef.current === 'pointer') {
        app.stage.position.x += cx - panLastX;
        app.stage.position.y += cy - panLastY;
        panLastX = cx;
        panLastY = cy;
      }

      if (lassoActive && modeRef.current === 'lasso') {
        lassoVertices.push({ x: cx, y: cy });
        drawLasso();
      }
    };

    const onNativePointerUp = (_e: PointerEvent) => {
      const wasPanning = isPanning;
      isPanning = false;

      if (modeRef.current === 'lasso' && lassoActive) {
        lassoActive = false;
        const verts = [...lassoVertices];
        lassoVertices = [];
        // Keep lasso drawn; resolve
        resolveModeBLasso(verts);
        return;
      }

      if (isDragging || wasPanning) {
        isDragging = false;
        return;
      }
      isDragging = false;
    };

    container.addEventListener('pointerdown', onNativePointerDown);
    document.addEventListener('pointermove', onNativePointerMove);
    document.addEventListener('pointerup', onNativePointerUp);

    // Scroll zoom
    const ZOOM_MIN = 0.3;
    const ZOOM_MAX = 5.0;
    const ZOOM_FACTOR = 0.0012;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const stage = app.stage;
      const oldScale = stage.scale.x;
      const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, oldScale * (1 - event.deltaY * ZOOM_FACTOR)));
      if (newScale === oldScale) return;
      const bounds = container.getBoundingClientRect();
      const cursorX = event.clientX - bounds.left;
      const cursorY = event.clientY - bounds.top;
      const ratio = newScale / oldScale;
      stage.position.x = cursorX - (cursorX - stage.position.x) * ratio;
      stage.position.y = cursorY - (cursorY - stage.position.y) * ratio;
      stage.scale.set(newScale);
    };
    container.addEventListener('wheel', onWheel, { passive: false });

    // Clear lasso ref for parent
    if (clearLassoRef) {
      clearLassoRef.current = () => {
        lassoGraphics.clear();
        lassoVertices = [];
        lassoActive = false;
        highlightLayer.clear();
        onLassoResultRef.current(null);
      };
    }

    setLoadMessage('');

    console.info(
      `[ConstellationMode Phase 1] Rendered — ` +
      `${sampleKits.length} constellations · ` +
      `${layout.instanceNodes.filter(n => n.visibility_at_default_zoom).length} first-class instance nodes visible · ` +
      `${layout.instanceNodes.length} total instances · ` +
      `force-config: MAX_RAD=${MAX_CONSTELLATION_RADIUS}px · layout ${layoutMs.toFixed(1)}ms`
    );

    return () => {
      container.removeEventListener('pointerdown', onNativePointerDown);
      document.removeEventListener('pointermove', onNativePointerMove);
      document.removeEventListener('pointerup', onNativePointerUp);
      container.removeEventListener('wheel', onWheel);
      app.ticker.remove(fpsTicker);
      app.destroy(true, { children: true, texture: true, baseTexture: true });
      appRef.current = null;
    };
  }, [data]);

  return (
    <div className="relative w-full h-full">
      {/* Mode toggle toolbar */}
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
          title="Lasso mode: drag to select constellations"
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
      </div>

      {/* Loading message */}
      {loadMessage && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-gray-950/80">
          <span className="text-gray-500 font-mono text-sm">{loadMessage}</span>
        </div>
      )}

      {/* Pixi canvas container */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ cursor: interactionMode === 'lasso' ? 'crosshair' : 'grab' }}
      />
    </div>
  );
}

// ─── Point-in-polygon (ray casting) ──────────────────────────────────────────

function pointInPolygon(
  px: number, py: number,
  vertices: Array<{ x: number; y: number }>
): boolean {
  let inside = false;
  const n = vertices.length;
  let j = n - 1;
  for (let i = 0; i < n; i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    const intersect = yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
    j = i;
  }
  return inside;
}
