// LeafGridHeader — the ONE shared header row per leaf block (D1-g).
//
// Renders the column labels for the leaf grid: build cols (Build/Family/Death-class)
// · 7 axis cols (movement…dependency, core_order verbatim) · metric cols
// (Depth/Lit/Builds). Sticky at the top of a virtualized block so it stays visible
// while the ghost rows scroll. Axis-group headers get a subtle tint so the seven
// core-axis columns read as a band.

import { memo } from 'react';
import type { AtlasColumn } from '../../utils/atlasColumns';

function LeafGridHeaderImpl({
  columns,
  totalGrow,
  indent,
  minWidthPx,
}: {
  columns: AtlasColumn[];
  totalGrow: number;
  indent: number;
  minWidthPx: number;
}) {
  return (
    <div
      style={{ paddingLeft: indent + 16, minWidth: minWidthPx }}
      className="sticky top-0 z-10 flex w-full items-center gap-2 border-b border-gray-800 bg-gray-950/95 py-1 pr-2 font-mono text-[9px] uppercase tracking-wider text-gray-500 backdrop-blur-sm"
    >
      {/* Spacer matching the row's leading dot (h-1.5 w-1.5 + gap). */}
      <span className="h-1.5 w-1.5 shrink-0" />
      {columns.map((col) => (
        <span
          key={col.id}
          style={{ flexBasis: `${(col.grow / totalGrow) * 100}%` }}
          className={[
            'min-w-0 shrink-0 truncate',
            col.numeric ? 'text-right' : '',
            col.group === 'axis' ? 'text-sky-400/70' : 'text-gray-500',
          ].join(' ')}
          title={col.label}
        >
          {col.label}
        </span>
      ))}
    </div>
  );
}

export const LeafGridHeader = memo(LeafGridHeaderImpl);
