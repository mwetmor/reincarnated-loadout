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
 * Phase 2+: star rendering, constellation lines, lasso interaction (subsequent sessions).
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadCosmographData } from '../data/cosmographData';
import type { CosmographData } from '../data/cosmographData';
import { CosmographCanvas } from '../components/Cosmograph/CosmographCanvas';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

export function Forge() {
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [data, setData] = useState<CosmographData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadStartRef = useRef<number>(0);

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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Page header */}
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-4">
        <div className="mb-1">
          <h1 className="text-lg font-semibold text-gray-200 tracking-wide">
            Forge — Substrate Cosmograph
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            Provisional Future-Engine View
          </p>
        </div>
        <p className="text-xs text-amber-500/80 bg-amber-900/20 border border-amber-800/40 rounded px-3 py-2 font-mono leading-relaxed max-w-3xl">
          All constellations on this page are{' '}
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
      </div>

      {/* Canvas area */}
      <div className="w-full" style={{ height: 'calc(100vh - 180px)', minHeight: 500 }}>
        {loadState === 'idle' || loadState === 'loading' ? (
          <LoadingState />
        ) : loadState === 'error' ? (
          <ErrorState message={loadError ?? 'Unknown error'} />
        ) : data ? (
          <CosmographCanvas data={data} />
        ) : null}
      </div>

      {/* Status bar */}
      {loadState === 'ready' && data && (
        <div className="max-w-6xl mx-auto px-4 py-2">
          <p className="text-[10px] text-gray-600 font-mono">
            {data.primitives.length} substrate primitives &middot;{' '}
            {data.kits.length} PROVISIONAL constellations &middot;{' '}
            {data.factionOverlays.factions.length} emergent faction halos &middot;{' '}
            Phase 1 scaffold — rendering in Phase 2+
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
