// atlas-lens.test.ts — the artifact-derived scale math (spec §8.2, §9.3, acc #57).
//
// D3 (spec §9.3, Matt 2026-07-15): pivot grouping + lens interaction retired —
// pivots→filters, zoom→fixed S_max. The v1 zoom INTERACTION math (clampScale /
// scaleOf / viewBoxFor / zoomAtPoint / panByScreen / screenToCanvas / gestureTransform
// / easeScaleForRadius / S_min / fitUnion / hull-union) is DELETED with its tests.
// What SURVIVES + is asserted here: the BOUND-DERIVATION law (§8.2) — parseViewBox /
// parsePlaneClipRect / parseHullBbox / pointsBbox / minSelectableRadius / deriveBounds
// / the S_max formula + doctored-radius probe — PLUS the new fixed-mount navigation
// arithmetic (§9.3 D3-b): renderedSize / canvasToRenderedPx / centerScroll /
// planeCenterCanvas. All run under vitest's `node` env (strings/numbers, no DOM) —
// the same derivation path the runtime uses on the fetched markup.

import { describe, it, expect } from 'vitest';
import {
  TARGET_D,
  deriveBounds,
  parseViewBox,
  parsePlaneClipRect,
  parseHullBbox,
  pointsBbox,
  minSelectableRadius,
  renderedSize,
  canvasToRenderedPx,
  centerScroll,
  planeCenterCanvas,
} from '../utils/atlasLens';

/**
 * A synthetic SVG mirroring the real Edition-II r7 artifact's load-bearing shape:
 *   - viewBox 0 0 1600 1200 (native canvas)
 *   - a planeClip rect (the emitted trim) x=96 y=132 w=1408 h=972 (the real values)
 *   - ONE dashed hull polyline (dasharray "7 5") — parseHullBbox still exercised
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

  it('captures the emitted planeClip rect — numbers AND verbatim strings', () => {
    const clip = parsePlaneClipRect(SYNTH_SVG);
    expect(clip.x).toBe(96);
    expect(clip.y).toBe(132);
    expect(clip.width).toBe(1408);
    expect(clip.height).toBe(972);
    // The RAW strings must be the exact emitted attribute text ("96.00", not "96").
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

describe('atlasLens — the FIXED mount scale derived from the artifact (acceptance #57)', () => {
  const bounds = deriveBounds(SYNTH_SVG);

  it('deriveBounds returns native viewBox + planeClip numbers + sMax + rMinSelectable', () => {
    expect(bounds.native).toEqual({ minx: 0, miny: 0, width: 1600, height: 1200 });
    expect(bounds.planeClip).toEqual({ x: 96, y: 132, width: 1408, height: 972 });
  });

  it('S_max = TARGET_D / (2 · r_min_selectable) renders the min mark ≥ TARGET_D', () => {
    expect(bounds.rMinSelectable).toBeCloseTo(1.45, 3);
    expect(bounds.sMax).toBeCloseTo(TARGET_D / (2 * 1.45), 4); // ~8.276
    // At S_max the min selectable mark reaches TARGET_D in the native frame.
    expect(2 * bounds.rMinSelectable * bounds.sMax).toBeCloseTo(TARGET_D, 4);
  });

  it('DOCTORED-RADIUS PROBE: mutating the min selectable r shifts S_max, zero code change', () => {
    // Halve the meso-ghost radius in the SOURCE only. S_max must double — no code
    // path changed; the bound is read from the artifact (acceptance #57).
    const doctored = SYNTH_SVG.replace('r="1.45"', 'r="0.725"');
    const b2 = deriveBounds(doctored);
    expect(b2.rMinSelectable).toBeCloseTo(0.725, 3);
    expect(b2.sMax).toBeCloseTo(bounds.sMax * 2, 3);
  });

  it('NO scale literal: sMax is never the ≈8.276 constant restated in the module', () => {
    // The value derives ONLY from the artifact radius; deriving from a DIFFERENT
    // radius yields a DIFFERENT sMax (proves it is not a hardcoded 8.276). Bump BOTH
    // meso ghosts so the new min selectable radius is 2.90 (kit r=3 is larger).
    const doctored = deriveBounds(
      SYNTH_SVG.replace('r="1.45"', 'r="2.90"').replace('r="2.18"', 'r="2.95"')
    );
    expect(doctored.rMinSelectable).toBeCloseTo(2.9, 3);
    expect(doctored.sMax).toBeCloseTo(TARGET_D / (2 * 2.9), 4); // ~4.138, not 8.276
    expect(doctored.sMax).not.toBeCloseTo(bounds.sMax, 2);
  });
});

describe('atlasLens — fixed-mount navigation math (§9.3 D3-b)', () => {
  const bounds = deriveBounds(SYNTH_SVG);
  const STAGE_W = 900;

  it('renderedSize = stageWidth × S_max, height by intrinsic 4:3 aspect', () => {
    const r = renderedSize(bounds.native, STAGE_W, bounds.sMax);
    expect(r.width).toBeCloseTo(STAGE_W * bounds.sMax, 4);
    // Aspect preserved: 1600:1200 = 4:3.
    expect(r.width / r.height).toBeCloseTo(1600 / 1200, 6);
  });

  it('canvasToRenderedPx is a linear scale from native (origin 0,0) to rendered px', () => {
    const rendered = renderedSize(bounds.native, STAGE_W, bounds.sMax);
    // Canvas origin maps to (0,0); canvas far corner maps to (renderedW, renderedH).
    expect(canvasToRenderedPx(0, 0, bounds.native, rendered)).toEqual({ px: 0, py: 0 });
    const far = canvasToRenderedPx(1600, 1200, bounds.native, rendered);
    expect(far.px).toBeCloseTo(rendered.width, 4);
    expect(far.py).toBeCloseTo(rendered.height, 4);
    // Canvas center maps to rendered center.
    const mid = canvasToRenderedPx(800, 600, bounds.native, rendered);
    expect(mid.px).toBeCloseTo(rendered.width / 2, 4);
    expect(mid.py).toBeCloseTo(rendered.height / 2, 4);
  });

  it('planeCenterCanvas = the emitted plane-rect center (96+1408/2, 132+972/2)', () => {
    const c = planeCenterCanvas(bounds);
    expect(c.cx).toBe(800); // 96 + 704
    expect(c.cy).toBe(618); // 132 + 486
  });

  it('centerScroll puts a canvas point at the viewport center, clamped to [0, max]', () => {
    const rendered = renderedSize(bounds.native, STAGE_W, bounds.sMax);
    const viewport = { width: STAGE_W, height: 600 };
    // A mid-content point: its rendered px minus half the viewport, clamped.
    const cx = 800;
    const cy = 600;
    const { px, py } = canvasToRenderedPx(cx, cy, bounds.native, rendered);
    const s = centerScroll(cx, cy, bounds.native, rendered, viewport);
    expect(s.scrollLeft).toBeCloseTo(
      Math.min(Math.max(px - viewport.width / 2, 0), rendered.width - viewport.width),
      3
    );
    expect(s.scrollTop).toBeCloseTo(
      Math.min(Math.max(py - viewport.height / 2, 0), rendered.height - viewport.height),
      3
    );
  });

  it('centerScroll clamps to 0 at the top-left corner (never negative)', () => {
    const rendered = renderedSize(bounds.native, STAGE_W, bounds.sMax);
    const viewport = { width: STAGE_W, height: 600 };
    const s = centerScroll(0, 0, bounds.native, rendered, viewport);
    expect(s.scrollLeft).toBe(0);
    expect(s.scrollTop).toBe(0);
  });

  it('centerScroll clamps to the max scroll at the far corner (never overscroll)', () => {
    const rendered = renderedSize(bounds.native, STAGE_W, bounds.sMax);
    const viewport = { width: STAGE_W, height: 600 };
    const s = centerScroll(1600, 1200, bounds.native, rendered, viewport);
    expect(s.scrollLeft).toBeCloseTo(rendered.width - viewport.width, 3);
    expect(s.scrollTop).toBeCloseTo(rendered.height - viewport.height, 3);
  });

  it('centerScroll returns 0 when content is smaller than the viewport (max < 0)', () => {
    // Purpose-built artifact whose ONLY selectable radius is large (r=40 => sMax=0.3),
    // so at stageWidth=100 the rendered content (30px) is narrower than the viewport.
    const bigRadiusSvg = `<svg viewBox="0 0 1600 1200">
<clipPath id="planeClip"><rect x="96.00" y="132.00" width="1408.00" height="972.00"/></clipPath>
<polyline points="0,0 1600,1200" stroke-dasharray="7 5"/>
<circle cx="800" cy="600" r="40" data-el="live" data-kit="only"/>
</svg>`;
    const smallBounds = deriveBounds(bigRadiusSvg);
    expect(smallBounds.sMax).toBeCloseTo(24 / 80, 4); // 0.3
    const rendered = renderedSize(smallBounds.native, 100, smallBounds.sMax); // width=30
    const viewport = { width: 100, height: 600 };
    const s = centerScroll(800, 600, smallBounds.native, rendered, viewport);
    expect(s.scrollLeft).toBe(0); // rendered.width(30) - viewport.width(100) < 0 -> 0
  });
});
