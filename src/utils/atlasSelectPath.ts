// atlasSelectPath.ts — the chart<->table bridge helpers (spec §5, §9.3, acceptance #56).
//
// D3 (spec §9.3, Matt 2026-07-15): pivot grouping retired — the body is ONE flat
// table. ancestorPathsForItem (which expanded pivot node paths) is GONE with its
// tests; a chart→table reveal now scrollIntoView's the flat leaf row by leafDomId
// (the page resets filters to All first iff the item was filtered out). What SURVIVES:
//   TABLE -> CHART: a leaf row is clicked -> itemToSelection() maps it to an
//     AtlasSelection (kit_id or ghost core) that atlasHighlight.buildHighlightCss
//     turns into a stroke halo; the stage center-scrolls the mark (useAtlasStage).
//   CHART -> TABLE: a mark is clicked on the inlined SVG -> hookToSelection()
//     maps its data-el/data-kit/data-core hooks to an AtlasSelection + a target
//     PivotItem; leafDomId() names the flat leaf row to scrollIntoView.

import type { PivotItem } from './atlasPivot';
import type { AtlasSelection } from './atlasHighlight';

// ---- Ruled data seams (gandalf, spec) ----
// Seam B: layer-drillin glyphs carry data-el="ghost" but NO data-core. They are
// NOT selection-wirable — a click deselects. hookToSelection returns null for them.

/** Map an atlas SVG mark's data-* hooks to a single-selection, or null (unwirable). */
export function hookToSelection(hooks: {
  el: string | null;
  kit: string | null;
  core: string | null;
}): AtlasSelection | null {
  const { el, kit, core } = hooks;
  if (el == null) return null;
  if (el === 'live' || el === 'condensation' || el === 'graveyard') {
    // Live singles, condensation MEMBERS (data-kit = own kit_id), graveyard kits
    // are all wirable by kit_id. (Seam B: condensation data-kits member list is
    // display-only; we select by the member's OWN data-kit.)
    return kit ? { kind: 'kit', kitId: kit } : null;
  }
  if (el === 'ghost') {
    // Meso ghosts carry data-core (7-tuple, |-joined). Drill-in ground does NOT
    // (seam B) — no data-core => unwirable => null => deselect.
    return core ? { kind: 'ghost', core } : null;
  }
  return null;
}

/** Map a clicked pivot leaf item to its single-selection (table -> chart). */
export function itemToSelection(item: PivotItem): AtlasSelection {
  if (item.kind === 'kit') return { kind: 'kit', kitId: item.row.kit_id };
  // Ghost row: |-join the emitted 7-tuple in core_order — MUST byte-match the
  // SVG data-core format (verified: core.join('|') === data-core).
  return { kind: 'ghost', core: item.row.core.join('|') };
}

/** True when a leaf item IS the current single selection (kit_id or ghost core). */
export function isSelectedItem(item: PivotItem, selection: AtlasSelection | null): boolean {
  if (!selection) return false;
  if (selection.kind === 'kit') return item.kind === 'kit' && item.row.kit_id === selection.kitId;
  return item.kind === 'ghost' && item.row.core.join('|') === selection.core;
}

/**
 * The leaf-selection key for a selection, in the SAME form as
 * atlasPivot.leafSelectionKey(item) — so a row's key can be compared to the
 * selection's key with string equality (O(1), no per-row isSelectedItem call).
 * kit -> `k:<kit_id>`; ghost -> `g:<|-joined core>`.
 */
export function selectionKey(selection: AtlasSelection | null): string | null {
  if (!selection) return null;
  return selection.kind === 'kit' ? `k:${selection.kitId}` : `g:${selection.core}`;
}

/**
 * A stable DOM id for a leaf row, so the table can scrollIntoView the row when
 * a chart mark is clicked (§9.3: the flat leaf row). Kits key by kit_id; ghosts by
 * |-joined core. Sanitised to a CSS/DOM-id-safe token (non [-\w] -> '_').
 */
export function leafDomId(item: PivotItem): string {
  const raw = item.kind === 'kit' ? `k-${item.row.kit_id}` : `g-${item.row.core.join('|')}`;
  return `atlas-leaf-${raw.replace(/[^-\w]/g, '_')}`;
}
