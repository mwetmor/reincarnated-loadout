// PivotLevelBar — draggable chips representing the ORDERED pivot levels.
//
// Native HTML5 drag-and-drop reorders the level list. Any level may move above
// or below any other (spec §5); Matt's named case (Condensations above the axis
// levels) is just a drag. No dependency.

import { useState } from 'react';
import type { PivotLevelDef, PivotLevelId } from '../../utils/atlasPivot';

interface PivotLevelBarProps {
  levels: PivotLevelDef[];
  onReorder: (nextOrderIds: PivotLevelId[]) => void;
}

export function PivotLevelBar({ levels, onReorder }: PivotLevelBarProps) {
  const [dragId, setDragId] = useState<PivotLevelId | null>(null);
  const [overId, setOverId] = useState<PivotLevelId | null>(null);

  function move(fromId: PivotLevelId, toId: PivotLevelId) {
    if (fromId === toId) return;
    const ids = levels.map((l) => l.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    onReorder(ids);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mr-1">
        Pivot order (drag)
      </span>
      {levels.map((lvl, i) => {
        const isDragging = dragId === lvl.id;
        const isOver = overId === lvl.id && dragId !== lvl.id;
        return (
          <button
            key={lvl.id}
            draggable
            onDragStart={() => setDragId(lvl.id)}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOverId(lvl.id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) move(dragId, lvl.id);
              setDragId(null);
              setOverId(null);
            }}
            className={[
              'group flex items-center gap-1 rounded px-2 py-1 font-mono text-[11px] cursor-grab active:cursor-grabbing transition-colors border',
              isDragging
                ? 'opacity-40 border-indigo-500 bg-indigo-950/60'
                : isOver
                  ? 'border-indigo-400 bg-indigo-900/50'
                  : 'border-gray-700 bg-gray-800/70 hover:border-gray-500',
            ].join(' ')}
            title="Drag to reorder this pivot level"
          >
            <span className="text-gray-600 text-[9px] tabular-nums">{i + 1}</span>
            <span className="text-gray-500 select-none">⠿</span>
            <span className="text-gray-200">{lvl.label}</span>
          </button>
        );
      })}
    </div>
  );
}
