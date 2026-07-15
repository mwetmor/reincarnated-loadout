// atlasSelectPath.ts — the chart<->table bridge helpers (spec §5, acceptance #34).
//
// Two directions share these pure helpers:
//   TABLE -> CHART: a leaf row is clicked -> itemToSelection() maps it to an
//     AtlasSelection (kit_id or ghost core) that atlasHighlight.buildHighlightCss
//     turns into a stroke halo, and leafDomId() names the row's DOM node so the
//     chart can be scrolled to (n/a here) — used mainly for the reverse.
//   CHART -> TABLE: a mark is clicked on the inlined SVG -> hookToSelection()
//     maps its data-el/data-kit/data-core hooks to an AtlasSelection + a target
//     PivotItem; ancestorPathsForItem() lists the pivot node paths to EXPAND so
//     the leaf mounts, and leafDomId() names the leaf row to scrollIntoView.
//
// The path logic MIRRORS atlasPivot.groupChildren exactly (same key derivation,
// same parentPath/key join, same passthrough fall-through) so the paths we emit
// here open the very nodes that renderer builds. A unit-free re-derivation would
// risk drift; instead we walk the SAME PivotLevelDef.keyOf functions.

import type { PivotItem, PivotLevelDef } from './atlasPivot';
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
 * a chart mark is clicked. Kits key by kit_id; ghosts by |-joined core.
 * Sanitised to a CSS/DOM-id-safe token (non [-\w] -> '_').
 */
export function leafDomId(item: PivotItem): string {
  const raw = item.kind === 'kit' ? `k-${item.row.kit_id}` : `g-${item.row.core.join('|')}`;
  return `atlas-leaf-${raw.replace(/[^-\w]/g, '_')}`;
}

/**
 * Given the CURRENT ordered pivot levels and a leaf item, return the ordered
 * list of ancestor node paths that must be EXPANDED for the item's leaf row to
 * mount. Mirrors atlasPivot.groupChildren: at each step we pick the FIRST level
 * (at or after the cursor) whose keyOf(item) is non-null, append `key` to the
 * running path, and advance PAST that level. Levels with a null key for THIS
 * item are skipped (the passthrough fall-through). When no further level applies,
 * the item is a leaf under the last path — we stop (the leaf itself has no path).
 *
 * Returns paths in the SAME '/'-join form groupChildren emits, so Set-membership
 * in the component's `expanded` state opens exactly the right nodes.
 */
export function ancestorPathsForItem(item: PivotItem, levels: PivotLevelDef[]): string[] {
  const paths: string[] = [];
  let parentPath = '';
  let li = 0;
  while (li < levels.length) {
    // Advance to the first level (>= li) that keys THIS item (non-null).
    let key: string | null = null;
    while (li < levels.length) {
      key = levels[li].keyOf(item);
      if (key != null) break;
      li++;
    }
    if (key == null) break; // no further applicable level — item is a leaf here
    const path = parentPath ? `${parentPath}/${key}` : key;
    paths.push(path);
    parentPath = path;
    li++; // consume this level; next iteration finds the following applicable one
  }
  return paths;
}
