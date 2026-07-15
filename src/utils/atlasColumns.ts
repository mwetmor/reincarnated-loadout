// atlasColumns.ts — the shared leaf-grid COLUMN model (D1-g).
//
// Ghost core axes are no longer pivot LEVELS (D1-g) — they are grid COLUMNS on the
// leaf rows. Build (kit) leaf rows and ghost leaf rows share ONE grid with ONE
// shared header row per leaf block:
//
//   BUILD cols   : name · family · death-class   (ghost rows show — here)
//   AXIS cols    : movement · delivery · treatment · function · proxy · activation
//                  · dependency  (core_order verbatim; builds show — here — because
//                  per-kit single-valued core codes DO NOT EXIST in the emit)
//   METRIC cols  : depth · lit · builds           (builds show — for ghost metrics)
//
// The seven AXIS column ids come from the emitted core_order (never invented). The
// header renders `core_order` verbatim; a ghost cell's axis value is core[i].
//
// Spec: agentic_orchestration/gandalf/notes/2026-07-15-atlas-interactive-glance-spec.md §9 D1-g

import type { PivotItem } from './atlasPivot';
import { buildProvenanceName } from './atlasPivot';

/** The em-dash shown in a column that does not apply to a given row-kind (D1-g). */
export const NA = '—';

/** Min pixel width per leaf-grid column; below (columns.length × this) the grid
 *  scrolls horizontally so 13 columns stay legible on a 375px phone (mobile-first). */
export const MIN_COL_PX = 62;

/** The pixel min-width of a leaf grid for a given column set (horizontal-scroll floor). */
export function gridMinWidthPx(columns: AtlasColumn[]): number {
  return columns.length * MIN_COL_PX;
}

export interface AtlasColumn {
  /** Stable column id (also the header text for axis columns = core_order name). */
  id: string;
  /** Header label. */
  label: string;
  /** Column group — drives width + subtle divider styling. */
  group: 'build' | 'axis' | 'metric';
  /** Cell value for a leaf item (NA sentinel when the column doesn't apply). */
  cell: (item: PivotItem) => string;
  /** Flex-basis weight for the grid track. */
  grow: number;
  /** Right-align (numeric metrics). */
  numeric?: boolean;
}

/** The three fixed BUILD columns (populated for kits; NA for ghosts). */
const BUILD_COLUMNS: AtlasColumn[] = [
  {
    id: 'name',
    label: 'Build',
    group: 'build',
    grow: 6,
    cell: (it) => (it.kind === 'kit' ? buildProvenanceName(it.row) : NA),
  },
  {
    id: 'family',
    label: 'Family',
    group: 'build',
    grow: 3,
    cell: (it) =>
      it.kind === 'kit' ? (it.row.condensation != null ? it.row.condensation : 'Single') : NA,
  },
  {
    id: 'death',
    label: 'Death-class',
    group: 'build',
    grow: 3,
    cell: (it) =>
      it.kind === 'kit' && it.row.cls === 'graveyard' ? (it.row.death_class ?? NA) : NA,
  },
];

/** The three METRIC columns (populated for ghosts; NA for kits). */
const METRIC_COLUMNS: AtlasColumn[] = [
  {
    id: 'depth',
    label: 'Depth',
    group: 'metric',
    grow: 2,
    numeric: true,
    cell: (it) => (it.kind === 'ghost' ? it.row.depth.toLocaleString() : NA),
  },
  {
    id: 'lit',
    label: 'Lit',
    group: 'metric',
    grow: 1,
    cell: (it) => (it.kind === 'ghost' ? (it.row.lit ? 'LIT' : '·') : NA),
  },
  {
    // D1-i: kit_count column labeled "Builds" for the community (INTERNAL field
    // kit_count is untouched — this is the human label only).
    id: 'builds',
    label: 'Builds',
    group: 'metric',
    grow: 1,
    numeric: true,
    cell: (it) => (it.kind === 'ghost' ? String(it.row.kit_count) : NA),
  },
];

/**
 * Build the full ordered column list for a leaf block, given the emitted core_order.
 * The seven AXIS columns are inserted between BUILD and METRIC columns, in core_order
 * (verbatim). Ghost axis cells read core[i]; build axis cells are NA (no per-kit code).
 */
export function buildLeafColumns(coreOrder: string[]): AtlasColumn[] {
  const axisColumns: AtlasColumn[] = coreOrder.map((axisName, i) => ({
    id: `axis:${axisName}`,
    label: axisName, // core_order verbatim (D1-g)
    group: 'axis' as const,
    grow: 2,
    cell: (it: PivotItem) => (it.kind === 'ghost' ? String(it.row.core[i]) : NA),
  }));
  return [...BUILD_COLUMNS, ...axisColumns, ...METRIC_COLUMNS];
}

/** Total flex weight — used to compute per-column flex-basis percentages. */
export function totalGrow(columns: AtlasColumn[]): number {
  return columns.reduce((n, c) => n + c.grow, 0);
}
