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

/** A pivot dimension id. Axis + entity + kit-refinement + the 7 ghost core axes. */
export type PivotLevelId =
  | 'axis-x'
  | 'axis-y'
  | 'entity'
  | 'kit-liveness'
  | 'kit-condensation'
  | `ghost:${string}`; // ghost:<coreAxisName>, e.g. ghost:movement

export interface PivotLevelDef {
  id: PivotLevelId;
  label: string;
  /** Group key for this item under this dimension, or null if not applicable. */
  keyOf: (item: PivotItem) => string | null;
}

// ---- Dimension factories ----

function axisXLevel(): PivotLevelDef {
  return {
    id: 'axis-x',
    label: 'Axis-X (WEST | EAST)',
    keyOf: (it) => (it.row.x >= 0 ? 'EAST' : 'WEST'),
  };
}

function axisYLevel(): PivotLevelDef {
  return {
    id: 'axis-y',
    label: 'Axis-Y (NORTH | SOUTH)',
    keyOf: (it) => (it.row.y >= 0 ? 'NORTH' : 'SOUTH'),
  };
}

function entityLevel(): PivotLevelDef {
  return {
    id: 'entity',
    label: 'Kits | Ghosts',
    keyOf: (it) => (it.kind === 'kit' ? 'Kits' : 'Ghosts'),
  };
}

function kitLivenessLevel(): PivotLevelDef {
  return {
    id: 'kit-liveness',
    label: 'Live Kits | Graveyard',
    // Only applies to kit items; ghosts fall through (null).
    keyOf: (it) => (it.kind === 'kit' ? (it.row.cls === 'live' ? 'Live Kits' : 'Graveyard') : null),
  };
}

function kitCondensationLevel(): PivotLevelDef {
  return {
    id: 'kit-condensation',
    label: 'Condensations | Single',
    // Applies only to LIVE kit items (graveyard + ghosts fall through).
    keyOf: (it) => {
      if (it.kind !== 'kit') return null;
      if (it.row.cls !== 'live') return null;
      return it.row.condensation != null ? `Condensation: ${it.row.condensation}` : 'Single';
    },
  };
}

function ghostCoreLevel(coreOrder: string[], axisName: string): PivotLevelDef {
  const idx = coreOrder.indexOf(axisName);
  return {
    id: `ghost:${axisName}`,
    label: `Ghost / ${axisName}`,
    // Applies only to ghost items; kits fall through.
    keyOf: (it) => (it.kind === 'ghost' ? String(it.row.core[idx]) : null),
  };
}

/**
 * The full catalogue of available pivot levels, given the emitted core_order.
 * Order of the returned array is the DEFAULT pivot hierarchy (spec §5):
 *   axis-x -> axis-y -> entity -> kit-liveness -> kit-condensation
 *   -> ghost:<core_order[0..6]>
 * The component seeds its ordered level list from this and lets the user drag.
 */
export function buildDefaultLevels(coreOrder: string[]): PivotLevelDef[] {
  return [
    axisXLevel(),
    axisYLevel(),
    entityLevel(),
    kitLivenessLevel(),
    kitCondensationLevel(),
    ...coreOrder.map((name) => ghostCoreLevel(coreOrder, name)),
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

// ---- Leaf helpers ----

/** Human-readable leaf label for a kit or ghost row. */
export function leafLabel(item: PivotItem): string {
  if (item.kind === 'kit') {
    const r = item.row;
    const tag =
      r.cls === 'graveyard'
        ? `† ${r.death_class ?? 'graveyard'}`
        : r.condensation != null
          ? r.condensation
          : 'single';
    return `${r.kit_id}  ·  ${tag}`;
  }
  const r = item.row;
  return `${r.core.join(' | ')}  ·  depth ${r.depth.toLocaleString()}${r.lit ? '  ·  LIT' : ''}`;
}

/** A stable react key for a leaf item. */
export function leafKey(item: PivotItem): string {
  return item.kind === 'kit' ? `k:${item.row.kit_id}` : `g:${item.row.core.join('|')}`;
}
