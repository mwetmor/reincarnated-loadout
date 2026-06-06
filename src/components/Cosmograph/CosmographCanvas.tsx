/**
 * CosmographCanvas.tsx — Pixi.js v7 WebGL rendering surface for /forge.
 *
 * Phase 1: Pixi.js Application mount + deep-space background. Canvas renders.
 * Phase 2: 570 primitive stars with bdi_weight brightness + element-coupling color +
 *           provenance-tag visual encoding. 77 first-class stars at default zoom;
 *           493 drill stars hidden until zoom > 1.5×.
 * Phase 3: 1000 PROVISIONAL constellation MST lines + 7 faction halos + region-label overlays.
 * Phase 4: Lasso interaction + side panel + flag-enum visualization.
 * Phase 5: Perf pass + zoom + viewport culling + Vercel deploy.
 *
 * Painterly cosmic aesthetic (register-locked per cosmograph-pivot § 3 + § 4):
 * - Deep-space background: near-black → navy at edges
 * - Stars: soft-glow radial alpha falloff (NOT crisp pixel disks)
 * - Avoid: solar-system / orbital-path / hexagonal-grid reflexes
 *
 * Discipline #11 — empirical inspection: all visual encoding decisions validated
 * against actual substrate data (provenance tags, bdi_weight ranges, element couplings)
 * before implementation. See Phase 2 inspection notes in AGENT_STATE.md.
 */

import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import type { CosmographData } from '../../data/cosmographData';
import type { PrimitiveEntry } from '../../data/cosmographTypes';

interface CosmographCanvasProps {
  data: CosmographData;
}

// ─── Coordinate Projection ───────────────────────────────────────────────────

interface ProjectionState {
  scale: number;
  offsetX: number;
  offsetY: number;
  umapMinX: number;
  umapMinY: number;
}

function computeProjection(
  canvasW: number,
  canvasH: number,
  data: CosmographData,
  paddingFraction = 0.07
): ProjectionState {
  const allX = data.primitives.map(p => p.embedding_x);
  const allY = data.primitives.map(p => p.embedding_y);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;

  const padX = rangeX * paddingFraction;
  const padY = rangeY * paddingFraction;

  const scaleX = canvasW / (rangeX + padX * 2);
  const scaleY = canvasH / (rangeY + padY * 2);
  // Uniform scale preserves UMAP aspect ratio
  const scale = Math.min(scaleX, scaleY);

  const renderW = (rangeX + padX * 2) * scale;
  const renderH = (rangeY + padY * 2) * scale;

  return {
    scale,
    offsetX: (canvasW - renderW) / 2 + padX * scale,
    offsetY: (canvasH - renderH) / 2 + padY * scale,
    umapMinX: minX,
    umapMinY: minY,
  };
}

function toCanvas(
  ux: number,
  uy: number,
  proj: ProjectionState
): { x: number; y: number } {
  return {
    x: proj.offsetX + (ux - proj.umapMinX) * proj.scale,
    y: proj.offsetY + (uy - proj.umapMinY) * proj.scale,
  };
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function CosmographCanvas({ data }: CosmographCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);

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
    const proj = computeProjection(w, h, data);

    // Layer order (back to front):
    // 1. Deep-space background
    // 2. Edge vignette
    // 3. Star layer (first-class + drill)
    // 4. Element orientation labels
    // 5. Provisional badge

    const bg = drawDeepSpaceBackground(app);
    app.stage.addChildAt(bg, 0);
    drawEdgeVignette(app);

    // Phase 2: 570 stars
    renderStarLayer(app, data, proj);

    // Phase 2: element labels (orientation aid at default zoom)
    renderElementLabels(app, data, proj);

    // Phase 2: subtle PROVISIONAL watermark
    renderProvisionalBadge(app);

    const visibleCount = data.primitives.filter(p => p.visibility_at_default_zoom).length;
    const drillCount = data.primitives.filter(p => !p.visibility_at_default_zoom).length;
    console.info(
      `[CosmographCanvas Phase 2] Pixi.js ${PIXI.VERSION} — ${w}×${h}px — ` +
      `scale ${proj.scale.toFixed(2)}px/UMAP-unit — ` +
      `${visibleCount} first-class stars visible · ${drillCount} drill stars hidden`
    );

    // Cleanup on unmount
    return () => {
      app.destroy(true, { children: true, texture: true, baseTexture: true });
      appRef.current = null;
    };
  }, [data]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ cursor: 'crosshair' }}
    />
  );
}
