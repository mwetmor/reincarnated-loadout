// atlasLens.ts — the artifact-derived scale math for the Build Horizon chart stage.
//
// PURE MODULE. No React, no DOM APIs — everything here operates on plain numbers
// and (for bound derivation) the SVG SOURCE STRING. That keeps the load-bearing
// math unit-testable under vitest's `node` environment, and makes S_max provably
// DERIVED FROM THE ARTIFACT (§8.2, §4c never-invent): we parse the very bytes that
// become the mounted SVG rather than restating any constant.
//
// D3 (spec §9.3, Matt 2026-07-15): the v1 zoom LENS is retired — pivots→filters,
// zoom→fixed S_max. The interactive viewBox-lens math (zoomAtPoint / panByScreen /
// gestureTransform / viewBoxFor / clip-tracks-view) is GONE with its tests. What
// SURVIVES (and is load-bearing) is §8.2's BOUND DERIVATION: the chart now mounts at
// a FIXED magnification = S_max, still derived from the mounted artifact bytes, and
// navigation is NATIVE browser scrolling (no runtime viewBox/planeClip mutation).
//
// LAWS IMPLEMENTED:
//   §8.2  S_max derived from the mounted artifact, never hardcoded.
//         - S_max = TARGET_D / (2·r_min_selectable), where r_min_selectable is the
//                   MIN radius among selection-wirable marks ONLY: [data-kit] +
//                   [data-core] (meso ghosts). Drill-in glyphs (data-el=ghost with
//                   NO data-core) are EXCLUDED — they do not drag the ceiling.
//                   At S_max every selection-wirable mark renders ≥ TARGET_D by
//                   construction — so no ease-scale logic is needed (§9.3 D3-b).
//   §9.3  Fixed-mount navigation math: the SVG renders at (stageWidth × S_max), and
//         a canvas point maps to a rendered pixel by canvasToRenderedPx(); the
//         initial scroll centers the plane rect; a table-row click centers a mark.
//         S_min (the old zoom-out floor) is NOT computed — there is no zoom-out.
//
// Spec: agentic_orchestration/gandalf/notes/2026-07-15-atlas-interactive-glance-spec.md §8.2, §9.3

/** The ONE named design constant (spec §8.2): comfortable pointer-target diameter. */
export const TARGET_D = 24;

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

/**
 * The artifact-derived mount bounds (spec §8.2 derivation, §9.3 fixed mount).
 * D3: no S_min / fitUnion / hull / reset-raw fields — there is no zoom-out floor and
 * no runtime mutation to reset. The chart mounts at `sMax` and scrolls natively.
 */
export interface AtlasBounds {
  /** The native viewBox emitted by the renderer (`0 0 1600 1200`). */
  native: ViewBox;
  /** The emitted planeClip <rect> attributes as NUMBERS — used ONLY to compute the
   *  initial scroll position (plane-rect center). The rect is NEVER mutated (§9.3). */
  planeClip: { x: number; y: number; width: number; height: number };
  /** Zoom-in ceiling = the FIXED mount scale: Matt's single-mark selection ease (§8.2). */
  sMax: number;
  /** The min selectable radius that set sMax (derivation receipt, acceptance #57). */
  rMinSelectable: number;
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

// ---- Bound derivation (S_max, §8.2 — the surviving derivation law) ----

/**
 * Derive the FIXED mount scale (S_max) + the plane-rect coords from the SVG source
 * string (spec §8.2). This is the single derivation path used at runtime (on the
 * fetched markup) AND in unit tests (on a synthetic SVG string) — proving the mount
 * scale is COPIED from the artifact, never restated. A doctored radius in the source
 * shifts sMax with ZERO code change (acceptance #57; the ≈8.276 literal appears
 * NOWHERE in source). No S_min / hull / union is computed — there is no zoom-out.
 */
export function deriveBounds(svg: string): AtlasBounds {
  const native = parseViewBox(svg);
  const clip = parsePlaneClipRect(svg);
  const rMinSelectable = minSelectableRadius(svg);

  const sMax = TARGET_D / (2 * rMinSelectable);

  return {
    native,
    planeClip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height },
    sMax,
    rMinSelectable,
  };
}

// ---- Fixed-mount navigation math (spec §9.3 D3-b) ----
//
// The SVG renders at a FIXED width = stageWidth × S_max; its height follows the
// intrinsic 4:3 aspect. A canvas-space point (cx, cy) — read off the inlined DOM
// by [data-kit]/[data-core], or the plane-rect center — maps to a RENDERED pixel by
// a straight linear scale, because the viewBox is native (`0 0 W H`, minx=miny=0)
// and there is no letterboxing. These pure helpers drive the initial scroll-center
// and the table→chart center-scroll. No runtime viewBox/planeClip mutation.

/** The rendered pixel SIZE of the SVG at the fixed mount (stageWidth × S_max). */
export function renderedSize(
  native: ViewBox,
  stageWidthPx: number,
  sMax: number
): { width: number; height: number } {
  const width = stageWidthPx * sMax;
  const height = width * (native.height / native.width);
  return { width, height };
}

/**
 * Map a canvas-space point to a rendered pixel offset within the SVG, given the
 * rendered size. viewBox is native (origin 0,0), so this is a linear scale by the
 * rendered/canvas ratio on each axis (identical ratios since aspect is preserved).
 */
export function canvasToRenderedPx(
  cx: number,
  cy: number,
  native: ViewBox,
  rendered: { width: number; height: number }
): { px: number; py: number } {
  const px = ((cx - native.minx) / native.width) * rendered.width;
  const py = ((cy - native.miny) / native.height) * rendered.height;
  return { px, py };
}

/**
 * The scrollLeft/scrollTop that centers a canvas-space point in a viewport of the
 * given size, clamped to the scrollable range [0, rendered − viewport]. Used for
 * the initial plane-center scroll and the table→chart mark-center scroll (§9.3).
 */
export function centerScroll(
  cx: number,
  cy: number,
  native: ViewBox,
  rendered: { width: number; height: number },
  viewport: { width: number; height: number }
): { scrollLeft: number; scrollTop: number } {
  const { px, py } = canvasToRenderedPx(cx, cy, native, rendered);
  const scrollLeft = clampScroll(px - viewport.width / 2, rendered.width - viewport.width);
  const scrollTop = clampScroll(py - viewport.height / 2, rendered.height - viewport.height);
  return { scrollLeft, scrollTop };
}

/** The canvas-space center of the plane rect (initial scroll target, §9.3). */
export function planeCenterCanvas(bounds: AtlasBounds): { cx: number; cy: number } {
  const { x, y, width, height } = bounds.planeClip;
  return { cx: x + width / 2, cy: y + height / 2 };
}

/** Clamp a scroll offset into [0, max]; max<0 (content smaller than view) → 0. */
function clampScroll(v: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(Math.max(v, 0), max);
}
