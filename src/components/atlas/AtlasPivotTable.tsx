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
// OUT OF SCOPE this pass (spec): chart<->table selection wiring. The onSelectRow
// seam is stubbed behind TODO(drax) for r7.
//
// Spec: agentic_orchestration/gandalf/notes/2026-07-15-atlas-interactive-glance-spec.md §5, §7 #33

import { useMemo, useState, useCallback } from 'react';
import {
  buildDefaultLevels,
  groupChildren,
  leafKey,
  type PivotItem,
  type PivotLevelDef,
  type PivotLevelId,
  type PivotNode,
} from '../../utils/atlasPivot';
import type { AtlasInteractiveData } from '../../data/atlasTypes';
import { PivotLevelBar } from './PivotLevelBar';
import { VirtualizedLeafList } from './VirtualizedLeafList';
import { LeafRow } from './LeafRow';

interface AtlasPivotTableProps {
  data: AtlasInteractiveData;
  // TODO(drax): r7 wiring — table row click -> chart slim-halo + pan-into-view.
  //   Left as an inert callback seam; spec §5 selection-wiring + acceptance #34
  //   wait for the r7 hooked SVG. When wired, this fires with the selected item.
  onSelectRow?: (item: PivotItem) => void;
}

// Below this leaf-count, render inline; above it, virtualize.
const VIRTUALIZE_THRESHOLD = 40;

export function AtlasPivotTable({ data, onSelectRow }: AtlasPivotTableProps) {
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

      <div className="max-h-[560px] overflow-auto rounded border border-gray-800 bg-gray-950/50">
        <PivotBranch
          items={rootItems}
          levels={levels}
          levelIndex={0}
          parentPath=""
          depth={0}
          expanded={expanded}
          onToggle={toggle}
          onSelectRow={onSelectRow}
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
}: PivotBranchProps) {
  // Group THIS level lazily. Only runs for mounted (i.e., expanded-ancestor) nodes.
  const { children, nextLevelIndex } = useMemo(
    () => groupChildren(items, levels, levelIndex, parentPath),
    [items, levels, levelIndex, parentPath]
  );

  if (children.length === 0) {
    // No further grouping — these items are leaves under the parent directly.
    return (
      <LeafGroup items={items} depth={depth} onSelectRow={onSelectRow} />
    );
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
}

function PivotRow({
  node,
  levels,
  nextLevelIndex,
  depth,
  expanded,
  onToggle,
  onSelectRow,
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
          <LeafGroup items={node.items} depth={depth + 1} onSelectRow={onSelectRow} />
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
}: {
  items: PivotItem[];
  depth: number;
  onSelectRow?: (item: PivotItem) => void;
}) {
  const indent = 8 + depth * 14;

  if (items.length > VIRTUALIZE_THRESHOLD) {
    return <VirtualizedLeafList items={items} indent={indent} onSelectRow={onSelectRow} />;
  }

  return (
    <ul>
      {items.map((it) => (
        <LeafRow key={leafKey(it)} item={it} indent={indent} onSelectRow={onSelectRow} />
      ))}
    </ul>
  );
}
