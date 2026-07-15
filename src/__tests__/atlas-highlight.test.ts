// atlas-highlight.test.ts — buildHighlightCss conformance (spec §4, acceptance #32).
//
// The class-highlight + single-selection CSS is the ONLY thing that touches the
// inlined SVG's appearance. The law (spec §4/§1) is strict:
//   - stroke halo ONLY: stroke / stroke-width / paint-order / stroke-opacity.
//   - ZERO fill mutation (`fill:` must never appear).
//   - ZERO dimming of non-selected marks (no `opacity:` / no `display:none`).
//   - halo width capped at 0.75px.
//   - stroke color bound by CANVAS (dark -> pale, light -> dark ink), not skin.
// These tests assert those invariants on the pure function output.

import { describe, it, expect } from 'vitest';
import { buildHighlightCss } from '../utils/atlasHighlight';
import type { LegendClass } from '../data/atlasTypes';

const ROOT = 'atlas-svg-test';

function classes(...c: LegendClass[]): Set<LegendClass> {
  return new Set(c);
}

/** Parse each `prop: value;` pair out of the emitted CSS (loose, block-agnostic). */
function declaredProps(css: string): string[] {
  return [...css.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
}

describe('buildHighlightCss — stroke-only law (acceptance #32)', () => {
  it('empty selection => empty CSS (no marks touched)', () => {
    const css = buildHighlightCss({
      rootId: ROOT,
      canvas: 'dark',
      selectedClasses: classes(),
      selection: null,
    });
    expect(css).toBe('');
  });

  it('NEVER declares `fill` (zero fill mutation) for any class', () => {
    const css = buildHighlightCss({
      rootId: ROOT,
      canvas: 'dark',
      selectedClasses: classes('live', 'condensations', 'graveyard', 'ghosts'),
      selection: { kind: 'kit', kitId: 'chr-arrow-storm-warden' },
    });
    expect(css).not.toMatch(/\bfill\s*:/);
  });

  it('NEVER dims non-selected marks (no bare `opacity`, no `display`)', () => {
    const css = buildHighlightCss({
      rootId: ROOT,
      canvas: 'light',
      selectedClasses: classes('ghosts'),
      selection: { kind: 'ghost', core: 'WALK|NOVA|damage|none|solo|active|one-shot' },
    });
    // stroke-opacity is allowed; a BARE `opacity:` (mark dimming) is not.
    expect(css).not.toMatch(/(^|[^-])opacity\s*:/);
    expect(css).not.toMatch(/\bdisplay\s*:/);
    expect(css).not.toMatch(/\bvisibility\s*:/);
  });

  it('only sets the whitelisted stroke properties', () => {
    const css = buildHighlightCss({
      rootId: ROOT,
      canvas: 'dark',
      selectedClasses: classes('live'),
      selection: { kind: 'kit', kitId: 'k' },
    });
    // `vector-effect` (non-scaling-stroke) joins the whitelist for zoom (§8.4):
    // it governs the STROKE's screen-constancy, never fill/dimming.
    const allowed = new Set([
      'stroke',
      'stroke-width',
      'stroke-opacity',
      'paint-order',
      'vector-effect',
    ]);
    for (const p of declaredProps(css)) {
      expect(allowed.has(p), `unexpected CSS property "${p}"`).toBe(true);
    }
  });

  it('adds vector-effect: non-scaling-stroke to every halo rule (§8.4 halo screen-constancy)', () => {
    const css = buildHighlightCss({
      rootId: ROOT,
      canvas: 'dark',
      selectedClasses: classes('live', 'ghosts'),
      selection: { kind: 'kit', kitId: 'k' },
    });
    // Every rule block that sets a stroke must also pin non-scaling-stroke so the
    // ≤0.75px halo is a SCREEN cap at all zooms (holds at S_max exactly as at 1×).
    const strokeBlocks = css.split('}').filter((b) => /stroke:/.test(b));
    expect(strokeBlocks.length).toBeGreaterThan(0);
    for (const b of strokeBlocks) {
      expect(b).toMatch(/vector-effect:\s*non-scaling-stroke/);
    }
  });

  it('caps every stroke-width at 0.75px', () => {
    const css = buildHighlightCss({
      rootId: ROOT,
      canvas: 'dark',
      selectedClasses: classes('live', 'condensations', 'graveyard', 'ghosts'),
      selection: { kind: 'kit', kitId: 'k' },
    });
    const widths = [...css.matchAll(/stroke-width:\s*([\d.]+)px/g)].map((m) => Number(m[1]));
    expect(widths.length).toBeGreaterThan(0);
    for (const w of widths) expect(w).toBeLessThanOrEqual(0.75);
  });

  it('binds stroke color by CANVAS (dark => pale, light => dark ink)', () => {
    const dark = buildHighlightCss({
      rootId: ROOT,
      canvas: 'dark',
      selectedClasses: classes('live'),
      selection: null,
    });
    const light = buildHighlightCss({
      rootId: ROOT,
      canvas: 'light',
      selectedClasses: classes('live'),
      selection: null,
    });
    expect(dark).toMatch(/stroke:\s*#eef3ff/i); // pale luminous on dark
    expect(light).toMatch(/stroke:\s*#0b0e14/i); // dark ink on light
  });

  it('scopes every selector under the root id (no global bleed)', () => {
    const css = buildHighlightCss({
      rootId: ROOT,
      canvas: 'dark',
      selectedClasses: classes('graveyard'),
      selection: { kind: 'kit', kitId: 'k' },
    });
    // Each rule head references the root id; the SVG bytes are never mutated at rest.
    const heads = css.split('}').filter((b) => b.includes('{'));
    for (const h of heads) expect(h).toContain(`#${ROOT}`);
  });

  it('multi-select emits one block per class + the single-selection block', () => {
    const css = buildHighlightCss({
      rootId: ROOT,
      canvas: 'dark',
      selectedClasses: classes('live', 'ghosts'),
      selection: { kind: 'kit', kitId: 'k' },
    });
    // 1 per-mark class block (live) + 1 ghost LAYER-GROUP block + 1 selection = 3.
    const blocks = css.split('}').filter((b) => b.includes('{')).length;
    expect(blocks).toBe(3);
    // Selection targets the kit by data-kit.
    expect(css).toContain('[data-kit="k"]');
    // D1-b: the Ghosts class targets the LAYER GROUPS, NOT per-mark data-el=ghost.
    expect(css).toContain('#layer-ghosts');
    expect(css).toContain('#layer-drillin');
    // The `live` per-mark block still targets data-el=live/condensation.
    expect(css).toContain('[data-el="live"]');
  });
});

describe('buildHighlightCss — D1-b highlight-cost law (acceptance #42)', () => {
  it('Ghosts toggle emits ZERO per-mark stroke rules — layer-group filter ONLY', () => {
    const css = buildHighlightCss({
      rootId: ROOT,
      canvas: 'dark',
      selectedClasses: classes('ghosts'),
      selection: null,
    });
    // NO per-mark ghost selector (the 46,006-mark stroke that caused Bomb 1).
    expect(css).not.toContain('[data-el="ghost"]');
    // Exactly ONE rule block, and it targets the two layer groups with a filter.
    const blocks = css.split('}').filter((b) => b.includes('{'));
    expect(blocks.length).toBe(1);
    expect(css).toContain('#layer-ghosts');
    expect(css).toContain('#layer-drillin');
    expect(css).toMatch(/filter:\s*brightness/);
    // The ghost class emits NO stroke halo (cost scales with class size, not marks).
    expect(css).not.toMatch(/stroke-width/);
  });

  it('the three SMALL classes stay per-mark stroke halos (≤600 marks each)', () => {
    for (const c of ['live', 'condensations', 'graveyard'] as LegendClass[]) {
      const css = buildHighlightCss({
        rootId: ROOT,
        canvas: 'dark',
        selectedClasses: classes(c),
        selection: null,
      });
      // Small classes: per-mark stroke halo (data-el selector + stroke-width).
      expect(css).toMatch(/\[data-el=/);
      expect(css).toMatch(/stroke-width:\s*0\.75px/);
      // And NEVER a layer-group filter (that's the ghost-only path).
      expect(css).not.toMatch(/filter:/);
    }
  });

  it('ghost layer filter is tuned PER CANVAS (dark != light values)', () => {
    const dark = buildHighlightCss({
      rootId: ROOT,
      canvas: 'dark',
      selectedClasses: classes('ghosts'),
      selection: null,
    });
    const light = buildHighlightCss({
      rootId: ROOT,
      canvas: 'light',
      selectedClasses: classes('ghosts'),
      selection: null,
    });
    // Both use a filter; the values differ per canvas (dark wants more lift).
    expect(dark).toMatch(/filter:/);
    expect(light).toMatch(/filter:/);
    expect(dark).not.toBe(light);
  });

  it('a single ghost-core selection STILL halos per-mark (1-few elements, not the class)', () => {
    // Selection-by-core halos one glyph — that stays per-mark (D1-b: selection ≠ class).
    const css = buildHighlightCss({
      rootId: ROOT,
      canvas: 'dark',
      selectedClasses: classes(),
      selection: { kind: 'ghost', core: 'WALK|NOVA|damage|none|solo|active|one-shot' },
    });
    expect(css).toContain('[data-core="WALK|NOVA|damage|none|solo|active|one-shot"]');
    expect(css).toMatch(/stroke-width:\s*0\.75px/);
    // The selection is NOT a layer-group filter.
    expect(css).not.toMatch(/filter:/);
  });
});
