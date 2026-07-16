// AtlasBuildTable — the filter bar + ONE flat build lattice (spec §9.3 D3-a).
//
// D3 (Matt 2026-07-15): pivots→filters. The hierarchical pivot (drag-reorder levels,
// progressive-disclosure tree, Reset order / Collapse all) is retired. In its place:
//   - a FILTER BAR — five simple controls (Axis-X pole · Axis-Y pole · Entity ·
//     Liveness · Family), AND-composed over the flat 11,666-item array (§9.3 D3-a).
//   - a live RESULT-COUNT readout (N builds · M ghost cells shown of totals), an
//     HONEST zero-result state + one-click Clear filters.
//   - the BODY is ONE flat table: the SAME D2 union grid (LeafGridHeader +
//     VirtualizedLeafList/LeafRow, untouched cell semantics) over the filtered items
//     — builds first, then ghosts, each in emitted order (no invented ranking).
//
// CHART<->TABLE WIRING (spec §9.3 D3-b, acceptance #56):
//   - onSelectRow fires on leaf-row click -> the page halos the mark + center-scrolls
//     the chart stage (table -> chart).
//   - `selection` marks the focused leaf (a subtle ring; NEVER a fill mutation).
//   - `openItem` is a chart->table request: when the page sets it (from a chart mark
//     click), this table scrollIntoView's the flat leaf row. The page has ALREADY
//     reset filters to All iff the item was filtered out, so the row is present.
//
// Spec: agentic_orchestration/gandalf/notes/2026-07-15-atlas-interactive-glance-spec.md §9.3

import { useMemo, useCallback, useEffect, useRef } from 'react';
import {
  leafKey,
  leafSelectionKey,
  makeFilterPredicate,
  familyOptions,
  countShown,
  filtersAreDefault,
  DEFAULT_FILTERS,
  poleGroupLabel,
  type PivotItem,
  type AtlasFilterState,
} from '../../utils/atlasPivot';
import {
  buildLeafColumns,
  totalGrow as sumGrow,
  gridMinWidthPx,
  type AtlasColumn,
} from '../../utils/atlasColumns';
import { leafDomId, selectionKey } from '../../utils/atlasSelectPath';
import type { AtlasInteractiveData } from '../../data/atlasTypes';
import type { AtlasSelection } from '../../utils/atlasHighlight';
import { VirtualizedLeafList } from './VirtualizedLeafList';
import { LeafRow } from './LeafRow';
import { LeafGridHeader } from './LeafGridHeader';

interface AtlasBuildTableProps {
  data: AtlasInteractiveData;
  /** Fires on leaf-row click; the page turns this into a chart halo + center-scroll. */
  onSelectRow?: (item: PivotItem) => void;
  /** The single active selection (from either direction) — marks the focused row. */
  selection?: AtlasSelection | null;
  /**
   * Chart->table reveal request: the item to reveal + a bump token. When the token
   * changes the table scrollIntoView's the flat leaf row. (Token lets the SAME item
   * re-trigger a scroll on repeated chart clicks.) The page has already reset filters
   * to All iff the item was filtered out (§9.3 D3-b), so the row is present here.
   */
  openItem?: { item: PivotItem; token: number } | null;
  /** The live filter state (owned by the page so chart->table can reset it to All). */
  filters: AtlasFilterState;
  onFiltersChange: (next: AtlasFilterState) => void;
}

// Below this row-count, render inline; above it, virtualize.
const VIRTUALIZE_THRESHOLD = 40;

export function AtlasBuildTable({
  data,
  onSelectRow,
  selection,
  openItem,
  filters,
  onFiltersChange,
}: AtlasBuildTableProps) {
  const coreOrder = data.pole_vocabulary.core_order;
  // D2-a: the DERIVED 14-axis engine-key schema (from pole_vocabulary); undefined on a
  // pre-D2 JSON (then the grid degrades to D1-g ghost-only axis columns).
  const engineKeyAxes = data.pole_vocabulary.engine_key_axes;

  // D2-b/c: the UNION leaf-grid columns — UNTOUCHED cell semantics (Matt: "the table
  // looks nice"). build cols · shared(5)+meso(2)+kit(9) axis cols · metric cols.
  const columns = useMemo(
    () => buildLeafColumns(coreOrder, engineKeyAxes),
    [coreOrder, engineKeyAxes]
  );
  const gridGrow = useMemo(() => sumGrow(columns), [columns]);

  // Family control options — ENUMERATED FROM THE DATA (distinct emitted condensations
  // among live kits, sorted); never a hand-typed list (§9.3 D3-a).
  const families = useMemo(() => familyOptions(data), [data]);

  // Root items = all builds THEN all ghosts, each in emitted order (§9.3: builds first).
  const rootItems: PivotItem[] = useMemo(() => {
    const kits: PivotItem[] = data.kits.map((row) => ({ kind: 'kit', row }));
    const ghosts: PivotItem[] = data.ghosts.map((row) => ({ kind: 'ghost', row }));
    return [...kits, ...ghosts];
  }, [data]);

  // ONE linear pass over the flat array per filter change (§9.3: the grouper caching
  // existed for the tree, which is gone). Memoized on (rootItems, filters) so a
  // selection change does NOT re-filter. Builds stay before ghosts (stable filter).
  const filtered: PivotItem[] = useMemo(() => {
    if (filtersAreDefault(filters)) return rootItems;
    const pred = makeFilterPredicate(filters);
    return rootItems.filter(pred);
  }, [rootItems, filters]);

  const shown = useMemo(() => countShown(filtered), [filtered]);
  const totals = useMemo(() => countShown(rootItems), [rootItems]);
  const isDefault = filtersAreDefault(filters);

  const clearFilters = useCallback(() => onFiltersChange(DEFAULT_FILTERS), [onFiltersChange]);

  // ---- Chart -> table: scroll the flat leaf row into view (best-effort) ----
  const scrollBoxRef = useRef<HTMLDivElement>(null);
  const lastOpenToken = useRef<number>(-1);
  useEffect(() => {
    if (!openItem) return;
    if (openItem.token === lastOpenToken.current) return;
    lastOpenToken.current = openItem.token;
    const domId = leafDomId(openItem.item);
    // Two rAFs: one for the filter-reset/render commit, one for layout of the
    // virtualized rows so the target row exists before we scroll to it.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(domId);
        if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    });
    // Only the token bump triggers a scroll (openItem carries the item + token).
  }, [openItem]);

  return (
    <section className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          {/* §9.3: the heading drops the word "pivot". Community vocab: builds/ghost cells. */}
          <h3 className="text-sm font-semibold text-gray-200">Build lattice</h3>
          <p className="font-mono text-[11px] text-gray-500">
            {shown.builds.toLocaleString()} builds · {shown.ghosts.toLocaleString()} ghost cells
            shown
            {!isDefault && (
              <span className="text-gray-600">
                {' '}
                of {totals.builds.toLocaleString()} · {totals.ghosts.toLocaleString()}
              </span>
            )}
          </p>
        </div>
        {!isDefault && (
          <button
            onClick={clearFilters}
            className="rounded border border-gray-700 bg-gray-800/70 px-2 py-1 font-mono text-[11px] text-gray-300 hover:border-gray-500"
          >
            Clear filters
          </button>
        )}
      </header>

      {/* FILTER BAR (§9.3 D3-a) — five simple controls. Segmented buttons for 1–4;
          a <select> for Family. Style consistent with the font-mono gray-800/900 chrome. */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2" data-testid="atlas-filter-bar">
        <Segmented
          label="Axis-X"
          value={filters.axisX}
          onChange={(v) => onFiltersChange({ ...filters, axisX: v })}
          options={[
            { value: 'all', label: 'All' },
            { value: 'west', label: poleGroupLabel('WEST') },
            { value: 'east', label: poleGroupLabel('EAST') },
          ]}
        />
        <Segmented
          label="Axis-Y"
          value={filters.axisY}
          onChange={(v) => onFiltersChange({ ...filters, axisY: v })}
          options={[
            { value: 'all', label: 'All' },
            { value: 'north', label: poleGroupLabel('NORTH') },
            { value: 'south', label: poleGroupLabel('SOUTH') },
          ]}
        />
        <Segmented
          label="Entity"
          value={filters.entity}
          onChange={(v) => onFiltersChange({ ...filters, entity: v })}
          options={[
            { value: 'all', label: 'All' },
            { value: 'builds', label: 'Builds' },
            { value: 'ghosts', label: 'Ghosts' },
          ]}
        />
        <Segmented
          label="Liveness"
          value={filters.liveness}
          onChange={(v) => onFiltersChange({ ...filters, liveness: v })}
          options={[
            { value: 'all', label: 'All' },
            { value: 'live', label: 'Live Builds' },
            { value: 'graveyard', label: 'Graveyard' },
          ]}
        />
        <label className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
            Family
          </span>
          <select
            value={filters.family}
            onChange={(e) => onFiltersChange({ ...filters, family: e.target.value })}
            data-testid="atlas-filter-family"
            className="rounded border border-gray-700 bg-gray-800/70 px-1.5 py-1 font-mono text-[11px] text-gray-200 hover:border-gray-500 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All</option>
            <option value="single">Single</option>
            {families.map((fam) => (
              <option key={fam} value={fam}>
                {fam}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* BODY — ONE flat table over the filtered items (builds first, then ghosts). */}
      <div
        ref={scrollBoxRef}
        // D1-c: contain the table's layout+style so its renders never invalidate the
        // SVG region's style scope (Bomb-1 cross-contamination guard, page-level too).
        style={{ contain: 'layout style' }}
        className="max-h-[560px] overflow-auto rounded border border-gray-800 bg-gray-950/50"
      >
        {filtered.length === 0 ? (
          <EmptyState onClear={clearFilters} />
        ) : (
          <FlatLeafGrid
            items={filtered}
            columns={columns}
            gridGrow={gridGrow}
            onSelectRow={onSelectRow}
            selection={selection ?? null}
          />
        )}
      </div>
    </section>
  );
}

// ---- HONEST zero-result state (§9.3 D3-a): an empty line + one-click Clear ----

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div
      className="flex flex-col items-center gap-2 px-3 py-10 text-center"
      data-testid="atlas-empty-state"
    >
      <p className="font-mono text-[12px] text-gray-400">No builds or ghost cells match.</p>
      <button
        onClick={onClear}
        className="rounded border border-gray-700 bg-gray-800/70 px-3 py-1 font-mono text-[11px] text-gray-300 hover:border-gray-500"
      >
        Clear filters
      </button>
    </div>
  );
}

// ---- The flat grid: one header + virtualized (or inline) rows over the items ----

function FlatLeafGrid({
  items,
  columns,
  gridGrow,
  onSelectRow,
  selection,
}: {
  items: PivotItem[];
  columns: AtlasColumn[];
  gridGrow: number;
  onSelectRow?: (item: PivotItem) => void;
  selection: AtlasSelection | null;
}) {
  const minWidthPx = gridMinWidthPx(columns);
  const selKey = selectionKey(selection);

  if (items.length > VIRTUALIZE_THRESHOLD) {
    return (
      <VirtualizedLeafList
        items={items}
        indent={0}
        columns={columns}
        totalGrow={gridGrow}
        onSelectRow={onSelectRow}
        selection={selection}
      />
    );
  }

  // Small inline group: one shared header (D1-g) + rows in a horizontally
  // scrollable band so the wide grid stays usable on narrow viewports (D2-c).
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: minWidthPx }}>
        <LeafGridHeader columns={columns} totalGrow={gridGrow} indent={0} minWidthPx={minWidthPx} />
        {items.map((it) => (
          <LeafRow
            key={leafKey(it)}
            item={it}
            indent={0}
            columns={columns}
            totalGrow={gridGrow}
            minWidthPx={minWidthPx}
            onSelectRow={onSelectRow}
            selected={selKey != null && leafSelectionKey(it) === selKey}
          />
        ))}
      </div>
    </div>
  );
}

// ---- Segmented control (one per structural dimension 1–4) ----

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}

function Segmented<T extends string>({ label, value, onChange, options }: SegmentedProps<T>) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">{label}</span>
      <div className="inline-flex overflow-hidden rounded border border-gray-700">
        {options.map((opt, i) => {
          const on = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              aria-pressed={on}
              className={[
                'px-2 py-1 font-mono text-[11px] transition-colors',
                i > 0 ? 'border-l border-gray-700' : '',
                on
                  ? 'bg-indigo-500/20 text-indigo-200'
                  : 'bg-gray-800/70 text-gray-400 hover:bg-gray-800',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
