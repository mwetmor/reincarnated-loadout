// atlasPivot.ts — the pivot-model engine for the hierarchical atlas pivot table.
//
// Design: pivot levels are a flat ORDERED list of "dimensions". Each dimension
// maps a leaf item -> a group key (or null = "not applicable to this item").
// Grouping walks the ordered dimensions; null-keyed items fall through to the
// next applicable dimension. This makes drag-to-reorder trivial (reorder the
// list) AND supports Matt's named case: putting `kit-condensation` ABOVE the
// axis dimensions yields condensation groups that span all four quadrants,
// because the condensation dimension keys FIRST and the axis dimensions key
// within each condensation group.
//
// Leaf items are a tagged union of kit rows and ghost rows. Progressive
// disclosure only — the tree is built lazily per expanded node; the 11,160-row
// ghost branch is never materialised flat (the component virtualises leaves).
//
// Spec: agentic_orchestration/gandalf/notes/2026-07-15-atlas-interactive-glance-spec.md §5

import type { AtlasKitRow, AtlasGhostRow } from '../data/atlasTypes';

export type PivotItem =
  | { kind: 'kit'; row: AtlasKitRow }
  | { kind: 'ghost'; row: AtlasGhostRow };

/**
 * A pivot dimension id. The DEFAULT hierarchy is exactly the FIVE STRUCTURAL levels
 * (D1-g): axis-x -> axis-y -> entity -> kit-liveness -> kit-condensation. The seven
 * ghost core axes are NO LONGER pivot levels — they became grid COLUMNS on ghost
 * leaf rows (D1-g). The `ghost:${string}` variant is retained in the union only so
 * a future opt-in re-add wouldn't be a type break; buildDefaultLevels never emits it.
 */
export type PivotLevelId =
  | 'axis-x'
  | 'axis-y'
  | 'entity'
  | 'kit-liveness'
  | 'kit-condensation'
  | `ghost:${string}`;

export interface PivotLevelDef {
  id: PivotLevelId;
  label: string;
  /** Group key for this item under this dimension, or null if not applicable. */
  keyOf: (item: PivotItem) => string | null;
}

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

// ---- Dimension factories ----

function axisXLevel(): PivotLevelDef {
  return {
    id: 'axis-x',
    // D1-e: level label reads the pole pair, WEST-pole first (DEPLOY | PERFORM).
    label: `Axis-X (${AXIS_POLES.WEST.name} | ${AXIS_POLES.EAST.name})`,
    // Group KEY is the pole label; x>=0 => EAST pole (PERFORM), else WEST (DEPLOY).
    keyOf: (it) => (it.row.x >= 0 ? poleGroupLabel('EAST') : poleGroupLabel('WEST')),
  };
}

function axisYLevel(): PivotLevelDef {
  return {
    id: 'axis-y',
    // D1-e: LAUNCH-pole first (world y>=0 pole), then EMBODY.
    label: `Axis-Y (${AXIS_POLES.NORTH.name} | ${AXIS_POLES.SOUTH.name})`,
    // world y>=0 => NORTH pole (LAUNCH); screen-y inversion is already baked into
    // the emitted `y` sign, so the data comparison is direct.
    keyOf: (it) => (it.row.y >= 0 ? poleGroupLabel('NORTH') : poleGroupLabel('SOUTH')),
  };
}

function entityLevel(): PivotLevelDef {
  return {
    id: 'entity',
    // D1-i community vocabulary: Kits -> Builds.
    label: 'Builds | Ghosts',
    keyOf: (it) => (it.kind === 'kit' ? 'Builds' : 'Ghosts'),
  };
}

function kitLivenessLevel(): PivotLevelDef {
  return {
    id: 'kit-liveness',
    // D1-i: Live Kits -> Live Builds.
    label: 'Live Builds | Graveyard',
    // Only applies to kit items; ghosts fall through (null).
    keyOf: (it) =>
      it.kind === 'kit' ? (it.row.cls === 'live' ? 'Live Builds' : 'Graveyard') : null,
  };
}

function kitCondensationLevel(): PivotLevelDef {
  return {
    id: 'kit-condensation',
    // D1-i: Condensations -> Build Families; Single stays.
    label: 'Build Families | Single',
    // Applies only to LIVE kit items (graveyard + ghosts fall through).
    keyOf: (it) => {
      if (it.kind !== 'kit') return null;
      if (it.row.cls !== 'live') return null;
      // D1-i group prefix: `Condensation: X` -> `Family: X`.
      return it.row.condensation != null ? `Family: ${it.row.condensation}` : 'Single';
    },
  };
}

/**
 * The catalogue of DEFAULT pivot levels (D1-g). Exactly the FIVE STRUCTURAL levels:
 *   axis-x -> axis-y -> entity -> kit-liveness -> kit-condensation
 * The seven ghost core axes are NO LONGER levels — they render as grid COLUMNS on
 * ghost leaf rows (D1-g). The 11,160-ghost branch now bottoms out at the
 * `entity=Ghosts` node as a single virtualized leaf block with columns.
 * The component seeds its ordered level list from this and lets the user drag.
 * (No `coreOrder` parameter: the ghost axes are columns now — see buildLeafColumns.)
 */
export function buildDefaultLevels(): PivotLevelDef[] {
  return [
    axisXLevel(),
    axisYLevel(),
    entityLevel(),
    kitLivenessLevel(),
    kitCondensationLevel(),
  ];
}

// ---- Tree model (built lazily / progressively) ----

export interface PivotNode {
  /** Stable path key from root, '/'-joined group keys. */
  path: string;
  /** The group label at this node's own level. */
  label: string;
  /** The level id that produced this node ('__leaf__' for a leaf row). */
  levelId: PivotLevelId | '__leaf__';
  /** Number of leaf items under this node (recursive count). */
  count: number;
  /** Items in this node (only retained at the frontier; see groupChildren). */
  items: PivotItem[];
  /** True once this node has no further applicable dimension => its items are leaves. */
  isLeafGroup: boolean;
}

/**
 * Group `items` by the FIRST applicable dimension at or after `levelIndex`.
 * Items whose key is null at a dimension fall through to the next dimension.
 * Returns the child nodes (one per distinct group key) plus, if some items had
 * no applicable dimension at all from levelIndex onward, a synthetic leaf bucket.
 *
 * This is called lazily per expanded node — the tree is never fully materialised.
 */
export function groupChildren(
  items: PivotItem[],
  levels: PivotLevelDef[],
  levelIndex: number,
  parentPath: string
): { children: PivotNode[]; nextLevelIndex: number } {
  // Find the next dimension for which AT LEAST ONE item has a non-null key.
  let li = levelIndex;
  let activeLevel: PivotLevelDef | null = null;
  while (li < levels.length) {
    const lvl = levels[li];
    if (items.some((it) => lvl.keyOf(it) != null)) {
      activeLevel = lvl;
      break;
    }
    li++;
  }

  if (activeLevel == null) {
    // No further grouping applies — everything here is a leaf under one bucket.
    return { children: [], nextLevelIndex: levels.length };
  }

  const groups = new Map<string, PivotItem[]>();
  const passthrough: PivotItem[] = []; // items with null key at this active level
  for (const it of items) {
    const key = activeLevel.keyOf(it);
    if (key == null) {
      passthrough.push(it);
      continue;
    }
    let bucket = groups.get(key);
    if (!bucket) {
      bucket = [];
      groups.set(key, bucket);
    }
    bucket.push(it);
  }

  const children: PivotNode[] = [];
  for (const [key, bucket] of groups) {
    const path = parentPath ? `${parentPath}/${key}` : key;
    // Is there any FURTHER applicable dimension for this bucket beyond li?
    const hasDeeper = hasApplicableLevel(bucket, levels, li + 1);
    children.push({
      path,
      label: key,
      levelId: activeLevel.id,
      count: bucket.length,
      items: bucket,
      isLeafGroup: !hasDeeper,
    });
  }

  // Passthrough items (null at this active level) that STILL have a deeper
  // applicable dimension get grouped there; if none, they are leaves in place.
  if (passthrough.length > 0) {
    const sub = groupChildren(passthrough, levels, li + 1, parentPath);
    if (sub.children.length > 0) {
      children.push(...sub.children);
    } else {
      // Genuinely ungroupable passthrough: attach as a leaf bucket.
      const path = parentPath ? `${parentPath}/·` : '·';
      children.push({
        path,
        label: '(ungrouped)',
        levelId: '__leaf__',
        count: passthrough.length,
        items: passthrough,
        isLeafGroup: true,
      });
    }
  }

  // Deterministic order: numeric-aware, then lexical.
  children.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  return { children, nextLevelIndex: li + 1 };
}

function hasApplicableLevel(items: PivotItem[], levels: PivotLevelDef[], from: number): boolean {
  for (let i = from; i < levels.length; i++) {
    if (items.some((it) => levels[i].keyOf(it) != null)) return true;
  }
  return false;
}

// ---- D1-c: group-children memoization (cache per level-order + node-path) ----
//
// groupChildren re-walks its `items` array on every call. Before D1-c the recursive
// renderer called it once per MOUNTED node PER RENDER — re-grouping the 11,666-item
// array on every selection/legend toggle (Bomb 2). The cache keys on (level-order
// signature, node-path, levelIndex): a node's grouping is a pure function of those
// three, so a cache hit returns the SAME children reference and does ZERO re-walk.
// Invalidated ONLY when the level ORDER changes (drag-reorder) or the data changes
// (new cache instance per items-array). A dev cache-hit counter proves it (#43).

export interface GroupChildrenResult {
  children: PivotNode[];
  nextLevelIndex: number;
}

/** Cache-hit/miss telemetry — dev-only receipts for acceptance #43. */
export interface PivotCacheStats {
  hits: number;
  misses: number;
}

/**
 * A memoizing grouper bound to ONE root items array + ONE ordered level list.
 * Rebuild it (new instance) when EITHER the items array OR the level ORDER changes;
 * within a stable (items, order) it returns cached children by (path, levelIndex).
 * This is the D1-c "cache group-children per (level-order, node-path)" law made
 * concrete: identity of the memo instance encodes (items, order); the map key
 * encodes (path, levelIndex).
 */
export class PivotGrouper {
  /** Root items this grouper is bound to (identity IS the data-change invalidation
   *  key — a new grouper is created iff the items array or the level order changes). */
  readonly rootItems: PivotItem[];
  private readonly levels: PivotLevelDef[];
  private readonly cache = new Map<string, GroupChildrenResult>();
  readonly stats: PivotCacheStats = { hits: 0, misses: 0 };

  constructor(rootItems: PivotItem[], levels: PivotLevelDef[]) {
    this.rootItems = rootItems;
    this.levels = levels;
  }

  /** Grouping key: a node is uniquely identified by its path + its start levelIndex. */
  private keyFor(parentPath: string, levelIndex: number): string {
    return `${levelIndex} ${parentPath}`;
  }

  group(items: PivotItem[], levelIndex: number, parentPath: string): GroupChildrenResult {
    const key = this.keyFor(parentPath, levelIndex);
    const cached = this.cache.get(key);
    if (cached) {
      this.stats.hits++;
      return cached;
    }
    this.stats.misses++;
    const result = groupChildren(items, this.levels, levelIndex, parentPath);
    this.cache.set(key, result);
    return result;
  }
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
