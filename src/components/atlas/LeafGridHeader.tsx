// LeafGridHeader — the ONE shared header row per leaf block (D1-g core, D2-c grouping).
//
// Renders the column labels for the UNION leaf grid: build cols (Build/Family/Death-class)
// · axis cols grouped shared(5) → meso-only(2) → kit-only(9) · metric cols
// (Depth/Lit/Builds). Sticky at the top of a virtualized block so it stays visible while
// the ghost rows scroll.
//
// D2-c: a GROUPED super-header names the axis families (Shared · Ghost · Build) above the
// per-axis labels; each axis-header tint reads its grain (shared=sky, ghost/meso=violet,
// build/kit=amber). Column-header tooltips carry the DERIVED axis name + grain verbatim.

import { memo } from 'react';
import type { AtlasColumn, AxisGrain } from '../../utils/atlasColumns';

/** Per-grain header text tint (subtle; reads as a band). */
function grainTint(grain: AxisGrain | undefined): string {
  switch (grain) {
    case 'shared':
      return 'text-sky-400/70';
    case 'meso':
      return 'text-violet-300/70';
    case 'kit':
      return 'text-amber-300/70';
    default:
      return 'text-sky-400/70';
  }
}

/** The D2-c grouped super-header labels + spans, derived from the column list order. */
function axisGroupSpans(columns: AtlasColumn[]): { label: string; grow: number; tint: string }[] {
  // Walk the columns, bucketing contiguous groups. Build+metric collapse to one
  // "structural" span each end; axis columns split by grain into named spans.
  const spans: { label: string; grow: number; tint: string }[] = [];
  let cur: { key: string; label: string; grow: number; tint: string } | null = null;
  const flush = () => {
    if (cur) spans.push({ label: cur.label, grow: cur.grow, tint: cur.tint });
    cur = null;
  };
  for (const col of columns) {
    let key: string;
    let label: string;
    let tint: string;
    if (col.group === 'build') {
      key = 'build-meta';
      label = 'Build';
      tint = 'text-gray-600';
    } else if (col.group === 'metric') {
      key = 'metric';
      label = 'Ghost metrics';
      tint = 'text-gray-600';
    } else {
      // axis column — group by grain
      key = `axis-${col.axisGrain}`;
      label =
        col.axisGrain === 'shared'
          ? 'Shared axes'
          : col.axisGrain === 'meso'
            ? 'Ghost-only (meso)'
            : 'Build-only (14-axis key)';
      tint = grainTint(col.axisGrain);
    }
    if (!cur || cur.key !== key) {
      flush();
      cur = { key, label, grow: col.grow, tint };
    } else {
      cur.grow += col.grow;
    }
  }
  flush();
  return spans;
}

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
  const groups = axisGroupSpans(columns);
  return (
    <div
      style={{ minWidth: minWidthPx }}
      className="sticky top-0 z-10 border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm"
    >
      {/* D2-c grouped super-header: axis-family labels above the per-column labels. */}
      <div
        style={{ paddingLeft: indent + 16 }}
        className="flex w-full items-center gap-2 pr-2 pt-1 font-mono text-[8px] uppercase tracking-widest"
      >
        <span className="h-1.5 w-1.5 shrink-0" />
        {groups.map((g, i) => (
          <span
            key={`${g.label}-${i}`}
            style={{ flexBasis: `${(g.grow / totalGrow) * 100}%` }}
            className={['min-w-0 shrink-0 truncate', g.tint].join(' ')}
            title={g.label}
          >
            {g.label}
          </span>
        ))}
      </div>
      {/* Per-column labels. */}
      <div
        style={{ paddingLeft: indent + 16 }}
        className="flex w-full items-center gap-2 py-1 pr-2 font-mono text-[9px] uppercase tracking-wider text-gray-500"
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
              col.group === 'axis' ? grainTint(col.axisGrain) : 'text-gray-500',
            ].join(' ')}
            // D2-c: tooltip carries the DERIVED axis name + grain verbatim.
            title={col.tooltip ?? col.label}
          >
            {col.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export const LeafGridHeader = memo(LeafGridHeaderImpl);
