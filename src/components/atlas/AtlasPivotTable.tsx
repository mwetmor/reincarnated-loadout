// AtlasPivotTable — hierarchical, drag-reorderable pivot over the atlas lattice.
//
// - Below-chart placement (spec §5).
// - Progressive disclosure: children of a node are grouped LAZILY on expand
//   (groupChildren is called per open node, never for the whole 11,160-row
//   ghost branch at once).
// - Virtualized leaf rendering: when an expanded LEAF group holds many rows
//   (ghost cells especially), only a scroll-window of rows mounts.
// - Drag-to-reorder pivot levels via PivotLevelBar, incl. condensations-above-
//   axes (Matt case).
//
// CHART<->TABLE WIRING (spec §5, acceptance #34):
//   - onSelectRow fires on leaf-row click -> the page applies the chart slim halo.
//   - `selection` marks the focused leaf (a subtle ring; NEVER a fill mutation).
//   - `openItem` is a chart->table request: when the page sets it (from a chart
//     mark click), this table EXPANDS the item's ancestor node paths (so the leaf
//     mounts) and scrollIntoView's the leaf row. Ancestor paths are computed from
//     the CURRENT (possibly drag-reordered) levels, so drilling stays correct.
//
// Spec: agentic_orchestration/gandalf/notes/2026-07-15-atlas-interactive-glance-spec.md §5, §7 #33

import { memo, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  buildDefaultLevels,
  leafKey,
  leafSelectionKey,
  PivotGrouper,
  type PivotItem,
  type PivotLevelDef,
  type PivotLevelId,
  type PivotNode,
} from '../../utils/atlasPivot';
import {
  buildLeafColumns,
  totalGrow as sumGrow,
  gridMinWidthPx,
  type AtlasColumn,
} from '../../utils/atlasColumns';
import { ancestorPathsForItem, leafDomId, selectionKey } from '../../utils/atlasSelectPath';
import type { AtlasInteractiveData } from '../../data/atlasTypes';
import type { AtlasSelection } from '../../utils/atlasHighlight';
import { PivotLevelBar } from './PivotLevelBar';
import { VirtualizedLeafList } from './VirtualizedLeafList';
import { LeafRow } from './LeafRow';
import { LeafGridHeader } from './LeafGridHeader';

// Dev-only cache-hit counter proving D1-c memoization (#43). Vite statically
// replaces import.meta.env.DEV; the whole readout is tree-shaken in prod builds.
const DEV = import.meta.env.DEV;

interface AtlasPivotTableProps {
  data: AtlasInteractiveData;
  /** Fires on leaf-row click; the page turns this into a chart slim-halo (#34). */
  onSelectRow?: (item: PivotItem) => void;
  /** The single active selection (from either direction) — marks the focused row. */
  selection?: AtlasSelection | null;
  /**
   * Chart->table drill request: the item to reveal + a bump token. When the token
   * changes the table expands the item's ancestors and scrolls the leaf into view.
   * (Token lets the SAME item re-trigger a scroll on repeated chart clicks.)
   */
  openItem?: { item: PivotItem; token: number } | null;
}

// Below this leaf-count, render inline; above it, virtualize.
const VIRTUALIZE_THRESHOLD = 40;

export function AtlasPivotTable({ data, onSelectRow, selection, openItem }: AtlasPivotTableProps) {
  const coreOrder = data.pole_vocabulary.core_order;
  // D2-a: the DERIVED 14-axis engine-key schema (from pole_vocabulary); undefined on a
  // pre-D2 JSON (then the grid degrades to D1-g ghost-only axis columns).
  const engineKeyAxes = data.pole_vocabulary.engine_key_axes;

  // D2-b/c: the UNION leaf-grid columns (build cols · shared(5)+meso(2)+kit(9) axis cols
  // · metric cols). Both grains populate the shared columns; build rows fill the kit-only
  // columns from engine_key; ghost rows fill the meso-only columns from core[i].
  const columns = useMemo(
    () => buildLeafColumns(coreOrder, engineKeyAxes),
    [coreOrder, engineKeyAxes]
  );
  const gridGrow = useMemo(() => sumGrow(columns), [columns]);

  // Ordered pivot levels (drag-reorderable). Seed = default hierarchy (D1-g: the
  // five structural levels; ghost cores are columns now, not levels).
  const defaultLevels = useMemo(() => buildDefaultLevels(), []);
  const [orderIds, setOrderIds] = useState<PivotLevelId[]>(() => defaultLevels.map((l) => l.id));

  const levels: PivotLevelDef[] = useMemo(() => {
    const byId = new Map(defaultLevels.map((l) => [l.id, l]));
    return orderIds.map((id) => byId.get(id)!).filter(Boolean);
  }, [orderIds, defaultLevels]);

  // Root items = all kits + all ghosts as a tagged union.
  const rootItems: PivotItem[] = useMemo(() => {
    const kits: PivotItem[] = data.kits.map((row) => ({ kind: 'kit', row }));
    const ghosts: PivotItem[] = data.ghosts.map((row) => ({ kind: 'ghost', row }));
    return [...kits, ...ghosts];
  }, [data]);

  // D1-c: ONE memoized grouper per (rootItems, level ORDER). Group-children are
  // cached by (levelIndex, path); a selection/legend toggle re-renders WITHOUT
  // re-walking the 11,666-item array. A new grouper is created ONLY when the items
  // change (data) or the level ORDER changes (drag-reorder) — the exact D1-c
  // invalidation law. `levels` identity changes iff orderIds changes (memo above).
  const grouper = useMemo(() => new PivotGrouper(rootItems, levels), [rootItems, levels]);

  // Expansion state keyed by node path.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const resetOrder = useCallback(() => setOrderIds(defaultLevels.map((l) => l.id)), [defaultLevels]);
  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  // ---- Chart -> table: expand ancestors + scroll the leaf into view ----
  const scrollBoxRef = useRef<HTMLDivElement>(null);
  const lastOpenToken = useRef<number>(-1);
  useEffect(() => {
    if (!openItem) return;
    if (openItem.token === lastOpenToken.current) return;
    lastOpenToken.current = openItem.token;
    const paths = ancestorPathsForItem(openItem.item, levels);
    // Open every ancestor node so the leaf row mounts.
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const p of paths) next.add(p);
      return next;
    });
    // After the expansion renders, scroll the leaf row into view (best-effort).
    const domId = leafDomId(openItem.item);
    // Two rAFs: one for the expansion commit, one for layout of virtualized rows.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(domId);
        if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    });
    // levels intentionally excluded — a reorder mid-open should not re-fire scroll;
    // the token bump is the sole trigger. (openItem carries the item + token.)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openItem]);

  return (
    <section className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Lattice pivot</h3>
          <p className="text-[11px] text-gray-500 font-mono">
            {data.counts.kits.toLocaleString()} builds · {data.counts.ghosts.toLocaleString()} ghost
            cells · progressive disclosure
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={resetOrder}
            className="rounded border border-gray-700 bg-gray-800/70 px-2 py-1 font-mono text-[11px] text-gray-300 hover:border-gray-500"
          >
            Reset order
          </button>
          <button
            onClick={collapseAll}
            className="rounded border border-gray-700 bg-gray-800/70 px-2 py-1 font-mono text-[11px] text-gray-300 hover:border-gray-500"
          >
            Collapse all
          </button>
        </div>
      </header>

      <div className="mb-3">
        <PivotLevelBar levels={levels} onReorder={setOrderIds} />
      </div>

      <div
        ref={scrollBoxRef}
        // D1-c: contain the table's layout+style so its renders never invalidate the
        // SVG region's style scope (Bomb-1 cross-contamination guard, page-level too).
        style={{ contain: 'layout style' }}
        className="max-h-[560px] overflow-auto rounded border border-gray-800 bg-gray-950/50"
      >
        <PivotBranch
          items={rootItems}
          grouper={grouper}
          levels={levels}
          levelIndex={0}
          parentPath=""
          depth={0}
          expanded={expanded}
          onToggle={toggle}
          onSelectRow={onSelectRow}
          selection={selection ?? null}
          columns={columns}
          gridGrow={gridGrow}
        />
      </div>

      {DEV && <PivotCacheReadout grouper={grouper} />}
    </section>
  );
}

// ---- Dev-only cache-hit readout (D1-c, #43; tree-shaken in prod) ----
// Reads the grouper's live hit/miss counters. This child is the LAST element in the
// section, so by the time it renders, every PivotBranch above it has already called
// grouper.group() this pass — the counters reflect the completed render. It renders
// with the parent on every selection/legend/expand change (no effect, no forced
// re-render): a selection/legend toggle re-renders the expanded tree producing cache
// HITS (zero re-grouping); a drag-reorder swaps the grouper (fresh instance) => misses
// reset, proving exact invalidation. Rendered only when import.meta.env.DEV.
function PivotCacheReadout({ grouper }: { grouper: PivotGrouper }) {
  const { hits, misses } = grouper.stats;
  const total = hits + misses;
  const rate = total > 0 ? Math.round((hits / total) * 100) : 0;
  return (
    <p className="mt-2 font-mono text-[10px] text-gray-600" data-testid="pivot-cache-readout">
      dev · group-children cache: {hits} hits / {misses} misses ({rate}% hit) · re-group cost O(0)
      on cache hit
    </p>
  );
}

// ---- Recursive branch renderer (lazy per open node) ----

interface PivotBranchProps {
  items: PivotItem[];
  grouper: PivotGrouper;
  levels: PivotLevelDef[];
  levelIndex: number;
  parentPath: string;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelectRow?: (item: PivotItem) => void;
  selection: AtlasSelection | null;
  columns: AtlasColumn[];
  gridGrow: number;
}

function PivotBranch({
  items,
  grouper,
  levels,
  levelIndex,
  parentPath,
  depth,
  expanded,
  onToggle,
  onSelectRow,
  selection,
  columns,
  gridGrow,
}: PivotBranchProps) {
  // D1-c: group via the MEMOIZING grouper — a cache hit returns the same children
  // reference with ZERO re-walk. Only mounted (expanded-ancestor) nodes call this.
  const { children, nextLevelIndex } = grouper.group(items, levelIndex, parentPath);

  if (children.length === 0) {
    // No further grouping — these items are leaves under the parent directly.
    return (
      <LeafGroup
        items={items}
        depth={depth}
        onSelectRow={onSelectRow}
        selection={selection}
        columns={columns}
        gridGrow={gridGrow}
      />
    );
  }

  return (
    <ul className="text-[12px]">
      {children.map((node) => (
        <PivotRow
          key={node.path}
          node={node}
          grouper={grouper}
          levels={levels}
          nextLevelIndex={nextLevelIndex}
          depth={depth}
          expanded={expanded}
          onToggle={onToggle}
          onSelectRow={onSelectRow}
          selection={selection}
          columns={columns}
          gridGrow={gridGrow}
        />
      ))}
    </ul>
  );
}

interface PivotRowProps {
  node: PivotNode;
  grouper: PivotGrouper;
  levels: PivotLevelDef[];
  nextLevelIndex: number;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelectRow?: (item: PivotItem) => void;
  selection: AtlasSelection | null;
  columns: AtlasColumn[];
  gridGrow: number;
}

// React.memo (D1-c): a group row re-renders only when its OWN props change. The
// `expanded` Set + `selection` are shared refs that change on every toggle; memo
// alone won't stop that, but combined with the grouper's cached children (stable
// node refs) the subtree work collapses to the nodes whose open/selected state
// actually flipped. Custom comparator keeps closed subtrees fully inert.
const PivotRow = memo(function PivotRow({
  node,
  grouper,
  levels,
  nextLevelIndex,
  depth,
  expanded,
  onToggle,
  onSelectRow,
  selection,
  columns,
  gridGrow,
}: PivotRowProps) {
  const isOpen = expanded.has(node.path);
  const indent = 8 + depth * 14;

  return (
    <li>
      <button
        onClick={() => onToggle(node.path)}
        style={{ paddingLeft: indent }}
        className="flex w-full items-center gap-2 py-1 pr-2 text-left font-mono hover:bg-gray-800/50"
      >
        <span className="w-3 shrink-0 text-gray-500">
          {node.isLeafGroup ? '·' : isOpen ? '▾' : '▸'}
        </span>
        <span className="truncate text-gray-200">{node.label}</span>
        <span className="ml-auto shrink-0 rounded bg-gray-800 px-1.5 text-[10px] tabular-nums text-gray-400">
          {node.count.toLocaleString()}
        </span>
      </button>

      {isOpen &&
        (node.isLeafGroup ? (
          <LeafGroup
            items={node.items}
            depth={depth + 1}
            onSelectRow={onSelectRow}
            selection={selection}
            columns={columns}
            gridGrow={gridGrow}
          />
        ) : (
          <PivotBranch
            items={node.items}
            grouper={grouper}
            levels={levels}
            levelIndex={nextLevelIndex}
            parentPath={node.path}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
            onSelectRow={onSelectRow}
            selection={selection}
            columns={columns}
            gridGrow={gridGrow}
          />
        ))}
    </li>
  );
});

// ---- Leaf group: inline for small, virtualized for large ----

function LeafGroup({
  items,
  depth,
  onSelectRow,
  selection,
  columns,
  gridGrow,
}: {
  items: PivotItem[];
  depth: number;
  onSelectRow?: (item: PivotItem) => void;
  selection: AtlasSelection | null;
  columns: AtlasColumn[];
  gridGrow: number;
}) {
  const indent = 8 + depth * 14;
  const minWidthPx = gridMinWidthPx(columns);
  const selKey = selectionKey(selection);

  if (items.length > VIRTUALIZE_THRESHOLD) {
    return (
      <VirtualizedLeafList
        items={items}
        indent={indent}
        columns={columns}
        totalGrow={gridGrow}
        onSelectRow={onSelectRow}
        selection={selection}
      />
    );
  }

  // Small inline group: one shared header (D1-g) + rows in a horizontally
  // scrollable band so the wide grid stays usable on narrow viewports.
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: minWidthPx }}>
        <LeafGridHeader
          columns={columns}
          totalGrow={gridGrow}
          indent={indent}
          minWidthPx={minWidthPx}
        />
        {items.map((it) => (
          <LeafRow
            key={leafKey(it)}
            item={it}
            indent={indent}
            columns={columns}
            totalGrow={gridGrow}
            minWidthPx={minWidthPx}
            onSelectRow={onSelectRow}
            selected={selKey != null && leafSelectionKey(it) === selKey}
          />
        ))}
      </div>
    </div>
  );
}
