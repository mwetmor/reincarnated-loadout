// atlasLens.ts — the viewBox-lens math for the atlas v1 zoom (spec §8).
//
// PURE MODULE. No React, no DOM APIs — everything here operates on plain numbers
// and (for bound derivation) the SVG SOURCE STRING. That keeps the load-bearing
// math unit-testable under vitest's `node` environment, and makes the two bounds
// provably DERIVED FROM THE ARTIFACT (§8.2, §4c never-invent): we parse the very
// bytes that become the mounted SVG rather than restating any constant.
//
// LAWS IMPLEMENTED (spec §8):
//   §8.2  Both bounds derived from the mounted artifact, never hardcoded.
//         - S_min = aspect-fit of union(canvas ∪ hull-polyline px bbox) + margin.
//                   The hull is the SVG's ONLY dashed <polyline> (dasharray "7 5").
//         - S_max = TARGET_D / (2·r_min_selectable), where r_min_selectable is the
//                   MIN radius among selection-wirable marks ONLY: [data-kit] +
//                   [data-core] (meso ghosts). Drill-in glyphs (data-el=ghost with
//                   NO data-core) are EXCLUDED — they do not drag the ceiling.
//   §8.1  Continuous scale S clamped to [S_min, S_max]; ×1.5 button steps.
//   §8.3  Clip-tracks-view: the current viewBox drives the planeClip rect while any
//         zoom/pan state is active; reset restores the emitted rect verbatim.
//
// SCALE MODEL. S = (native viewBox width) / (current viewBox width). At S=1 the
// viewBox equals the native canvas (the whole artifact fills the wrapper). At S=8
// a 200-unit slice fills the wrapper (8× magnification). The viewBox aspect is
// pinned to the native 4:3 at every S so the artifact is never distorted.
//
// Spec: agentic_orchestration/gandalf/notes/2026-07-15-atlas-interactive-glance-spec.md §8

/** The ONE named design constant (spec §8.2): comfortable pointer-target diameter. */
export const TARGET_D = 24;

/** Margin (screen-independent px, canvas units) around the union at S_min (§8.2). */
export const FIT_MARGIN = 24;

/** ×1.5 per +/− button step and per double-click (spec §8.1). */
export const STEP_FACTOR = 1.5;

/** An axis-aligned bounding box in canvas (viewBox) coordinates. */
export interface Bbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** A viewBox: origin (minx, miny) + size (width, height), in canvas units. */
export interface ViewBox {
  minx: number;
  miny: number;
  width: number;
  height: number;
}

/** The full set of lens bounds derived from the mounted artifact at mount (§8.2). */
export interface AtlasBounds {
  /** The native viewBox emitted by the renderer (`0 0 1600 1200`). */
  native: ViewBox;
  /** The emitted planeClip <rect> attributes as NUMBERS (for arithmetic). */
  planeClip: { x: number; y: number; width: number; height: number };
  /**
   * The emitted planeClip <rect> attributes as the EXACT ORIGINAL STRINGS (e.g.
   * "96.00", not "96"). Reset restores these VERBATIM (§8.3, acceptance #39) so a
   * byte-diff of the reset rect against the emitted rect is identical.
   */
  planeClipRaw: { x: string; y: string; width: string; height: string };
  /** The emitted viewBox as the EXACT ORIGINAL STRING (reset restores verbatim). */
  nativeViewBoxRaw: string;
  /** The union bbox (canvas ∪ hull px bbox) + FIT_MARGIN — what S_min must show. */
  fitUnion: Bbox;
  /** Zoom-out floor: Matt's full-horizon view (§8.2). */
  sMin: number;
  /** Zoom-in ceiling: Matt's single-mark selection ease (§8.2). */
  sMax: number;
  /** The min selectable radius that set sMax (receipt for acceptance #36). */
  rMinSelectable: number;
  /** The hull polyline px bbox (receipt: proves the dashed line closes at S_min). */
  hullBbox: Bbox;
}

// ---- SVG-source parsing (works on the exact bytes that become the DOM) ----

/** Parse `viewBox="a b c d"` → ViewBox. Throws if absent/malformed. */
export function parseViewBox(svg: string): ViewBox {
  const m = svg.match(/viewBox="([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)"/);
  if (!m) throw new Error('atlasLens: no viewBox on the mounted SVG');
  const [, a, b, c, d] = m;
  return { minx: +a, miny: +b, width: +c, height: +d };
}

/**
 * Parse the emitted planeClip rect (`<clipPath id="planeClip"><rect x=.. y=.. w=.. h=..`).
 * Returns BOTH the numeric values (for arithmetic) AND the EXACT original attribute
 * STRINGS (for verbatim reset — §8.3, acceptance #39: "96.00" restores as "96.00").
 */
export function parsePlaneClipRect(svg: string): {
  x: number;
  y: number;
  width: number;
  height: number;
  raw: { x: string; y: string; width: string; height: string };
} {
  // The clipPath block, then the first <rect> inside it.
  const block = svg.match(/<clipPath id="planeClip">\s*<rect\b([^>]*)\/?>/);
  if (!block) throw new Error('atlasLens: no planeClip rect on the mounted SVG');
  const attrs = block[1];
  const str = (name: string): string => {
    const mm = attrs.match(new RegExp(`\\b${name}="([^"]*)"`));
    if (!mm) throw new Error(`atlasLens: planeClip rect missing ${name}`);
    return mm[1];
  };
  const rx = str('x');
  const ry = str('y');
  const rw = str('width');
  const rh = str('height');
  return { x: +rx, y: +ry, width: +rw, height: +rh, raw: { x: rx, y: ry, width: rw, height: rh } };
}

/**
 * Parse the hull polyline px bbox — the SVG's ONLY dashed <polyline> (dasharray
 * "7 5", spec §8.2). Returns the bbox of its `points`. Throws if not found.
 */
export function parseHullBbox(svg: string): Bbox {
  // Find the polyline element carrying stroke-dasharray="7 5".
  const dashMatch = svg.match(/<polyline\b[^>]*stroke-dasharray="7 5"[^>]*>/);
  // Some emitters order attributes differently; also accept points-first form.
  const el =
    dashMatch?.[0] ??
    svg.match(/<polyline\b[^>]*?points="[^"]*"[^>]*stroke-dasharray="7 5"[^>]*>/)?.[0];
  if (!el) throw new Error('atlasLens: no dashed hull polyline (dasharray "7 5") found');
  const pts = el.match(/points="([^"]*)"/);
  if (!pts) throw new Error('atlasLens: hull polyline has no points attribute');
  return pointsBbox(pts[1]);
}

/** Bbox of an SVG `points` string ("x,y x,y …" or "x y x y …"). */
export function pointsBbox(points: string): Bbox {
  const nums = points.trim().split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n));
  if (nums.length < 2 || nums.length % 2 !== 0) {
    throw new Error('atlasLens: malformed points list');
  }
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < nums.length; i += 2) {
    const x = nums[i];
    const y = nums[i + 1];
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

/**
 * The MIN radius among SELECTION-WIRABLE marks only (spec §8.2): circles carrying
 * `data-kit` (kits) OR `data-core` (meso ghosts). Drill-in ghosts (data-el="ghost"
 * with NO data-core) are EXCLUDED. Returns the min `r`, or throws if none present.
 *
 * We scan every <circle …> once; a circle is selectable iff its tag text contains
 * `data-kit=` or `data-core=`. This mirrors the runtime CSS-selector wirability
 * (atlasSelectPath.hookToSelection) exactly — same seam, same set.
 */
export function minSelectableRadius(svg: string): number {
  let min = Infinity;
  const circleRe = /<circle\b([^>]*)\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = circleRe.exec(svg)) !== null) {
    const attrs = m[1];
    const wirable = /\bdata-kit=/.test(attrs) || /\bdata-core=/.test(attrs);
    if (!wirable) continue;
    const rm = attrs.match(/\br="([-\d.]+)"/);
    if (!rm) continue;
    const r = +rm[1];
    if (Number.isFinite(r) && r > 0 && r < min) min = r;
  }
  if (!Number.isFinite(min)) {
    throw new Error('atlasLens: no selectable ([data-kit]/[data-core]) circle radii found');
  }
  return min;
}

// ---- Bound derivation (the two-bound ruling, §8.2) ----

/** Union of two bboxes. */
export function unionBbox(a: Bbox, b: Bbox): Bbox {
  return {
    x0: Math.min(a.x0, b.x0),
    y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1),
    y1: Math.max(a.y1, b.y1),
  };
}

/** Grow a bbox by `m` on every side. */
export function padBbox(b: Bbox, m: number): Bbox {
  return { x0: b.x0 - m, y0: b.y0 - m, x1: b.x1 + m, y1: b.y1 + m };
}

/**
 * S_min = aspect-fit scale that shows the whole `fitUnion` inside a viewport of the
 * native aspect (§8.2). The viewBox must cover the union in BOTH dims while holding
 * the native aspect, so vbW = max(unionW, unionH · aspect); S = nativeW / vbW.
 */
export function fitScale(fitUnion: Bbox, native: ViewBox): number {
  const aspect = native.width / native.height;
  const uW = fitUnion.x1 - fitUnion.x0;
  const uH = fitUnion.y1 - fitUnion.y0;
  const vbW = Math.max(uW, uH * aspect);
  return native.width / vbW;
}

/**
 * Derive BOTH bounds + the reset invariants from the SVG source string (spec §8.2).
 * This is the single derivation path used at runtime (on the fetched markup) AND in
 * unit tests (on a synthetic SVG string) — proving the bounds are copied from the
 * artifact, never restated. A doctored radius in the source shifts sMax with zero
 * code change (acceptance #36).
 */
export function deriveBounds(svg: string): AtlasBounds {
  const native = parseViewBox(svg);
  const clip = parsePlaneClipRect(svg);
  const hullBbox = parseHullBbox(svg);
  const rMinSelectable = minSelectableRadius(svg);

  // Capture the EXACT emitted viewBox string for verbatim reset (§8.3, acc #39).
  const vbRaw = svg.match(/viewBox="([^"]*)"/);
  const nativeViewBoxRaw = vbRaw ? vbRaw[1] : viewBoxToAttr(native);

  const canvasBbox: Bbox = {
    x0: native.minx,
    y0: native.miny,
    x1: native.minx + native.width,
    y1: native.miny + native.height,
  };
  const fitUnion = padBbox(unionBbox(canvasBbox, hullBbox), FIT_MARGIN);

  const sMin = fitScale(fitUnion, native);
  const sMax = TARGET_D / (2 * rMinSelectable);

  return {
    native,
    planeClip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height },
    planeClipRaw: clip.raw,
    nativeViewBoxRaw,
    fitUnion,
    sMin,
    sMax,
    rMinSelectable,
    hullBbox,
  };
}

// ---- Lens arithmetic (viewBox transforms; spec §8.1) ----

/** Clamp S into [sMin, sMax]. */
export function clampScale(s: number, bounds: AtlasBounds): number {
  return Math.min(bounds.sMax, Math.max(bounds.sMin, s));
}

/** The viewBox width for a given scale S (aspect pinned to native). */
export function viewWidthForScale(s: number, native: ViewBox): number {
  return native.width / s;
}

/**
 * The viewBox for a scale S, centered on canvas-point (cx, cy), then clamped so
 * the view never wanders arbitrarily far from the artifact. At/below S_min the
 * whole fitUnion is visible, so we do not pan-clamp there (the view IS the union);
 * above S_min we keep the view origin within the fitUnion so panning stays honest
 * (clip-tracks-view reveals beyond-frame marks, but the lens can't fly off entirely).
 */
export function viewBoxFor(s: number, cx: number, cy: number, bounds: AtlasBounds): ViewBox {
  const { native, fitUnion } = bounds;
  const aspect = native.width / native.height;
  const width = viewWidthForScale(s, native);
  const height = width / aspect;

  let minx = cx - width / 2;
  let miny = cy - height / 2;

  // Pan-clamp: keep the viewBox within the padded fitUnion when the view is smaller
  // than the union; when the view is larger (near S_min), center it on the union.
  const uW = fitUnion.x1 - fitUnion.x0;
  const uH = fitUnion.y1 - fitUnion.y0;

  if (width >= uW) {
    minx = fitUnion.x0 + (uW - width) / 2;
  } else {
    minx = Math.min(Math.max(minx, fitUnion.x0), fitUnion.x1 - width);
  }
  if (height >= uH) {
    miny = fitUnion.y0 + (uH - height) / 2;
  } else {
    miny = Math.min(Math.max(miny, fitUnion.y0), fitUnion.y1 - height);
  }

  return { minx, miny, width, height };
}

/** The center point of a viewBox. */
export function viewCenter(vb: ViewBox): { cx: number; cy: number } {
  return { cx: vb.minx + vb.width / 2, cy: vb.miny + vb.height / 2 };
}

/** The current scale S implied by a viewBox (native.width / vb.width). */
export function scaleOf(vb: ViewBox, native: ViewBox): number {
  return native.width / vb.width;
}

/**
 * Zoom to scale `nextS` while keeping the canvas-point under the cursor fixed
 * (cursor-anchored wheel / double-click, spec §8.1). `anchor` is the canvas-space
 * point under the pointer (from screenToCanvas); `fx`/`fy` are its fractional
 * position within the CURRENT viewBox (0..1). After the zoom the same anchor sits
 * at the same fraction, so it stays put on screen.
 */
export function zoomAtPoint(
  current: ViewBox,
  nextSRaw: number,
  anchor: { x: number; y: number },
  bounds: AtlasBounds
): ViewBox {
  const nextS = clampScale(nextSRaw, bounds);
  const width = viewWidthForScale(nextS, bounds.native);
  const height = width / (bounds.native.width / bounds.native.height);
  // Fraction of the anchor within the CURRENT view.
  const fx = current.width > 0 ? (anchor.x - current.minx) / current.width : 0.5;
  const fy = current.height > 0 ? (anchor.y - current.miny) / current.height : 0.5;
  // Desired origin so anchor lands at the same fraction of the NEW view.
  const cx = anchor.x - (fx - 0.5) * width; // == anchor.x + width*(0.5 - fx)
  const cy = anchor.y - (fy - 0.5) * height;
  return viewBoxFor(nextS, cx, cy, bounds);
}

/**
 * Map a screen-space pointer position (clientX/Y relative to the wrapper's box) to
 * a canvas-space point, given the CURRENT viewBox and the wrapper's on-screen size.
 * SVG `preserveAspectRatio` defaults to xMidYMid meet; since we pin the viewBox to
 * the native aspect AND the wrapper renders at that same aspect (w-full, h-auto),
 * there is no letterboxing and the map is a straight linear scale.
 */
export function screenToCanvas(
  px: number,
  py: number,
  rect: { width: number; height: number },
  vb: ViewBox
): { x: number; y: number } {
  const fx = rect.width > 0 ? px / rect.width : 0.5;
  const fy = rect.height > 0 ? py / rect.height : 0.5;
  return { x: vb.minx + fx * vb.width, y: vb.miny + fy * vb.height };
}

/** Pan the viewBox by a screen-space delta (drag), converting px→canvas units. */
export function panByScreen(
  current: ViewBox,
  dxScreen: number,
  dyScreen: number,
  rect: { width: number; height: number },
  bounds: AtlasBounds
): ViewBox {
  const kx = rect.width > 0 ? current.width / rect.width : 1;
  const ky = rect.height > 0 ? current.height / rect.height : 1;
  const cx = current.minx + current.width / 2 - dxScreen * kx;
  const cy = current.miny + current.height / 2 - dyScreen * ky;
  const s = scaleOf(current, bounds.native);
  return viewBoxFor(s, cx, cy, bounds);
}

/** Serialize a viewBox to the `viewBox`/`x y w h` attribute string. */
export function viewBoxToAttr(vb: ViewBox): string {
  return `${round(vb.minx)} ${round(vb.miny)} ${round(vb.width)} ${round(vb.height)}`;
}

/** Rect attributes (for the planeClip) tracking the current viewBox (§8.3). */
export function viewBoxToRectAttrs(vb: ViewBox): { x: string; y: string; width: string; height: string } {
  return {
    x: String(round(vb.minx)),
    y: String(round(vb.miny)),
    width: String(round(vb.width)),
    height: String(round(vb.height)),
  };
}

/** 4-dp rounding to keep attribute strings compact + deterministic. */
function round(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

/**
 * The ease-scale for a specific mark radius: the scale at which a mark of radius
 * `r` renders at exactly TARGET_D/2 on screen (its comfortable-select size). Used
 * by the table→chart lens-pan (§8.4): if the selected mark is smaller than that at
 * the current S, raise S to this value (clamped ≤ S_max).
 */
export function easeScaleForRadius(r: number, bounds: AtlasBounds): number {
  if (r <= 0) return bounds.sMax;
  const s = TARGET_D / (2 * r);
  return clampScale(s, bounds);
}

// ---- Transform-during-gesture (spec §8.4: compositor-only, no viewBox writes) ----

/** A CSS transform (transform-origin 0 0) mapping `from`'s render to `to`'s render. */
export interface GestureTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

/**
 * Compute the CSS transform that makes the SVG — currently rendering viewBox
 * `from` into a box of `rect` px — LOOK as if it rendered viewBox `to`, WITHOUT
 * rewriting the viewBox (spec §8.4 gesture perf: compositor-only during the
 * gesture, then a single settle-write). transform-origin is 0,0.
 *
 * A canvas point p renders under `from` at screen s0 = (p - from.min)/from.w · boxW.
 * Under `to` it renders at s1 = (p - to.min)/to.w · boxW. The map s0 → s1 is affine
 * `s1 = scale·s0 + t`, with scale = from.w/to.w and t = boxW·(from.min − to.min)/to.w
 * (x; analogous for y with boxH). Derived independent of p, so a single transform
 * reproduces the target view exactly (used only transiently; settle bakes it in).
 */
export function gestureTransform(
  from: ViewBox,
  to: ViewBox,
  rect: { width: number; height: number }
): GestureTransform {
  const scaleX = to.width > 0 ? from.width / to.width : 1;
  const scaleY = to.height > 0 ? from.height / to.height : 1;
  // We pin aspect, so scaleX == scaleY; use scaleX as the uniform scale.
  const scale = scaleX;
  const translateX = to.width > 0 ? (rect.width * (from.minx - to.minx)) / to.width : 0;
  const translateY = to.height > 0 ? (rect.height * (from.miny - to.miny)) / to.height : 0;
  // scaleY is derived only to keep the relationship explicit for readers/tests.
  void scaleY;
  return { scale, translateX, translateY };
}

/** Serialize a GestureTransform to a CSS `transform` value (origin 0 0). */
export function gestureTransformToCss(t: GestureTransform): string {
  return `translate(${round(t.translateX)}px, ${round(t.translateY)}px) scale(${round(t.scale)})`;
}
