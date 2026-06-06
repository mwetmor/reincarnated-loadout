/**
 * CosmographCanvas.tsx — Pixi.js v7 WebGL rendering surface for /forge.
 *
 * Phase 1: Pixi.js Application mount + deep-space background. Canvas renders.
 * Phase 2: 570 primitive stars with bdi_weight brightness + element-coupling color +
 *           provenance-tag visual encoding. 77 first-class stars at default zoom;
 *           493 drill stars hidden until zoom > 1.5×.
 * Phase 3: 1000 PROVISIONAL constellation centroid dim-points + MST lines (cull-by-default)
 *           + 7 faction halos + region-label overlays + substrate disclosure.
 * Phase 4: Lasso interaction + composite-score resolution + side panel integration.
 * Phase 5: Perf pass + zoom + viewport culling + Vercel deploy.
 *
 * Painterly cosmic aesthetic (register-locked per cosmograph-pivot § 3 + § 4):
 * - Deep-space background: near-black → navy at edges
 * - Stars: soft-glow radial alpha falloff (NOT crisp pixel disks)
 * - Avoid: solar-system / orbital-path / hexagonal-grid reflexes
 *
 * Phase 3 cull-by-default architecture (Discipline #1 math; gandalf design-state record):
 * - Default zoom: 1000 centroid dim-points (near-zero render cost)
 * - Zoom-in (Z key): MST lines for in-viewport kits (~4,950 segments max)
 * - Faction halo click: MST lines for selected faction's kits (~4,700 segments max)
 * - Lasso: MST lines for lasso-resolved kits (Phase 4)
 *
 * Phase 4 pointer event architecture:
 * - LassoLayer owns pointerdown/move/up — intercepts drag-start
 * - Faction-click fires on pointerup ONLY IF drag distance < MIN_CLICK_PX
 * - This avoids dual-event conflicts: drag = lasso; click = faction highlight
 *
 * Discipline #11 — empirical inspection: all visual encoding decisions validated
 * against actual substrate data (provenance tags, bdi_weight ranges, element couplings,
 * faction centroid nulls, mechanic cluster positions) before implementation.
 * See Phase 2+3 inspection notes in AGENT_STATE.md.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import type { CosmographData } from '../../data/cosmographData';
import type { PrimitiveEntry } from '../../data/cosmographTypes';
import {
  computeProjection,
  toCanvas,
  type ProjectionState,
} from './coordinateProjection';
import {
  buildAllMSTEdges,
} from '../../utils/mstConstellation';
import {
  renderConstellationCentroids,
  createConstellationLineLayer,
  drawConstellationLines,
  getKitsInViewport,
} from './ConstellationLayer';
import {
  renderFactionHalos,
  renderFactionLabels,
} from './FactionHaloLayer';
import {
  renderEmergentMechanicLabels,
  renderTierAnnotationBlock,
  renderChainArchitectureLabels,
} from './RegionLabelLayer';
import { renderSubstrateDisclosure } from './SubstrateDisclosure';
import { attachLassoLayer, clearLasso } from './LassoLayer';
import { resolveLasso } from '../../utils/lassoResolution';
import type { LassoResolutionResult } from '../../utils/lassoResolution';

// Minimum pointer travel distance (px) to classify as a drag (lasso) vs a click (faction)
const MIN_CLICK_PX = 6;

interface CosmographCanvasProps {
  data: CosmographData;
  /** Called when lasso resolves — Forge.tsx shows SidePanel with result. */
  onLassoResult: (result: LassoResolutionResult | null) => void;
  /**
   * Ref that Forge.tsx stores — the canvas populates it with a clear function
   * so the SidePanel "Clear" button can trigger a visual lasso clear.
   */
  clearLassoRef?: React.MutableRefObject<(() => void) | null>;
}

// ─── Element Color Palette ────────────────────────────────────────────────────
// Per dispatch § 3.1 + element_biases.py:28 matrix.
// Empirically verified: element nodes themselves have empty element_coupling_json;
// their identity is their primitive_id (e.g. "element_fire").
// Sub-element flavors carry ["fire"], ["water"], etc. in element_coupling_json.

const ELEMENT_COLORS: Record<string, number> = {
  fire:      0xE85520, // warm red-orange
  water:     0x2299DD, // cyan-blue
  earth:     0xA07040, // amber-brown
  wind:      0x88CC88, // pale green
  lightning: 0xAA66EE, // violet
  holy:      0xDDAA33, // warm gold
  shadow:    0x7744AA, // deep purple
  physical:  0x8899AA, // neutral steel
};

// DEX-uncoupled accent per dispatch § 3.1 + Surface C verdict
const DEX_COLOR = 0x44DDCC; // teal-cyan accent

// Neutral starlight white for uncoupled primitives
const NEUTRAL_COLOR = 0xCCDDEE;

/**
 * Derive primary color for a primitive based on its element coupling
 * and/or primitive family/id.
 *
 * Resolution order (Discipline #11 — verified against actual data):
 * 1. If primitive_family === 'element', read element from primitive_id suffix
 * 2. If element_coupling_json has entries, use first coupling
 * 3. If attribute_coupling_json has DEX, use DEX accent
 * 4. If attribute_coupling_json has STR, lean physical
 * 5. Fallback: neutral starlight
 */
function getPrimitiveColor(p: PrimitiveEntry): number {
  // 1. Element nodes: id like "element_fire" → color from id suffix
  if (p.primitive_family === 'element') {
    const elemName = p.primitive_id.replace('element_', '');
    return ELEMENT_COLORS[elemName] ?? NEUTRAL_COLOR;
  }

  // 2. Element-coupled primitives (sub_element_flavor, some mechanics)
  try {
    const elementCoupling = JSON.parse(p.element_coupling_json) as string[];
    if (elementCoupling.length > 0) {
      const firstElem = elementCoupling[0];
      return ELEMENT_COLORS[firstElem] ?? NEUTRAL_COLOR;
    }
  } catch {
    // malformed JSON — fall through
  }

  // 3. DEX-coupled (rare — Architecture A asymmetry)
  try {
    const attrCoupling = JSON.parse(p.attribute_coupling_json) as string[];
    if (attrCoupling.includes('DEX')) {
      return DEX_COLOR;
    }
    // STR-coupled weapon forms: lean physical-steel
    if (attrCoupling.includes('STR')) {
      return ELEMENT_COLORS['physical'];
    }
  } catch {
    // fall through
  }

  // 4. Neutral
  return NEUTRAL_COLOR;
}

// ─── Provenance-Tag Visual Encoding ──────────────────────────────────────────
// Per dispatch § 3.1 + cosmograph_README design-history visibility section.
// Empirically verified provenance tags found in data:
//   T4_strategy:          'active-v1.13', 'retired-but-preserved'
//   skill_geometry:       'CORE_14', 'CORE_MARGINAL_2', 'B11_EXPANSION', 'B13_DEFENSIVE_MOBILITY'
//   sub_element_flavor:   'rotating_flavor_pool_v1_2026-06-01',
//                         'architecture_A_taxonomy_sibling_v1_2026-06-01'
//   attribute:            'primary_attribute_v1', 'deferred_placeholder_v1_2026-05-24'
//   element:              'canonical_7_rotating', 'canonical_plus_physical'
// Many other tags also appear (weapon_form_lookup_v1.0_cycle10, etc.)

type ProvenanceProfile = {
  alphaMultiplier: number;    // applied to base alpha from bdi_weight
  colorShift: number | null;  // additive hue shift as blended color (null = no shift)
  outlineOnly: boolean;       // if true: draw as outline circle instead of filled
  dashed: boolean;            // if true: star pulse animation (Phase 5) or static faint
};

function getProvenanceProfile(p: PrimitiveEntry): ProvenanceProfile {
  const tag = p.provenance_tag;

  // Retired — ghost star (brightness 0.20 per dispatch § 3.1; bdi_weight is already 0.20)
  if (tag === 'retired-but-preserved') {
    return { alphaMultiplier: 1.0, colorShift: null, outlineOnly: false, dashed: false };
    // bdi_weight=0.20 already drives low alpha; no extra reduction needed
  }

  // VIT deferred placeholder — faint outline only
  if (tag === 'deferred_placeholder_v1_2026-05-24') {
    return { alphaMultiplier: 0.6, colorShift: null, outlineOnly: true, dashed: false };
  }

  // B11_EXPANSION — slight cyan chromatic shift
  if (tag === 'B11_EXPANSION') {
    return { alphaMultiplier: 1.0, colorShift: 0x0044AA, outlineOnly: false, dashed: false };
  }

  // B13_DEFENSIVE_MOBILITY — slight green chromatic shift
  if (tag === 'B13_DEFENSIVE_MOBILITY') {
    return { alphaMultiplier: 1.0, colorShift: 0x003322, outlineOnly: false, dashed: false };
  }

  // Architecture A taxonomy siblings (9 physical sub-element star analogs)
  if (tag === 'architecture_A_taxonomy_sibling_v1_2026-06-01') {
    return { alphaMultiplier: 0.7, colorShift: 0x110022, outlineOnly: false, dashed: false };
  }

  // Default — no special encoding
  return { alphaMultiplier: 1.0, colorShift: null, outlineOnly: false, dashed: false };
}

// ─── Star Size Rules ──────────────────────────────────────────────────────────
// Per dispatch § 3.1:
// - Base: 2-3 px radius
// - T4 capstone + high bdi (≥ 0.85): 5-6 px with bloom
// - Retired ghost: 1.5 px

function getStarRadius(p: PrimitiveEntry): number {
  if (p.provenance_tag === 'retired-but-preserved') return 1.5;
  if (p.primitive_family === 'T4_strategy' && p.bdi_weight >= 0.85) return 5.5;
  if (p.bdi_weight >= 0.85) return 4.0;
  if (p.bdi_weight >= 0.70) return 3.0;
  return 2.0;
}

// ─── Soft-Glow Star Drawing ───────────────────────────────────────────────────
// Painterly cosmic aesthetic: radial alpha falloff rather than crisp disk.
// Implemented as: inner filled circle + outer semi-transparent bloom ring.

function drawStar(
  g: PIXI.Graphics,
  x: number,
  y: number,
  radius: number,
  color: number,
  alpha: number,
  outlineOnly: boolean,
  bloomFactor: number = 1.8
): void {
  if (outlineOnly) {
    // Faint outline ring only (VIT deferred placeholder)
    g.lineStyle(0.8, color, alpha * 0.7);
    g.beginFill(0x000000, 0); // transparent fill
    g.drawCircle(x, y, radius);
    g.endFill();
    g.lineStyle(0);
    return;
  }

  // Outer bloom ring (soft glow)
  const bloomRadius = radius * bloomFactor;
  g.beginFill(color, alpha * 0.15);
  g.drawCircle(x, y, bloomRadius);
  g.endFill();

  // Mid glow
  g.beginFill(color, alpha * 0.30);
  g.drawCircle(x, y, radius * 1.3);
  g.endFill();

  // Core circle (bright)
  g.beginFill(color, alpha);
  g.drawCircle(x, y, radius);
  g.endFill();
}

// ─── Color Blending Utility ───────────────────────────────────────────────────
// Blends base color with a shift color at a fixed ratio for provenance-tag tinting.

function blendColor(base: number, shift: number, ratio: number = 0.25): number {
  const br = (base >> 16) & 0xFF;
  const bg = (base >> 8) & 0xFF;
  const bb = base & 0xFF;
  const sr = (shift >> 16) & 0xFF;
  const sg = (shift >> 8) & 0xFF;
  const sb = shift & 0xFF;
  const r = Math.round(br + (sr - br) * ratio);
  const gc = Math.round(bg + (sg - bg) * ratio);
  const b = Math.round(bb + (sb - bb) * ratio);
  return (r << 16) | (gc << 8) | b;
}

// ─── Background Drawing ───────────────────────────────────────────────────────

function drawDeepSpaceBackground(app: PIXI.Application): PIXI.Graphics {
  const bg = new PIXI.Graphics();

  // Near-black base fill
  bg.beginFill(0x020408, 1.0);
  bg.drawRect(0, 0, app.screen.width, app.screen.height);
  bg.endFill();

  return bg;
}

function drawEdgeVignette(app: PIXI.Application): void {
  const edgeAlpha = 0.35;
  const edgeColor = 0x000812;
  const w = app.screen.width;
  const h = app.screen.height;

  const edges = [
    { x: 0, y: 0, width: w * 0.15, height: h },
    { x: w * 0.85, y: 0, width: w * 0.15, height: h },
    { x: 0, y: 0, width: w, height: h * 0.10 },
    { x: 0, y: h * 0.90, width: w, height: h * 0.10 },
  ];

  for (const e of edges) {
    const eg = new PIXI.Graphics();
    eg.beginFill(edgeColor, edgeAlpha);
    eg.drawRect(e.x, e.y, e.width, e.height);
    eg.endFill();
    app.stage.addChild(eg);
  }
}

// ─── Phase 2: Star Layer Rendering ───────────────────────────────────────────

/**
 * Renders all 570 substrate primitive stars.
 *
 * Visual encoding per dispatch § 3.1 + Discipline #11 empirical validation:
 * - Brightness: alpha = 0.35 + 0.65 × bdi_weight
 * - Color: element-coupling → element hue; DEX → teal accent; neutral → starlight
 * - Size: T4 capstone 5-6px; retired 1.5px; high-bdi 4px; base 2px
 * - Provenance: retired ghost; VIT outline-only; B11 cyan-shift; B13 green-shift
 * - Visibility: first-class (77) always visible; drill (493) hidden until zoom > 1.5×
 *
 * Returns two Graphics objects: one for first-class stars, one for drill stars.
 * The drill-stars container is hidden by default (visible=false).
 */
function renderStarLayer(
  app: PIXI.Application,
  data: CosmographData,
  proj: ProjectionState
): { firstClassLayer: PIXI.Container; drillLayer: PIXI.Container } {
  const firstClassLayer = new PIXI.Container();
  const drillLayer = new PIXI.Container();
  drillLayer.visible = false; // hidden at default zoom — Phase 5 zoom logic shows these

  // Use a single Graphics object per layer for batching (performance)
  const firstClassG = new PIXI.Graphics();
  const drillG = new PIXI.Graphics();

  for (const p of data.primitives) {
    const { x, y } = toCanvas(p.embedding_x, p.embedding_y, proj);

    // Base brightness per bdi_weight
    const baseAlpha = 0.35 + 0.65 * p.bdi_weight;

    // Element color
    let color = getPrimitiveColor(p);

    // Provenance profile
    const profile = getProvenanceProfile(p);
    const finalAlpha = baseAlpha * profile.alphaMultiplier;

    // Apply chromatic shift if present
    if (profile.colorShift !== null) {
      color = blendColor(color, profile.colorShift, 0.30);
    }

    const radius = getStarRadius(p);

    const g = p.visibility_at_default_zoom ? firstClassG : drillG;
    drawStar(g, x, y, radius, color, finalAlpha, profile.outlineOnly);
  }

  firstClassLayer.addChild(firstClassG);
  drillLayer.addChild(drillG);

  app.stage.addChild(firstClassLayer);
  app.stage.addChild(drillLayer);

  return { firstClassLayer, drillLayer };
}

// ─── Phase 2: Family Label Overlay (first-class stars only) ──────────────────
// Render subtle labels for the 8 element stars at default zoom
// to give orientation context. All other labels deferred to Phase 3
// region-label overlay system.

function renderElementLabels(
  app: PIXI.Application,
  data: CosmographData,
  proj: ProjectionState
): void {
  const labelStyle = new PIXI.TextStyle({
    fontFamily: 'ui-monospace, monospace',
    fontSize: 9,
    fill: 0x8899BB,
    align: 'center',
    letterSpacing: 0.5,
  });

  for (const p of data.primitives) {
    // Only label element-family first-class stars at default zoom
    if (p.primitive_family !== 'element') continue;
    if (!p.visibility_at_default_zoom) continue;

    const { x, y } = toCanvas(p.embedding_x, p.embedding_y, proj);
    const label = new PIXI.Text(p.primitive_label.toLowerCase(), labelStyle);
    label.x = x - label.width / 2;
    label.y = y + getStarRadius(p) + 3;
    label.alpha = 0.55;
    app.stage.addChild(label);
  }
}

// ─── Phase 2: PROVISIONAL watermark ─────────────────────────────────────────
// Subtle status indicator at top of canvas distinguishing this from /loadout.

function renderProvisionalBadge(app: PIXI.Application): void {
  const badgeStyle = new PIXI.TextStyle({
    fontFamily: 'ui-monospace, monospace',
    fontSize: 10,
    fill: 0x444466,
    align: 'right',
    letterSpacing: 1.5,
  });
  const text = new PIXI.Text('SUBSTRATE COSMOGRAPH · PHASE A · ALL CONSTELLATIONS PROVISIONAL', badgeStyle);
  text.x = app.screen.width - text.width - 12;
  text.y = 10;
  text.alpha = 0.45;
  app.stage.addChild(text);
}

// ─── Phase 4: Interaction hint ────────────────────────────────────────────────

function renderInteractionHint(app: PIXI.Application): PIXI.Text {
  const style = new PIXI.TextStyle({
    fontFamily: 'ui-monospace, monospace',
    fontSize: 9,
    fill: 0x445566,
    align: 'left',
    letterSpacing: 0.4,
  });
  const text = new PIXI.Text(
    '[Z] constellation lines · click faction · drag to lasso',
    style
  );
  text.x = 12;
  text.y = 12;
  text.alpha = 0.45;
  app.stage.addChild(text);
  return text;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CosmographCanvas({ data, onLassoResult, clearLassoRef }: CosmographCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);

  // Phase 3 interaction state (refs to avoid React re-renders on animation)
  const constellationLineLayerRef = useRef<PIXI.Graphics | null>(null);
  const mstEdgeMapRef = useRef<Map<string, import('../../utils/mstConstellation').MSTEdge[]>>(new Map());
  const kitMapRef = useRef<Map<string, import('../../data/cosmographTypes').KitConstellation>>(new Map());
  const projRef = useRef<ProjectionState | null>(null);
  const showingLinesRef = useRef<boolean>(false);
  const selectedFactionRef = useRef<string | null>(null);
  const factionMemberMapRef = useRef<Map<string, string[]>>(new Map()); // faction_id → kit_ids

  // Phase 4 lasso refs
  const lassoGraphicsRef = useRef<PIXI.Graphics | null>(null);
  const lassoDetachRef = useRef<(() => void) | null>(null);
  const onLassoResultRef = useRef(onLassoResult);
  onLassoResultRef.current = onLassoResult; // keep current without re-triggering useEffect

  // Key handler for [Z] toggle
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'z' && e.key !== 'Z') return;
    const lineLayer = constellationLineLayerRef.current;
    const app = appRef.current;
    const proj = projRef.current;
    if (!lineLayer || !app || !proj) return;

    showingLinesRef.current = !showingLinesRef.current;

    if (!showingLinesRef.current) {
      // Clear lines
      lineLayer.clear();
      return;
    }

    // Render viewport-culled constellation lines (zoom-in mode)
    const viewportKits = getKitsInViewport(
      data.kits,
      proj,
      app.screen.width,
      app.screen.height,
      80
    );

    drawConstellationLines(
      lineLayer,
      viewportKits,
      kitMapRef.current,
      mstEdgeMapRef.current,
      proj
    );

    console.info(
      `[CosmographCanvas Phase 3] Z-toggle: rendering ${viewportKits.size} constellation MST sets ` +
      `(~${viewportKits.size * 33} segments)`
    );
  }, [data.kits]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Create Pixi.js Application
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

    // Compute UMAP → canvas projection
    const proj = computeProjection(w, h, data.primitives);
    projRef.current = proj;

    // Pre-compute MST edges for all 1000 kits (Kruskal; ~33 edges/kit)
    const t0 = performance.now();
    const mstEdgeMap = buildAllMSTEdges(data.kits, data.primitives);
    const mstMs = performance.now() - t0;
    mstEdgeMapRef.current = mstEdgeMap;

    // Build kit lookup map
    const kitMap = new Map<string, import('../../data/cosmographTypes').KitConstellation>();
    for (const kit of data.kits) {
      kitMap.set(kit.kit_id, kit);
    }
    kitMapRef.current = kitMap;

    // Build faction member map for faction-highlight interaction
    const factionMemberMap = new Map<string, string[]>();
    for (const faction of data.factionOverlays.factions) {
      // member_kit_ids may be present; if not, we'll need to resolve by assignment
      if (faction.member_kit_ids && faction.member_kit_ids.length > 0) {
        factionMemberMap.set(faction.faction_id, faction.member_kit_ids);
      }
    }
    factionMemberMapRef.current = factionMemberMap;

    // ── Layer order (back to front) ──────────────────────────────────────────
    // 1. Deep-space background
    // 2. Edge vignette
    // 3. Faction halos (translucent polygons — behind stars for depth)
    // 4. Region labels (emergent mechanic families + tier block)
    // 5. Constellation centroid dim-points (1000 dim points at default zoom)
    // 6. Constellation MST lines (empty at start; populated on zoom/lasso/faction)
    // 7. Star layer (first-class + drill)
    // 8. Element orientation labels
    // 9. Faction labels
    // 10. Substrate disclosure
    // 11. PROVISIONAL watermark
    // 12. Interaction hint

    const bg = drawDeepSpaceBackground(app);
    app.stage.addChildAt(bg, 0);
    drawEdgeVignette(app);

    // Phase 3: Faction halos (behind everything else for depth)
    renderFactionHalos(app, data.factionOverlays.factions, proj);

    // Phase 3: Region labels — emergent mechanic families
    renderEmergentMechanicLabels(app, data.regionLabels, proj);

    // Phase 3: Tier annotation block + chain architecture
    renderTierAnnotationBlock(app, proj);
    renderChainArchitectureLabels(app, proj);

    // Phase 3: Constellation centroid dim-points (default zoom state)
    renderConstellationCentroids(app, data.kits, proj);

    // Phase 3: MST line layer (empty at start — populated via Z-key or faction click)
    const constellationLineLayer = createConstellationLineLayer(app);
    constellationLineLayerRef.current = constellationLineLayer;

    // Phase 2: 570 stars (rendered ABOVE constellation layers so stars read clearly)
    renderStarLayer(app, data, proj);

    // Phase 2: element labels (orientation aid at default zoom)
    renderElementLabels(app, data, proj);

    // Phase 3: Faction labels (above stars so they're readable)
    renderFactionLabels(app, data.factionOverlays.factions, proj);

    // Phase 3: Substrate-honest disclosure (bottom-left)
    renderSubstrateDisclosure(app);

    // Phase 2: subtle PROVISIONAL watermark
    renderProvisionalBadge(app);

    // Phase 4: Update interaction hint to include lasso
    renderInteractionHint(app);

    // Phase 4: Unified pointer event architecture
    // LassoLayer owns pointerdown/pointermove/pointerup for drag (lasso).
    // Faction-click fires on pointerup ONLY IF drag distance < MIN_CLICK_PX.
    //
    // Pointer-down tracking for click vs drag discrimination:
    let pointerDownX = 0;
    let pointerDownY = 0;
    let isDragging = false;

    app.stage.eventMode = 'static';
    app.stage.hitArea = new PIXI.Rectangle(0, 0, w, h);

    // Track pointer-down position (LassoLayer will also receive this event)
    const onStagePointerDown = (event: PIXI.FederatedPointerEvent) => {
      pointerDownX = event.globalX;
      pointerDownY = event.globalY;
      isDragging = false;
    };

    const onStagePointerMove = (event: PIXI.FederatedPointerEvent) => {
      if (!isDragging) {
        const dx = event.globalX - pointerDownX;
        const dy = event.globalY - pointerDownY;
        if (Math.sqrt(dx * dx + dy * dy) >= MIN_CLICK_PX) {
          isDragging = true;
        }
      }
    };

    const onStagePointerUp = (event: PIXI.FederatedPointerEvent) => {
      // Only fire faction-click if this was a true click (not a drag/lasso)
      if (isDragging) return;

      const lineLayer = constellationLineLayerRef.current;
      if (!lineLayer) return;

      const clickX = event.globalX;
      const clickY = event.globalY;

      // Find which faction's halo the click falls in
      let clickedFaction: string | null = null;
      for (const faction of data.factionOverlays.factions) {
        if (pointInConvexHull(clickX, clickY, faction.polygon_convex_hull, proj)) {
          clickedFaction = faction.faction_id;
          break;
        }
      }

      if (clickedFaction === null) {
        // Click outside all halos — clear constellation lines (but keep lasso result)
        if (selectedFactionRef.current !== null) {
          selectedFactionRef.current = null;
          showingLinesRef.current = false;
          lineLayer.clear();
        }
        return;
      }

      if (clickedFaction === selectedFactionRef.current) {
        // Toggle off
        selectedFactionRef.current = null;
        showingLinesRef.current = false;
        lineLayer.clear();
        return;
      }

      selectedFactionRef.current = clickedFaction;
      showingLinesRef.current = true;

      const memberIds = factionMemberMapRef.current.get(clickedFaction);
      if (!memberIds || memberIds.length === 0) {
        console.info(`[CosmographCanvas Phase 4] Faction ${clickedFaction} has no member_kit_ids`);
        lineLayer.clear();
        return;
      }

      const factionKitSet = new Set<string>(memberIds);
      drawConstellationLines(
        lineLayer,
        factionKitSet,
        kitMapRef.current,
        mstEdgeMapRef.current,
        proj
      );

      console.info(
        `[CosmographCanvas Phase 4] Faction ${clickedFaction} highlighted: ` +
        `${factionKitSet.size} kits (~${factionKitSet.size * 33} segments)`
      );
    };

    app.stage.on('pointerdown', onStagePointerDown);
    app.stage.on('pointermove', onStagePointerMove);
    app.stage.on('pointerup', onStagePointerUp);
    app.stage.on('pointerupoutside', onStagePointerUp);

    // Phase 4: Attach lasso layer (added to stage ABOVE constellation lines)
    // LassoLayer adds its graphics to stage automatically.
    const { lassoGraphics, detach: detachLasso } = attachLassoLayer(app, proj, {
      onLassoClose: (verticesUMAP) => {
        const t0 = performance.now();

        const result = resolveLasso({
          lassoPolygon: verticesUMAP,
          primitives: data.primitives,
          kits: data.kits,
          primitiveById: data.primitiveById,
          topN: 3,
        });

        const resolveMs = performance.now() - t0;

        console.info(
          `[CosmographCanvas Phase 4] Lasso resolved in ${resolveMs.toFixed(2)}ms — ` +
          `${result.lassoPrimitiveIds.size} primitives enclosed · ` +
          `${result.matches.length} matches · ` +
          `emptyLasso=${result.emptyLasso} · ambiguous=${result.ambiguous} · noBestMatch=${result.noBestMatch}`
        );

        // Draw constellation MST lines for matched kits
        const lineLayer = constellationLineLayerRef.current;
        if (lineLayer && result.matches.length > 0) {
          const matchedKitIds = new Set(result.matches.map(m => m.kit.kit_id));
          drawConstellationLines(
            lineLayer,
            matchedKitIds,
            kitMapRef.current,
            mstEdgeMapRef.current,
            proj
          );
          showingLinesRef.current = true;
        } else if (lineLayer && result.emptyLasso) {
          lineLayer.clear();
          showingLinesRef.current = false;
        }

        // Notify Forge.tsx for side panel
        onLassoResultRef.current(result);
      },
      onLassoClear: () => {
        // Clear constellation lines when new lasso starts
        const lineLayer = constellationLineLayerRef.current;
        if (lineLayer && showingLinesRef.current) {
          lineLayer.clear();
          showingLinesRef.current = false;
        }
        // Clear side panel
        onLassoResultRef.current(null);
      },
    });

    lassoGraphicsRef.current = lassoGraphics;
    lassoDetachRef.current = detachLasso;

    // Expose clear function to parent (for SidePanel "Clear" button)
    if (clearLassoRef) {
      clearLassoRef.current = () => {
        clearLasso(lassoGraphics);
        const lineLayer = constellationLineLayerRef.current;
        if (lineLayer) {
          lineLayer.clear();
          showingLinesRef.current = false;
        }
        selectedFactionRef.current = null;
        onLassoResultRef.current(null);
      };
    }

    const visibleCount = data.primitives.filter(p => p.visibility_at_default_zoom).length;
    const drillCount = data.primitives.filter(p => !p.visibility_at_default_zoom).length;
    console.info(
      `[CosmographCanvas Phase 4] Pixi.js ${PIXI.VERSION} — ${w}×${h}px — ` +
      `scale ${proj.scale.toFixed(2)}px/UMAP-unit — ` +
      `${visibleCount} first-class stars · ${drillCount} drill stars · ` +
      `MST pre-computed in ${mstMs.toFixed(1)}ms · ` +
      `${data.kits.length} constellation centroids · ` +
      `${data.factionOverlays.factions.length} faction halos · ` +
      `lasso layer active`
    );

    // Register keyboard handler
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      lassoDetachRef.current?.();
      lassoDetachRef.current = null;
      lassoGraphicsRef.current = null;
      app.destroy(true, { children: true, texture: true, baseTexture: true });
      appRef.current = null;
      constellationLineLayerRef.current = null;
      projRef.current = null;
    };
  }, [data, handleKeyDown]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ cursor: 'crosshair' }}
    />
  );
}

// ─── Geometry utilities ────────────────────────────────────────────────────────

/**
 * Point-in-convex-hull test using the cross-product sign method.
 * Hull vertices are in UMAP space; point is in canvas space.
 * Converts hull to canvas space before testing.
 *
 * Used for faction halo click interaction.
 */
function pointInConvexHull(
  canvasX: number,
  canvasY: number,
  hull: [number, number][],
  proj: ProjectionState
): boolean {
  if (hull.length < 3) return false;

  // Convert hull to canvas coords
  const canvasHull = hull.map(([hx, hy]) => toCanvas(hx, hy, proj));

  // Cross-product sign test for convex polygon containment
  let sign = 0;
  for (let i = 0; i < canvasHull.length; i++) {
    const p1 = canvasHull[i];
    const p2 = canvasHull[(i + 1) % canvasHull.length];
    const cross = (p2.x - p1.x) * (canvasY - p1.y) - (p2.y - p1.y) * (canvasX - p1.x);
    if (cross === 0) continue; // on edge
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (sign !== s) return false;
  }
  return true;
}
