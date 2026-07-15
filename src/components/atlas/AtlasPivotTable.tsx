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

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  buildDefaultLevels,
  groupChildren,
  leafKey,
  type PivotItem,
  type PivotLevelDef,
  type PivotLevelId,
  type PivotNode,
} from '../../utils/atlasPivot';
import { ancestorPathsForItem, leafDomId, isSelectedItem } from '../../utils/atlasSelectPath';
import type { AtlasInteractiveData } from '../../data/atlasTypes';
import type { AtlasSelection } from '../../utils/atlasHighlight';
import { PivotLevelBar } from './PivotLevelBar';
import { VirtualizedLeafList } from './VirtualizedLeafList';
import { LeafRow } from './LeafRow';

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

  // Ordered pivot levels (drag-reorderable). Seed = default hierarchy.
  const defaultLevels = useMemo(() => buildDefaultLevels(coreOrder), [coreOrder]);
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
            {data.counts.kits.toLocaleString()} kits · {data.counts.ghosts.toLocaleString()} ghost
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
        className="max-h-[560px] overflow-auto rounded border border-gray-800 bg-gray-950/50"
      >
        <PivotBranch
          items={rootItems}
          levels={levels}
          levelIndex={0}
          parentPath=""
          depth={0}
          expanded={expanded}
          onToggle={toggle}
          onSelectRow={onSelectRow}
          selection={selection ?? null}
        />
      </div>
    </section>
  );
}

// ---- Recursive branch renderer (lazy per open node) ----

interface PivotBranchProps {
  items: PivotItem[];
  levels: PivotLevelDef[];
  levelIndex: number;
  parentPath: string;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelectRow?: (item: PivotItem) => void;
  selection: AtlasSelection | null;
}

function PivotBranch({
  items,
  levels,
  levelIndex,
  parentPath,
  depth,
  expanded,
  onToggle,
  onSelectRow,
  selection,
}: PivotBranchProps) {
  // Group THIS level lazily. Only runs for mounted (i.e., expanded-ancestor) nodes.
  const { children, nextLevelIndex } = useMemo(
    () => groupChildren(items, levels, levelIndex, parentPath),
    [items, levels, levelIndex, parentPath]
  );

  if (children.length === 0) {
    // No further grouping — these items are leaves under the parent directly.
    return <LeafGroup items={items} depth={depth} onSelectRow={onSelectRow} selection={selection} />;
  }

  return (
    <ul className="text-[12px]">
      {children.map((node) => (
        <PivotRow
          key={node.path}
          node={node}
          levels={levels}
          nextLevelIndex={nextLevelIndex}
          depth={depth}
          expanded={expanded}
          onToggle={onToggle}
          onSelectRow={onSelectRow}
          selection={selection}
        />
      ))}
    </ul>
  );
}

interface PivotRowProps {
  node: PivotNode;
  levels: PivotLevelDef[];
  nextLevelIndex: number;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelectRow?: (item: PivotItem) => void;
  selection: AtlasSelection | null;
}

function PivotRow({
  node,
  levels,
  nextLevelIndex,
  depth,
  expanded,
  onToggle,
  onSelectRow,
  selection,
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
          />
        ) : (
          <PivotBranch
            items={node.items}
            levels={levels}
            levelIndex={nextLevelIndex}
            parentPath={node.path}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
            onSelectRow={onSelectRow}
            selection={selection}
          />
        ))}
    </li>
  );
}

// ---- Leaf group: inline for small, virtualized for large ----

function LeafGroup({
  items,
  depth,
  onSelectRow,
  selection,
}: {
  items: PivotItem[];
  depth: number;
  onSelectRow?: (item: PivotItem) => void;
  selection: AtlasSelection | null;
}) {
  const indent = 8 + depth * 14;

  if (items.length > VIRTUALIZE_THRESHOLD) {
    return (
      <VirtualizedLeafList
        items={items}
        indent={indent}
        onSelectRow={onSelectRow}
        selection={selection}
      />
    );
  }

  return (
    <ul>
      {items.map((it) => (
        <LeafRow
          key={leafKey(it)}
          item={it}
          indent={indent}
          onSelectRow={onSelectRow}
          selected={isSelectedItem(it, selection)}
        />
      ))}
    </ul>
  );
}
