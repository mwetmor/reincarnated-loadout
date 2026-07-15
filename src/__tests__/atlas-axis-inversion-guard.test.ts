// atlas-axis-inversion-guard.test.ts — the MANDATORY D1-e inversion guard (#45).
//
// The skin-bug class taught us not to trust hand-typed sign constants. This test
// derives the expected sign -> pole mapping FROM the vendored r7 SVG rails (the
// artifact of record — same never-invent discipline as the zoom bounds), and
// asserts the pivot's mapping (pivotPoleMapping) against it. It also PROVES a
// deliberately flipped mapping FAILS, so the guard has teeth.
//
// Ground truth (parsed live from public/atlas/atlas-edition2-archive.svg):
//   right-rail text "PERFORM →" @ high x  => positive-x pole = PERFORM (EAST)
//   left-rail  text "← DEPLOY"  @ low  x  => negative-x pole = DEPLOY  (WEST)
//   top-strip  text "↑ LAUNCH"  @ low  screen-y => positive world-y = LAUNCH (NORTH)
//   bottom     text "EMBODY ↓"  @ high screen-y => negative world-y = EMBODY (SOUTH)
// Screen-y is INVERTED: the top strip (low screen-y) is the positive-world-y pole.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { pivotPoleMapping } from '../utils/atlasPivot';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const SVG_PATH = resolve(REPO_ROOT, 'public/atlas/atlas-edition2-archive.svg');

/** One rail text element: its pole word + its (x, y) anchor. */
interface RailText {
  pole: 'PERFORM' | 'DEPLOY' | 'LAUNCH' | 'EMBODY';
  x: number;
  y: number;
}

/**
 * Parse the four pole-rail <text> elements out of the SVG, returning each pole's
 * word + anchor coords. Pure regex over the raw bytes (no DOM) — mirrors the
 * artifact exactly. The x/y are read from the element's own attributes.
 */
function parseRailTexts(svg: string): RailText[] {
  const poles: RailText['pole'][] = ['PERFORM', 'DEPLOY', 'LAUNCH', 'EMBODY'];
  const out: RailText[] = [];
  for (const pole of poles) {
    const i = svg.indexOf(pole);
    expect(i, `SVG must contain the '${pole}' rail`).toBeGreaterThan(-1);
    const start = svg.lastIndexOf('<text', i);
    const end = svg.indexOf('</text>', i);
    expect(start, `'${pole}' must sit inside a <text>`).toBeGreaterThan(-1);
    const frag = svg.slice(start, end);
    const xm = frag.match(/\bx="([-\d.]+)"/);
    const ym = frag.match(/\by="([-\d.]+)"/);
    expect(xm && ym, `'${pole}' <text> must carry x and y`).toBeTruthy();
    out.push({ pole, x: Number(xm![1]), y: Number(ym![1]) });
  }
  return out;
}

/**
 * Derive the sign -> pole mapping FROM the rails' geometry:
 *   the x-pole with the LARGER x is the POSITIVE-x pole (right rail).
 *   the y-pole with the SMALLER screen-y is the POSITIVE-world-y pole (top strip;
 *   screen-y inverted).
 */
function deriveMappingFromSvg(rails: RailText[]) {
  const byPole = Object.fromEntries(rails.map((r) => [r.pole, r]));
  const perform = byPole['PERFORM'];
  const deploy = byPole['DEPLOY'];
  const launch = byPole['LAUNCH'];
  const embody = byPole['EMBODY'];

  // X axis: the pole further RIGHT (larger x) is the positive-x pole.
  const xPositivePole = perform.x > deploy.x ? 'PERFORM' : 'DEPLOY';
  const xNegativePole = perform.x > deploy.x ? 'DEPLOY' : 'PERFORM';
  // Y axis: the pole HIGHER on screen (smaller screen-y) is positive world-y.
  const yPositivePole = launch.y < embody.y ? 'LAUNCH' : 'EMBODY';
  const yNegativePole = launch.y < embody.y ? 'EMBODY' : 'LAUNCH';

  return {
    xPositive: xPositivePole,
    xNegative: xNegativePole,
    yPositive: yPositivePole,
    yNegative: yNegativePole,
  };
}

describe('D1-e axis-pole inversion guard (#45)', () => {
  const svg = readFileSync(SVG_PATH, 'utf8');
  const rails = parseRailTexts(svg);
  const svgMapping = deriveMappingFromSvg(rails);

  it('parses all four pole rails with sane geometry', () => {
    const byPole = Object.fromEntries(rails.map((r) => [r.pole, r]));
    // PERFORM is the RIGHT rail (high x); DEPLOY the LEFT (low x).
    expect(byPole['PERFORM'].x).toBeGreaterThan(byPole['DEPLOY'].x);
    // LAUNCH is the TOP strip (low screen-y); EMBODY the BOTTOM (high screen-y).
    expect(byPole['LAUNCH'].y).toBeLessThan(byPole['EMBODY'].y);
  });

  it('the pivot mapping MATCHES the SVG-derived sign->pole mapping', () => {
    expect(pivotPoleMapping()).toEqual(svgMapping);
    // Spell it out for the record.
    expect(svgMapping.xPositive).toBe('PERFORM'); // x >= 0 (EAST)
    expect(svgMapping.xNegative).toBe('DEPLOY'); // x <  0 (WEST)
    expect(svgMapping.yPositive).toBe('LAUNCH'); // world y >= 0 (NORTH; top strip)
    expect(svgMapping.yNegative).toBe('EMBODY'); // world y <  0 (SOUTH; bottom)
  });

  it('a DELIBERATELY FLIPPED mapping FAILS against the SVG (guard has teeth)', () => {
    // Flip x poles — this is the bug the guard must catch.
    const flippedX = {
      ...pivotPoleMapping(),
      xPositive: pivotPoleMapping().xNegative,
      xNegative: pivotPoleMapping().xPositive,
    };
    expect(flippedX).not.toEqual(svgMapping);

    // Flip y poles (the screen-y inversion trap) — must also be caught.
    const flippedY = {
      ...pivotPoleMapping(),
      yPositive: pivotPoleMapping().yNegative,
      yNegative: pivotPoleMapping().yPositive,
    };
    expect(flippedY).not.toEqual(svgMapping);
  });
});
