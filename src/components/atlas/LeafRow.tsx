// LeafRow — a single kit-or-ghost leaf row in the pivot table.
//
// Shared by AtlasPivotTable (inline small groups) and VirtualizedLeafList (large
// groups). Kept in its own file so both consumers stay components-only.

import { leafLabel, type PivotItem } from '../../utils/atlasPivot';

export function LeafRow({
  item,
  indent,
  onSelectRow,
}: {
  item: PivotItem;
  indent: number;
  onSelectRow?: (item: PivotItem) => void;
}) {
  const isGraveyard = item.kind === 'kit' && item.row.cls === 'graveyard';
  const isCondensation = item.kind === 'kit' && item.row.condensation != null;
  const isGhost = item.kind === 'ghost';
  return (
    <li>
      <button
        // TODO(drax): r7 wiring — clicking a leaf fires onSelectRow which will
        //   apply the slim halo to the chart mark + pan it into view (acceptance
        //   #34). Inert until the r7 hooked SVG lands.
        onClick={() => onSelectRow?.(item)}
        style={{ paddingLeft: indent + 16 }}
        className="flex w-full items-center gap-2 py-0.5 pr-2 text-left font-mono text-[11px] hover:bg-gray-800/40"
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
        <span className="truncate text-gray-400">{leafLabel(item)}</span>
      </button>
    </li>
  );
}
