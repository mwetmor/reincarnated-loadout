// atlasColumns.ts — the shared leaf-grid COLUMN model (D1-g core, D2-b/c union grid).
//
// D1-g made ghost core axes into grid COLUMNS. D2-b/c widens the grid to a UNION of
// the ghost meso-7 and the build 14-axis engine key. One grid, one shared header row:
//
//   BUILD cols  : name · family · death-class      (ghost rows show — here)
//   AXIS cols   : the UNION of ghost-7 + build-14, grouped by D2-c:
//                   shared(5)   treatment · function · proxy · activation · dependency
//                               — BOTH grains populate (emitter-proven identical vocab)
//                   meso-only(2) movement(meso) · delivery(meso)
//                               — ONLY ghost rows populate; builds show —
//                               (the ghost grain's TRANSFORMED tokens: FREE-MOVE etc.)
//                   kit-only(9)  movement · delivery · amplitude · geometry · defense
//                               · economy · range · tempo · commit
//                               — ONLY build rows populate; ghosts show —
//   METRIC cols : depth · lit · builds              (build rows show — here)
//
// D2-b SHARED-COLUMN LAW (emitter-proven, receipt in engine-key-sidecar.__provenance__):
//   an axis shares ONE column iff the emitter maps kit->meso IDENTITY (fit2reg_direct2),
//   so the kit token == the meso token. movement + delivery are TRANSFORMED
//   (fit2reg_movement renames full-move->FREE-MOVE; fit2reg_delivery grain-collapses
//   geometry+proxy) => they get SEPARATE grain columns, NOT a shared one. This DIVERGES
//   from the brief's "expected shared six" (which listed movement); the emitter's own
//   REG2FIT crosswalk proves movement's kit/meso vocabularies differ (full-move vs
//   FREE-MOVE) so it is NOT shared. The five proven-identical axes are shared.
//
// D2-b `unknown` vs `—`: `unknown` is a CURATED engine-key value → rendered literally.
//   `—` (NA) means NO DATA (blank sentinel normalised to null, or off-kind cell). Never
//   collapse the two.
//
// The axis names/order come from the EMITTED data (ghost core_order + the derived
// engine_key_axes schema) — never invented on the render side.
//
// Spec: agentic_orchestration/gandalf/notes/2026-07-15-atlas-interactive-glance-spec.md §9 D1-g + §9.2 D2-b/c

import type { PivotItem } from './atlasPivot';
import { buildProvenanceName } from './atlasPivot';
import type { AtlasEngineKeyAxis } from '../data/atlasTypes';

/** The em-dash shown in a column that does not apply to a given row-kind (D2-b: NO DATA;
 *  distinct from the curated literal value "unknown"). */
export const NA = '—';

/** Min pixel width per leaf-grid column; below (columns.length × this) the grid scrolls
 *  horizontally INSIDE the table region so the wide union grid stays legible on a 375px
 *  phone (mobile-first, D2-c: horizontal scroll inside the table only). */
export const MIN_COL_PX = 64;

/** The pixel min-width of a leaf grid for a given column set (horizontal-scroll floor). */
export function gridMinWidthPx(columns: AtlasColumn[]): number {
  return columns.length * MIN_COL_PX;
}

/** Axis-column grain family (D2-c grouping): shared both grains, meso-only, kit-only. */
export type AxisGrain = 'shared' | 'meso' | 'kit';

export interface AtlasColumn {
  /** Stable column id (also the header text for axis columns = derived axis name). */
  id: string;
  /** Header label (mechanically prettified derived name — never a new word). */
  label: string;
  /** Column group — drives width + subtle divider styling. */
  group: 'build' | 'axis' | 'metric';
  /** For axis columns, the grain family (D2-c grouping); undefined for build/metric. */
  axisGrain?: AxisGrain;
  /** Column-header tooltip — carries the DERIVED axis name + grain verbatim (D2-c). */
  tooltip?: string;
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
 * D2-b: the emitter-proven SHARED axis set — axes whose kit->meso mapping is IDENTITY
 * (fit2reg_direct2 in ghost_field_edition2.py), so the kit token == the meso token and
 * ONE column honestly carries both grains. Receipt: engine-key-sidecar.__provenance__
 * .shared_column_verdict. movement + delivery are EXCLUDED (transformed, not identity).
 */
export const SHARED_AXES = ['treatment', 'function', 'proxy', 'activation', 'dependency'] as const;
const SHARED_SET = new Set<string>(SHARED_AXES);

/** Mechanically prettify a derived axis name for a header (title-case; underscores ->
 *  spaces). NEW WORDS ARE NOT INTRODUCED (D2-c) — this is a pure presentation transform
 *  on the derived string, so the header always traces back to the emitted axis name. */
export function prettifyAxis(axis: string): string {
  return axis
    .split(/[_\s]+/)
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** A ghost cell's value for a core axis (by core_order index), else NA. */
function ghostCoreCell(coreIndex: number): (item: PivotItem) => string {
  return (it) => (it.kind === 'ghost' ? String(it.row.core[coreIndex]) : NA);
}

/** A build's engine-key value for an axis; null (blank sentinel / off-kind) -> NA. Note:
 *  the curated literal 'unknown' passes through UNCHANGED (D2-b). */
function buildEngineKeyCell(axis: string): (item: PivotItem) => string {
  return (it) => {
    if (it.kind !== 'kit') return NA;
    const ek = it.row.engine_key;
    if (ek == null) return NA;
    const v = ek[axis];
    return v == null || v === '' ? NA : String(v);
  };
}

/**
 * Build the full ordered UNION column list for a leaf block (D2-b/c).
 *
 * @param coreOrder      the ghost meso core_order (verbatim, from pole_vocabulary)
 * @param engineKeyAxes  the derived 14-axis engine-key schema (from pole_vocabulary), or
 *                       undefined (pre-D2 JSON) — then the grid degrades to D1-g behavior
 *                       (ghost core axes as columns; builds show — in axis columns).
 *
 * Column order (D2-c): BUILD · [shared(5) · meso-only · kit-only] · METRIC.
 *   - shared    : one column, cell reads ghost core[i] for ghosts AND engine_key[axis]
 *                 for builds (emitter-proven identical vocab).
 *   - meso-only : ghost core axes NOT in the shared set (movement, delivery) — ghost
 *                 populates via core[i]; builds show — (transformed grain, not their key).
 *   - kit-only  : engine-key axes NOT in the shared set (the 9) — build populates via
 *                 engine_key[axis]; ghosts show —.
 */
export function buildLeafColumns(
  coreOrder: string[],
  engineKeyAxes?: AtlasEngineKeyAxis[]
): AtlasColumn[] {
  const ghostIndexOf = new Map<string, number>();
  coreOrder.forEach((name, i) => ghostIndexOf.set(name, i));

  // --- SHARED columns (5): both grains populate. Ordered by ghost core_order for
  //     stable, familiar sequencing. Cell = ghost core[i] OR build engine_key[axis]. ---
  const sharedColumns: AtlasColumn[] = [];
  for (const axis of coreOrder) {
    if (!SHARED_SET.has(axis)) continue;
    const gi = ghostIndexOf.get(axis)!;
    const ekCell = engineKeyAxes ? buildEngineKeyCell(axis) : () => NA;
    sharedColumns.push({
      id: `axis:${axis}`,
      label: prettifyAxis(axis),
      group: 'axis',
      axisGrain: 'shared',
      tooltip: `${axis} — shared (build + ghost; emitter-proven identical vocabulary)`,
      grow: 2,
      cell: (it) => (it.kind === 'ghost' ? ghostCoreCell(gi)(it) : ekCell(it)),
    });
  }

  // --- MESO-ONLY columns: ghost core axes NOT shared (movement, delivery). Ghost
  //     populates; builds show — (they carry their OWN transformed key, in kit-only). ---
  const mesoColumns: AtlasColumn[] = [];
  coreOrder.forEach((axis, i) => {
    if (SHARED_SET.has(axis)) return;
    mesoColumns.push({
      id: `axis:meso:${axis}`,
      label: prettifyAxis(axis),
      group: 'axis',
      axisGrain: 'meso',
      tooltip: `${axis} — meso grain (ghost only; the aggregated/transformed register value)`,
      grow: 2,
      cell: ghostCoreCell(i),
    });
  });

  // --- KIT-ONLY columns: engine-key axes NOT shared (the 9). Build populates; ghosts
  //     show —. Ordered by the derived engine_key_axes `pos` (the emitter's part order). ---
  const kitColumns: AtlasColumn[] = [];
  if (engineKeyAxes) {
    for (const a of [...engineKeyAxes].sort((x, y) => x.pos - y.pos)) {
      if (SHARED_SET.has(a.axis)) continue;
      kitColumns.push({
        id: `axis:kit:${a.axis}`,
        label: prettifyAxis(a.axis),
        group: 'axis',
        axisGrain: 'kit',
        tooltip: `${a.axis} — build grain (build only; corpus column ${a.column})`,
        grow: 2,
        cell: buildEngineKeyCell(a.axis),
      });
    }
  }

  return [...BUILD_COLUMNS, ...sharedColumns, ...mesoColumns, ...kitColumns, ...METRIC_COLUMNS];
}

/** Total flex weight — used to compute per-column flex-basis percentages. */
export function totalGrow(columns: AtlasColumn[]): number {
  return columns.reduce((n, c) => n + c.grow, 0);
}
