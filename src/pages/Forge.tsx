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
 * View modes:
 *   Default (no param / ?view=cascade): Phase 5 spirit-guide cascade + cycling text-list UI.
 *     § 12 canonical architecture: iPad text-list cycling + sky-runes-only cosmograph.
 *     Spirit guide elicitation cascade (3+ layers); cycling-preview sky response animation.
 *     Per dispatch 2026-06-10-drax-forge-phase-5-amendment-cycling-text-list-ui.md.
 *   ?view=rune: Phase 4 rune-per-group + two-tier selection (preserved baseline).
 *     6 primitive-group rune anchors (large atmospheric light-edge brush-stroke, no color).
 *     Tier 1: tap or sign to select rune group. Tier 2: per-primitive icon selection.
 *   ?view=twolayer: Phase 3 two-layer + buffer-space cosmograph.
 *     Layer 1: 8 element-family anchor nebulas. Layer 2: 1000 kit cluster dots.
 *   ?view=constellation: Phase 2 kit-galaxy — 1000 constellation clusters.
 *     LOD: centroid dots at 1.0× zoom; full star clusters at ≥2× zoom.
 *   ?view=primitive: substrate-analysis view — 570 unique primitives as stars (analyst diagnostic).
 *
 * Phase 5 (2026-06-10): spirit-guide-driven elicitation cascade + cycling text-list UI.
 *   Per dispatch 2026-06-10-drax-forge-phase-5-amendment-cycling-text-list-ui.md.
 *   Earth-Avatar Creation Moment Architecture § 12 (canonical lock 2026-06-10, commit 861403d).
 *   iPad text-list cycling UI on panel; sky rune anchors PRESERVED per § 12.2.
 *   Tier 2 placeholder icons REMOVED per § 12.10 DEPRECATION (29 icons deprecated).
 *   Cosmograph sky cluster response animation per § 12.4 cycling-preview UX vocabulary.
 *
 * Phase 4 (2026-06-09): rune-per-primitive-group + two-tier selection prototype.
 *   Preserved at ?view=rune as baseline fallback.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { loadCosmographData, loadConstellationLayout, loadTwoLayerLayout, loadTwoLayerLayoutAlt, loadRuneLayerLayout } from '../data/cosmographData';
import type { CosmographData } from '../data/cosmographData';
import type { ConstellationLayoutData } from '../data/cosmographTypes';
import type { TwoLayerLayoutData } from '../data/twoLayerTypes';
import type { RuneLayerLayoutData } from '../data/runeAnchorTypes';
import { CosmographCanvas } from '../components/Cosmograph/CosmographCanvas';
import { ConstellationModeCanvas } from '../components/Cosmograph/ConstellationModeCanvas';
import { TwoLayerCanvas } from '../components/Cosmograph/TwoLayerCanvas';
import { RuneLayerCanvas } from '../components/Cosmograph/RuneLayerCanvas';
import { SidePanel } from '../components/Cosmograph/SidePanel';
import { CascadePanel } from '../components/Cosmograph/CascadePanel';
import type { LassoResolutionResult } from '../utils/lassoResolution';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
type LayoutLoadState = 'idle' | 'loading' | 'ready' | 'error';
type ViewMode = 'primitive' | 'constellation' | 'twolayer' | 'rune' | 'cascade';

/**
 * Phase 3.3 — algorithm comparison.
 * 'baseline': fixed-anchor + radial projection (deterministic spiral zones)
 * 'forcealt': force-directed (organic, anchor-spring + inter-kit repulsion)
 */
type AlgorithmMode = 'baseline' | 'forcealt';

export function Forge() {
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [data, setData] = useState<CosmographData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lassoResult, setLassoResult] = useState<LassoResolutionResult | null>(null);
  // Lasso mode (two-layer only): 'within-anchor' | 'cross-buffer' | 'buffer-only'
  const [lassoMode, setLassoMode] = useState<string | null>(null);
  const loadStartRef = useRef<number>(0);
  const clearLassoRef = useRef<(() => void) | null>(null);

  // Phase 3.3 algorithm comparison toggle
  const [algorithmMode, setAlgorithmMode] = useState<AlgorithmMode>('baseline');

  // Phase 2 constellation layout — lazy-loaded when constellation mode is first selected.
  const [layoutData, setLayoutData] = useState<ConstellationLayoutData | null>(null);
  const [layoutLoadState, setLayoutLoadState] = useState<LayoutLoadState>('idle');
  const [layoutLoadError, setLayoutLoadError] = useState<string | null>(null);
  const layoutLoadStartRef = useRef<number>(0);

  // Phase 3 two-layer layout — lazy-loaded when twolayer mode is first selected.
  const [twoLayerData, setTwoLayerData] = useState<TwoLayerLayoutData | null>(null);
  const [twoLayerLoadState, setTwoLayerLoadState] = useState<LayoutLoadState>('idle');
  const [twoLayerLoadError, setTwoLayerLoadError] = useState<string | null>(null);

  // Phase 3.3 alternative layout (force-directed)
  const [twoLayerAltData, setTwoLayerAltData] = useState<TwoLayerLayoutData | null>(null);
  const [twoLayerAltLoadState, setTwoLayerAltLoadState] = useState<LayoutLoadState>('idle');
  const [twoLayerAltLoadError, setTwoLayerAltLoadError] = useState<string | null>(null);

  // Phase 4 rune-layer layout
  const [runeLayerData, setRuneLayerData] = useState<RuneLayerLayoutData | null>(null);
  const [runeLayerLoadState, setRuneLayerLoadState] = useState<LayoutLoadState>('idle');
  const [runeLayerLoadError, setRuneLayerLoadError] = useState<string | null>(null);

  // Default view: cascade (Phase 5, player-facing § 12 architecture).
  // Phase 4 rune: ?view=rune (preserved baseline)
  // Phase 3 two-layer: ?view=twolayer
  // Phase 2 constellation: ?view=constellation
  // Analyst primitive: ?view=primitive
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const viewMode: ViewMode =
    viewParam === 'primitive' ? 'primitive' :
    viewParam === 'constellation' ? 'constellation' :
    viewParam === 'twolayer' ? 'twolayer' :
    viewParam === 'rune' ? 'rune' :
    'cascade';

  // Phase 5 — cascade state (for sky cluster response animation)
  const [cascadeHighlightAnchorId, setCascadeHighlightAnchorId] = useState<string | null>(null);

  const setViewMode = useCallback((mode: ViewMode) => {
    if (mode === 'cascade') {
      setSearchParams({});  // cascade is default (Phase 5)
    } else {
      setSearchParams({ view: mode });
    }
    clearLassoRef.current?.();
    setLassoResult(null);
    setLassoMode(null);
    setCascadeHighlightAnchorId(null);
  }, [setSearchParams]);

  // Lazy-load Phase 2 constellation layout
  useEffect(() => {
    if (viewMode !== 'constellation') return;
    if (layoutLoadState !== 'idle') return;
    setLayoutLoadState('loading');
    layoutLoadStartRef.current = performance.now();
    loadConstellationLayout()
      .then((d) => {
        const ms = performance.now() - layoutLoadStartRef.current;
        console.info(`[Forge] Constellation layout loaded in ${ms.toFixed(0)} ms — ${d.centroids.length} kits`);
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

  // Lazy-load Phase 3 two-layer layout (also pre-loads constellation layout for star instances)
  useEffect(() => {
    if (viewMode !== 'twolayer') return;
    if (twoLayerLoadState !== 'idle') return;
    setTwoLayerLoadState('loading');
    Promise.all([
      loadTwoLayerLayout(),
      // Two-layer canvas reuses Phase 2 cluster geometry for star instances
      layoutLoadState === 'ready' && layoutData
        ? Promise.resolve(layoutData)
        : loadConstellationLayout(),
    ])
      .then(([tlData, clData]) => {
        console.info(
          `[Forge] Two-layer layout loaded — ` +
          `${tlData.anchors.length} anchors · ${tlData.centroids.length} kits`
        );
        setTwoLayerData(tlData);
        if (!layoutData) {
          setLayoutData(clData);
          setLayoutLoadState('ready');
        }
        setTwoLayerLoadState('ready');
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Forge] Two-layer layout load failed:', msg);
        setTwoLayerLoadError(msg);
        setTwoLayerLoadState('error');
      });
  }, [viewMode, twoLayerLoadState, layoutData, layoutLoadState]);

  // Lazy-load Phase 3.3 alternative layout (force-directed) on first toggle to forcealt
  useEffect(() => {
    if (algorithmMode !== 'forcealt') return;
    if (twoLayerAltLoadState !== 'idle') return;
    setTwoLayerAltLoadState('loading');
    loadTwoLayerLayoutAlt()
      .then((d) => {
        console.info(`[Forge] Two-layer alt layout loaded — ${d.centroids.length} kits (force-directed)`);
        setTwoLayerAltData(d);
        setTwoLayerAltLoadState('ready');
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Forge] Two-layer alt layout load failed:', msg);
        setTwoLayerAltLoadError(msg);
        setTwoLayerAltLoadState('error');
      });
  }, [algorithmMode, twoLayerAltLoadState]);

  // Lazy-load Phase 4/5 rune-layer layout (shared by both rune and cascade views)
  useEffect(() => {
    if (viewMode !== 'rune' && viewMode !== 'cascade') return;
    if (runeLayerLoadState !== 'idle') return;
    setRuneLayerLoadState('loading');
    Promise.all([
      loadRuneLayerLayout(),
      layoutLoadState === 'ready' && layoutData
        ? Promise.resolve(layoutData)
        : loadConstellationLayout(),
    ])
      .then(([rlData, clData]) => {
        console.info(
          `[Forge] Rune-layer layout loaded — ` +
          `${rlData.rune_anchors.length} rune anchors · ${rlData.centroids.length} kits`
        );
        setRuneLayerData(rlData);
        if (!layoutData) {
          setLayoutData(clData);
          setLayoutLoadState('ready');
        }
        setRuneLayerLoadState('ready');
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Forge] Rune-layer layout load failed:', msg);
        setRuneLayerLoadError(msg);
        setRuneLayerLoadState('error');
      });
  }, [viewMode, runeLayerLoadState, layoutData, layoutLoadState]);

  // Load core cosmograph data (always)
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

  const handleTwoLayerLassoResult = useCallback((result: LassoResolutionResult | null, mode: string) => {
    setLassoResult(result);
    setLassoMode(mode === 'clear' ? null : mode);
  }, []);

  const handleClearLasso = useCallback(() => {
    clearLassoRef.current?.();
    setLassoResult(null);
    setLassoMode(null);
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

          {/* View toggle: cascade (default, Phase 5) ↔ rune (Phase 4) ↔ two-layer (Phase 3) ↔ constellation (Phase 2) ↔ primitive (analyst) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 rounded border border-gray-700/60 bg-gray-900/60 px-1.5 py-1">
              <span className="text-[9px] text-gray-600 font-mono mr-1 uppercase tracking-wider">View:</span>
              <button
                onClick={() => setViewMode('cascade')}
                title="Phase 5 — spirit guide cascade + cycling text-list UI. § 12 canonical architecture: iPad text + sky runes. 7 Tier 1 anchors cycling."
                className={
                  'rounded px-2 py-0.5 text-[10px] font-mono transition-colors ' +
                  (viewMode === 'cascade'
                    ? 'bg-violet-700/70 text-violet-100'
                    : 'text-gray-500 hover:text-gray-300')
                }
              >
                cascade
              </button>
              <button
                onClick={() => setViewMode('rune')}
                title="Phase 4 — rune-per-group. 6 primitive-group rune anchors (large atmospheric). Tier 1: tap/sign to select. Tier 2: per-primitive icons."
                className={
                  'rounded px-2 py-0.5 text-[10px] font-mono transition-colors ' +
                  (viewMode === 'rune'
                    ? 'bg-violet-700/70 text-violet-100'
                    : 'text-gray-500 hover:text-gray-300')
                }
              >
                rune
              </button>
              <button
                onClick={() => setViewMode('twolayer')}
                title="Phase 3 — two-layer + buffer-space cosmograph. Nebulas = element anchors. Dots = kit clusters. Hybrid kits in buffer space."
                className={
                  'rounded px-2 py-0.5 text-[10px] font-mono transition-colors ' +
                  (viewMode === 'twolayer'
                    ? 'bg-indigo-700/70 text-indigo-100'
                    : 'text-gray-500 hover:text-gray-300')
                }
              >
                two-layer
              </button>
              <button
                onClick={() => setViewMode('constellation')}
                title="Phase 2 — kit-galaxy. 1000 constellation clusters, element neighborhoods."
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

            {/* Phase 3.3 — algorithm comparison toggle (two-layer mode only) */}
            {viewMode === 'twolayer' && (
              <div className="flex items-center gap-1 rounded border border-gray-700/40 bg-gray-900/40 px-1.5 py-1">
                <span className="text-[9px] text-gray-600 font-mono mr-1 uppercase tracking-wider">Algo:</span>
                <button
                  onClick={() => { setAlgorithmMode('baseline'); clearLassoRef.current?.(); setLassoResult(null); }}
                  title="Phase 3.1 baseline: fixed-anchor + radial projection (sunflower spiral zones). Deterministic, clean buffer by design."
                  className={
                    'rounded px-2 py-0.5 text-[10px] font-mono transition-colors ' +
                    (algorithmMode === 'baseline'
                      ? 'bg-slate-600/70 text-slate-100'
                      : 'text-gray-600 hover:text-gray-400')
                  }
                >
                  radial
                </button>
                <button
                  onClick={() => { setAlgorithmMode('forcealt'); clearLassoRef.current?.(); setLassoResult(null); }}
                  title="Phase 3.3 alternative: force-directed (anchor-spring + inter-kit repulsion). Organic; buffer emerges from physics."
                  className={
                    'rounded px-2 py-0.5 text-[10px] font-mono transition-colors ' +
                    (algorithmMode === 'forcealt'
                      ? 'bg-teal-700/70 text-teal-100'
                      : 'text-gray-600 hover:text-gray-400')
                  }
                >
                  force
                </button>
                {algorithmMode === 'forcealt' && twoLayerAltLoadState === 'loading' && (
                  <span className="text-[8px] font-mono text-gray-600 ml-1">loading…</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mode descriptor */}
        {viewMode === 'cascade' ? (
          <p className="text-xs text-violet-400/80 bg-violet-900/15 border border-violet-800/40 rounded px-3 py-2 font-mono leading-relaxed max-w-4xl">
            <span className="text-violet-200 font-bold">Phase 5 — Spirit Guide Cascade + Cycling Text-List</span>
            {' '}— § 12 canonical architecture: <span className="text-violet-300">iPad text-list cycling</span> + <span className="text-violet-300">sky runes only</span> ·{' '}
            Spirit guide opens: <em>"What is most important for your journey this season?"</em> ·{' '}
            7 Tier 1 anchors cycle; sky responds to attention (cycling ≠ committing) ·{' '}
            Cascade 3+ layers deep; final form emerges.
            <strong className="text-violet-200"> Scroll to zoom</strong> — stars reveal at 2×.
            All <span className="text-amber-500 font-bold">PROVISIONAL</span>.
          </p>
        ) : viewMode === 'rune' ? (
          <p className="text-xs text-violet-400/80 bg-violet-900/15 border border-violet-800/40 rounded px-3 py-2 font-mono leading-relaxed max-w-4xl">
            <span className="text-violet-200 font-bold">Phase 4 — Rune-Per-Group + Two-Tier Selection</span>
            {' '}— 6 primitive-group <span className="text-violet-300">rune anchors</span> (large atmospheric light-edge brush-stroke; no color; drawn by light) ·{' '}
            1000 kit <span className="text-violet-300">clusters</span> spatially near their group ·{' '}
            <span className="text-amber-300">Tier 1:</span> tap or sign a rune to select its primitive group ·{' '}
            <span className="text-amber-300">Tier 2:</span> pick per-primitive values (placeholder icons; canonical design Pattern B).
            <strong className="text-violet-200"> Scroll to zoom</strong> — stars reveal at 2×.
            All <span className="text-amber-500 font-bold">PROVISIONAL</span>.
          </p>
        ) : viewMode === 'twolayer' ? (
          <p className="text-xs text-indigo-400/80 bg-indigo-900/15 border border-indigo-800/40 rounded px-3 py-2 font-mono leading-relaxed max-w-4xl">
            <span className="text-indigo-200 font-bold">Phase 3 — Two-Layer + Buffer-Space</span>
            {' '}— 8 element-anchor <span className="text-indigo-300">nebulas</span> (Layer 1; regional markers) ·{' '}
            1000 kit <span className="text-indigo-300">clusters</span> (Layer 2; spatially near their element) ·{' '}
            <span className="text-purple-300">310 hybrid kits</span> in buffer zones between anchors (discoverable cross-substrate content).
            <strong className="text-indigo-200"> Scroll to zoom</strong> — stars reveal at 2×.
            <strong className="text-indigo-200"> Lasso</strong> at 2×+: tight lasso = related kits · wide cross-buffer = unusual combinations · buffer-only = hybrid discovery.
            All <span className="text-amber-500 font-bold">PROVISIONAL</span>.
          </p>
        ) : viewMode === 'primitive' ? (
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
            <span className="text-gray-200 font-bold">Phase 2 — Kit-Galaxy</span>
            {' '}— A galaxy of every possible kit — 1000 builds, each a bounded star cluster.
            Element neighborhoods visible at overview:{' '}
            <span className="text-orange-400">fire / lightning</span> left ·{' '}
            <span className="text-blue-400">water / wind</span> center ·{' '}
            <span className="text-gray-500">physical / shadow / holy</span> right.
            <strong className="text-gray-300"> Scroll to zoom</strong> into a region —
            full star clusters reveal at 2×.
            <strong className="text-gray-300"> Lasso</strong> a cluster at 2×+ to identify a kit.
            All <span className="font-bold text-amber-500">PROVISIONAL</span>.
          </p>
        )}
      </div>

      {/* Main content: canvas + side panel
          Mobile layout (< 640px): column stack — canvas above, side panel below (when result present)
          iPad+ (≥ 640px): row layout — canvas left, side panel right at 260px
      */}
      <div
        className="flex flex-col sm:flex-row"
        style={{ height: 'calc(100vh - 195px)', minHeight: 480 }}
      >
        {/* Canvas area — full width on mobile (min 60% of container), flex-1 on sm+
            sm:min-h-0 re-enables flex shrink on desktop; on mobile 60% ensures canvas dominates */}
        <div className="flex-1 min-w-0" style={{ minHeight: 'clamp(240px, 60%, 100%)' }}>
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
            ) : viewMode === 'constellation' ? (
              layoutLoadState === 'error' ? (
                <ErrorState message={layoutLoadError ?? 'Constellation layout load failed'} />
              ) : layoutLoadState === 'ready' && layoutData ? (
                <ConstellationModeCanvas
                  data={data}
                  layoutData={layoutData}
                  onLassoResult={handleLassoResult}
                  clearLassoRef={clearLassoRef}
                />
              ) : (
                <LayoutLoadingState message="Loading constellation layout… (constellation_layout.json · 1000 kits · 34k instance nodes)" />
              )
            ) : viewMode === 'cascade' ? (
              // Phase 5 — spirit guide cascade + cycling text-list UI (§ 12 canonical architecture)
              runeLayerLoadState === 'error' ? (
                <ErrorState message={runeLayerLoadError ?? 'Rune-layer layout load failed'} />
              ) : runeLayerLoadState === 'ready' && runeLayerData && layoutData ? (
                // Canvas wrapper — position:relative so CascadePanel can overlay absolutely
                <div className="relative w-full h-full">
                  <RuneLayerCanvas
                    key="cascade"
                    data={data}
                    runeLayoutData={runeLayerData}
                    constellationLayoutData={layoutData}
                    onLassoResult={handleTwoLayerLassoResult}
                    clearLassoRef={clearLassoRef}
                    cascadeMode={true}
                    cascadeHighlightAnchorId={cascadeHighlightAnchorId}
                  />
                  {/* CascadePanel overlay — iPad text-list cycling UI per § 12.2 */}
                  <CascadePanel
                    onHighlight={(anchorId) => setCascadeHighlightAnchorId(anchorId)}
                    onTier1Commit={(anchorId) => {
                      setCascadeHighlightAnchorId(anchorId);
                      console.info(`[Forge P5] Tier 1 committed: ${anchorId}`);
                    }}
                    onEmergence={(kitId) => {
                      console.info(`[Forge P5] Final emergence: ${kitId}`);
                    }}
                    onReset={() => {
                      setCascadeHighlightAnchorId(null);
                    }}
                  />
                </div>
              ) : (
                <LayoutLoadingState message="Loading cascade layout… (rune_layer_layout.json · 7 sky regions · 1000 kits)" />
              )
            ) : viewMode === 'rune' ? (
              // Phase 4 — rune-per-group + two-tier selection (preserved baseline)
              runeLayerLoadState === 'error' ? (
                <ErrorState message={runeLayerLoadError ?? 'Rune-layer layout load failed'} />
              ) : runeLayerLoadState === 'ready' && runeLayerData && layoutData ? (
                <RuneLayerCanvas
                  key="rune"
                  data={data}
                  runeLayoutData={runeLayerData}
                  constellationLayoutData={layoutData}
                  onLassoResult={handleTwoLayerLassoResult}
                  clearLassoRef={clearLassoRef}
                  cascadeMode={false}
                />
              ) : (
                <LayoutLoadingState message="Loading rune-layer layout… (rune_layer_layout.json · 6 primitive groups · 1000 kits)" />
              )
            ) : (
              // Two-layer (Phase 3) — baseline or force-directed alternative
              (() => {
                // Pick layout based on algorithm toggle (Phase 3.3)
                const activeLayout = algorithmMode === 'forcealt' ? twoLayerAltData : twoLayerData;
                const activeLoadState = algorithmMode === 'forcealt' ? twoLayerAltLoadState : twoLayerLoadState;
                const activeError = algorithmMode === 'forcealt' ? twoLayerAltLoadError : twoLayerLoadError;

                if (activeLoadState === 'error') {
                  return <ErrorState message={activeError ?? 'Two-layer layout load failed'} />;
                }
                if (activeLoadState === 'ready' && activeLayout && layoutData) {
                  return (
                    <TwoLayerCanvas
                      key={algorithmMode}  // Force re-mount on algorithm switch
                      data={data}
                      layoutData={activeLayout}
                      constellationLayoutData={layoutData}
                      onLassoResult={handleTwoLayerLassoResult}
                      clearLassoRef={clearLassoRef}
                    />
                  );
                }
                const msg = algorithmMode === 'forcealt'
                  ? 'Loading force-directed layout… (twolayer_layout_alt.json · force-directed alternative)'
                  : 'Loading two-layer layout… (twolayer_layout.json · 8 anchors · 1000 kits · 3 zones)';
                return <LayoutLoadingState message={msg} />;
              })()
            )
          ) : null}
        </div>

        {/* Side panel
            Mobile (< 640px): full-width, stacked below canvas.
              When no lasso result: hidden (preserves canvas space).
              When lasso result present: visible, min-h-[200px] to show content.
            iPad+ (≥ 640px): fixed 280px column on the right, always visible (shows idle hint).
            Border: top on mobile (column stack), left on sm+ (row layout).
        */}
        {loadState === 'ready' && data && (
          <div
            className={
              'flex-shrink-0 w-full sm:w-[280px] border-t sm:border-t-0 sm:border-l border-gray-800/60 bg-gray-950 overflow-hidden min-h-[200px] sm:min-h-0 ' +
              (lassoResult === null ? 'hidden sm:block' : '')
            }
          >
            <SidePanel
              result={lassoResult}
              data={data}
              onClear={handleClearLasso}
              lassoMode={viewMode === 'twolayer' ? lassoMode : undefined}
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
            ) : viewMode === 'constellation' ? (
              <>
                {layoutData?.centroids.length ?? '…'} constellation clusters ·{' '}
                {layoutData ? '18k first-class stars' : 'loading layout…'} &middot;
                dots at 1× · stars at 2×+ · lasso at 2×+ · &quot;substrate&quot; above for primitive analysis
              </>
            ) : viewMode === 'cascade' ? (
              <>
                7 sky cluster regions · spirit guide cascade (§ 12) &middot;{' '}
                {runeLayerData?.rune_anchors.length ?? '…'} rune anchors (sky layer) &middot;{' '}
                {runeLayerData?.centroids.length ?? '…'} kit clusters &middot;{' '}
                cycle = preview · commit = advance · PROVISIONAL
              </>
            ) : viewMode === 'rune' ? (
              <>
                {runeLayerData?.rune_anchors.length ?? '…'} rune group anchors (Layer 1) &middot;{' '}
                {runeLayerData?.centroids.length ?? '…'} kit clusters (Layer 2) &middot;{' '}
                tap or sign rune = Tier 1 · icon select = Tier 2 · dots at 1× · stars at 2×+ · PROVISIONAL
              </>
            ) : (
              (() => {
                const activeData = algorithmMode === 'forcealt' ? twoLayerAltData : twoLayerData;
                const algoLabel = algorithmMode === 'forcealt' ? 'force-directed' : 'radial-projection';
                return (
                  <>
                    {activeData?.anchors.length ?? '…'} element anchors (Layer 1) &middot;{' '}
                    {activeData?.centroids.length ?? '…'} kit clusters (Layer 2) &middot;{' '}
                    {activeData?.centroids.filter(c => c.zone === 'buffer').length ?? '…'} buffer kits &middot;{' '}
                    dots at 1× · stars at 2×+ · lasso at 2×+ &middot; algo: {algoLabel}
                  </>
                );
              })()
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

function LayoutLoadingState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-gray-500 font-mono text-sm mb-2">Loading layout...</div>
        <div className="text-gray-700 font-mono text-xs">{message}</div>
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
