// atlasHighlight.ts — page-injected CSS builder for the atlas class-highlight
// (spec §4, acceptance #32) and the single-mark selection halo (spec §5,
// acceptance #34).
//
// LAW (spec §4 / §1):
//   - Highlight is a STROKE HALO ≤ 0.75px. ZERO fill mutations. ZERO dimming of
//     non-selected marks ("very slim, almost non-existent; dots never obscured").
//   - Live-single fill is GROUP-INHERITED in the r7 SVG (<g fill="#50991f"> …),
//     so we NEVER touch `fill` — only `stroke` / `stroke-width` / `paint-order`.
//     Setting stroke leaves the inherited fill intact.
//   - Dark canvas (archive): pale luminous stroke. Light canvas (instrument):
//     dark ink stroke. Bound by CANVAS, never by skin name.
//
// SEMANTICS (spec §1 basic-legend vocabulary, verified against r7 hooks):
//   - "Live Kits"    = ALL live marks = singles + condensation members
//                      = [data-el="live"], [data-el="condensation"]
//   - "Condensations"= the six groups' members = [data-el="condensation"]
//   - "Graveyard"    = the †s = [data-el="graveyard"]
//   - "Ghosts"       = meso + drill-in ground = [data-el="ghost"]
//                      (both #layer-ghosts and #layer-drillin carry data-el=ghost)
//
// The `paint-order:stroke` keeps the halo behind the fill so a filled dot is
// never obscured — the halo reads as a faint rim only.
//
// ZOOM (spec §8.4, acceptance #37): every halo rule carries
// `vector-effect: non-scaling-stroke` so the ≤0.75px cap is a SCREEN-perceptual
// cap that holds at S_max (8×) exactly as at 1× — the halo never fattens as the
// viewBox lens magnifies. Marks carry no native strokes (fills are group-
// inherited), so this vector-effect touches halos ONLY. Stroke-only law carries;
// zero fill mutation; zero dimming — at every zoom.

import type { CanvasKind, LegendClass } from '../data/atlasTypes';

/** Halo stroke width — spec cap is 0.75px; we sit at the cap for legend classes. */
const CLASS_HALO_WIDTH = 0.75;
/** The single-selection halo is a touch wider so it reads as the focused mark,
 *  but still ≤ 0.75px per the law (we use the same cap; distinction is opacity). */
const SELECT_HALO_WIDTH = 0.75;

/** Halo stroke color by canvas. */
function haloStroke(canvas: CanvasKind): string {
  // Dark canvas → pale luminous; light canvas → dark ink.
  return canvas === 'dark' ? '#eef3ff' : '#0b0e14';
}

/** Per legend-class CSS selectors (rooted at the inlined-svg wrapper). */
const CLASS_SELECTORS: Record<LegendClass, string[]> = {
  live: ['[data-el="live"]', '[data-el="condensation"]'],
  condensations: ['[data-el="condensation"]'],
  graveyard: ['[data-el="graveyard"]'],
  ghosts: ['[data-el="ghost"]'],
};

/**
 * Escape a value for a CSS attribute selector `[attr="..."]`.
 * kit_ids are `[a-z0-9-]`; cores are pipe-joined tokens — both are quote-safe,
 * but we escape defensively (backslash-escape `"` and `\`).
 */
function cssAttrEscape(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export interface AtlasHighlightArgs {
  /** Root element id the SVG is inlined under (selectors are scoped to it). */
  rootId: string;
  canvas: CanvasKind;
  /** Multi-selected legend classes (§4). */
  selectedClasses: Set<LegendClass>;
  /** Single selected mark (§5): a kit_id (`data-kit`) OR a ghost core (`data-core`). */
  selection: AtlasSelection | null;
}

/** A single selected mark — either a kit (by kit_id) or a meso ghost (by core). */
export type AtlasSelection =
  | { kind: 'kit'; kitId: string }
  | { kind: 'ghost'; core: string };

/**
 * Build the full page-injected CSS string. Contains, in order:
 *   1. class-highlight rules (one block per selected legend class)
 *   2. single-selection rule (the focused mark)
 * ONLY stroke / stroke-width / paint-order / stroke-opacity are set. No `fill`,
 * no `opacity` on non-selected marks (zero dimming).
 */
export function buildHighlightCss(args: AtlasHighlightArgs): string {
  const { rootId, canvas, selectedClasses, selection } = args;
  const root = `#${rootId}`;
  const stroke = haloStroke(canvas);
  const blocks: string[] = [];

  // ---- 1. Class highlights (multi-select) ----
  for (const cls of selectedClasses) {
    const sels = CLASS_SELECTORS[cls];
    if (!sels) continue;
    const scoped = sels.map((s) => `${root} svg ${s}`).join(',\n');
    blocks.push(
      `${scoped} {\n` +
        `  stroke: ${stroke};\n` +
        `  stroke-width: ${CLASS_HALO_WIDTH}px;\n` +
        `  stroke-opacity: 0.85;\n` +
        `  paint-order: stroke;\n` +
        `  vector-effect: non-scaling-stroke;\n` +
        `}`
    );
  }

  // ---- 2. Single-selection halo (one mark) ----
  if (selection) {
    let sel: string;
    if (selection.kind === 'kit') {
      sel = `${root} svg [data-kit="${cssAttrEscape(selection.kitId)}"]`;
    } else {
      // Ghost by representative core — CSS halos EVERY glyph at that position.
      // This is positionally honest (table ghost-row → halo the glyph at that
      // (x,y)) even when the core is a shared aggregate representative (§ seam 1).
      sel = `${root} svg [data-core="${cssAttrEscape(selection.core)}"]`;
    }
    blocks.push(
      `${sel} {\n` +
        `  stroke: ${stroke};\n` +
        `  stroke-width: ${SELECT_HALO_WIDTH}px;\n` +
        `  stroke-opacity: 1;\n` +
        `  paint-order: stroke;\n` +
        `  vector-effect: non-scaling-stroke;\n` +
        `}`
    );
  }

  return blocks.join('\n\n');
}
