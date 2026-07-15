// VirtualizedLeafList — windowed rendering for large leaf groups (ghost cells).
//
// A leaf group can hold thousands of ghost-cell rows. Rendering them all would
// mount thousands of DOM nodes. This windows the list: a fixed-height scroll
// container mounts only the rows in view (+ a small overscan). No dependency —
// fixed row height + scrollTop math.
//
// Spec §5: "never a flat 11,160-row render; virtualized."

import { useRef, useState, useCallback } from 'react';
import { leafKey, type PivotItem } from '../../utils/atlasPivot';
import { LeafRow } from './LeafRow';

const ROW_H = 22; // px per leaf row (must match LeafRow line-height footprint)
const VIEW_H = 260; // px visible window
const OVERSCAN = 6; // rows rendered above/below the window

export function VirtualizedLeafList({
  items,
  indent,
  onSelectRow,
}: {
  items: PivotItem[];
  indent: number;
  onSelectRow?: (item: PivotItem) => void;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const total = items.length;
  const totalH = total * ROW_H;
  const first = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const visibleCount = Math.ceil(VIEW_H / ROW_H) + OVERSCAN * 2;
  const last = Math.min(total, first + visibleCount);
  const slice = items.slice(first, last);
  const padTop = first * ROW_H;

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      style={{ height: VIEW_H }}
      className="overflow-auto border-l border-gray-800/60 bg-gray-950/40"
    >
      <div style={{ height: totalH, position: 'relative' }}>
        <div style={{ transform: `translateY(${padTop}px)` }}>
          <ul>
            {slice.map((it) => (
              <div key={leafKey(it)} style={{ height: ROW_H }}>
                <LeafRow item={it} indent={indent} onSelectRow={onSelectRow} />
              </div>
            ))}
          </ul>
        </div>
      </div>
      <div className="sticky bottom-0 border-t border-gray-800 bg-gray-950/90 px-2 py-0.5 text-[9px] font-mono text-gray-600">
        virtualized · showing {first + 1}–{last} of {total.toLocaleString()} rows
      </div>
    </div>
  );
}
