// atlasPivot.ts — the leaf-item model + filter engine for Build Horizon.
//
// D3 (spec §9.3, Matt 2026-07-15): the hierarchical PIVOT engine is retired —
// pivots→filters. The drag-reorderable ordered-dimension tree (PivotGrouper /
// groupChildren / buildDefaultLevels / PivotLevelDef / PivotNode) is GONE with its
// tests. In its place: FIVE simple filter controls (§9.3 D3-a), each a predicate on
// a structural dimension, AND-composed over the flat 11,666-item array. What SURVIVES
// is the leaf-item union (PivotItem), the axis-pole vocabulary + inversion guard
// (AXIS_POLES / poleGroupLabel / pivotPoleMapping — the filter LABELS come from here,
// never retyped), the build-provenance names, and the leaf key/index helpers (the
// D2 union grid consumes them). This module is PURE — no React, unit-testable.
//
// Leaf items are a tagged union of kit rows and ghost rows. The body is ONE flat
// table over the filtered items (builds first, then ghosts, each in emitted order).
//
// Spec: agentic_orchestration/gandalf/notes/2026-07-15-atlas-interactive-glance-spec.md §9.3

import type { AtlasKitRow, AtlasGhostRow, AtlasInteractiveData } from '../data/atlasTypes';

export type PivotItem =
  | { kind: 'kit'; row: AtlasKitRow }
  | { kind: 'ghost'; row: AtlasGhostRow };

// ---- Axis-pole vocabulary (D1-e) ----
// The pivot's compass labels ARE the pole names. Ground truth = the r7 SVG rails
// (verified against public/atlas/atlas-edition2-archive.svg, inversion-guarded):
//   right-rail  "PERFORM →" @ x=1546 (high x)  => positive-x pole = PERFORM (EAST)
//   left-rail   "← DEPLOY"  @ x=54   (low x)   => negative-x pole = DEPLOY  (WEST)
//   top-strip   "↑ LAUNCH"  @ y=120  (low  screen-y) => positive world-y = LAUNCH (NORTH)
//   bottom      "EMBODY ↓"  @ y=1119 (high screen-y) => negative world-y = EMBODY (SOUTH)
// Screen-y is inverted: the emitted data's y>=0 is the NORTH/LAUNCH pole even though
// it renders at the TOP (low screen-y). The `axis_names` JSON strings carry NO sign
// convention and are NOT trusted here (spec D1-e). The inversion-guard unit test
// re-derives this mapping FROM the SVG and asserts it.
export const AXIS_POLES = {
  /** x >= 0 */ EAST: { name: 'PERFORM', compass: 'E' },
  /** x <  0 */ WEST: { name: 'DEPLOY', compass: 'W' },
  /** world y >= 0 */ NORTH: { name: 'LAUNCH', compass: 'N' },
  /** world y <  0 */ SOUTH: { name: 'EMBODY', compass: 'S' },
} as const;

/** Group label for a pole: `PERFORM · E` (upper pole name, muted compass gloss). */
export function poleGroupLabel(pole: keyof typeof AXIS_POLES): string {
  const p = AXIS_POLES[pole];
  return `${p.name} · ${p.compass}`;
}

/**
 * The pivot's EXPLICIT sign -> pole-name mapping (D1-e), exposed for the inversion
 * guard. This is the SINGLE source the pivot's axis keyOf logic reflects:
 *   x >= 0 -> PERFORM (EAST) ; x < 0 -> DEPLOY (WEST)
 *   world y >= 0 -> LAUNCH (NORTH) ; world y < 0 -> EMBODY (SOUTH)
 * The inversion-guard unit test derives the SAME mapping FROM the vendored SVG rails
 * and asserts equality — and asserts a deliberately flipped mapping FAILS.
 */
export function pivotPoleMapping(): {
  xPositive: string;
  xNegative: string;
  yPositive: string;
  yNegative: string;
} {
  return {
    xPositive: AXIS_POLES.EAST.name, // PERFORM
    xNegative: AXIS_POLES.WEST.name, // DEPLOY
    yPositive: AXIS_POLES.NORTH.name, // LAUNCH
    yNegative: AXIS_POLES.SOUTH.name, // EMBODY
  };
}

// ---- D3-a: the FIVE filter controls (spec §9.3) ----
//
// Each control is a simple filter on ONE structural dimension — the five that were
// pivot levels. Values 'all' pass everything; any non-All setting is a predicate on
// the row. COMPOSITION LAW (§9.3, deterministic): AND across controls; a row a
// non-All filter does NOT APPLY TO **fails** it. Concretely:
//   - Liveness = graveyard  ⇒ ghosts drop (a ghost has no liveness).
//   - Family   = <name>|single ⇒ ghosts + graveyard drop (only live kits carry a
//                              family), and Single = live kit with condensation null.
// Default = 'all' on every control. Enumerated-from-data: the Family options are the
// distinct emitted `condensation` values among LIVE kits (never a hand-typed list).

export type AxisXFilter = 'all' | 'east' | 'west';
export type AxisYFilter = 'all' | 'north' | 'south';
export type EntityFilter = 'all' | 'builds' | 'ghosts';
export type LivenessFilter = 'all' | 'live' | 'graveyard';
/** 'all' | 'single' | a specific family name (enumerated from emitted condensations). */
export type FamilyFilter = string;

export interface AtlasFilterState {
  axisX: AxisXFilter;
  axisY: AxisYFilter;
  entity: EntityFilter;
  liveness: LivenessFilter;
  family: FamilyFilter;
}

/** The all-pass default (every control 'all'). */
export const DEFAULT_FILTERS: AtlasFilterState = {
  axisX: 'all',
  axisY: 'all',
  entity: 'all',
  liveness: 'all',
  family: 'all',
};

/** True iff no filter is narrowing (used to short-circuit + drive the Clear button). */
export function filtersAreDefault(f: AtlasFilterState): boolean {
  return (
    f.axisX === 'all' &&
    f.axisY === 'all' &&
    f.entity === 'all' &&
    f.liveness === 'all' &&
    f.family === 'all'
  );
}

/**
 * The distinct emitted `condensation` values among LIVE kits, sorted — the Family
 * control's dynamic options (enumerated FROM THE DATA, never hand-typed, §9.3 D3-a).
 */
export function familyOptions(data: AtlasInteractiveData): string[] {
  const set = new Set<string>();
  for (const k of data.kits) {
    if (k.cls === 'live' && k.condensation != null) set.add(k.condensation);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/**
 * The composed predicate for a filter state (spec §9.3 D3-a composition law). AND
 * across the five controls; a control the row does NOT apply to FAILS any non-All
 * setting. Pure — the component applies it in one linear pass over the flat array.
 */
export function makeFilterPredicate(f: AtlasFilterState): (item: PivotItem) => boolean {
  return (item) => {
    // Axis-X pole (world-x sign; label from AXIS_POLES). Applies to BOTH kinds.
    if (f.axisX === 'east' && !(item.row.x >= 0)) return false;
    if (f.axisX === 'west' && !(item.row.x < 0)) return false;
    // Axis-Y pole (world-y sign; emitted sign already encodes screen-y inversion).
    if (f.axisY === 'north' && !(item.row.y >= 0)) return false;
    if (f.axisY === 'south' && !(item.row.y < 0)) return false;
    // Entity: builds | ghosts.
    if (f.entity === 'builds' && item.kind !== 'kit') return false;
    if (f.entity === 'ghosts' && item.kind !== 'ghost') return false;
    // Liveness: applies to KITS ONLY — a ghost FAILS any non-All liveness setting.
    if (f.liveness !== 'all') {
      if (item.kind !== 'kit') return false;
      if (f.liveness === 'live' && item.row.cls !== 'live') return false;
      if (f.liveness === 'graveyard' && item.row.cls !== 'graveyard') return false;
    }
    // Family: applies to LIVE KITS ONLY — ghosts + graveyard FAIL any non-All family.
    if (f.family !== 'all') {
      if (item.kind !== 'kit') return false;
      if (item.row.cls !== 'live') return false;
      if (f.family === 'single') {
        if (item.row.condensation != null) return false;
      } else {
        // A specific family name.
        if (item.row.condensation !== f.family) return false;
      }
    }
    return true;
  };
}

/** The count readout for a filtered item list: builds shown + ghost cells shown. */
export function countShown(items: PivotItem[]): { builds: number; ghosts: number } {
  let builds = 0;
  let ghosts = 0;
  for (const it of items) {
    if (it.kind === 'kit') builds++;
    else ghosts++;
  }
  return { builds, ghosts };
}

// ---- D1-c: leaf-index lookup map (kill VirtualizedLeafList findIndex sweeps) ----
//
// The virtualizer used items.findIndex(isSelectedItem) on every selection change to
// reveal the selected row — an O(n) sweep over up-to-thousands of ghost rows per
// selection (Bomb 2, table side). This builds an O(1) key -> index map ONCE per
// items array; the virtualizer looks the selection up instead of sweeping.

/** Stable selection key for a leaf item (matches AtlasSelection identity). */
export function leafSelectionKey(item: PivotItem): string {
  return item.kind === 'kit' ? `k:${item.row.kit_id}` : `g:${item.row.core.join('|')}`;
}

/** Build a leaf-key -> row-index map for an items array (memoize per array). */
export function buildLeafIndexMap(items: PivotItem[]): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < items.length; i++) m.set(leafSelectionKey(items[i]), i);
  return m;
}

// ---- Leaf helpers ----

/**
 * Title-case a corpus game slug for DISPLAY (D1-h). Mechanical transform ONLY — the
 * character content still traces to the corpus `game` field (zero invention: we do
 * NOT map 'poe1' -> 'Path of Exile', which would fabricate strings). 'chronicon' ->
 * 'Chronicon', 'poe1' -> 'Poe1', 'd2' -> 'D2'. null in -> null out (renders nothing).
 */
export function displayGame(game: string | null): string | null {
  if (game == null || game === '') return null;
  return game.charAt(0).toUpperCase() + game.slice(1);
}

/**
 * D1-h: the community-facing build name for a kit row —
 *   `folk_name — game year (patch)`
 * with patch appended only when present, year omitted when absent (then just
 * `folk_name — game`). Every string is a copy of a corpus field; a missing field
 * renders nothing (never a guess). folk_name is guaranteed present on the atlas set
 * (build-fail floor 506/506); if somehow absent, fall back to the kit_id slug so the
 * row is never blank.
 */
export function buildProvenanceName(row: AtlasKitRow): string {
  const folk = row.folk_name && row.folk_name !== '' ? row.folk_name : null;
  if (folk == null) return row.kit_id; // defensive; the build guard prevents this
  const game = displayGame(row.game);
  if (game == null) return folk; // name only when no game (should not happen on atlas)
  let tail = game;
  if (row.era_year != null) tail += ` ${row.era_year}`;
  if (row.stabilization_patch != null && row.stabilization_patch !== '') {
    tail += ` (${row.stabilization_patch})`;
  }
  return `${folk} — ${tail}`;
}

/**
 * Human-readable leaf label for a kit or ghost row (fallback / compact contexts).
 * The GRID renderer (LeafRow) shows the structured columns; this single-string form
 * is used where a compact label is needed. D1-h build names + D1-i vocabulary.
 */
export function leafLabel(item: PivotItem): string {
  if (item.kind === 'kit') {
    const r = item.row;
    // D1-h: build-provenance name instead of the kit_id slug.
    const name = buildProvenanceName(r);
    const tag =
      r.cls === 'graveyard'
        ? `† ${r.death_class ?? 'graveyard'}`
        : r.condensation != null
          ? r.condensation // build-family name (already community-facing)
          : 'single';
    return `${name}  ·  ${tag}`;
  }
  const r = item.row;
  return `${r.core.join(' | ')}  ·  depth ${r.depth.toLocaleString()}${r.lit ? '  ·  LIT' : ''}`;
}

/** A stable react key for a leaf item. */
export function leafKey(item: PivotItem): string {
  return leafSelectionKey(item);
}
