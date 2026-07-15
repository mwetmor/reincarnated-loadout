// LeafRow — a single kit-or-ghost leaf row in the pivot table.
//
// Shared by AtlasPivotTable (inline small groups) and VirtualizedLeafList (large
// groups). Kept in its own file so both consumers stay components-only.
//
// WIRING (spec §5, acceptance #34):
//   - onClick fires onSelectRow(item) -> the page applies the chart slim halo and
//     pans the mark into view. (table -> chart)
//   - `selected` renders a subtle focus ring on the row and carries the stable
//     DOM id (leafDomId) so a chart mark click can scrollIntoView this row. The
//     selection cue is a RING only — never a fill/color mutation of the row dot.

import { leafLabel, type PivotItem } from '../../utils/atlasPivot';
import { leafDomId } from '../../utils/atlasSelectPath';

export function LeafRow({
  item,
  indent,
  onSelectRow,
  selected = false,
}: {
  item: PivotItem;
  indent: number;
  onSelectRow?: (item: PivotItem) => void;
  selected?: boolean;
}) {
  const isGraveyard = item.kind === 'kit' && item.row.cls === 'graveyard';
  const isCondensation = item.kind === 'kit' && item.row.condensation != null;
  const isGhost = item.kind === 'ghost';
  return (
    <li>
      <button
        id={leafDomId(item)}
        onClick={() => onSelectRow?.(item)}
        aria-current={selected ? 'true' : undefined}
        style={{ paddingLeft: indent + 16 }}
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
        <span className={['truncate', selected ? 'text-gray-100' : 'text-gray-400'].join(' ')}>
          {leafLabel(item)}
        </span>
      </button>
    </li>
  );
}
