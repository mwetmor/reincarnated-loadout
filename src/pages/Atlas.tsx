// Atlas — /atlas route: the interactive-atlas Glance page skeleton.
//
// COMPOSITION (spec §6):
//   - The BLACK COPY LEADS. The lead skin is resolved by CANVAS (dark) via the
//     provenance skin_canvas_map — NEVER by skin name (the names are inverted:
//     'archive' = dark, 'instrument' = light; caught + ratified 2026-07-15).
//   - White ('instrument') sits behind the skin toggle.
//   - Basic legend, top-left, over the chart (scaffold; highlight wiring = r7).
//   - Hierarchical pivot table below the chart.
//   - Edition-I stays as an archived second lens (current page structure).
//
// SVG SOURCE THIS PASS: the verified e21 Edition-II capture (per-canvas file),
// vendored to public/atlas/. r7 supersedes it; we develop layout against e21
// knowing the hooked r7 SVG lands later (spec §0 sequencing; out-of-scope: r7
// SVG vendoring + all chart<->table + class-highlight wiring).
//
// Spec: agentic_orchestration/gandalf/notes/2026-07-15-atlas-interactive-glance-spec.md

import { useState, useMemo } from 'react';
import { useAtlasData } from '../hooks/useAtlasData';
import { AtlasLegend } from '../components/atlas/AtlasLegend';
import { AtlasSkinToggle } from '../components/atlas/AtlasSkinToggle';
import { AtlasPivotTable } from '../components/atlas/AtlasPivotTable';
import type { LegendClass, SkinName, CanvasKind, RenderProvenance } from '../data/atlasTypes';

// Per-canvas SVG file map (e21 capture, vendored). Keyed by SKIN name because
// the files are named by skin; we only ever LOOK UP by resolving canvas->skin.
const SVG_FOR_SKIN: Record<SkinName, string> = {
  archive: '/atlas/atlas-edition2-archive.svg', // DARK — the lead
  instrument: '/atlas/atlas-edition2-instrument.svg', // LIGHT
};

/** Resolve the skin whose canvas is `dark` (the black-copy lead) from provenance. */
function leadSkinForDark(prov: RenderProvenance): SkinName {
  const entry = (Object.entries(prov.skin_canvas_map) as [SkinName, { canvas: CanvasKind }][]).find(
    ([, v]) => v.canvas === 'dark'
  );
  // Fallback is defensive only; provenance always carries the dark entry.
  return entry ? entry[0] : 'archive';
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="font-mono text-sm text-gray-500">Loading atlas…</p>
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

  // Legend multi-select state (scaffold; highlight wiring = r7).
  const [selectedClasses, setSelectedClasses] = useState<Set<LegendClass>>(() => new Set());
  const toggleClass = (id: LegendClass) =>
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (status === 'loading' || status === 'idle') return <LoadingState />;
  if (status === 'error' || !data || !provenance || !resolvedSkin) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <p className="font-mono text-sm text-rose-400">Error loading atlas</p>
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

  const svgUrl = SVG_FOR_SKIN[resolvedSkin];
  const canvasHex = provenance.skin_canvas_map[resolvedSkin].hex;
  // Honest order-of-magnitude of the loaded slim payload vs the 7.5MB source.
  // (Re-serialization estimate; not byte-exact with the on-disk file.)
  const slimPayloadBytes = new Blob([JSON.stringify(data)]).size;

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-100">Kit Atlas</h1>
          <p className="font-mono text-[11px] text-gray-500">
            Edition-{data.derived_from.atlas_version} lattice · {data.counts.kits} kits ·{' '}
            {data.counts.ghosts.toLocaleString()} ghost cells · black copy leads
          </p>
        </div>
        <AtlasSkinToggle
          provenance={provenance}
          activeSkin={resolvedSkin}
          onSelectSkin={setActiveSkin}
        />
      </header>

      {/* CHART STAGE — SVG background, legend overlaid top-left. */}
      <div
        className="relative w-full overflow-hidden rounded-lg border border-gray-800"
        style={{ backgroundColor: canvasHex }}
      >
        {/*
          The vendored SVG is a print-grade static artifact (hooks are inert at
          rest; scripts are NOT inside the SVG). We render it as an <img> for the
          layout skeleton. r7's hooked SVG will later be inlined so the
          page-injected highlight CSS can target its layer groups / data-el.
          TODO(drax): swap <img> for inlined r7 SVG when hooks land (spec §3/§4).
        */}
        <img
          src={svgUrl}
          alt={`Kit atlas — Edition-${data.derived_from.atlas_version}, ${activeCanvas} canvas`}
          className="block h-auto w-full"
        />
        <div className="pointer-events-auto absolute left-3 top-3">
          <AtlasLegend
            selected={selectedClasses}
            onToggle={toggleClass}
            canvas={activeCanvas}
          />
        </div>
      </div>

      {/* PIVOT TABLE — below the chart. */}
      <div className="mt-4">
        <AtlasPivotTable
          data={data}
          // TODO(drax): r7 wiring — onSelectRow will drive chart slim-halo + pan
          //   once the hooked SVG is inlined (acceptance #34). Inert this pass.
        />
      </div>

      {/* ARCHIVED SECOND LENS — Edition-I (current page structure). */}
      <footer className="mt-6 rounded border border-gray-800/70 bg-gray-900/30 p-3">
        <p className="font-mono text-[11px] text-gray-500">
          Archived lens · Edition-I remains available as the prior atlas record.
          Provenance: emitted {data.derived_from.emitted_at.slice(0, 10)} · basis frozen 2026-07-14 ·{' '}
          {(data.derived_from.source_bytes / 1024 / 1024).toFixed(1)}MB source →{' '}
          {(slimPayloadBytes / 1024 / 1024).toFixed(2)}MB slim derivative.
        </p>
      </footer>
    </div>
  );
}
