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
 * View modes (gandalf mode-disposition 2026-06-07):
 *   Default (no param / ?view=constellation): kit-galaxy — 1000 constellation clusters (player-facing).
 *     LOD: centroid dots at 1.0× zoom; full star clusters at ≥2× zoom.
 *     Layout loaded lazily from constellation_layout.json (2MB) on first load.
 *   ?view=primitive: substrate-analysis view — 570 unique primitives as stars (analyst diagnostic).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { loadCosmographData, loadConstellationLayout } from '../data/cosmographData';
import type { CosmographData } from '../data/cosmographData';
import type { ConstellationLayoutData } from '../data/cosmographTypes';
import { CosmographCanvas } from '../components/Cosmograph/CosmographCanvas';
import { ConstellationModeCanvas } from '../components/Cosmograph/ConstellationModeCanvas';
import { SidePanel } from '../components/Cosmograph/SidePanel';
import type { LassoResolutionResult } from '../utils/lassoResolution';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
type LayoutLoadState = 'idle' | 'loading' | 'ready' | 'error';
type ViewMode = 'primitive' | 'constellation';

export function Forge() {
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [data, setData] = useState<CosmographData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lassoResult, setLassoResult] = useState<LassoResolutionResult | null>(null);
  const loadStartRef = useRef<number>(0);
  const clearLassoRef = useRef<(() => void) | null>(null);

  // Constellation layout — lazy-loaded when constellation mode is first selected.
  // Separate from cosmograph data load to avoid 2MB payload for Mode A users.
  const [layoutData, setLayoutData] = useState<ConstellationLayoutData | null>(null);
  const [layoutLoadState, setLayoutLoadState] = useState<LayoutLoadState>('idle');
  const [layoutLoadError, setLayoutLoadError] = useState<string | null>(null);
  const layoutLoadStartRef = useRef<number>(0);

  // Default view: constellation (Mode B, player-facing).
  // Analyst primitive view: ?view=primitive
  // ?view=constellation also supported (redundant; same as default)
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const viewMode: ViewMode = viewParam === 'primitive' ? 'primitive' : 'constellation';

  const setViewMode = useCallback((mode: ViewMode) => {
    setSearchParams(mode === 'constellation' ? {} : { view: 'primitive' });
    clearLassoRef.current?.();
    setLassoResult(null);
  }, [setSearchParams]);

  // Lazy-load constellation layout when constellation mode is selected
  useEffect(() => {
    if (viewMode !== 'constellation') return;
    if (layoutLoadState !== 'idle') return;   // already loading or loaded
    setLayoutLoadState('loading');
    layoutLoadStartRef.current = performance.now();
    loadConstellationLayout()
      .then((d) => {
        const ms = performance.now() - layoutLoadStartRef.current;
        console.info(
          `[Forge] Constellation layout loaded in ${ms.toFixed(0)} ms — ` +
          `${d.centroids.length} kits, world ${d.meta.world_w}×${d.meta.world_h} px`
        );
        setLayoutData(d);
        setLayoutLoadState('ready');
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Forge] Constellation layout load failed:', msg);
        setLayoutLoadError(msg);
        setLayoutLoadState('error');
      });
  }, [viewMode, layoutLoadState]);

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

          {/* View toggle: constellation (default, player-facing) ↔ primitive (analyst) */}
          <div className="flex items-center gap-1 rounded border border-gray-700/60 bg-gray-900/60 px-1.5 py-1">
            <span className="text-[9px] text-gray-600 font-mono mr-1 uppercase tracking-wider">View:</span>
            <button
              onClick={() => setViewMode('constellation')}
              title="Kit-galaxy view — 1000 constellation clusters, element neighborhoods, scroll to zoom"
              className={
                'rounded px-2 py-0.5 text-[10px] font-mono transition-colors ' +
                (viewMode === 'constellation'
                  ? 'bg-indigo-700/70 text-indigo-100'
                  : 'text-gray-500 hover:text-gray-300')
              }
            >
              constellation
            </button>
            <button
              onClick={() => setViewMode('primitive')}
              title="Substrate analysis view — each unique primitive is a star; 570 stars; kit membership non-local"
              className={
                'rounded px-2 py-0.5 text-[10px] font-mono transition-colors ' +
                (viewMode === 'primitive'
                  ? 'bg-amber-700/70 text-amber-100'
                  : 'text-gray-500 hover:text-gray-300')
              }
            >
              substrate
            </button>
          </div>
        </div>

        {/* Mode descriptor */}
        {viewMode === 'primitive' ? (
          <p className="text-xs text-amber-500/80 bg-amber-900/20 border border-amber-800/40 rounded px-3 py-2 font-mono leading-relaxed max-w-3xl">
            <span className="text-amber-300 font-bold">Substrate Analysis View</span>
            {' '}— 570 unique primitives, each rendered as one star. Brightness = rarity weight; color = element.
            Kit membership is non-local (a kit's primitives scatter across the canvas).
            Useful for substrate-coverage analysis and element over-representation diagnostics.
            All constellations are{' '}
            <span className="font-bold text-amber-400">PROVISIONAL</span> — future-engine kits, not real cycle-14 kits.
            Real kits at{' '}
            <Link to="/loadout" className="text-amber-300 underline underline-offset-2 hover:text-amber-200">
              Loadout
            </Link>{' '}
            and{' '}
            <Link to="/kits" className="text-amber-300 underline underline-offset-2 hover:text-amber-200">
              Kits
            </Link>.
          </p>
        ) : (
          <p className="text-xs text-gray-400 bg-gray-900/40 border border-gray-800/50 rounded px-3 py-2 font-mono leading-relaxed max-w-3xl">
            A galaxy of every possible kit — 1000 builds, each a bounded star cluster.
            Element neighborhoods visible at overview:{' '}
            <span className="text-orange-400">fire / lightning</span> left ·{' '}
            <span className="text-blue-400">water / wind</span> center ·{' '}
            <span className="text-gray-500">physical / shadow / holy</span> right.
            <strong className="text-gray-300"> Scroll to zoom</strong> into a region —
            full star clusters reveal at 2×.
            <strong className="text-gray-300"> Lasso</strong> a cluster at 2×+ to identify a kit.
            All <span className="font-bold text-amber-500">PROVISIONAL</span> — future-engine kits.
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
            ) : layoutLoadState === 'error' ? (
              <ErrorState message={layoutLoadError ?? 'Constellation layout load failed'} />
            ) : layoutLoadState === 'ready' && layoutData ? (
              <ConstellationModeCanvas
                data={data}
                layoutData={layoutData}
                onLassoResult={handleLassoResult}
                clearLassoRef={clearLassoRef}
              />
            ) : (
              <LayoutLoadingState />
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
                {layoutData?.centroids.length ?? '…'} constellation clusters ·{' '}
                {layoutData ? '18k first-class stars' : 'loading layout…'} &middot;
                dots at 1× · stars at 2×+ · lasso at 2×+ · &quot;substrate&quot; above for primitive analysis
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

function LayoutLoadingState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-gray-500 font-mono text-sm mb-2">Loading constellation layout…</div>
        <div className="text-gray-700 font-mono text-xs">
          constellation_layout.json · 1000 kits · 34k instance nodes · pre-computed by Python
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
