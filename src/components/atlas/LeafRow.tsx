// LeafRow — a single build-or-ghost leaf row in the pivot table, rendered as a GRID
// row across the shared columns (D1-g).
//
// Shared by AtlasPivotTable (inline small groups) and VirtualizedLeafList (large
// groups). React.memo'd (D1-c) so a selection change re-renders only the row whose
// `selected` flag flipped, never the whole windowed slice.
//
// COLUMNS (D1-g): build cols (name/family/death) · 7 axis cols (core_order) · metric
// cols (depth/lit/builds). Ghost rows populate axis+metric; build rows populate the
// build cols; every off-kind cell shows the NA em-dash.
//
// WIRING (spec §5, acceptance #34):
//   - onClick fires onSelectRow(item) -> the page applies the chart slim halo and
//     pans the mark into view. (table -> chart)
//   - `selected` renders a subtle focus ring + carries the stable DOM id (leafDomId)
//     so a chart mark click can scrollIntoView this row. The cue is a RING only.

import { memo } from 'react';
import type { PivotItem } from '../../utils/atlasPivot';
import type { AtlasColumn } from '../../utils/atlasColumns';
import { NA } from '../../utils/atlasColumns';
import { leafDomId } from '../../utils/atlasSelectPath';

function LeafRowImpl({
  item,
  indent,
  columns,
  totalGrow,
  minWidthPx,
  onSelectRow,
  selected = false,
}: {
  item: PivotItem;
  indent: number;
  columns: AtlasColumn[];
  totalGrow: number;
  minWidthPx: number;
  onSelectRow?: (item: PivotItem) => void;
  selected?: boolean;
}) {
  const isGraveyard = item.kind === 'kit' && item.row.cls === 'graveyard';
  const isCondensation = item.kind === 'kit' && item.row.condensation != null;
  const isGhost = item.kind === 'ghost';
  return (
    <button
      id={leafDomId(item)}
      onClick={() => onSelectRow?.(item)}
      aria-current={selected ? 'true' : undefined}
      style={{ paddingLeft: indent + 16, minWidth: minWidthPx }}
      className={[
        'flex w-full items-center gap-2 py-0.5 pr-2 text-left font-mono text-[11px] transition-colors',
        selected
          ? 'bg-indigo-500/15 ring-1 ring-inset ring-indigo-400/70'
          : 'hover:bg-gray-800/40',
      ].join(' ')}
    >
      <span
        className={[
          'h-1.5 w-1.5 shrink-0 rounded-full',
          isGhost
            ? 'bg-gray-600'
            : isCondensation
              ? 'bg-indigo-400'
              : isGraveyard
                ? 'bg-rose-500/70'
                : 'bg-emerald-400',
        ].join(' ')}
      />
      {columns.map((col) => {
        const v = col.cell(item);
        const isNa = v === NA;
        // D2-c: tint axis cells by grain so the union bands read (shared=sky,
        // ghost/meso=violet, build/kit=amber); non-axis populated cells stay neutral.
        // D2-b: the curated literal 'unknown' is styled like any value (never as NA).
        const axisTint =
          col.axisGrain === 'meso'
            ? 'text-violet-200/80'
            : col.axisGrain === 'kit'
              ? 'text-amber-200/85'
              : 'text-sky-300/80';
        return (
          <span
            key={col.id}
            style={{ flexBasis: `${(col.grow / totalGrow) * 100}%` }}
            className={[
              'min-w-0 shrink-0 truncate',
              col.numeric ? 'text-right tabular-nums' : '',
              isNa
                ? 'text-gray-700'
                : col.group === 'axis'
                  ? axisTint
                  : selected
                    ? 'text-gray-100'
                    : 'text-gray-400',
            ].join(' ')}
            title={isNa ? undefined : v}
          >
            {v}
          </span>
        );
      })}
    </button>
  );
}

export const LeafRow = memo(LeafRowImpl);
