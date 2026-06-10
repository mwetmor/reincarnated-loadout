/**
 * RuneLayerCanvas.tsx — Phase 4 rune-per-primitive-group + two-tier selection.
 *
 * Drax Phase 4, 2026-06-09. Per dispatch:
 *   2026-06-09-drax-forge-phase-4-AMENDMENT-rune-per-group-two-tier.md
 *
 * Architecture:
 *   Rune-anchor layer: 6 primitive-group rune anchors rendered as large atmospheric
 *     light-edge brush-stroke glyphs. No color — drawn by light only (monochromatic
 *     luminous white/silver). The rune "looms behind" its kit cluster group.
 *
 *   Two-tier selection (Option γ — both tap + gesture-draw per drax discretion):
 *     Tier 1: Player selects rune group
 *       - Tap/click selects immediately (Option α baseline)
 *       - Gesture-draw traces the rune stroke (Option β sign-as-input; Tal Rasha precedent)
 *       - Toggle: Input: [tap / sign] lets player pick their style
 *     Tier 2: Within selected rune, player picks per-primitive values via icon buttons
 *       (Placeholder icons; canonical icon design DEFERRED Pattern B per Matt 2026-06-09)
 *
 *   Phase 3 baselines preserved:
 *     - Lasso (within-anchor / cross-buffer / buffer-only semantic modes)
 *     - Algorithm toggle (radial / force-directed)
 *     - Mobile-responsive layout
 *     - Touch pinch-zoom
 *     - 60 FPS performance target
 *
 * Criterion 11 (PRIORITY-ELEVATED): classifyLasso() thresholds re-validated.
 *   Phase 4 values per compute-rune-layer-layout.py analysis:
 *     within_anchor_centroid_threshold=1100 (unchanged)
 *     nearby_anchor_threshold=2000 (CHANGED from 1200)
 *     cross_buffer_min_lasso_radius=950 (CHANGED from 600)
 *     min_lasso_polygon_points=2 (unchanged)
 *
 * Discipline #40 scaffold values:
 *   - 6 primitive groups (rune registry; drax-discretion-substitutable; canonical lock deferred)
 *   - Per-group rune assignments (cross-system; drax-discretion; canonical lock deferred)
 *   - Tier 2 placeholder icons (canonical icon design deferred Pattern B)
 *   - visual_render_spec parameters (canonical render-parameter lock deferred Pattern B)
 *
 * D7: No raw LLM player-facing content. Rune registry + placeholder icons are hand-curated.
 * D8: Mobile-responsive; touch-input ergonomics for both Tier 1 + Tier 2.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';
import type { CosmographData } from '../../data/cosmographData';
import type { RuneLayerLayoutData, RuneAnchor, RuneLayerCentroid } from '../../data/runeAnchorTypes';
import type { ConstellationLayoutData, ConstellationLayoutNode } from '../../data/cosmographTypes';
import type { RunePrimitiveGroup, PrimitiveGroupId } from '../../data/runeAnchorTypes';
import { RUNE_PRIMITIVE_GROUPS, RUNE_GROUP_BY_ID } from '../../data/runeRegistry';
import { scoreKitsByPrimitiveSet } from '../../utils/lassoResolution';
import type { LassoResolutionResult } from '../../utils/lassoResolution';
import { TierTwoPanel } from './TierTwoPanel';

// ─── Constants ────────────────────────────────────────────────────────────────

const LOD_ZOOM_THRESHOLD = 2.0;
const MIN_CLICK_PX = 6;

// Phase 4 classifyLasso thresholds (re-validated per criterion 11)
// CHANGED from Phase 3: nearby_anchor_threshold 1200→2000, cross_buffer_min_lasso_radius 600→950
const P4_WITHIN_ANCHOR_CENTROID_THRESHOLD = 1100;  // unchanged
const P4_NEARBY_ANCHOR_THRESHOLD = 2000;             // CHANGED: atmospheric_radius + 200px
const P4_CROSS_BUFFER_MIN_LASSO_RADIUS = 950;        // CHANGED: recalibrated for tighter grid
const P4_MIN_LASSO_POLYGON_POINTS = 2;               // unchanged

// ─── Element colors (shared with Phase 3) ────────────────────────────────────

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

// ─── Rune rendering ───────────────────────────────────────────────────────────

/**
 * Draw the atmospheric rune anchor.
 *
 * Visual register per Matt 2026-06-09:
 *   "The rune sign should loom largely in the space behind the primitive cluster,
 *    with a glowing light highlighting the edges of the rune and without any color
 *    except having the brush strokes drawn by light."
 *
 * Implementation approach:
 *   1. Very faint atmospheric diffusion (outer glow, covers atmospheric_radius)
 *   2. The rune glyph rendered as a PIXI.Text at large scale with luminous white
 *   3. Light-edge highlight via multiple concentric text renders with decreasing alpha
 *   4. No element color — only white/silver luminous light
 *
 * The glyph text approach is used here for Phase 4 web-layer prototype.
 * Production UE-port will use Niagara VFX brush-stroke render (WS2 scope).
 *
 * SCAFFOLD: visual_render_spec parameters are drax defaults.
 * Canonical visual-register render-parameter lock DEFERRED to Pattern B.
 * // TODO(drax): replace scaffold render parameters with canonical lock post-Pattern-B
 */
function drawRuneAtmosphere(
  g: PIXI.Graphics,
  anchor: RuneAnchor,
  isSelected: boolean,
  isHovered: boolean,
): void {
  const cx = anchor.x;
  const cy = anchor.y;
  const atmR = anchor.atmospheric_radius;
  const strokeR = anchor.stroke_radius;

  // Layer 1: Very faint outer atmospheric presence ("looming" quality)
  const baseAlpha = isSelected ? 0.055 : isHovered ? 0.038 : 0.018;
  g.beginFill(0xFFFFFF, baseAlpha * 0.4);
  g.drawCircle(cx, cy, atmR);
  g.endFill();

  // Layer 2: Mid atmospheric haze (denser toward center)
  g.beginFill(0xFFFFFF, baseAlpha * 0.7);
  g.drawCircle(cx, cy, atmR * 0.65);
  g.endFill();

  // Layer 3: Inner stroke region glow (where the rune lives)
  g.beginFill(0xFFFFFF, baseAlpha * 1.4);
  g.drawCircle(cx, cy, strokeR);
  g.endFill();

  // Layer 4: Selection/hover indicator ring (faint boundary)
  const ringAlpha = isSelected ? 0.28 : isHovered ? 0.15 : 0.05;
  g.lineStyle(isSelected ? 1.2 : 0.6, 0xFFFFFF, ringAlpha);
  g.drawCircle(cx, cy, strokeR * 1.05);
  g.lineStyle(0);

  // Layer 5: Selection pulse — additional bright inner ring when selected
  if (isSelected) {
    g.lineStyle(1.8, 0xFFFFFF, 0.50);
    g.drawCircle(cx, cy, strokeR * 0.55);
    g.lineStyle(0);
    g.beginFill(0xFFFFFF, 0.08);
    g.drawCircle(cx, cy, strokeR * 0.40);
    g.endFill();
  }
}

/**
 * Create a rune glyph text object.
 *
 * The rune is rendered as a large Unicode character (Elder Futhark, I Ching, etc.)
 * with luminous white fill. Multiple text copies at different alphas simulate
 * the light-edge brush-stroke effect.
 *
 * For Phase 4 prototype: PIXI.Text with large font size + glow layering.
 * For UE-port WS2: Niagara VFX brush-stroke + SplineMesh rune geometry.
 */
function createRuneGlyphContainer(
  anchor: RuneAnchor,
  isSelected: boolean,
  isHovered: boolean,
): PIXI.Container {
  const container = new PIXI.Container();
  const cx = anchor.x;
  const cy = anchor.y;
  const strokeR = anchor.stroke_radius;

  // Font size scales to stroke_radius so the rune fills its region visually
  // At stroke_radius=900px, a ~1600px font size fills the space appropriately
  const fontSize = Math.round(strokeR * 1.8);

  const baseAlpha = isSelected ? 0.72 : isHovered ? 0.52 : 0.28;
  const glyph = anchor.group.rune.glyph;

  // Layer 1: Outermost glow (large, very faint — the atmospheric light haze)
  const glowStyle1 = new PIXI.TextStyle({
    fontFamily: 'serif',
    fontSize: fontSize * 1.15,
    fill: 0xFFFFFF,
    align: 'center',
  });
  const glow1 = new PIXI.Text(glyph, glowStyle1);
  glow1.alpha = baseAlpha * 0.08;
  glow1.anchor.set(0.5, 0.5);
  glow1.x = cx;
  glow1.y = cy;
  container.addChild(glow1);

  // Layer 2: Mid glow
  const glowStyle2 = new PIXI.TextStyle({
    fontFamily: 'serif',
    fontSize: fontSize * 1.05,
    fill: 0xFFFFFF,
    align: 'center',
  });
  const glow2 = new PIXI.Text(glyph, glowStyle2);
  glow2.alpha = baseAlpha * 0.18;
  glow2.anchor.set(0.5, 0.5);
  glow2.x = cx;
  glow2.y = cy;
  container.addChild(glow2);

  // Layer 3: Main rune body (medium alpha — the drawn form)
  const mainStyle = new PIXI.TextStyle({
    fontFamily: 'serif',
    fontSize,
    fill: 0xEEEEFF,
    align: 'center',
    stroke: 0xFFFFFF,
    strokeThickness: isSelected ? 3.0 : 1.5,
  });
  const main = new PIXI.Text(glyph, mainStyle);
  main.alpha = baseAlpha;
  main.anchor.set(0.5, 0.5);
  main.x = cx;
  main.y = cy;
  container.addChild(main);

  // Layer 4: Light-edge highlight (crisp, bright — "glowing light highlighting the edges")
  const edgeStyle = new PIXI.TextStyle({
    fontFamily: 'serif',
    fontSize: fontSize * 0.97,
    fill: 0xFFFFFF,
    align: 'center',
    stroke: 0xFFFFFF,
    strokeThickness: isSelected ? 5.0 : 3.0,
  });
  const edge = new PIXI.Text(glyph, edgeStyle);
  edge.alpha = baseAlpha * (isSelected ? 0.65 : 0.42);
  edge.anchor.set(0.5, 0.5);
  edge.x = cx;
  edge.y = cy;
  container.addChild(edge);

  return container;
}

// ─── Star glow (reused from Phase 3) ─────────────────────────────────────────

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

// ─── Point-in-polygon ─────────────────────────────────────────────────────────

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

// ─── Lasso classification (Phase 4 re-validated thresholds) ──────────────────

/**
 * Classify lasso by its relationship to rune anchor regions.
 *
 * Phase 4 threshold values per criterion 11 re-validation in compute-rune-layer-layout.py:
 *   within_anchor_centroid_threshold=1100 (unchanged from Phase 3)
 *   nearby_anchor_threshold=2000 (CHANGED from 1200 — recalibrated for atmospheric_radius=1800px)
 *   cross_buffer_min_lasso_radius=950 (CHANGED from 600 — recalibrated for 3×2 grid spacing)
 *   min_lasso_polygon_points=2 (unchanged)
 */
function classifyLasso(
  lassoVertices: Array<{ x: number; y: number }>,
  runeAnchors: RuneAnchor[],
): 'within-anchor' | 'cross-buffer' | 'buffer-only' {
  if (lassoVertices.length < P4_MIN_LASSO_POLYGON_POINTS) return 'buffer-only';

  const cx = lassoVertices.reduce((s, v) => s + v.x, 0) / lassoVertices.length;
  const cy = lassoVertices.reduce((s, v) => s + v.y, 0) / lassoVertices.length;
  const lassoR = Math.max(...lassoVertices.map(v => Math.sqrt((v.x - cx) ** 2 + (v.y - cy) ** 2)));

  let minAnchorDist = Infinity;
  let nearAnchorCount = 0;
  for (const anchor of runeAnchors) {
    const dist = Math.sqrt((cx - anchor.x) ** 2 + (cy - anchor.y) ** 2);
    if (dist < minAnchorDist) minAnchorDist = dist;
    // Phase 4: nearby = lasso overlaps with atmospheric region (atmospheric_radius=1800)
    if (dist < P4_NEARBY_ANCHOR_THRESHOLD + lassoR) nearAnchorCount++;
  }

  if (nearAnchorCount >= 2 && lassoR > P4_CROSS_BUFFER_MIN_LASSO_RADIUS) return 'cross-buffer';
  if (minAnchorDist < P4_WITHIN_ANCHOR_CENTROID_THRESHOLD || nearAnchorCount >= 1) return 'within-anchor';
  return 'buffer-only';
}

// ─── Gesture recognition for Tier 1 (Option β sign-as-input) ─────────────────

/**
 * Recognize which rune group a gesture-drawn stroke most closely matches.
 *
 * Phase 4 implementation: centroid-proximity heuristic.
 * The player draws a stroke in the approximate region of a rune anchor.
 * The recognition finds which rune anchor's stroke_radius the gesture centroid
 * is closest to (or within).
 *
 * This is an intentionally simple baseline per Discipline #18.2:
 *   "methodology consultation fires AFTER baseline at extension hotspots"
 * Phase 4 tries reasonable algorithm empirically as the baseline.
 * Elrond formal methodology consultation fires post-Phase-4 if pain surfaces.
 *
 * SCAFFOLD: gesture-recognition algorithm is Phase 4 baseline heuristic.
 * Methodology hotspot for post-Phase-4 elrond consultation per Discipline #18.2.
 * // TODO(drax): evaluate gesture-recognition methodology with elrond post-Phase-4 if pain surfaces
 */
function recognizeGestureGroup(
  gestureVertices: Array<{ x: number; y: number }>,
  runeAnchors: RuneAnchor[],
): PrimitiveGroupId | null {
  if (gestureVertices.length < 3) return null;

  // Gesture centroid
  const gcx = gestureVertices.reduce((s, v) => s + v.x, 0) / gestureVertices.length;
  const gcy = gestureVertices.reduce((s, v) => s + v.y, 0) / gestureVertices.length;

  // Find nearest rune anchor to gesture centroid
  let bestAnchor: RuneAnchor | null = null;
  let bestDist = Infinity;
  for (const anchor of runeAnchors) {
    const dist = Math.sqrt((gcx - anchor.x) ** 2 + (gcy - anchor.y) ** 2);
    if (dist < bestDist) {
      bestDist = dist;
      bestAnchor = anchor;
    }
  }

  // Accept if gesture centroid is within atmospheric_radius of nearest rune
  if (bestAnchor && bestDist < bestAnchor.atmospheric_radius) {
    return bestAnchor.group_id;
  }
  return null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type Tier1InputMode = 'tap' | 'sign';

interface RuneLayerCanvasProps {
  data: CosmographData;
  runeLayoutData: RuneLayerLayoutData;
  constellationLayoutData: ConstellationLayoutData;
  onLassoResult: (result: LassoResolutionResult | null, lassoMode: string) => void;
  clearLassoRef?: React.MutableRefObject<(() => void) | null>;
  /** Anchor render mode: 'nebula' = Phase 3, 'rune' = Phase 4. From Forge.tsx toggle. */
  anchorMode?: 'nebula' | 'rune';
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RuneLayerCanvas({
  data,
  runeLayoutData,
  constellationLayoutData,
  onLassoResult,
  clearLassoRef,
}: RuneLayerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const [interactionMode, setInteractionMode] = useState<'pointer' | 'lasso'>('pointer');
  const modeRef = useRef<'pointer' | 'lasso'>('pointer');
  const onLassoResultRef = useRef(onLassoResult);
  onLassoResultRef.current = onLassoResult;
  const normalizedZoomRef = useRef(1.0);

  // Tier 1 input mode: tap (Option α) or sign/gesture-draw (Option β)
  const [tier1InputMode, setTier1InputMode] = useState<Tier1InputMode>('tap');
  const tier1InputModeRef = useRef<Tier1InputMode>('tap');

  // Tier 1: selected rune group
  const [selectedGroup, setSelectedGroup] = useState<PrimitiveGroupId | null>(null);
  const selectedGroupRef = useRef<PrimitiveGroupId | null>(null);

  // Lasso mode info
  const [lastLassoMode, setLastLassoMode] = useState<string | null>(null);

  // Gesture-draw state (Option β)
  const [isGestureActive, setIsGestureActive] = useState(false);
  const gestureVerticesRef = useRef<Array<{ x: number; y: number }>>([]);
  const gestureGraphicsRef = useRef<PIXI.Graphics | null>(null);

  // Rune glyph container registry (for selection state updates)
  const runeGlyphContainersRef = useRef<Map<PrimitiveGroupId, PIXI.Container>>(new Map());
  const runeAtmosphereLayerRef = useRef<PIXI.Graphics | null>(null);
  const runeGlyphLayerRef = useRef<PIXI.Container | null>(null);
  const runeAnchorsRef = useRef<RuneAnchor[]>([]);

  const handleModeToggle = useCallback((m: 'pointer' | 'lasso') => {
    modeRef.current = m;
    setInteractionMode(m);
  }, []);

  const handleTier1InputModeToggle = useCallback((m: Tier1InputMode) => {
    tier1InputModeRef.current = m;
    setTier1InputMode(m);
  }, []);

  // Redraw rune atmosphere + glyphs when selection changes
  const redrawRuneLayer = useCallback(() => {
    const atmosphereLayer = runeAtmosphereLayerRef.current;
    const glyphLayer = runeGlyphLayerRef.current;
    const anchors = runeAnchorsRef.current;
    if (!atmosphereLayer || !glyphLayer) return;

    atmosphereLayer.clear();

    for (const anchor of anchors) {
      const isSelected = selectedGroupRef.current === anchor.group_id;
      const isHovered = false;  // hover state managed separately
      drawRuneAtmosphere(atmosphereLayer, anchor, isSelected, isHovered);

      // Update glyph container: remove old, add new
      const oldContainer = runeGlyphContainersRef.current.get(anchor.group_id);
      if (oldContainer) {
        glyphLayer.removeChild(oldContainer);
        oldContainer.destroy({ children: true });
      }
      const newContainer = createRuneGlyphContainer(anchor, isSelected, isHovered);
      glyphLayer.addChild(newContainer);
      runeGlyphContainersRef.current.set(anchor.group_id, newContainer);
    }
  }, []);

  const handleSelectGroup = useCallback((groupId: PrimitiveGroupId | null) => {
    selectedGroupRef.current = groupId;
    setSelectedGroup(groupId);
    redrawRuneLayer();
  }, [redrawRuneLayer]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    const worldW = runeLayoutData.meta.world_w;
    const worldH = runeLayoutData.meta.world_h;
    const MAX_KIT_RADIUS = runeLayoutData.meta.max_kit_radius;

    const initialScale = Math.min(containerW / worldW, containerH / worldH);
    const primById = data.primitiveById;

    // Build rune anchors with group data attached
    const runeAnchors: RuneAnchor[] = runeLayoutData.rune_anchors.map(ra => ({
      ...ra,
      group: RUNE_GROUP_BY_ID.get(ra.group_id) ?? RUNE_PRIMITIVE_GROUPS[0],
    }));
    runeAnchorsRef.current = runeAnchors;

    const centroidByKitId = new Map<string, RuneLayerCentroid>();
    for (const c of runeLayoutData.centroids) {
      centroidByKitId.set(c.kit_id, c);
    }

    // Build star nodes (same approach as Phase 3 — translate Phase 2 cluster geometry)
    interface RenderNode {
      nodeId: string;
      kit_id: string;
      primitive_id: string;
      x: number;
      y: number;
      zone: 'primary' | 'outer' | 'buffer';
    }

    const allStarNodes: RenderNode[] = [];
    const p2CentroidByKitId = new Map<string, { cx: number; cy: number }>();
    for (const c of constellationLayoutData.centroids) {
      p2CentroidByKitId.set(c.kit_id, { cx: c.cx, cy: c.cy });
    }

    for (const runeLayerCentroid of runeLayoutData.centroids) {
      const kit_id = runeLayerCentroid.kit_id;
      const p2Centroid = p2CentroidByKitId.get(kit_id);
      const p2Nodes = constellationLayoutData.clusters[kit_id];
      if (!p2Nodes || !p2Centroid) continue;

      const dx = runeLayerCentroid.cx - p2Centroid.cx;
      const dy = runeLayerCentroid.cy - p2Centroid.cy;

      for (const node of p2Nodes as ConstellationLayoutNode[]) {
        const prim = primById.get(node.p);
        if (!prim?.visibility_at_default_zoom) continue;
        allStarNodes.push({
          nodeId: `${kit_id}:${node.p}`,
          kit_id,
          primitive_id: node.p,
          x: node.x + dx,
          y: node.y + dy,
          zone: runeLayerCentroid.zone,
        });
      }
    }

    console.info(
      `[RuneLayer P4] Star nodes built: ${allStarNodes.length} ` +
      `(translated from Phase 2 cluster geometry to Phase 4 rune-group centroids)`
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

    // ── RUNE ANCHOR LAYER 1: Atmospheric diffusion ──────────────────────────
    // The rune atmosphere renders BEHIND the kit clusters (below in z-order)
    // so the rune "looms behind" the primitive cluster as per Matt's spec.
    const atmosphereLayer = new PIXI.Graphics();
    runeAtmosphereLayerRef.current = atmosphereLayer;
    worldStage.addChild(atmosphereLayer);

    // ── RUNE ANCHOR LAYER 2: Glyph text containers ──────────────────────────
    const glyphLayer = new PIXI.Container();
    runeGlyphLayerRef.current = glyphLayer;
    worldStage.addChild(glyphLayer);

    // Initial rune render (no selection)
    for (const anchor of runeAnchors) {
      drawRuneAtmosphere(atmosphereLayer, anchor, false, false);
      const glyphContainer = createRuneGlyphContainer(anchor, false, false);
      glyphLayer.addChild(glyphContainer);
      runeGlyphContainersRef.current.set(anchor.group_id, glyphContainer);
    }

    // ── Rune group labels ────────────────────────────────────────────────────
    const labelLayer = new PIXI.Container();
    const labelStyle = new PIXI.TextStyle({
      fontFamily: 'ui-monospace, monospace',
      fontSize: 13,
      fill: 0x888899,
      align: 'center',
      letterSpacing: 2.0,
      fontWeight: 'bold',
    });
    const sublabelStyle = new PIXI.TextStyle({
      fontFamily: 'ui-monospace, monospace',
      fontSize: 9,
      fill: 0x334455,
      align: 'center',
      letterSpacing: 0.8,
    });
    for (const anchor of runeAnchors) {
      const group = anchor.group;
      const label = new PIXI.Text(group.label.toUpperCase(), labelStyle);
      label.anchor.set(0.5, 0.5);
      // Position label ABOVE the rune's kit cluster zone
      label.x = anchor.x;
      label.y = anchor.y - anchor.stroke_radius * 0.8;
      labelLayer.addChild(label);

      const kitCount = runeLayoutData.centroids.filter(c => c.primary_group === anchor.group_id).length;
      const sublabel = new PIXI.Text(`${kitCount} kits`, sublabelStyle);
      sublabel.anchor.set(0.5, 0.5);
      sublabel.x = anchor.x;
      sublabel.y = anchor.y - anchor.stroke_radius * 0.8 + 18;
      labelLayer.addChild(sublabel);
    }
    worldStage.addChild(labelLayer);

    // ── LAYER 2: Kit-cluster dots (LOD: zoom < 2.0) ─────────────────────────
    const dotsLayer = new PIXI.Graphics();
    const DOT_OUTER_R = 28;
    const DOT_INNER_R = 13;

    for (const c of runeLayoutData.centroids) {
      const color = elementColor(c.element);
      const isBuffer = c.zone === 'buffer';
      const isOuter = c.zone === 'outer';
      const glowAlpha = isBuffer ? 0.35 : isOuter ? 0.12 : 0.15;
      const dotAlpha = isBuffer ? 0.90 : isOuter ? 0.60 : 0.75;

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

    // ── Star layer (LOD: zoom >= 2.0) ─────────────────────────────────────────
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
      const alphaMultiplier = node.zone === 'buffer' ? 1.2 : 1.0;
      drawStarGlow(starsLayer, node.x, node.y, radius, color, Math.min(1.0, alpha * alphaMultiplier));
    }
    worldStage.addChild(starsLayer);
    console.info(`[RuneLayer P4] Stars drawn in ${(performance.now() - t0).toFixed(1)}ms — ${allStarNodes.length} nodes`);

    // ── Bounds layer ──────────────────────────────────────────────────────────
    const boundsLayer = new PIXI.Graphics();
    boundsLayer.visible = false;
    for (const c of runeLayoutData.centroids) {
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
            `[RuneLayer P4] FPS window ${fpsLogCount} — ` +
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

    // ── Lasso graphics ────────────────────────────────────────────────────────
    const lassoGraphics = new PIXI.Graphics();
    app.stage.addChild(lassoGraphics);

    // ── Gesture-draw graphics (Option β) ────────────────────────────────────
    const gestureGraphics = new PIXI.Graphics();
    app.stage.addChild(gestureGraphics);
    gestureGraphicsRef.current = gestureGraphics;

    // ── Watermark ─────────────────────────────────────────────────────────────
    const wmStyle = new PIXI.TextStyle({
      fontFamily: 'ui-monospace, monospace',
      fontSize: 9,
      fill: 0x223344,
      letterSpacing: 1.5,
    });
    const wm = new PIXI.Text(
      `RUNE-LAYER · PHASE 4 · 6 GROUPS · ${runeLayoutData.centroids.length} KITS · ALL PROVISIONAL`,
      wmStyle
    );
    wm.x = containerW - wm.width - 12;
    wm.y = 10;
    wm.alpha = 0.60;
    app.stage.addChild(wm);

    // ── Hint ──────────────────────────────────────────────────────────────────
    const hintStyle = new PIXI.TextStyle({ fontFamily: 'ui-monospace, monospace', fontSize: 9, fill: 0x334455, letterSpacing: 0.3 });
    const hint = new PIXI.Text(
      'Phase 4 — rune-per-group · tap or sign rune to select group · select group to compose primitives',
      hintStyle
    );
    hint.x = 12;
    hint.y = 12;
    hint.alpha = 0.50;
    app.stage.addChild(hint);

    // ── Screen-to-world transform ─────────────────────────────────────────────
    const screenToWorld = (sx: number, sy: number) => ({
      wx: (sx - worldStage.position.x) / worldStage.scale.x,
      wy: (sy - worldStage.position.y) / worldStage.scale.y,
    });

    // ── Lasso state ───────────────────────────────────────────────────────────
    let lassoVertices: Array<{ x: number; y: number }> = [];
    let lassoActive = false;

    const drawLasso = () => {
      lassoGraphics.clear();
      if (lassoVertices.length < 2) return;
      lassoGraphics.lineStyle(1.0, 0x88AAFF, 0.75);
      lassoGraphics.moveTo(lassoVertices[0].x, lassoVertices[0].y);
      for (let i = 1; i < lassoVertices.length; i++) {
        lassoGraphics.lineTo(lassoVertices[i].x, lassoVertices[i].y);
      }
      lassoGraphics.lineTo(lassoVertices[0].x, lassoVertices[0].y);
    };

    // ── Gesture-draw state (Option β) ────────────────────────────────────────
    let gestureActive = false;
    let gestureVertices: Array<{ x: number; y: number }> = [];

    const drawGestureStroke = () => {
      gestureGraphics.clear();
      if (gestureVertices.length < 2) return;
      // Render gesture as luminous white stroke (sign-as-light visual)
      gestureGraphics.lineStyle(2.5, 0xFFFFFF, 0.65);
      gestureGraphics.moveTo(gestureVertices[0].x, gestureVertices[0].y);
      for (let i = 1; i < gestureVertices.length; i++) {
        gestureGraphics.lineTo(gestureVertices[i].x, gestureVertices[i].y);
      }
      // Outer glow layer
      gestureGraphics.lineStyle(6.0, 0xCCDDFF, 0.18);
      gestureGraphics.moveTo(gestureVertices[0].x, gestureVertices[0].y);
      for (let i = 1; i < gestureVertices.length; i++) {
        gestureGraphics.lineTo(gestureVertices[i].x, gestureVertices[i].y);
      }
    };

    // ── Lasso resolution ──────────────────────────────────────────────────────
    const resolveTwoLayerLasso = (screenVerts: Array<{ x: number; y: number }>) => {
      if (screenVerts.length < 3) return;

      const worldVerts = screenVerts.map(v => {
        const { wx, wy } = screenToWorld(v.x, v.y);
        return { x: wx, y: wy };
      });

      // Phase 4: classify against rune anchors (re-validated thresholds)
      const lassoMode = classifyLasso(worldVerts, runeAnchors);

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
        `[RuneLayer P4] Lasso resolved (${lassoMode}) — ` +
        `${capturedNodeIds.size} nodes → ${uniquePrimitiveIds.size} unique prims → ` +
        `${result.matches.length} matches`
      );

      if (result.matches.length > 0) {
        highlightKit(result.matches[0].kit.kit_id);
      }
      onLassoResultRef.current(result, lassoMode);
      setLastLassoMode(lassoMode);
    };

    // ── Tier 1 tap selection ───────────────────────────────────────────────────
    const handleTapSelectGroup = (screenX: number, screenY: number) => {
      const { wx, wy } = screenToWorld(screenX, screenY);

      // Find nearest rune anchor within atmospheric_radius
      let bestAnchor: RuneAnchor | null = null;
      let bestDist = Infinity;
      for (const anchor of runeAnchors) {
        const dist = Math.sqrt((wx - anchor.x) ** 2 + (wy - anchor.y) ** 2);
        if (dist < anchor.atmospheric_radius && dist < bestDist) {
          bestDist = dist;
          bestAnchor = anchor;
        }
      }

      if (bestAnchor) {
        const newGroupId = bestAnchor.group_id;
        // Toggle: tap same group again to deselect
        const nextGroup = selectedGroupRef.current === newGroupId ? null : newGroupId;
        selectedGroupRef.current = nextGroup;
        setSelectedGroup(nextGroup);
        redrawRuneLayer();
        console.info(
          `[RuneLayer P4] Tier 1 tap select: ${nextGroup ?? 'deselected'}`
        );
      }
    };

    // ── Pointer events ────────────────────────────────────────────────────────
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
        return;
      }

      // Gesture-draw mode (Option β): active at any zoom
      if (tier1InputModeRef.current === 'sign' && modeRef.current === 'pointer') {
        gestureActive = true;
        gestureVerticesRef.current = [{ x: cx, y: cy }];
        gestureVertices = [{ x: cx, y: cy }];
        setIsGestureActive(true);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.buttons === 0) return;
      const { cx, cy } = getContainerPos(e);
      const dx = cx - pointerDownX, dy = cy - pointerDownY;
      if (!isDragging && Math.sqrt(dx * dx + dy * dy) >= MIN_CLICK_PX) {
        isDragging = true;
        if (modeRef.current === 'pointer' && tier1InputModeRef.current === 'tap') isPanning = true;
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
      if (gestureActive && tier1InputModeRef.current === 'sign') {
        gestureVertices.push({ x: cx, y: cy });
        gestureVerticesRef.current = gestureVertices;
        drawGestureStroke();
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

      // Gesture-draw completion (Option β)
      if (gestureActive && tier1InputModeRef.current === 'sign') {
        gestureActive = false;
        setIsGestureActive(false);
        const verts = [...gestureVertices];
        gestureVertices = [];
        gestureVerticesRef.current = [];

        if (verts.length >= 3) {
          // Transform gesture to world space for recognition
          const worldVerts = verts.map(v => {
            const { wx, wy } = screenToWorld(v.x, v.y);
            return { x: wx, y: wy };
          });

          const recognizedGroup = recognizeGestureGroup(worldVerts, runeAnchors);
          if (recognizedGroup) {
            const nextGroup = selectedGroupRef.current === recognizedGroup ? null : recognizedGroup;
            selectedGroupRef.current = nextGroup;
            setSelectedGroup(nextGroup);
            redrawRuneLayer();
            console.info(`[RuneLayer P4] Tier 1 gesture-sign recognized: ${recognizedGroup ?? 'no match'}`);
          } else {
            console.info('[RuneLayer P4] Tier 1 gesture-sign: no group recognized (drew outside all rune atmospheres)');
          }
        }

        // Clear gesture stroke with fade (just clear immediately for Phase 4)
        gestureGraphics.clear();
        return;
      }

      // Tap selection (Option α)
      if (!isDragging && !wasPanning && tier1InputModeRef.current === 'tap') {
        handleTapSelectGroup(pointerDownX, pointerDownY);
      }

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

    // ── Touch pinch zoom ──────────────────────────────────────────────────────
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
        gestureGraphics.clear();
        lassoVertices = [];
        lassoActive = false;
        gestureActive = false;
        gestureVertices = [];
        highlightLayer.clear();
        onLassoResultRef.current(null, 'clear');
      };
    }

    console.info(
      `[RuneLayer P4] Rendered — ` +
      `${runeAnchors.length} rune group anchors · ` +
      `${runeLayoutData.centroids.length} kit centroids · ` +
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
      runeGlyphContainersRef.current.clear();
      runeAtmosphereLayerRef.current = null;
      runeGlyphLayerRef.current = null;
    };
  }, [data, runeLayoutData, constellationLayoutData, redrawRuneLayer]);

  // Sync selectedGroup changes from external clear back to the ref
  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
  }, [selectedGroup]);

  // Selected group object for Tier 2 panel
  const selectedGroupData: RunePrimitiveGroup | null = selectedGroup
    ? RUNE_GROUP_BY_ID.get(selectedGroup) ?? null
    : null;

  return (
    <div className="relative w-full h-full">
      {/* Toolbar */}
      <div
        className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 rounded border border-gray-700/60 bg-gray-900/90 px-2 py-1.5 backdrop-blur-sm"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Pointer/lasso mode */}
        <button
          onClick={() => handleModeToggle('pointer')}
          title="Pointer mode: pan/zoom or tap rune to select group"
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
          title="Lasso mode: zoom to 2× then draw to select kits"
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
          <span className="text-[9px] text-gray-600 font-mono ml-0.5">(zoom 2×+ to activate)</span>
        )}

        {/* Tier 1 input mode toggle (pointer mode only) */}
        {interactionMode === 'pointer' && (
          <>
            <span className="text-[9px] text-gray-600 font-mono mx-0.5">|</span>
            <span className="text-[9px] text-gray-600 font-mono">Input:</span>
            <button
              onClick={() => handleTier1InputModeToggle('tap')}
              title="Tap to select rune group (Option α)"
              className={
                'rounded px-1.5 py-0.5 text-[9px] font-mono transition-colors ' +
                (tier1InputMode === 'tap'
                  ? 'bg-amber-800/70 text-amber-100'
                  : 'text-gray-600 hover:text-gray-400')
              }
            >
              tap
            </button>
            <button
              onClick={() => handleTier1InputModeToggle('sign')}
              title="Sign the rune — gesture-draw in the rune's region to select (Option β; Tal Rasha sign-as-input)"
              className={
                'rounded px-1.5 py-0.5 text-[9px] font-mono transition-colors ' +
                (tier1InputMode === 'sign'
                  ? 'bg-amber-800/70 text-amber-100'
                  : 'text-gray-600 hover:text-gray-400')
              }
            >
              sign
            </button>
            {tier1InputMode === 'sign' && (
              <span className="text-[8px] text-amber-500/70 font-mono">
                {isGestureActive ? 'drawing…' : 'draw in rune region'}
              </span>
            )}
          </>
        )}

        {/* Lasso mode indicator */}
        {lastLassoMode && interactionMode === 'lasso' && (
          <span className={
            'text-[9px] font-mono px-1 py-0.5 rounded ml-1 ' +
            (lastLassoMode === 'within-anchor'
              ? 'bg-indigo-900/60 text-indigo-300'
              : lastLassoMode === 'cross-buffer'
              ? 'bg-amber-900/60 text-amber-300'
              : 'bg-purple-900/60 text-purple-300')
          }>
            {lastLassoMode}
          </span>
        )}

        {/* Selected group indicator */}
        {selectedGroup && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/70 ml-1">
            {RUNE_GROUP_BY_ID.get(selectedGroup)?.label ?? selectedGroup}
          </span>
        )}
      </div>

      {/* Tier 2 panel — per-primitive selection within selected rune group */}
      {selectedGroupData && (
        <TierTwoPanel
          group={selectedGroupData}
          onClose={() => handleSelectGroup(null)}
        />
      )}

      {/* Legend */}
      <div
        className="absolute bottom-3 left-3 z-10 flex flex-col gap-1 rounded border border-gray-800/60 bg-gray-900/85 px-2.5 py-2 backdrop-blur-sm text-[9px] font-mono text-gray-500"
        style={{ pointerEvents: 'none' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-400">☰</span>
          <span className="text-white/60">Rune = primitive group anchor (Layer 1)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 opacity-70 flex-shrink-0" />
          <span>Dot = kit cluster (Layer 2)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 opacity-70 flex-shrink-0" />
          <span className="text-purple-400/80">Dual-dot = hybrid kit (buffer zone)</span>
        </div>
        <div className="text-gray-700 mt-0.5">Tap rune to select group → compose primitives</div>
      </div>

      {/* Pixi canvas */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{
          cursor: tier1InputMode === 'sign' ? 'crosshair' : interactionMode === 'lasso' ? 'crosshair' : 'grab',
          touchAction: 'none',
        }}
      />
    </div>
  );
}
