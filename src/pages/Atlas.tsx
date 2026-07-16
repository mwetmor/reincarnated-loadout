// Atlas — /atlas route: the "Build Horizon" interactive page (spec §§4-6, §9.3).
//
// COMPOSITION (spec §6):
//   - The BLACK COPY LEADS. The lead skin is resolved by CANVAS (dark) via the
//     provenance skin_canvas_map — NEVER by skin name (the names are inverted:
//     'archive' = dark, 'instrument' = light; caught + ratified 2026-07-15).
//   - White ('instrument') sits behind the skin toggle.
//   - Basic legend band, top-left (D1-a). Toggling a class halos its members.
//   - A FILTER BAR + one flat build lattice below the chart (D3-a), wired
//     bidirectionally to the chart.
//   - Edition-I stays as an archived second lens (current page structure).
//
// D3 (spec §9.3, Matt 2026-07-15): pivots→filters. The pivot table is retired; a
//   filter bar (five controls) drives a flat table.
// D4 (spec §9.4, Matt 2026-07-15): the chart is a STATIC FULL-HORIZON MAP.
//   - It mounts at the DERIVED FIT BOX (union(canvas ∪ hull) + FIT_MARGIN, aspect-
//     pinned, centered — the old S_min view), written ONCE to the SVG's viewBox +
//     planeClip at inline (useAtlasStage → deriveBounds; NO box literal in source).
//     The whole horizon (incl. beyond-canvas hull extent) is visible at fluid width;
//     no zoom, no pan, no scroll. (D3-b's fixed-S_max + native-scroll stage is
//     superseded; §9.4 rules ONE mount-time write to the fit box as lawful.)
//
// SVG SOURCE: the r7 hooked Edition-II SVG (per-canvas file), vendored to
// public/atlas/. It is INLINED (not <img>) so the page-injected highlight CSS can
// target its layer groups (<g id="layer-live"> …) and per-mark data-el / data-kit
// / data-core hooks. The SVG is a print-grade static artifact carrying NO scripts
// (renderer law §3.4) — inlining is inert at rest.
//
// Spec: agentic_orchestration/gandalf/notes/2026-07-15-atlas-interactive-glance-spec.md

import { useState, useMemo, useCallback, useId, useRef, useEffect } from 'react';
import { useAtlasData } from '../hooks/useAtlasData';
import { useAtlasSvg } from '../hooks/useAtlasSvg';
import { useAtlasStage } from '../hooks/useAtlasStage';
import { AtlasLegend } from '../components/atlas/AtlasLegend';
import { AtlasSkinToggle } from '../components/atlas/AtlasSkinToggle';
import { AtlasBuildTable } from '../components/atlas/AtlasBuildTable';
import { FIT_MARGIN } from '../utils/atlasLens';
import { buildHighlightCss, type AtlasSelection } from '../utils/atlasHighlight';
import { hookToSelection, itemToSelection } from '../utils/atlasSelectPath';
import {
  buildProvenanceName,
  makeFilterPredicate,
  filtersAreDefault,
  DEFAULT_FILTERS,
  type PivotItem,
  type AtlasFilterState,
} from '../utils/atlasPivot';
import type {
  LegendClass,
  SkinName,
  CanvasKind,
  RenderProvenance,
  AtlasInteractiveData,
} from '../data/atlasTypes';

/** Resolve the skin whose canvas is `dark` (the black-copy lead) from provenance. */
function leadSkinForDark(prov: RenderProvenance): SkinName {
  const entry = (Object.entries(prov.skin_canvas_map) as [SkinName, { canvas: CanvasKind }][]).find(
    ([, v]) => v.canvas === 'dark'
  );
  // Fallback is defensive only; provenance always carries the dark entry.
  return entry ? entry[0] : 'archive';
}

/**
 * True when any part of `el` is within the page viewport (§9.4 D4-d table→chart).
 * The chart is a static map — table→chart only page-scrolls when the chart is OUT of
 * view; if it's already (partly) visible, the in-place halo is enough (no jump).
 */
function isElementInViewport(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const vw = window.innerWidth || document.documentElement.clientWidth;
  return r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="font-mono text-sm text-gray-500">Loading Build Horizon…</p>
      </div>
    </div>
  );
}

export function Atlas() {
  const { data, provenance, status, error, refresh } = useAtlasData();

  // Active skin — initialized LAZILY to the dark-canvas skin once provenance loads.
  // Bound by CANVAS via provenance; the string 'archive' is never hardcoded as intent.
  const [activeSkin, setActiveSkin] = useState<SkinName | null>(null);
  const resolvedSkin: SkinName | null = useMemo(() => {
    if (!provenance) return null;
    return activeSkin ?? leadSkinForDark(provenance);
  }, [provenance, activeSkin]);

  const activeCanvas: CanvasKind = useMemo(() => {
    if (!provenance || !resolvedSkin) return 'dark';
    return provenance.skin_canvas_map[resolvedSkin]?.canvas ?? 'dark';
  }, [provenance, resolvedSkin]);

  // Inlined r7 SVG markup for the active skin (fetched as text, cached per skin).
  const { markup: svgMarkup, status: svgStatus } = useAtlasSvg(resolvedSkin);

  // Legend multi-select state (§4) — drives the class-highlight CSS.
  const [selectedClasses, setSelectedClasses] = useState<Set<LegendClass>>(() => new Set());
  const toggleClass = (id: LegendClass) =>
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Single-mark selection (§5) — independent of the class toggles. Set from either
  // a table row click OR a chart mark click. Null = nothing selected.
  const [selection, setSelection] = useState<AtlasSelection | null>(null);
  // Detail of an aggregate meso glyph the chart last surfaced (ruled seam A).
  const [aggregateCells, setAggregateCells] = useState<number | null>(null);
  // Chart->table reveal request (item + bump token so repeat clicks re-scroll).
  const [openItem, setOpenItem] = useState<{ item: PivotItem; token: number } | null>(null);
  const openTokenRef = useRef(0);

  // D3-a: filter state OWNED by the page so chart->table can reset it to All when a
  // clicked mark is filtered out of the table (§9.3 D3-b deterministic reveal).
  const [filters, setFilters] = useState<AtlasFilterState>(DEFAULT_FILTERS);

  // Stable root id for the inlined-SVG wrapper — highlight CSS is scoped to it.
  const rootId = useId().replace(/:/g, '_'); // useId() emits ':' which is not id-safe
  const svgRootId = `atlas-svg-${rootId}`;

  // ---- STATIC FULL-HORIZON MAP (spec §9.4 D4): mount at the derived fit box ----
  // The fit box is DERIVED from the mounted artifact bytes (never hardcoded) and
  // written ONCE to the SVG's viewBox + planeClip at inline; static thereafter (no
  // scroll, no zoom, no pan). The host div holds the inlined SVG at page flow; the
  // chartRegionRef is the scrollIntoView target for table→chart (page-level).
  const chartRegionRef = useRef<HTMLDivElement>(null);
  const svgHostRef = useRef<HTMLDivElement>(null);

  // Inline the r7 SVG markup IMPERATIVELY into the host div, keyed on the markup.
  // Owning the host's innerHTML outside React's render path avoids dangerouslySet-
  // InnerHTML churn; the stage hook then writes the derived fit box to the inlined
  // SVG's viewBox + planeClip ONCE (§9.4 D4-c). Skin flip changes svgMarkup → the
  // effect re-inlines the new-canvas artifact and the hook re-applies the fit box.
  useEffect(() => {
    const host = svgHostRef.current;
    if (!host) return;
    if (svgMarkup) host.innerHTML = svgMarkup;
    else host.replaceChildren();
  }, [svgMarkup]);

  const stage = useAtlasStage(svgHostRef, svgMarkup, svgStatus === 'success');

  // ---- TABLE -> CHART: a leaf row click halos its mark; page-scrolls the chart (§9.4) ----
  const handleSelectRow = useCallback(
    (item: PivotItem) => {
      const sel = itemToSelection(item);
      setSelection(sel);
      setAggregateCells(null); // table-origin selection carries no aggregate caption
      // §9.4 D4-d: the chart is a STATIC map — there is no stage scroll to center a
      // mark. The halo (highlight CSS) lands on the mark in place. If the chart region
      // is scrolled OUT of the page viewport, bring it into view (page-level). Accepted
      // consequence: at fit scale the smallest marks render below TARGET_D — the TABLE
      // is the precision surface; the chart is the overview map with halo feedback.
      const region = chartRegionRef.current;
      if (region && !isElementInViewport(region)) {
        region.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    },
    []
  );

  // ---- CHART -> TABLE: a mark click reads its hooks, sets selection + reveals ----
  const handleChartClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!data) return;
      const target = e.target as Element | null;
      const mark = target?.closest?.('[data-el]') as Element | null;
      if (!mark) {
        // Empty canvas -> deselect (spec: clicking empty canvas deselects).
        setSelection(null);
        setAggregateCells(null);
        return;
      }
      const el = mark.getAttribute('data-el');
      const kit = mark.getAttribute('data-kit');
      const core = mark.getAttribute('data-core');
      const sel = hookToSelection({ el, kit, core });
      if (!sel) {
        // Unwirable mark (drill-in ground: data-el=ghost, no data-core) -> deselect.
        setSelection(null);
        setAggregateCells(null);
        return;
      }
      setSelection(sel);

      // Resolve the target PivotItem to reveal in the flat table.
      let item: PivotItem | null = null;
      if (sel.kind === 'kit') {
        const row = data.kits.find((k) => k.kit_id === sel.kitId);
        if (row) item = { kind: 'kit', row };
        setAggregateCells(null); // kits are single cells
      } else {
        // Ghost by representative core — reveal the representative's row (seam A).
        const row = data.ghosts.find((g) => g.core.join('|') === sel.core);
        if (row) item = { kind: 'ghost', row };
        // Aggregate caption: data-mult>1 => N coincident cells at this position.
        const mult = Number(mark.getAttribute('data-mult') ?? '1');
        setAggregateCells(Number.isFinite(mult) && mult > 1 ? mult : null);
      }
      if (item) {
        // §9.3 D3-b DETERMINISTIC REVEAL: if the item fails the active filters, RESET
        // filters to All FIRST (so the flat row is present), THEN scroll. No silent
        // non-reveal. A default filter state passes everything — skip the reset then.
        const target2 = item;
        if (!filtersAreDefault(filters) && !makeFilterPredicate(filters)(target2)) {
          setFilters(DEFAULT_FILTERS);
        }
        openTokenRef.current += 1;
        setOpenItem({ item: target2, token: openTokenRef.current });
      }
    },
    [data, filters]
  );

  // ---- Highlight CSS: recomputed from legend classes + single selection ----
  const highlightCss = useMemo(
    () =>
      buildHighlightCss({
        rootId: svgRootId,
        canvas: activeCanvas,
        selectedClasses,
        selection,
      }),
    [svgRootId, activeCanvas, selectedClasses, selection]
  );

  if (status === 'loading' || status === 'idle') return <LoadingState />;
  if (status === 'error' || !data || !provenance || !resolvedSkin) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <p className="font-mono text-sm text-rose-400">Error loading Build Horizon</p>
        <p className="mt-2 text-xs text-gray-500">{error ?? 'missing data'}</p>
        <button
          onClick={refresh}
          className="mt-4 rounded bg-gray-800 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const canvasHex = provenance.skin_canvas_map[resolvedSkin].hex;
  // Honest order-of-magnitude of the loaded slim payload vs the 7.5MB source.
  const slimPayloadBytes = new Blob([JSON.stringify(data)]).size;

  return (
    // D1-f FLUID WIDTH: no max-w cap on the atlas route — the page goes fluid to the
    // browser window with 16–24px gutters. Chart, legend band, table, summary, and
    // provenance all span this same fluid width. Scope: atlas route ONLY.
    <div className="w-full px-4 py-4 sm:px-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          {/* D2-d (Matt-RULED): the community-facing surface name is "Build Horizon"
              (avoids the PoE "Atlas of Worlds" collision; ties to the plate's CHARTED
              HORIZON vocabulary). Internals (atlas* files, routes /atlas, kit_id,
              types, test ids) stay `atlas`/kits per Matt's internal/community split. */}
          <h1 className="text-lg font-semibold text-gray-100">Build Horizon</h1>
          <p className="font-mono text-[11px] text-gray-500">
            Edition-{data.derived_from.atlas_version} lattice · {data.counts.kits} builds ·{' '}
            {data.counts.ghosts.toLocaleString()} ghost cells · black copy leads
          </p>
        </div>
        <AtlasSkinToggle
          provenance={provenance}
          activeSkin={resolvedSkin}
          onSelectSkin={setActiveSkin}
        />
      </header>

      {/* D1-a LEGEND BAND: the legend lives in a NORMAL-FLOW band between the page
          header and the chart, top-left aligned. It NEVER overlays the SVG. */}
      <div className="mb-3">
        <AtlasLegend selected={selectedClasses} onToggle={toggleClass} canvas={activeCanvas} />
      </div>

      {/* CHART REGION (§9.4 D4) — the inlined r7 SVG is a STATIC full-horizon map. It
          mounts at the DERIVED FIT BOX (whole horizon incl. beyond-canvas hull extent
          in frame) and flows at fluid width, height following the fit-box aspect. No
          zoom UI, no scroll stage, no gestures — the block flows w-full h-auto. Canvas
          hex fills the exposed surround (the fit box is wider than the canvas, so the
          out-of-canvas margin shows). Click delegation reads the data-el hooks for
          chart->table. This region is the scrollIntoView target for table->chart. */}
      <div
        ref={chartRegionRef}
        onClick={handleChartClick}
        aria-label="Build Horizon — full-horizon chart"
        className="relative w-full rounded-lg border border-gray-800 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
        style={{ backgroundColor: canvasHex }}
      >
        {/* Page-injected highlight CSS — targets the inlined SVG's data-el hooks. It is
            scoped under #svgRootId; the SVG bytes are never mutated at rest. */}
        <style>{highlightCss}</style>

        {/*
          The vendored r7 SVG is inlined IMPERATIVELY (via the effect above), not
          through dangerouslySetInnerHTML on the render path. The host div carries the
          inlined <svg>; useAtlasStage writes the derived fit box to its viewBox +
          planeClip ONCE at mount (§9.4 D4-c: one mount-time config write is lawful).
          Click delegation on the REGION reads the data-el / data-kit / data-core hooks
          off the event target (chart->table). The SVG is a print-grade static artifact
          with NO scripts inside (renderer law §3.4) — inlining is inert at rest.
        */}
        <div id={svgRootId} ref={svgHostRef} className="atlas-svg-host block w-full select-none" />

        {!svgMarkup && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <p className="font-mono text-[11px] text-gray-500">
                {svgStatus === 'error' ? 'Failed to load the chart SVG' : 'Rendering the chart…'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* FIT-BOX RECEIPT (§9.4 acceptance #60): the full-horizon fit box derived at
          runtime from the artifact — the box numbers + the implied S_min (native.width
          / fitBox.width). No box literal in source; a doctored hull shifts it. Read
          live from the stage hook's derived bounds. */}
      {stage.bounds && (
        <p className="mt-1.5 font-mono text-[10px] text-gray-600">
          Full-horizon fit view · viewBox{' '}
          {stage.bounds.fitBox.minx.toFixed(1)} {stage.bounds.fitBox.miny.toFixed(1)}{' '}
          {stage.bounds.fitBox.width.toFixed(1)} {stage.bounds.fitBox.height.toFixed(1)} · implied
          S_min {stage.bounds.sMin.toFixed(3)}× · union(canvas ∪ hull) + {FIT_MARGIN}px margin,
          aspect-pinned (no zoom, no scroll)
        </p>
      )}

      {/* SELECTION SUMMARY — the focused mark; aggregate caption (ruled seam A). */}
      <SelectionSummary
        selection={selection}
        data={data}
        aggregateCells={aggregateCells}
        onClear={() => {
          setSelection(null);
          setAggregateCells(null);
        }}
      />

      {/* FILTER BAR + FLAT BUILD LATTICE — below the chart, wired bidirectionally. */}
      <div className="mt-3">
        <AtlasBuildTable
          data={data}
          onSelectRow={handleSelectRow}
          selection={selection}
          openItem={openItem}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>

      {/* PROVENANCE PANEL — P-DF-1 verdict read at RUNTIME (never hardcoded, #35). */}
      <ProvenancePanel provenance={provenance} data={data} slimBytes={slimPayloadBytes} />
    </div>
  );
}

// ---- Selection summary (single mark + ruled aggregate caption) ----

function SelectionSummary({
  selection,
  data,
  aggregateCells,
  onClear,
}: {
  selection: AtlasSelection | null;
  data: AtlasInteractiveData;
  aggregateCells: number | null;
  onClear: () => void;
}) {
  // D1-h + D1-i: resolve a kit selection to its community build name; ghost stays
  // its core tuple. Prefix uses community vocabulary (build · … / ghost · …).
  const label = useMemo(() => {
    if (!selection) return '';
    if (selection.kind === 'kit') {
      const row = data.kits.find((k) => k.kit_id === selection.kitId);
      const name = row ? buildProvenanceName(row) : selection.kitId;
      return `build · ${name}`;
    }
    return `ghost · ${selection.core.split('|').join(' | ')}`;
  }, [selection, data]);
  if (!selection) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded border border-indigo-500/30 bg-indigo-950/20 px-3 py-1.5">
      <span className="font-mono text-[11px] text-indigo-200">Selected</span>
      <span className="truncate font-mono text-[11px] text-gray-300">{label}</span>
      {aggregateCells != null && (
        // Ruled seam A: aggregate meso glyph — surface the coincident-cell count.
        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
          {aggregateCells.toLocaleString()} cells at this position (representative shown)
        </span>
      )}
      <button
        onClick={onClear}
        className="ml-auto rounded border border-gray-700 px-2 py-0.5 font-mono text-[10px] text-gray-400 hover:border-gray-500"
      >
        Clear
      </button>
    </div>
  );
}

// ---- Provenance panel (P-DF-1 verdict, read at runtime) ----

function ProvenancePanel({
  provenance,
  data,
  slimBytes,
}: {
  provenance: RenderProvenance;
  data: AtlasInteractiveData;
  slimBytes: number;
}) {
  const pdf1 = provenance.p_df_1;
  return (
    <footer className="mt-6 space-y-2 rounded border border-gray-800/70 bg-gray-900/30 p-3">
      {pdf1 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-[11px] font-semibold text-gray-300">P-DF-1</span>
          <span
            className={[
              'rounded px-1.5 py-0.5 font-mono text-[10px] font-bold',
              pdf1.falsified ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300',
            ].join(' ')}
          >
            {pdf1.verdict}
          </span>
          <span className="font-mono text-[10px] text-gray-500">
            {/* Field NAMES (S_max, K_max) are machine-verbatim provenance keys; the
                human label uses community vocab (kits -> builds) per the D1-i split. */}
            S_max {pdf1.S_max} · K_max {pdf1.K_max_beyond_horizon} · {pdf1.n_beyond_horizon_kits}{' '}
            builds beyond horizon
          </span>
        </div>
      )}
      {pdf1?.statement && (
        <p className="max-w-3xl font-mono text-[10px] leading-relaxed text-gray-600">
          {pdf1.statement}
        </p>
      )}
      <p className="font-mono text-[11px] text-gray-500">
        Archived lens · Edition-I remains available as the prior chart record.
        {provenance.render ? ` Render: ${provenance.render}.` : ''} Provenance: emitted{' '}
        {data.derived_from.emitted_at.slice(0, 10)} · basis frozen 2026-07-14 ·{' '}
        {(data.derived_from.source_bytes / 1024 / 1024).toFixed(1)}MB source →{' '}
        {(slimBytes / 1024 / 1024).toFixed(2)}MB slim derivative.
      </p>
    </footer>
  );
}
