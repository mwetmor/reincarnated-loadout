// VirtualizedLeafList — windowed grid rendering for large leaf groups (ghost cells).
//
// A leaf group can hold thousands of ghost-cell rows (the 11,160-ghost branch now
// bottoms out here as ONE block — D1-g dropped the seven ghost pivot levels). This
// windows the list: a fixed-height scroll container mounts only the rows in view
// (+ overscan). No dependency — fixed row height + scrollTop math.
//
// D1-c perf laws applied here:
//   - Leaf-index MAP (buildLeafIndexMap) replaces the per-selection items.findIndex
//     sweep — O(1) reveal instead of O(n) over thousands of rows (Bomb 2, table side).
//   - Scroll state is rAF-THROTTLED — a fast scroll fires one setState per frame,
//     not per scroll event; the virtualizer never thrashes React.
//   - `contain: layout style` on the scroll region so its renders never invalidate
//     the SVG region's style scope (Bomb-1 cross-contamination guard).
//   - LeafRow is React.memo'd — only the row whose `selected` flipped re-renders.
//
// D1-g grid: ONE shared header row (LeafGridHeader) + build/axis/metric columns.
//
// Spec §5: "never a flat 11,160-row render; virtualized." + §9 D1-c/D1-g.

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { leafKey, buildLeafIndexMap, leafSelectionKey, type PivotItem } from '../../utils/atlasPivot';
import type { AtlasSelection } from '../../utils/atlasHighlight';
import { gridMinWidthPx, type AtlasColumn } from '../../utils/atlasColumns';
import { LeafRow } from './LeafRow';
import { LeafGridHeader } from './LeafGridHeader';

const ROW_H = 22; // px per leaf row (must match LeafRow line-height footprint)
const VIEW_H = 300; // px visible window (grid rows a touch taller; keeps ≥50fps)
const OVERSCAN = 6; // rows rendered above/below the window

export function VirtualizedLeafList({
  items,
  indent,
  columns,
  totalGrow,
  onSelectRow,
  selection = null,
}: {
  items: PivotItem[];
  indent: number;
  columns: AtlasColumn[];
  totalGrow: number;
  onSelectRow?: (item: PivotItem) => void;
  selection?: AtlasSelection | null;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // rAF-throttle scroll -> at most one setState per frame (D1-c).
  const rafRef = useRef<number | null>(null);
  const pendingTop = useRef(0);
  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    pendingTop.current = e.currentTarget.scrollTop;
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setScrollTop(pendingTop.current);
      });
    }
  }, []);
  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  // D1-c: O(1) leaf-index map — built ONCE per items array (memoized on identity).
  const indexMap = useMemo(() => buildLeafIndexMap(items), [items]);

  const minWidthPx = gridMinWidthPx(columns);
  const total = items.length;
  const totalH = total * ROW_H;
  const first = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const visibleCount = Math.ceil(VIEW_H / ROW_H) + OVERSCAN * 2;
  const last = Math.min(total, first + visibleCount);
  const slice = items.slice(first, last);
  const padTop = first * ROW_H;

  // Chart -> table: when the selected item lives in THIS group but outside the
  // window, scroll it in. D1-c: O(1) map lookup instead of items.findIndex sweep.
  const selKey = selection
    ? selection.kind === 'kit'
      ? `k:${selection.kitId}`
      : `g:${selection.core}`
    : null;
  useEffect(() => {
    if (!selKey) return;
    const idx = indexMap.get(selKey);
    if (idx == null || idx < 0) return;
    const box = scrollRef.current;
    if (!box) return;
    const rowTop = idx * ROW_H;
    const rowBottom = rowTop + ROW_H;
    if (rowTop < box.scrollTop || rowBottom > box.scrollTop + VIEW_H) {
      box.scrollTop = Math.max(0, rowTop - VIEW_H / 2 + ROW_H / 2);
    }
    // indexMap is stable per items array; selKey drives the reveal.
  }, [selKey, indexMap]);

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      style={{ height: VIEW_H, contain: 'layout style' }}
      className="overflow-auto border-l border-gray-800/60 bg-gray-950/40"
    >
      {/* Inner track carries min-width so the header + rows scroll horizontally together. */}
      <div style={{ minWidth: minWidthPx }}>
        <LeafGridHeader
          columns={columns}
          totalGrow={totalGrow}
          indent={indent}
          minWidthPx={minWidthPx}
        />
        <div style={{ height: totalH, position: 'relative' }}>
          <div style={{ transform: `translateY(${padTop}px)` }}>
            {slice.map((it) => (
              <div key={leafKey(it)} style={{ height: ROW_H }}>
                <LeafRow
                  item={it}
                  indent={indent}
                  columns={columns}
                  totalGrow={totalGrow}
                  minWidthPx={minWidthPx}
                  onSelectRow={onSelectRow}
                  selected={
                    selKey != null && leafSelectionKey(it) === selKey
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="sticky bottom-0 left-0 border-t border-gray-800 bg-gray-950/90 px-2 py-0.5 text-[9px] font-mono text-gray-600">
        virtualized · showing {first + 1}–{last} of {total.toLocaleString()} rows
      </div>
    </div>
  );
}
