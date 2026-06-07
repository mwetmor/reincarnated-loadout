/**
 * Forge.tsx — /forge route
 *
 * Substrate Cosmograph — forward-looking future-engine visualization.
 * 570 primitive stars + 1000 PROVISIONAL simulated kit constellations + 7 emergent faction halos.
 *
 * ALL constellations on this page are SIMULATED placeholders per Option B amendment 2026-06-06.
 * They show the future-engine substrate vocabulary, not real kits.
 * Cycle 14 real kits live at /loadout and /kits.
 *
 * Rendering: Pixi.js v7 + @pixi/react v7 (WebGL star-field canvas).
 * Data: elrond Phase 4 cosmograph packet (read-only, static JSON).
 *
 * Phase 1: route + scaffold + data loading + ingestion-contract validation.
 * Phase 2: primitive star rendering with brightness + color + provenance encoding.
 * Phase 3: constellation MST lines + faction halos + region-label overlays.
 * Phase 4: lasso interaction + composite-score resolution + side panel.
 * Phase 5: scroll-to-zoom + viewport culling (drillLayer at zoom>1.5×) + Vercel preview deploy.
 *
 * A/B spike (2026-06-07): ?view=primitive (Mode A, default) vs ?view=constellation (Mode B, Phase 1 sample).
 *   Mode A: primitive-galaxy — each unique primitive is one star; 570 stars; kit membership non-local.
 *   Mode B: kit-as-bounded-constellation — per-kit primitive instances in local force-directed cluster.
 *           Phase 1: 10-kit sample only; rest hidden. Phase 2: full 1000-kit corpus if GREEN.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { loadCosmographData } from '../data/cosmographData';
import type { CosmographData } from '../data/cosmographData';
import { CosmographCanvas } from '../components/Cosmograph/CosmographCanvas';
import { ConstellationModeCanvas } from '../components/Cosmograph/ConstellationModeCanvas';
import { SidePanel } from '../components/Cosmograph/SidePanel';
import type { LassoResolutionResult } from '../utils/lassoResolution';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
type ViewMode = 'primitive' | 'constellation';

export function Forge() {
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [data, setData] = useState<CosmographData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lassoResult, setLassoResult] = useState<LassoResolutionResult | null>(null);
  const loadStartRef = useRef<number>(0);
  const clearLassoRef = useRef<(() => void) | null>(null);

  // A/B toggle: ?view=primitive (Mode A) | ?view=constellation (Mode B)
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const viewMode: ViewMode = viewParam === 'constellation' ? 'constellation' : 'primitive';

  const setViewMode = useCallback((mode: ViewMode) => {
    setSearchParams(mode === 'primitive' ? {} : { view: 'constellation' });
    // Clear lasso when switching modes
    clearLassoRef.current?.();
    setLassoResult(null);
  }, [setSearchParams]);

  useEffect(() => {
    setLoadState('loading');
    loadStartRef.current = performance.now();

    loadCosmographData()
      .then((d) => {
        const elapsed = performance.now() - loadStartRef.current;
        console.info(
          `[Forge] Cosmograph data loaded in ${elapsed.toFixed(0)} ms — ` +
          `${d.primitives.length} primitives, ${d.kits.length} kits, ` +
          `${d.factionOverlays.factions.length} factions`
        );
        setData(d);
        setLoadState('ready');
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Forge] Data load failed:', msg);
        setLoadError(msg);
        setLoadState('error');
      });
  }, []);

  const handleLassoResult = useCallback((result: LassoResolutionResult | null) => {
    setLassoResult(result);
  }, []);

  const handleClearLasso = useCallback(() => {
    clearLassoRef.current?.();
    setLassoResult(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Page header */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-4">
        <div className="mb-1 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-semibold text-gray-200 tracking-wide">
              Forge — Substrate Cosmograph
            </h1>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              Provisional Future-Engine View
            </p>
          </div>

          {/* A/B view toggle — spike Phase 1 */}
          <div className="flex items-center gap-1 rounded border border-gray-700/60 bg-gray-900/60 px-1.5 py-1">
            <span className="text-[9px] text-gray-600 font-mono mr-1 uppercase tracking-wider">View:</span>
            <button
              onClick={() => setViewMode('primitive')}
              title="Mode A: primitive-galaxy — each unique primitive is a star; 570 stars; kit membership non-local"
              className={
                'rounded px-2 py-0.5 text-[10px] font-mono transition-colors ' +
                (viewMode === 'primitive'
                  ? 'bg-indigo-700/70 text-indigo-100'
                  : 'text-gray-500 hover:text-gray-300')
              }
            >
              primitive
            </button>
            <button
              onClick={() => setViewMode('constellation')}
              title="Mode B: kit-as-bounded-constellation — per-kit primitive instances in local clusters (Phase 1: 10-kit sample)"
              className={
                'rounded px-2 py-0.5 text-[10px] font-mono transition-colors ' +
                (viewMode === 'constellation'
                  ? 'bg-amber-700/70 text-amber-100'
                  : 'text-gray-500 hover:text-gray-300')
              }
            >
              constellation
            </button>
            {viewMode === 'constellation' && (
              <span className="text-[9px] text-amber-600/70 font-mono ml-1">SPIKE·P1·10 kits</span>
            )}
          </div>
        </div>

        {/* Mode descriptor */}
        {viewMode === 'primitive' ? (
          <p className="text-xs text-amber-500/80 bg-amber-900/20 border border-amber-800/40 rounded px-3 py-2 font-mono leading-relaxed max-w-3xl">
            <span className="text-amber-300 font-bold">Mode A — Primitive Galaxy</span>
            {' '}(current Phase A): All constellations on this page are{' '}
            <span className="font-bold text-amber-400">SIMULATED placeholders</span>.
            They show the future-engine substrate vocabulary, not real kits.
            Cycle 14 real kits live at{' '}
            <Link to="/loadout" className="text-amber-300 underline underline-offset-2 hover:text-amber-200">
              Loadout
            </Link>{' '}
            and{' '}
            <Link to="/kits" className="text-amber-300 underline underline-offset-2 hover:text-amber-200">
              Kits
            </Link>.
          </p>
        ) : (
          <p className="text-xs text-amber-500/80 bg-amber-900/20 border border-amber-800/40 rounded px-3 py-2 font-mono leading-relaxed max-w-3xl">
            <span className="text-amber-300 font-bold">Mode B — Kit-as-Bounded-Constellation</span>
            {' '}(A/B spike Phase 1): 10-kit sample. Each constellation = one kit, rendered as a
            bounded local cluster of per-kit primitive instances. All{' '}
            <span className="font-bold text-amber-400">PROVISIONAL</span>.
            Toggle back to &quot;primitive&quot; to see Mode A side-by-side.
          </p>
        )}
      </div>

      {/* Main content: canvas + side panel */}
      <div
        className="flex"
        style={{ height: 'calc(100vh - 180px)', minHeight: 500 }}
      >
        {/* Canvas area */}
        <div className="flex-1 min-w-0">
          {loadState === 'idle' || loadState === 'loading' ? (
            <LoadingState />
          ) : loadState === 'error' ? (
            <ErrorState message={loadError ?? 'Unknown error'} />
          ) : data ? (
            viewMode === 'primitive' ? (
              <CosmographCanvas
                data={data}
                onLassoResult={handleLassoResult}
                clearLassoRef={clearLassoRef}
              />
            ) : (
              <ConstellationModeCanvas
                data={data}
                onLassoResult={handleLassoResult}
                clearLassoRef={clearLassoRef}
              />
            )
          ) : null}
        </div>

        {/* Side panel */}
        {loadState === 'ready' && data && (
          <div
            className="flex-shrink-0 border-l border-gray-800/60 bg-gray-950 overflow-hidden"
            style={{ width: 280 }}
          >
            <SidePanel
              result={lassoResult}
              data={data}
              onClear={handleClearLasso}
            />
          </div>
        )}
      </div>

      {/* Status bar */}
      {loadState === 'ready' && data && (
        <div className="max-w-7xl mx-auto px-4 py-2">
          <p className="text-[10px] text-gray-600 font-mono">
            {viewMode === 'primitive' ? (
              <>
                {data.primitives.length} substrate primitives &middot;{' '}
                {data.kits.length} PROVISIONAL constellations &middot;{' '}
                {data.factionOverlays.factions.length} emergent faction halos &middot;{' '}
                scroll to zoom &middot; [Z] constellation lines &middot; pointer mode: drag to pan &middot; lasso mode: drag to select
              </>
            ) : (
              <>
                MODE B · 10-kit sample · per-kit primitive instances · force-directed constellation layout &middot;
                scroll to zoom &middot; lasso to select constellation &middot; toggle &quot;primitive&quot; above to see Mode A
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-gray-500 font-mono text-sm mb-2">Loading substrate data...</div>
        <div className="text-gray-700 font-mono text-xs">
          primitive_registry &middot; kit_constellations &middot; flag_enum_attachments &middot; region_labels &middot; faction_overlays
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <div className="text-red-400 font-mono text-sm mb-2">Data load failed</div>
        <div className="text-gray-600 font-mono text-xs">{message}</div>
        <div className="text-gray-700 font-mono text-xs mt-2">
          Ensure /public/data/cosmograph/*.json are present (run scripts/convert-cosmograph-data.py)
        </div>
      </div>
    </div>
  );
}
