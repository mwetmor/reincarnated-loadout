// atlas-lens.test.ts — the artifact-derived FIT-BOX math + the STRUCTURAL plate
// identification (spec §9.4 + §9.5, acc #60/#62/#63/#65).
//
// D4 (spec §9.4, Matt 2026-07-15): the chart mounts at the FULL-HORIZON FIT view —
// "just barely encompass all of the horizon" — NOT at S_max. This SUPERSEDES the D3-b
// fixed-S_max + native-scroll model: the fixed-mount NAVIGATION math (renderedSize /
// canvasToRenderedPx / centerScroll / planeCenterCanvas) and the S_max DERIVATION
// (minSelectableRadius / TARGET_D / sMax / the doctored-RADIUS probe) are RETIRED with
// the scroll stage — table→chart is now a page-level scrollIntoView of the chart region.
//
// D5 (spec §9.5, Matt 2026-07-15): the "screen box" resizes to the ruled zoom. The
// mount-time write becomes a WRITE-SET (§9.5 D5-c): viewBox · planeClip · PLATE · svg
// sizing, all to the SAME derived fit box. This test file adds the pure, FAIL-LOUD
// STRUCTURAL plate identifier (identifyPlateRect) — happy path, the doctored-HULL probe
// EXTENDED to the plate (wider fit box → what the plate is written to grows, via
// viewBoxToRectAttrs(fitBox)), and the ambiguous/absent-candidate fixtures that RAISE.
//
// What SURVIVES + is asserted here: the SVG-source parsing (parseViewBox /
// parsePlaneClipRect / parseHullBbox / pointsBbox) AND the FIT-BOX derivation (§9.4):
// unionBbox / padBbox / aspectPinToViewBox / deriveBounds's fitBox + sMin + the
// doctored-HULL probe + the viewBox/rect attribute serializers + (§9.5) identifyPlateRect.
// All run under vitest's `node` env (strings/numbers/plain descriptors, no DOM) — the
// SAME derivation + identity path the runtime uses on the fetched markup + live rects.

import { describe, it, expect } from 'vitest';
import {
  FIT_MARGIN,
  deriveBounds,
  identifyPlateRect,
  parseViewBox,
  parsePlaneClipRect,
  parseHullBbox,
  pointsBbox,
  unionBbox,
  padBbox,
  aspectPinToViewBox,
  viewBoxToAttr,
  viewBoxToRectAttrs,
  type PlateRectCandidate,
} from '../utils/atlasLens';

/**
 * A synthetic SVG mirroring the real Edition-II r7 artifact's load-bearing shape:
 *   - viewBox 0 0 1600 1200 (native canvas)
 *   - a planeClip rect (the emitted trim) x=96 y=132 w=1408 h=972 (the real values)
 *   - the canvas PLATE rect: DIRECT child of <svg>, x=0 y=0 w=1600 h=1200 fill=#0e1016
 *     — native-dim + filled, the sole structural plate (spec §9.5 D5-a); every nested
 *     rect (the planeClip rect inside <defs>) is NOT a direct child and/or not native-dim
 *   - ONE dashed hull polyline (dasharray "7 5") whose px bbox EXCEEDS the canvas on
 *     all four edges (x[43.10, 1725.54] × y[−1.74, 1363.27] — the real extremes)
 *   - kit circles (data-kit) + a meso-ghost circle (data-core) — present for realism
 */
const SYNTH_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">
<defs>
<clipPath id="planeClip"><rect x="96.00" y="132.00" width="1408.00" height="972.00"/></clipPath>
</defs>
<rect x="0" y="0" width="1600" height="1200" fill="#0e1016"/>
<g id="layer-ghosts" clip-path="url(#planeClip)">
<circle cx="1000.06" cy="774.86" r="1.45" data-el="ghost" data-core="A|B|c|d|e|f|g" data-mult="1"/>
</g>
<g id="layer-live">
<polyline points="43.10,579.93 1725.54,625.81 1329.55,1363.27 672.45,-1.74 43.10,579.93" fill="none" stroke="#5a5340" stroke-opacity="0.75" stroke-width="1.1" stroke-dasharray="7 5" stroke-linejoin="round"/>
<circle cx="873.99" cy="377.69" r="3" data-el="live" data-kit="chr-arrow-storm-warden"/>
</g>
</svg>`;

// The synthetic hull's px bbox (matches the real artifact's extremes on each edge).
const HULL = { x0: 43.1, y0: -1.74, x1: 1725.54, y1: 1363.27 };

describe('atlasLens — SVG-source parsing (§9.4, copy the artifact)', () => {
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
});

describe('atlasLens — fit-box geometry primitives (§9.4)', () => {
  it('unionBbox is the min/max envelope of two bboxes', () => {
    const u = unionBbox({ x0: 0, y0: 0, x1: 1600, y1: 1200 }, HULL);
    expect(u).toEqual({ x0: 0, y0: -1.74, x1: 1725.54, y1: 1363.27 });
  });

  it('padBbox grows a bbox by m on every side', () => {
    expect(padBbox({ x0: 0, y0: 0, x1: 100, y1: 50 }, 24)).toEqual({
      x0: -24,
      y0: -24,
      x1: 124,
      y1: 74,
    });
  });

  it('aspectPinToViewBox widens the SHORT dim symmetrically, centered on the box', () => {
    // A box that is too TALL for 4:3 (uH·aspect > uW): X widens, Y unchanged, centered.
    const box = { x0: -24, y0: -25.74, x1: 1749.54, y1: 1387.27 }; // uW=1773.54 uH=1413.01
    const vb = aspectPinToViewBox(box, 4 / 3);
    const uW = box.x1 - box.x0;
    const uH = box.y1 - box.y0;
    const vbW = Math.max(uW, uH * (4 / 3)); // 1884.0133...
    expect(vb.width).toBeCloseTo(vbW, 4);
    expect(vb.height).toBeCloseTo(vbW / (4 / 3), 4); // == uH (Y was the binding dim)
    expect(vb.height).toBeCloseTo(uH, 4);
    // Aspect is exactly native 4:3.
    expect(vb.width / vb.height).toBeCloseTo(4 / 3, 6);
    // Centered on the union: equal slack on left/right, none on top/bottom.
    expect(vb.minx).toBeCloseTo(box.x0 + (uW - vbW) / 2, 4); // negative slack (widened)
    expect(vb.miny).toBeCloseTo(box.y0, 4); // Y unchanged
    // The box is fully CONTAINED by the viewBox in both dims.
    expect(vb.minx).toBeLessThanOrEqual(box.x0);
    expect(vb.minx + vb.width).toBeGreaterThanOrEqual(box.x1);
    expect(vb.miny).toBeLessThanOrEqual(box.y0);
    expect(vb.miny + vb.height).toBeGreaterThanOrEqual(box.y1);
  });

  it('aspectPinToViewBox widens the OTHER dim when the box is too WIDE for 4:3', () => {
    // A box wider than 4:3 (uW > uH·aspect): Y widens, X unchanged.
    const box = { x0: 0, y0: 0, x1: 2000, y1: 300 }; // uW=2000 uH=300, aspect 4:3
    const vb = aspectPinToViewBox(box, 4 / 3);
    expect(vb.width).toBeCloseTo(2000, 4); // X binding
    expect(vb.height).toBeCloseTo(2000 / (4 / 3), 4); // 1500
    expect(vb.minx).toBeCloseTo(0, 4);
    expect(vb.miny).toBeCloseTo(0 + (300 - 1500) / 2, 4); // centered on Y
  });
});

describe('atlasLens — the STATIC fit box derived from the artifact (acceptance #60)', () => {
  const bounds = deriveBounds(SYNTH_SVG);

  it('deriveBounds returns native + planeClip numbers + fitBox + fitUnion + sMin + hull', () => {
    expect(bounds.native).toEqual({ minx: 0, miny: 0, width: 1600, height: 1200 });
    expect(bounds.planeClip).toEqual({ x: 96, y: 132, width: 1408, height: 972 });
    expect(bounds.hullBbox.x0).toBeCloseTo(HULL.x0, 2);
    expect(bounds.hullBbox.x1).toBeCloseTo(HULL.x1, 2);
  });

  it('fitUnion = union(canvas ∪ hull) + FIT_MARGIN on every side', () => {
    // canvas 0,0–1600,1200 ∪ hull => x[0,1725.54] y[−1.74,1363.27]; then ±24.
    expect(bounds.fitUnion.x0).toBeCloseTo(0 - FIT_MARGIN, 3);
    expect(bounds.fitUnion.y0).toBeCloseTo(-1.74 - FIT_MARGIN, 3);
    expect(bounds.fitUnion.x1).toBeCloseTo(1725.54 + FIT_MARGIN, 3);
    expect(bounds.fitUnion.y1).toBeCloseTo(1363.27 + FIT_MARGIN, 3);
  });

  it('fitBox is aspect-pinned to native 4:3 and CONTAINS the padded union', () => {
    const vb = bounds.fitBox;
    // Native aspect exactly.
    expect(vb.width / vb.height).toBeCloseTo(1600 / 1200, 6);
    // Contains the fitUnion (whole horizon incl. beyond-canvas hull extent in frame).
    expect(vb.minx).toBeLessThanOrEqual(bounds.fitUnion.x0 + 1e-6);
    expect(vb.miny).toBeLessThanOrEqual(bounds.fitUnion.y0 + 1e-6);
    expect(vb.minx + vb.width).toBeGreaterThanOrEqual(bounds.fitUnion.x1 - 1e-6);
    expect(vb.miny + vb.height).toBeGreaterThanOrEqual(bounds.fitUnion.y1 - 1e-6);
  });

  it('fitBox RECEIPT: the exact box + implied S_min for the real artifact extremes', () => {
    // Height is the binding dim (uH·aspect=1884.01 > uW=1773.54), so X widens.
    const vb = bounds.fitBox;
    expect(vb.minx).toBeCloseTo(-79.2367, 3);
    expect(vb.miny).toBeCloseTo(-25.74, 3);
    expect(vb.width).toBeCloseTo(1884.0133, 3);
    expect(vb.height).toBeCloseTo(1413.01, 3);
    // Implied S_min = native.width / fitBox.width ≈ 0.849 (spec §8.2 "≈0.85×").
    expect(bounds.sMin).toBeCloseTo(1600 / vb.width, 6);
    expect(bounds.sMin).toBeCloseTo(0.84925, 4);
    // A viewBox WIDER than native ⇒ a view "zoomed out" from native ⇒ sMin < 1.
    expect(bounds.sMin).toBeLessThan(1);
  });

  it('DOCTORED-HULL PROBE: enlarging the hull in the SOURCE grows the fit box, zero code change', () => {
    // Push one hull vertex far beyond the frame (source only). The union grows, so the
    // fit box grows and sMin shrinks — no code path changed; the box is READ from the
    // artifact (acceptance #60/#62; mirrors the D3 doctored-RADIUS probe, now hull).
    const doctored = SYNTH_SVG.replace('1725.54,625.81', '2600.00,625.81');
    const b2 = deriveBounds(doctored);
    // Union x1 moves out to 2600 (+24 pad).
    expect(b2.fitUnion.x1).toBeCloseTo(2600 + FIT_MARGIN, 3);
    // The fit box is WIDER than the undoctored one, and sMin is SMALLER (more zoomed out).
    expect(b2.fitBox.width).toBeGreaterThan(bounds.fitBox.width);
    expect(b2.sMin).toBeLessThan(bounds.sMin);
    // Still exactly native aspect.
    expect(b2.fitBox.width / b2.fitBox.height).toBeCloseTo(1600 / 1200, 6);
  });

  it('NO box literal: the fit box derives ONLY from the artifact hull (different hull ⇒ different box)', () => {
    // Shrink the hull to WITHIN the canvas on every edge; now the union IS the canvas,
    // and the fit box is just canvas+margin, aspect-pinned — a DIFFERENT box entirely.
    const inside = SYNTH_SVG.replace(
      'points="43.10,579.93 1725.54,625.81 1329.55,1363.27 672.45,-1.74 43.10,579.93"',
      'points="200,300 1400,300 1400,900 200,900 200,300"'
    );
    const b3 = deriveBounds(inside);
    // Union = canvas (0,0–1600,1200) since the hull is now inside it.
    expect(b3.fitUnion).toEqual({ x0: -24, y0: -24, x1: 1624, y1: 1224 });
    // A DIFFERENT fit box than the beyond-frame case (proves it is not a hardcoded box).
    expect(b3.fitBox.width).not.toBeCloseTo(bounds.fitBox.width, 1);
    // canvas+margin is 1648 wide, 1248 tall → aspect 1.32 < 4:3, so X widens to 1664.
    expect(b3.fitBox.width).toBeCloseTo(Math.max(1648, 1248 * (4 / 3)), 3); // 1664
    expect(b3.sMin).toBeCloseTo(1600 / b3.fitBox.width, 6);
  });
});

describe('atlasLens — mount-write attribute serializers (§9.4 D4-a)', () => {
  const bounds = deriveBounds(SYNTH_SVG);

  it('viewBoxToAttr emits "minx miny width height" (trailing zeros trimmed)', () => {
    expect(viewBoxToAttr({ minx: 0, miny: 0, width: 1600, height: 1200 })).toBe('0 0 1600 1200');
    // The real fit box, formatted.
    const a = viewBoxToAttr(bounds.fitBox);
    const parts = a.split(' ').map(Number);
    expect(parts[0]).toBeCloseTo(-79.2367, 3);
    expect(parts[2]).toBeCloseTo(1884.0133, 3);
    expect(parts).toHaveLength(4);
  });

  it('viewBoxToRectAttrs mirrors the viewBox as x/y/width/height rect attrs', () => {
    const r = viewBoxToRectAttrs(bounds.fitBox);
    expect(Number(r.x)).toBeCloseTo(bounds.fitBox.minx, 3);
    expect(Number(r.y)).toBeCloseTo(bounds.fitBox.miny, 3);
    expect(Number(r.width)).toBeCloseTo(bounds.fitBox.width, 3);
    expect(Number(r.height)).toBeCloseTo(bounds.fitBox.height, 3);
    // The rect and the viewBox are the SAME box (D4-a: both written to the fit box).
    const vb = viewBoxToAttr(bounds.fitBox).split(' ');
    expect([r.x, r.y, r.width, r.height]).toEqual(vb);
  });
});

// ---- §9.5 D5-a: structural, FAIL-LOUD plate identification ----
//
// The runtime enumerates the live svg's DIRECT-CHILD rects and describes each as a
// PlateRectCandidate {ref, width, height, hasFill}; identifyPlateRect picks the single
// native-dim + filled candidate (0 or >1 → throws). These tests mirror that shape with
// plain descriptors (the SAME pure code path, no DOM). The "direct-child" scoping is the
// hook's responsibility (Array.from(svg.children).filter(rect)); here we assert the
// identity predicate ITSELF: native-dim + fill, exactly one, else raise.

/**
 * Extract the DIRECT-CHILD rects of the <svg> from a source string as plate candidates,
 * mirroring the hook's `Array.from(svg.children).filter(rect)` scoping WITHOUT a DOM:
 * grab only rects that are NOT inside <defs> (the planeClip rect lives in <defs> and is
 * therefore not a direct child). This keeps the fixture honest to the runtime scoping.
 */
function directChildRectCandidates(svg: string): PlateRectCandidate[] {
  const withoutDefs = svg.replace(/<defs>[\s\S]*?<\/defs>/g, '');
  // Only rects that are NOT nested in a <g> … </g> (top-level rects). The synthetic +
  // real artifacts place the plate as a top-level rect right after </defs>; every other
  // rect is inside a layer group. A light structural filter: strip <g>…</g> blocks too.
  const topLevel = withoutDefs.replace(/<g\b[\s\S]*?<\/g>/g, '');
  const rects = topLevel.match(/<rect\b[^>]*\/?>/g) ?? [];
  return rects.map((tag, i) => {
    const attr = (name: string): string | null => {
      const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
      return m ? m[1] : null;
    };
    const w = attr('width');
    const h = attr('height');
    const fill = attr('fill');
    return {
      ref: `rect#${i}`,
      width: w == null ? NaN : Number(w),
      height: h == null ? NaN : Number(h),
      hasFill: (fill ?? '').trim() !== '',
    };
  });
}

describe('atlasLens — structural plate identification (§9.5 D5-a, acc #63/#65)', () => {
  const native = parseViewBox(SYNTH_SVG);

  it('picks the SINGLE native-dim, filled direct-child rect as the plate', () => {
    const candidates = directChildRectCandidates(SYNTH_SVG);
    // The synthetic artifact has exactly one top-level rect: the plate.
    expect(candidates).toHaveLength(1);
    const plate = identifyPlateRect(candidates, native);
    expect(plate.ref).toBe('rect#0');
    expect(plate.width).toBe(native.width);
    expect(plate.height).toBe(native.height);
    expect(plate.hasFill).toBe(true);
  });

  it('identifies by native dims + fill, NOT by fill literal or index', () => {
    // Two direct-child rects, plate SECOND, different fill hex (mirrors dark vs light
    // canvas: #0e1016 / #f7f8fa). Structural identity must pick the native-dim one
    // regardless of order or fill value — a decoy non-native filled rect is ignored.
    const candidates: PlateRectCandidate[] = [
      { ref: 'decoy-footer', width: 400, height: 24, hasFill: true }, // non-native filled
      { ref: 'plate', width: 1600, height: 1200, hasFill: true }, // the plate (2nd)
    ];
    expect(identifyPlateRect(candidates, native).ref).toBe('plate');

    // Same plate, arbitrary fill value — still identified (no fill-literal matching).
    const lightCanvas: PlateRectCandidate[] = [
      { ref: 'plate-light', width: 1600, height: 1200, hasFill: true },
    ];
    expect(identifyPlateRect(lightCanvas, native).ref).toBe('plate-light');
  });

  it('FAIL-LOUD: ZERO candidates (no native-dim filled rect) RAISES', () => {
    // A native-dim rect with NO fill is not a plate; a filled rect at non-native dims is
    // not a plate. Neither matches → throw (the artifact shape changed; refuse to guess).
    const noFillAtNative: PlateRectCandidate[] = [
      { ref: 'unfilled-plate-slot', width: 1600, height: 1200, hasFill: false },
      { ref: 'filled-but-small', width: 800, height: 600, hasFill: true },
    ];
    expect(() => identifyPlateRect(noFillAtNative, native)).toThrow(/no canvas plate rect/i);
    // And the truly-empty case.
    expect(() => identifyPlateRect([], native)).toThrow(/no canvas plate rect/i);
  });

  it('FAIL-LOUD: AMBIGUOUS (>1 native-dim filled rect) RAISES — no index/fill tiebreak', () => {
    const ambiguous: PlateRectCandidate[] = [
      { ref: 'plate-a', width: 1600, height: 1200, hasFill: true },
      { ref: 'plate-b', width: 1600, height: 1200, hasFill: true },
    ];
    expect(() => identifyPlateRect(ambiguous, native)).toThrow(/ambiguous canvas plate/i);
  });

  it('DOCTORED-HULL PROBE extends to the PLATE: a wider fit box ⇒ the plate is written wider, zero code change', () => {
    // The plate is written to viewBoxToRectAttrs(fitBox) — the SAME fit box as viewBox +
    // planeClip. So the D4 doctored-hull probe (enlarge a hull vertex in the SOURCE →
    // wider fit box) makes the plate follow with zero code change (acceptance #63/#65).
    const baseline = deriveBounds(SYNTH_SVG);
    const doctored = deriveBounds(SYNTH_SVG.replace('1725.54,625.81', '2600.00,625.81'));

    // The plate is identified identically in both (structural; unchanged by the hull).
    const basePlate = identifyPlateRect(directChildRectCandidates(SYNTH_SVG), native);
    expect(basePlate.ref).toBe('rect#0');

    // What the plate gets WRITTEN to (viewBoxToRectAttrs(fitBox)) grows with the fit box.
    const baseAttrs = viewBoxToRectAttrs(baseline.fitBox);
    const doctoredAttrs = viewBoxToRectAttrs(doctored.fitBox);
    expect(Number(doctoredAttrs.width)).toBeGreaterThan(Number(baseAttrs.width));
    // Plate write == planeClip write == viewBox (acceptance #63: all three the fit box).
    expect([doctoredAttrs.x, doctoredAttrs.y, doctoredAttrs.width, doctoredAttrs.height]).toEqual(
      viewBoxToAttr(doctored.fitBox).split(' ')
    );
  });
});
