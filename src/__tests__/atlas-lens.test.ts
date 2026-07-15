// atlas-lens.test.ts — the v1 zoom lens math (spec §8, acceptance #36).
//
// PURE-PART coverage:
//   - bound derivation from a SYNTHETIC SVG string (§8.2): S_min shows every hull
//     point + the full canvas; S_max = TARGET_D/(2·r_min_selectable) with drill-in
//     glyphs EXCLUDED; both bounds provably derived from the artifact — a doctored
//     radius shifts S_max with ZERO code change (acceptance #36).
//   - the lens arithmetic: clamp, aspect-fit, cursor-anchored zoom keeps the anchor
//     fixed, pan stays honest, gesture transform reproduces the target view.
//
// These run under vitest's `node` env, so everything operates on strings/numbers
// (no DOM) — the same derivation path the runtime uses on the fetched markup.

import { describe, it, expect } from 'vitest';
import {
  TARGET_D,
  FIT_MARGIN,
  deriveBounds,
  parseViewBox,
  parsePlaneClipRect,
  parseHullBbox,
  pointsBbox,
  minSelectableRadius,
  fitScale,
  clampScale,
  scaleOf,
  viewBoxFor,
  viewCenter,
  zoomAtPoint,
  panByScreen,
  screenToCanvas,
  gestureTransform,
  easeScaleForRadius,
  type ViewBox,
} from '../utils/atlasLens';

/**
 * A synthetic SVG mirroring the real Edition-II r7 artifact's load-bearing shape:
 *   - viewBox 0 0 1600 1200 (native canvas)
 *   - a planeClip rect (the emitted trim), captured verbatim for reset
 *   - ONE dashed hull polyline (dasharray "7 5") exceeding the frame on all sides
 *   - kit circles (data-kit, r=3) + meso-ghost circles (data-core, r=1.45)
 *   - a drill-in ghost (data-el="ghost", NO data-core, r=1.37) — must be EXCLUDED
 */
const SYNTH_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">
<defs>
<clipPath id="planeClip"><rect x="96.00" y="132.00" width="1408.00" height="972.00"/></clipPath>
</defs>
<rect x="0" y="0" width="1600" height="1200" fill="#0e1016"/>
<g id="layer-drillin" clip-path="url(#planeClip)">
<circle cx="1003.18" cy="1019.36" r="1.37" data-el="ghost" data-mult="1"/>
</g>
<g id="layer-ghosts" clip-path="url(#planeClip)">
<circle cx="1000.06" cy="774.86" r="1.45" data-el="ghost" data-core="A|B|c|d|e|f|g" data-mult="1"/>
<circle cx="1000.43" cy="641.28" r="2.18" data-el="ghost" data-core="H|I|j|k|l|m|n" data-mult="4"/>
</g>
<g id="layer-live">
<polyline points="43.10,579.93 1725.54,625.81 1329.55,1363.27 672.45,-1.74 43.10,579.93" fill="none" stroke="#5a5340" stroke-opacity="0.75" stroke-width="1.1" stroke-dasharray="7 5" stroke-linejoin="round"/>
<circle cx="873.99" cy="377.69" r="3" data-el="live" data-kit="chr-arrow-storm-warden"/>
<circle cx="758.28" cy="684.47" r="5.2" data-el="condensation" data-kit="chr-bee-warden" data-kits="chr-bee-warden|chr-x"/>
</g>
</svg>`;

// The synthetic hull's px bbox (matches the real artifact's extremes on each edge).
const HULL = { x0: 43.1, y0: -1.74, x1: 1725.54, y1: 1363.27 };

describe('atlasLens — SVG-source parsing (§8.2, copy the artifact)', () => {
  it('parses the native viewBox', () => {
    expect(parseViewBox(SYNTH_SVG)).toEqual({ minx: 0, miny: 0, width: 1600, height: 1200 });
  });

  it('captures the emitted planeClip rect — numbers AND verbatim strings (reset target, §8.3)', () => {
    const clip = parsePlaneClipRect(SYNTH_SVG);
    expect(clip.x).toBe(96);
    expect(clip.y).toBe(132);
    expect(clip.width).toBe(1408);
    expect(clip.height).toBe(972);
    // The RAW strings must be the exact emitted attribute text ("96.00", not "96")
    // so reset restores byte-identically (acceptance #39 verbatim).
    expect(clip.raw).toEqual({ x: '96.00', y: '132.00', width: '1408.00', height: '972.00' });
  });

  it('finds the ONLY dashed hull polyline and its bbox', () => {
    const b = parseHullBbox(SYNTH_SVG);
    expect(b.x0).toBeCloseTo(HULL.x0, 2);
    expect(b.y0).toBeCloseTo(HULL.y0, 2);
    expect(b.x1).toBeCloseTo(HULL.x1, 2);
    expect(b.y1).toBeCloseTo(HULL.y1, 2);
  });

  it('pointsBbox handles both comma and space separators', () => {
    const comma = pointsBbox('0,0 10,20 5,-5');
    const space = pointsBbox('0 0 10 20 5 -5');
    for (const b of [comma, space]) {
      expect(b.x0).toBe(0);
      expect(b.y0).toBe(-5);
      expect(b.x1).toBe(10);
      expect(b.y1).toBe(20);
    }
  });

  it('minSelectableRadius = min over [data-kit] ∪ [data-core] ONLY (drill-in excluded)', () => {
    // r=1.37 drill-in ghost has NO data-core => excluded; min is the meso ghost 1.45.
    expect(minSelectableRadius(SYNTH_SVG)).toBeCloseTo(1.45, 3);
  });
});

describe('atlasLens — the two bounds derived from the artifact (acceptance #36)', () => {
  const bounds = deriveBounds(SYNTH_SVG);

  it('S_min shows every hull point AND the full canvas in-viewport', () => {
    // The fit-union must contain the canvas and every hull vertex (+ margin).
    const u = bounds.fitUnion;
    expect(u.x0).toBeLessThanOrEqual(Math.min(0, HULL.x0) - FIT_MARGIN + 1e-6);
    expect(u.y0).toBeLessThanOrEqual(Math.min(0, HULL.y0) - FIT_MARGIN + 1e-6);
    expect(u.x1).toBeGreaterThanOrEqual(Math.max(1600, HULL.x1) + FIT_MARGIN - 1e-6);
    expect(u.y1).toBeGreaterThanOrEqual(Math.max(1200, HULL.y1) + FIT_MARGIN - 1e-6);

    // At S_min the viewBox is the aspect-fit of that union: every hull point lands
    // inside the viewBox (the dashed line closes on screen).
    const c = viewCenter({ minx: u.x0, miny: u.y0, width: u.x1 - u.x0, height: u.y1 - u.y0 });
    const vb = viewBoxFor(bounds.sMin, c.cx, c.cy, bounds);
    const inside = (x: number, y: number) =>
      x >= vb.minx - 1e-6 &&
      x <= vb.minx + vb.width + 1e-6 &&
      y >= vb.miny - 1e-6 &&
      y <= vb.miny + vb.height + 1e-6;
    // Canvas corners.
    expect(inside(0, 0)).toBe(true);
    expect(inside(1600, 1200)).toBe(true);
    // Hull extremes.
    expect(inside(HULL.x0, HULL.y0)).toBe(true);
    expect(inside(HULL.x1, HULL.y1)).toBe(true);
  });

  it('S_min matches the spec reference (~0.85×) for the real extremes', () => {
    expect(bounds.sMin).toBeCloseTo(0.849, 2);
  });

  it('S_max = TARGET_D / (2 · r_min_selectable) renders the min mark ≥ TARGET_D', () => {
    expect(bounds.rMinSelectable).toBeCloseTo(1.45, 3);
    expect(bounds.sMax).toBeCloseTo(TARGET_D / (2 * 1.45), 4); // ~8.276
    // At S_max the min selectable mark reaches TARGET_D in the native frame.
    expect(2 * bounds.rMinSelectable * bounds.sMax).toBeCloseTo(TARGET_D, 4);
  });

  it('DOCTORED-RADIUS PROBE: mutating the min selectable r shifts S_max, zero code change', () => {
    // Halve the meso-ghost radius in the SOURCE only. S_max must double — no code
    // path changed; the bound is read from the artifact.
    const doctored = SYNTH_SVG.replace('r="1.45"', 'r="0.725"');
    const b2 = deriveBounds(doctored);
    expect(b2.rMinSelectable).toBeCloseTo(0.725, 3);
    expect(b2.sMax).toBeCloseTo(bounds.sMax * 2, 3);
    // S_min is unaffected by a radius change (it derives from hull ∪ canvas).
    expect(b2.sMin).toBeCloseTo(bounds.sMin, 6);
  });

  it('a doctored HULL extreme shifts S_min, zero code change', () => {
    // Push the east hull vertex further out; the union widens, S_min drops.
    const doctored = SYNTH_SVG.replace('1725.54,625.81', '2400.00,625.81');
    const b2 = deriveBounds(doctored);
    expect(b2.hullBbox.x1).toBeCloseTo(2400, 2);
    expect(b2.sMin).toBeLessThan(bounds.sMin);
  });

  it('carries VERBATIM reset targets: emitted viewBox string + planeClip raw strings (§8.3)', () => {
    expect(bounds.nativeViewBoxRaw).toBe('0 0 1600 1200');
    expect(bounds.planeClipRaw).toEqual({
      x: '96.00',
      y: '132.00',
      width: '1408.00',
      height: '972.00',
    });
  });
});

describe('atlasLens — lens arithmetic (§8.1)', () => {
  const bounds = deriveBounds(SYNTH_SVG);
  const NATIVE: ViewBox = bounds.native;

  it('clampScale holds S within [sMin, sMax]', () => {
    expect(clampScale(0.001, bounds)).toBeCloseTo(bounds.sMin, 6);
    expect(clampScale(999, bounds)).toBeCloseTo(bounds.sMax, 6);
    expect(clampScale(2, bounds)).toBe(2);
  });

  it('fitScale is aspect-correct (height-constrained union here)', () => {
    const s = fitScale(bounds.fitUnion, NATIVE);
    expect(s).toBeCloseTo(bounds.sMin, 6);
    // With the fit viewBox, the scale from native.width/vbWidth agrees.
    const vbW = NATIVE.width / s;
    expect(vbW).toBeGreaterThanOrEqual(bounds.fitUnion.x1 - bounds.fitUnion.x0 - 1e-6);
  });

  it('viewBoxFor preserves the native aspect ratio at every scale', () => {
    for (const s of [bounds.sMin, 1, 2, 4, bounds.sMax]) {
      const vb = viewBoxFor(s, 800, 600, bounds);
      expect(vb.width / vb.height).toBeCloseTo(NATIVE.width / NATIVE.height, 6);
      expect(scaleOf(vb, NATIVE)).toBeCloseTo(s, 6);
    }
  });

  it('zoomAtPoint keeps the cursor-anchored canvas point fixed on screen', () => {
    // Start at S=2 centered, then zoom to S=4 anchored at a specific canvas point.
    const start = viewBoxFor(2, 800, 600, bounds);
    const rect = { width: 1600, height: 1200 };
    // Pick a screen pixel, map to canvas under `start`.
    const screenX = 1200;
    const screenY = 300;
    const anchor = screenToCanvas(screenX, screenY, rect, start);
    const next = zoomAtPoint(start, 4, anchor, bounds);
    // The same canvas anchor must map back to the SAME screen pixel under `next`
    // (allowing for pan-clamp: if clamped, the invariant can shift — so choose an
    // interior anchor away from the union edges, which this one is).
    const backX = ((anchor.x - next.minx) / next.width) * rect.width;
    const backY = ((anchor.y - next.miny) / next.height) * rect.height;
    expect(backX).toBeCloseTo(screenX, 1);
    expect(backY).toBeCloseTo(screenY, 1);
  });

  it('panByScreen shifts the center opposite the drag delta', () => {
    const start = viewBoxFor(4, 800, 600, bounds);
    const rect = { width: 1600, height: 1200 };
    const c0 = viewCenter(start);
    // Drag right+down by 100px each: content follows the cursor, so the viewBox
    // center moves LEFT+UP in canvas space (center.x decreases).
    const panned = panByScreen(start, 100, 100, rect, bounds);
    const c1 = viewCenter(panned);
    expect(c1.cx).toBeLessThan(c0.cx);
    expect(c1.cy).toBeLessThan(c0.cy);
  });

  it('easeScaleForRadius targets TARGET_D/2 and clamps to [sMin, sMax]', () => {
    // A mark of the min selectable radius eases to ~S_max/2 (TARGET_D/2 target),
    // still within bounds.
    const s = easeScaleForRadius(bounds.rMinSelectable, bounds);
    expect(s).toBeGreaterThanOrEqual(bounds.sMin);
    expect(s).toBeLessThanOrEqual(bounds.sMax);
    // A tiny radius clamps UP to sMax (never beyond).
    expect(easeScaleForRadius(0.001, bounds)).toBeCloseTo(bounds.sMax, 6);
  });
});

describe('atlasLens — gesture transform reproduces the target view (§8.4)', () => {
  const bounds = deriveBounds(SYNTH_SVG);
  const rect = { width: 1600, height: 1200 };

  it('transform maps every canvas point from `from`-render to `to`-render', () => {
    const from = viewBoxFor(2, 800, 600, bounds);
    const to = viewBoxFor(4, 700, 500, bounds);
    const t = gestureTransform(from, to, rect);
    // For a set of canvas points, screen-under-`from` * transform == screen-under-`to`.
    const pts = [
      [100, 100],
      [800, 600],
      [1500, 1100],
    ];
    for (const [px, py] of pts) {
      const s0x = ((px - from.minx) / from.width) * rect.width;
      const s0y = ((py - from.miny) / from.height) * rect.height;
      const s1x = ((px - to.minx) / to.width) * rect.width;
      const s1y = ((py - to.miny) / to.height) * rect.height;
      // Apply the CSS transform (origin 0,0): scale then translate.
      const mappedX = t.scale * s0x + t.translateX;
      const mappedY = t.scale * s0y + t.translateY;
      expect(mappedX).toBeCloseTo(s1x, 4);
      expect(mappedY).toBeCloseTo(s1y, 4);
    }
  });

  it('identity view => identity transform', () => {
    const vb = viewBoxFor(3, 800, 600, bounds);
    const t = gestureTransform(vb, vb, rect);
    expect(t.scale).toBeCloseTo(1, 6);
    expect(t.translateX).toBeCloseTo(0, 6);
    expect(t.translateY).toBeCloseTo(0, 6);
  });
});
