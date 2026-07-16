// atlasLens.ts — the artifact-derived FIT-BOX math for the Build Horizon chart.
//
// PURE MODULE. No React, no DOM APIs — everything here operates on plain numbers
// and (for bound derivation) the SVG SOURCE STRING. That keeps the load-bearing
// math unit-testable under vitest's `node` environment, and makes the mount box
// provably DERIVED FROM THE ARTIFACT (§4c never-invent, §9.4): we parse the very
// bytes that become the mounted SVG rather than restating any constant.
//
// D4 (spec §9.4, Matt 2026-07-15): the chart mounts at the FULL-HORIZON FIT view —
// "just barely encompass all of the horizon" — NOT at S_max. D3-b's fixed-S_max +
// native-scroll stage is SUPERSEDED: there is no zoom, no scroll, no pan. The mount
// box is the OLD S_min view: union(canvas ∪ hull px bbox) + FIT_MARGIN, aspect-pinned
// to the native 4:3 and centered on the union (exactly the old lens's viewBoxFor at
// S_min). It is written ONCE to the SVG's `viewBox` + `planeClip` rect at inline
// (initial mount + each skin flip) and static thereafter.
//
// (Supersession, §9.4: an EARLIER comment here asserted "no S_min is computed — there
// is no zoom-out." That was D3-b's law. §9.4 revives the S_min/fit-box derivation as
// the STATIC mount box — the fit view IS the ruled chart. S_max derivation is retired
// with the scroll stage; the ≈8.276 ceiling is no longer load-bearing.)
//
// D5 (spec §9.5, Matt 2026-07-15): the fit box now ALSO governs the PLATE. D4 left the
// canvas PLATE rect + the svg's width/height attrs at emitted canvas geometry; D5
// extends the mount-time write to a WRITE-SET (viewBox · planeClip · plate · svg sizing)
// so the dark backdrop fits the ruled zoom. This module adds the pure, fail-loud
// STRUCTURAL plate identifier (identifyPlateRect); the DOM write lives in useAtlasStage.
//
// D6 (spec §9.6, Matt 2026-07-15): the DECORATIVE FRAME rect joins the write-set — the
// drawn plot boundary Matt reads as "the box" was left at emitted canvas geometry, so
// under the D4 full-horizon mount the hull/ghost content renders OUTSIDE it. The frame is
// written to the fit box INSET by FRAME_INSET (12u) on all sides. This module adds the
// fail-loud STRUCTURAL frame identifier (identifyFrameRect — the complement of the plate
// law: fill="none" + a stroke) + insetViewBox; the DOM write lives in useAtlasStage. The
// write-set is now: viewBox · planeClip · plate · svg-sizing · frame.
//
// LAWS IMPLEMENTED:
//   §9.4  The fit box = padBbox(unionBbox(canvasBbox, hullBbox), FIT_MARGIN),
//         aspect-pinned to native (widen the short dim symmetrically), centered on
//         the union. sMin = native.width / fitBox.width is the implied full-horizon
//         scale (receipt only — it is not applied as a scroll magnification; the
//         viewBox IS the fit box). A doctored hull in the source shifts the fit box
//         with ZERO code change (acceptance #60/#62): the box is READ from the
//         artifact, never restated.
//
// Spec: agentic_orchestration/gandalf/notes/2026-07-15-atlas-interactive-glance-spec.md §9.4

/**
 * Margin (screen-independent px, canvas units) around the union in the fit box
 * (spec §9.4, the old §8.2 S_min margin). The fit view pads the union by this on
 * every side BEFORE the aspect-pin, so the closed hull never touches the frame edge.
 */
export const FIT_MARGIN = 24;

/**
 * The decorative FRAME inset (canvas units) from the fit box on every side (spec §9.6
 * D6-a — the ONLY legislated number in that pass). The frame rect is written to the fit
 * box shrunk by this on all four sides, so its stroke sits fully on-plate and reads as a
 * plot boundary rather than an edge-clip.
 */
export const FRAME_INSET = 12;

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
 * The artifact-derived mount bounds (spec §9.4 static fit box).
 * D4: the chart mounts at `fitBox` (viewBox + planeClip written ONCE); no scroll, no
 * zoom. `sMin` is the implied full-horizon scale (receipt only). `hullBbox` is the
 * dashed-hull px bbox that drives the union (receipt: proves the hull closes in-frame).
 */
export interface AtlasBounds {
  /** The native viewBox emitted by the renderer (`0 0 1600 1200`). */
  native: ViewBox;
  /**
   * The emitted planeClip <rect> attributes as NUMBERS. D4: the rect is REWRITTEN
   * ONCE to `fitBox` at mount (so plane-layer content beyond the emitted clip — the
   * hull's beyond-canvas extent — renders). These are the ORIGINAL emitted numbers,
   * kept for the derivation receipt / reference.
   */
  planeClip: { x: number; y: number; width: number; height: number };
  /**
   * The FIT BOX (spec §9.4): the union(canvas ∪ hull) + FIT_MARGIN, aspect-pinned to
   * native and centered on the union. This is the ONE box written to the SVG's
   * `viewBox` AND `planeClip` rect at mount. The whole horizon (incl. beyond-canvas
   * hull extent) is in-frame at this box.
   */
  fitBox: ViewBox;
  /** The un-aspect-pinned padded union (receipt: what the fit box must contain). */
  fitUnion: Bbox;
  /**
   * The implied full-horizon scale = native.width / fitBox.width (the old §8.2 S_min).
   * Receipt only — NOT applied as a magnification; the viewBox IS the fit box (a
   * viewBox WIDER than native = a view "zoomed out" from native).
   */
  sMin: number;
  /** The dashed-hull polyline px bbox (receipt: the union's beyond-canvas driver). */
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
 * STRINGS (retained for reference / receipts).
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

// ---- Fit-box geometry (spec §9.4 — the surviving derivation law) ----

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
 * Aspect-pin a bbox to `aspect` (native width/height) and return it as a ViewBox,
 * centered on the bbox (spec §9.4). The viewBox must COVER the box in BOTH dims while
 * holding the native aspect, so widen whichever dimension is short (symmetric, so the
 * union stays centered) — this is exactly the old lens's viewBoxFor at S_min:
 *   vbW = max(uW, uH · aspect); vbH = vbW / aspect;
 *   minx = box.x0 + (uW − vbW)/2;  miny = box.y0 + (uH − vbH)/2  (one delta is 0).
 */
export function aspectPinToViewBox(box: Bbox, aspect: number): ViewBox {
  const uW = box.x1 - box.x0;
  const uH = box.y1 - box.y0;
  const vbW = Math.max(uW, uH * aspect);
  const vbH = vbW / aspect;
  const minx = box.x0 + (uW - vbW) / 2;
  const miny = box.y0 + (uH - vbH) / 2;
  return { minx, miny, width: vbW, height: vbH };
}

/**
 * Derive the STATIC FIT BOX (spec §9.4) from the SVG source string. This is the single
 * derivation path used at runtime (on the fetched markup) AND in unit tests (on a
 * synthetic SVG string) — proving the mount box is COPIED from the artifact, never
 * restated. A doctored hull in the source shifts the fit box with ZERO code change
 * (acceptance #60/#62; no box literal appears anywhere in source).
 *
 * fitBox = aspect-pin( padBbox(union(canvasBbox, hullBbox), FIT_MARGIN) ), native aspect.
 * sMin (receipt) = native.width / fitBox.width — the implied full-horizon scale.
 */
export function deriveBounds(svg: string): AtlasBounds {
  const native = parseViewBox(svg);
  const clip = parsePlaneClipRect(svg);
  const hullBbox = parseHullBbox(svg);

  const canvasBbox: Bbox = {
    x0: native.minx,
    y0: native.miny,
    x1: native.minx + native.width,
    y1: native.miny + native.height,
  };
  const fitUnion = padBbox(unionBbox(canvasBbox, hullBbox), FIT_MARGIN);
  const aspect = native.width / native.height;
  const fitBox = aspectPinToViewBox(fitUnion, aspect);
  const sMin = native.width / fitBox.width;

  return {
    native,
    planeClip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height },
    fitBox,
    fitUnion,
    sMin,
    hullBbox,
  };
}

// ---- Structural plate identification (spec §9.5 D5-a) ----
//
// D5 (spec §9.5, Matt 2026-07-15): "the 'screen box' now needs to be resized to fit the
// current zoom." D4 wrote viewBox + planeClip to the fit box but left the canvas PLATE
// rect (the dark backdrop) at emitted canvas geometry — so marks/rails/footer render
// off the plate and page-background bands sit inside the frame. The mount-time write-set
// EXTENDS to the plate: same moment, same derived fit box, x/y/w/h set alongside.
//
// Identification is STRUCTURAL and FAIL-LOUD (spec §9.5 D5-a): the plate is the
// direct-child <rect> of the <svg> whose width/height equal the parsed native canvas
// dims (`bounds.native`) AND which carries a fill. NO fill-literal matching (the fill
// differs per canvas: #0e1016 dark / #f7f8fa light), NO positional index, NO coordinate
// literals. Zero OR >1 candidates → throw loudly (no guess). This pure predicate runs on
// plain descriptors so it is node-testable (acceptance #65 ambiguous-candidate fixture
// RAISES) and shares its logic with the DOM-write helper (useAtlasStage), which builds
// the descriptors from the live svg's direct-child rects.

/**
 * A minimal, DOM-agnostic descriptor of a candidate <rect>: its numeric width/height
 * (parsed from the attributes), whether it carries a `fill`, whether that fill is the
 * literal `none`, and whether it carries a `stroke`. The DOM helper builds one of these
 * per direct-child rect of the svg; the pure identifiers below select the PLATE (§9.5)
 * and the decorative FRAME (§9.6). Keeping the shape plain (no SVGRectElement) makes the
 * identity logic unit-testable under vitest's `node` env with the SAME code path the
 * runtime uses.
 */
export interface PlateRectCandidate {
  /** Stable handle back to the source element (e.g., the SVGRectElement, or a test id). */
  ref: unknown;
  /** Parsed `width` attribute as a number (NaN if absent/malformed — never matches). */
  width: number;
  /** Parsed `height` attribute as a number (NaN if absent/malformed — never matches). */
  height: number;
  /** True iff the rect carries a non-empty `fill` attribute. */
  hasFill: boolean;
  /** True iff the rect's `fill` attribute is exactly `none` (§9.6 frame identity). */
  fillIsNone: boolean;
  /** True iff the rect carries a non-empty `stroke` attribute (§9.6 frame identity). */
  hasStroke: boolean;
}

/**
 * Identify the canvas PLATE among the svg's direct-child rects, STRUCTURALLY and
 * FAIL-LOUD (spec §9.5 D5-a). The plate is the candidate whose width/height equal the
 * native canvas dims AND which carries a fill. Exactly ONE must match:
 *   - 0 matches → throw (the artifact changed shape; do NOT guess a substitute).
 *   - >1 matches → throw (ambiguous; do NOT pick by index or fill literal).
 * Returns the single matching candidate (the caller writes the fit box to its `ref`).
 *
 * @param candidates the svg's direct-child rects as descriptors
 * @param native     the parsed native viewBox (bounds.native) — the plate's emitted dims
 */
export function identifyPlateRect(
  candidates: PlateRectCandidate[],
  native: ViewBox
): PlateRectCandidate {
  const matches = candidates.filter(
    (c) => c.hasFill && c.width === native.width && c.height === native.height
  );
  if (matches.length === 0) {
    throw new Error(
      `atlasLens: no canvas plate rect found (a direct-child <rect> of the svg with ` +
        `width=${native.width} height=${native.height} and a fill). The artifact shape ` +
        `changed — refusing to guess (spec §9.5 D5-a).`
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `atlasLens: ambiguous canvas plate — ${matches.length} direct-child rects match ` +
        `native ${native.width}×${native.height} with a fill. Structural identity requires ` +
        `exactly one; refusing to pick by index or fill literal (spec §9.5 D5-a).`
    );
  }
  return matches[0];
}

// ---- Structural FRAME identification (spec §9.6 D6-a) ----
//
// D6 (spec §9.6, Matt 2026-07-15): "the legend needs to be moved into the Atlas box" +
// "the box is too small." Under the D4 full-horizon mount, hull/ghost content renders
// OUTSIDE the decorative frame rect (the drawn plot boundary the eye reads as "the screen
// box"), so it no longer contains the chart. D6-a joins the FRAME to the mount-time
// write-set: the frame's x/y/w/h are set to the fit box INSET by 12 canvas units on all
// sides (the stroke stays fully on-plate, reads as a boundary not an edge-clip).
//
// Identification is STRUCTURAL + FAIL-LOUD — the exact COMPLEMENT of identifyPlateRect
// (§9.5): the plate is the filled native-dim rect; the frame is the direct-child <rect>
// with `fill="none"` AND a stroke present. NO stroke-literal matching (the stroke differs
// per canvas: #3a3d33 dark / #c3cad6 light), NO positional index, NO hardcoded geometry
// (the 12u inset is the only legislated number, applied by insetViewBox). Zero OR >1
// candidates → throw loudly. Pure predicate over plain descriptors → node-testable, same
// code path the runtime uses on the live svg's direct-child rects.

/**
 * Identify the decorative FRAME among the svg's direct-child rects, STRUCTURALLY and
 * FAIL-LOUD (spec §9.6 D6-a). The frame is the candidate with `fill="none"` AND a stroke.
 * Exactly ONE must match:
 *   - 0 matches → throw (the artifact changed shape; do NOT guess a substitute).
 *   - >1 matches → throw (ambiguous; do NOT pick by index or stroke literal).
 * Returns the single matching candidate (the caller writes the inset fit box to its `ref`).
 *
 * @param candidates the svg's direct-child rects as descriptors
 */
export function identifyFrameRect(candidates: PlateRectCandidate[]): PlateRectCandidate {
  const matches = candidates.filter((c) => c.fillIsNone && c.hasStroke);
  if (matches.length === 0) {
    throw new Error(
      `atlasLens: no decorative frame rect found (a direct-child <rect> of the svg with ` +
        `fill="none" and a stroke). The artifact shape changed — refusing to guess ` +
        `(spec §9.6 D6-a).`
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `atlasLens: ambiguous decorative frame — ${matches.length} direct-child rects have ` +
        `fill="none" with a stroke. Structural identity requires exactly one; refusing to ` +
        `pick by index or stroke literal (spec §9.6 D6-a).`
    );
  }
  return matches[0];
}

// ---- Attribute serialization for the mount-time write (spec §9.5 D5 write-set) ----
//
// The fit box is written ONCE (as a WRITE-SET, spec §9.5 D5-c) to the live SVG at inline
// (initial mount + each skin flip): the `viewBox` attribute, the planeClip <rect>
// x/y/width/height, AND the canvas PLATE rect x/y/width/height (§9.5 D5-a) — plus the
// removal of the svg's own width/height attrs (§9.5 D5-b). After that the chart is
// static — no interaction-driven mutation. These pure serializers keep the DOM-write
// helper (useAtlasStage) free of formatting logic and unit-testable here.

/** Round a canvas coordinate for a DOM attribute (4 dp — sub-pixel, stable). */
function fmt(n: number): string {
  // toFixed(4) then trim trailing zeros / dot so integers stay clean.
  return n.toFixed(4).replace(/\.?0+$/, '');
}

/** The `viewBox` attribute string for a ViewBox (minx miny width height). */
export function viewBoxToAttr(vb: ViewBox): string {
  return `${fmt(vb.minx)} ${fmt(vb.miny)} ${fmt(vb.width)} ${fmt(vb.height)}`;
}

/** The planeClip <rect> attribute values for a ViewBox (spec §9.4 D4-a). */
export function viewBoxToRectAttrs(
  vb: ViewBox
): { x: string; y: string; width: string; height: string } {
  return { x: fmt(vb.minx), y: fmt(vb.miny), width: fmt(vb.width), height: fmt(vb.height) };
}

/**
 * Inset a ViewBox by `inset` canvas units on ALL FOUR sides (spec §9.6 D6-a). Origin
 * moves in by `inset`; width/height shrink by `2·inset`. This is the frame rect's target:
 * the fit box (the ruled view) shrunk by FRAME_INSET so its stroke reads as an in-plate
 * boundary. A doctored hull → wider fit box → wider inset box → the frame follows, zero
 * code change (acceptance #66).
 */
export function insetViewBox(vb: ViewBox, inset: number): ViewBox {
  return {
    minx: vb.minx + inset,
    miny: vb.miny + inset,
    width: vb.width - 2 * inset,
    height: vb.height - 2 * inset,
  };
}
