// useAtlasLens — the runtime wiring for the atlas v1 zoom (spec §8).
//
// A viewBox lens over the INLINED r7 SVG. All the load-bearing math lives in the
// pure ../utils/atlasLens module (unit-tested); this hook binds it to the DOM:
//
//   - Derives BOTH bounds from the mounted artifact (the fetched SVG markup — the
//     exact bytes that become the DOM), never hardcoded (§8.2, acceptance #36).
//   - Interaction grammar (§8.1): cursor-anchored wheel (rAF-throttled), pinch,
//     drag-pan, +/− (×1.5), double-click zoom-in at cursor, reset, keyboard +/−/0.
//   - Gesture perf (§8.4, acceptance #38): a CSS transform on the <svg> DURING the
//     gesture (compositor-only), then a SINGLE viewBox write + planeClip update on
//     gesture settle. No per-frame viewBox writes.
//   - Clip-tracks-view (§8.3, acceptance #40): while any zoom/pan state is active
//     the planeClip <rect> follows the current viewBox; reset restores the emitted
//     viewBox AND the emitted planeClip rect VERBATIM. The on-disk SVG bytes are
//     never touched — this is runtime DOM state only.
//
// The lens state (current viewBox) lives in a REF, not React state, so a gesture
// never triggers a React re-render (§8.4). The render-visible readout (scale +
// button-enable flags) is PUBLISHED into React state only on settle/reset (rare),
// so gestures stay off the render path while the chrome still updates.
//
// Spec: agentic_orchestration/gandalf/notes/2026-07-15-atlas-interactive-glance-spec.md §8

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deriveBounds,
  clampScale,
  scaleOf,
  viewCenter,
  viewBoxFor,
  viewBoxToAttr,
  viewBoxToRectAttrs,
  zoomAtPoint,
  panByScreen,
  screenToCanvas,
  gestureTransform,
  gestureTransformToCss,
  easeScaleForRadius,
  STEP_FACTOR,
  TARGET_D,
  type AtlasBounds,
  type ViewBox,
} from '../utils/atlasLens';

export interface UseAtlasLensResult {
  /** Derived bounds (null until the SVG markup mounts). Exposed for receipts/UI. */
  bounds: AtlasBounds | null;
  /** Current scale S (native.width / viewBox.width). 1 until mounted. */
  scale: number;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  /**
   * Table→chart lens-pan (§8.4): center the mark under `sel` at the current S; if
   * its rendered diameter < TARGET_D/2 raise S to its ease-scale (≤ S_max). `sel`
   * is the CSS attribute selector value (kit_id or |-joined core); we read the
   * mark's cx/cy/r off the mounted DOM (copy the artifact, never restate coords).
   */
  panToMark: (sel: { kind: 'kit'; kitId: string } | { kind: 'ghost'; core: string }) => void;
}

/**
 * @param containerRef  the div that wraps the inlined SVG (dangerouslySetInnerHTML)
 * @param svgMarkup     the fetched SVG source (bounds are derived from it)
 * @param enabled       gate — only wire once the SVG is actually in the DOM
 */
/** The render-visible lens readout — kept in React STATE (published on settle). */
interface LensReadout {
  bounds: AtlasBounds | null;
  scale: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

const INITIAL_READOUT: LensReadout = {
  bounds: null,
  scale: 1,
  canZoomIn: false,
  canZoomOut: false,
};

export function useAtlasLens(
  containerRef: React.RefObject<HTMLDivElement | null>,
  svgMarkup: string | null,
  enabled: boolean
): UseAtlasLensResult {
  const boundsRef = useRef<AtlasBounds | null>(null);
  const viewRef = useRef<ViewBox | null>(null); // current committed viewBox (hot path)

  // Render-visible readout lives in STATE — never read a ref during render. It is
  // published only on settle/reset (rare), so gestures still avoid re-renders: the
  // hot path writes viewRef + the DOM, then publishes the derived readout once.
  const [readout, setReadout] = useState<LensReadout>(INITIAL_READOUT);

  const publish = useCallback((vb: ViewBox) => {
    const bounds = boundsRef.current;
    if (!bounds) return;
    const scale = scaleOf(vb, bounds.native);
    setReadout({
      bounds,
      scale,
      canZoomIn: scale < bounds.sMax - 1e-6,
      canZoomOut: scale > bounds.sMin + 1e-6,
    });
  }, []);

  // ---- LIVE DOM access (query the container each call; never cache a stale <svg>) ----
  // React re-inlines the SVG via dangerouslySetInnerHTML on skin flip, and StrictMode
  // double-invokes; a cached element reference can detach. The CONTAINER div is stable
  // across all of that, so we resolve the current live <svg> from it on every commit.
  // These fire only on settle / reset (not per gesture-frame), so the query is cheap.
  const liveSvg = useCallback((): SVGSVGElement | null => {
    return (containerRef.current?.querySelector('svg') as SVGSVGElement | null) ?? null;
  }, [containerRef]);

  const liveClipRect = useCallback((svg: SVGSVGElement | null): SVGRectElement | null => {
    return (svg?.querySelector('#planeClip rect') as SVGRectElement | null) ?? null;
  }, []);

  // ---- Commit a viewBox to the DOM: single write + clip update (settle path) ----
  const commitView = useCallback(
    (vb: ViewBox) => {
      const svg = liveSvg();
      if (!svg) return;
      viewRef.current = vb;
      svg.setAttribute('viewBox', viewBoxToAttr(vb));
      // Clear any transient gesture transform now that the viewBox holds the truth.
      svg.style.transform = '';
      svg.style.transformOrigin = '';
      svg.style.willChange = '';
      // Clip-tracks-view (§8.3): the planeClip rect follows the current viewBox.
      const rect = liveClipRect(svg);
      if (rect) {
        const a = viewBoxToRectAttrs(vb);
        rect.setAttribute('x', a.x);
        rect.setAttribute('y', a.y);
        rect.setAttribute('width', a.width);
        rect.setAttribute('height', a.height);
      }
      // Publish the derived readout (scale + button-enable) once, on settle.
      publish(vb);
    },
    [liveSvg, liveClipRect, publish]
  );

  // ---- Transient gesture transform: compositor-only, no viewBox write (§8.4) ----
  const previewView = useCallback(
    (vb: ViewBox) => {
      const svg = liveSvg();
      const from = viewRef.current;
      const host = containerRef.current;
      if (!svg || !from || !host) return;
      const rect = { width: host.clientWidth, height: host.clientHeight };
      const t = gestureTransform(from, vb, rect);
      svg.style.transformOrigin = '0 0';
      svg.style.willChange = 'transform';
      svg.style.transform = gestureTransformToCss(t);
    },
    [containerRef, liveSvg]
  );

  // ---- Derive bounds + set the initial view whenever the markup (re)mounts ----
  useEffect(() => {
    if (!enabled || !svgMarkup) return;
    // The host div's innerHTML is set imperatively by the page effect (keyed on the
    // same markup), which runs BEFORE this hook effect in commit order — so the SVG
    // is in the DOM here. Derive both bounds from the markup SOURCE (the exact bytes
    // that mounted): the never-invent page-constant rule (§4c/§8.2).
    const svg = liveSvg();
    if (!svg) return;
    let bounds: AtlasBounds;
    try {
      bounds = deriveBounds(svgMarkup);
    } catch {
      // If derivation fails (unexpected artifact), leave the lens inert — the SVG
      // still renders at its emitted viewBox; zoom controls will report disabled.
      boundsRef.current = null;
      return;
    }
    boundsRef.current = bounds;

    // SKIN FLIP PRESERVES THE LENS (§8.4): a skin flip re-inlines the OTHER-canvas
    // artifact (fresh <svg> at its emitted native viewBox), but the zoom state lives
    // OUTSIDE the skin state. If we already hold a view (from before the flip), and
    // it is a valid non-native view under the (geometry-frozen, identical) bounds,
    // RE-APPLY it to the fresh SVG so the flip is seamless. Otherwise (first mount)
    // initialize to the emitted native viewBox.
    const prior = viewRef.current;
    const isNativeView =
      !prior ||
      (prior.minx === bounds.native.minx &&
        prior.miny === bounds.native.miny &&
        prior.width === bounds.native.width &&
        prior.height === bounds.native.height);
    if (prior && !isNativeView) {
      // Re-clamp the prior view into the current bounds (identical across skins,
      // but this keeps it correct even if a future skin differed) and re-commit.
      const s = clampScale(scaleOf(prior, bounds.native), bounds);
      const c = viewCenter(prior);
      commitView(viewBoxFor(s, c.cx, c.cy, bounds));
    } else {
      // Fresh mount: emitted native viewBox (S = 1). planeClip stays emitted until
      // the first zoom/pan.
      viewRef.current = { ...bounds.native };
      publish(viewRef.current);
    }
  }, [enabled, svgMarkup, liveSvg, publish, commitView]);

  // ---- Cursor-anchored WHEEL (rAF-throttled, §8.1/§8.4) ----
  const wheelRaf = useRef<number | null>(null);
  const pendingWheel = useRef<{ x: number; y: number; factor: number } | null>(null);

  const applyPendingWheel = useCallback(() => {
    wheelRaf.current = null;
    const bounds = boundsRef.current;
    const from = viewRef.current;
    const host = containerRef.current;
    const p = pendingWheel.current;
    pendingWheel.current = null;
    if (!bounds || !from || !host || !p) return;
    const rect = { width: host.clientWidth, height: host.clientHeight };
    const anchor = screenToCanvas(p.x, p.y, rect, from);
    const nextS = clampScale(scaleOf(from, bounds.native) * p.factor, bounds);
    const vb = zoomAtPoint(from, nextS, anchor, bounds);
    // Wheel settles each frame: a single viewBox write per rAF, not per event.
    commitView(vb);
  }, [containerRef, commitView]);

  // ---- Imperative controls (buttons / keyboard) ----
  const stepZoom = useCallback(
    (factor: number, anchorCanvas?: { x: number; y: number }) => {
      const bounds = boundsRef.current;
      const from = viewRef.current;
      if (!bounds || !from) return;
      const nextS = clampScale(scaleOf(from, bounds.native) * factor, bounds);
      // Default anchor = the current view center (button/keyboard steps).
      const c = viewCenter(from);
      const anchor = anchorCanvas ?? { x: c.cx, y: c.cy };
      const vb = zoomAtPoint(from, nextS, anchor, bounds);
      commitView(vb);
    },
    [commitView]
  );

  const zoomIn = useCallback(() => stepZoom(STEP_FACTOR), [stepZoom]);
  const zoomOut = useCallback(() => stepZoom(1 / STEP_FACTOR), [stepZoom]);

  const reset = useCallback(() => {
    const bounds = boundsRef.current;
    const svg = liveSvg();
    if (!bounds || !svg) return;
    // Restore the EMITTED viewBox VERBATIM (the exact emitted attribute string).
    viewRef.current = { ...bounds.native };
    svg.setAttribute('viewBox', bounds.nativeViewBoxRaw);
    svg.style.transform = '';
    svg.style.transformOrigin = '';
    svg.style.willChange = '';
    // Restore the EMITTED planeClip rect VERBATIM (§8.3, acceptance #39) — the
    // captured original attribute STRINGS ("96.00", not "96"), so a byte-diff of
    // the reset rect against the emitted rect is identical.
    const rect = liveClipRect(svg);
    if (rect) {
      rect.setAttribute('x', bounds.planeClipRaw.x);
      rect.setAttribute('y', bounds.planeClipRaw.y);
      rect.setAttribute('width', bounds.planeClipRaw.width);
      rect.setAttribute('height', bounds.planeClipRaw.height);
    }
    publish(viewRef.current);
  }, [liveSvg, liveClipRect, publish]);

  // ---- Table→chart lens-pan (§8.4) ----
  const panToMark = useCallback<UseAtlasLensResult['panToMark']>(
    (sel) => {
      const bounds = boundsRef.current;
      const from = viewRef.current;
      const svg = liveSvg();
      if (!bounds || !from || !svg) return;
      const attrSel =
        sel.kind === 'kit'
          ? `[data-kit="${cssAttrEscape(sel.kitId)}"]`
          : `[data-core="${cssAttrEscape(sel.core)}"]`;
      const mark = svg.querySelector(attrSel) as SVGCircleElement | null;
      if (!mark) return;
      // Read the mark's px position + radius off the DOM (copy the artifact).
      const cx = Number(mark.getAttribute('cx'));
      const cy = Number(mark.getAttribute('cy'));
      const r = Number(mark.getAttribute('r'));
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
      const curS = scaleOf(from, bounds.native);
      // Rendered diameter (screen px) ≈ 2r · S in native-frame terms. If below
      // TARGET_D/2, raise S to this mark's ease-scale (≤ S_max); else hold S.
      let nextS = curS;
      if (Number.isFinite(r) && r > 0 && 2 * r * curS < TARGET_D / 2) {
        nextS = Math.max(curS, easeScaleForRadius(r, bounds));
      }
      const vb = viewBoxFor(nextS, cx, cy, bounds);
      commitView(vb);
    },
    [commitView, liveSvg]
  );

  // ---- Attach native DOM listeners (wheel/pointer/dblclick/keyboard) ----
  useEffect(() => {
    if (!enabled) return;
    const host = containerRef.current;
    if (!host) return;

    // WHEEL — cursor-anchored, rAF-throttled. Passive:false to preventDefault the
    // page scroll while zooming the lens.
    const onWheel = (e: WheelEvent) => {
      if (!boundsRef.current || !viewRef.current) return;
      e.preventDefault();
      const box = host.getBoundingClientRect();
      const px = e.clientX - box.left;
      const py = e.clientY - box.top;
      // Zoom factor from wheel delta: deltaY<0 (scroll up) => zoom IN.
      const factor = Math.exp(-e.deltaY * 0.0015);
      pendingWheel.current = { x: px, y: py, factor };
      if (wheelRaf.current == null) {
        wheelRaf.current = requestAnimationFrame(applyPendingWheel);
      }
    };

    // DOUBLE-CLICK — one ×1.5 zoom-in step at the cursor.
    const onDblClick = (e: MouseEvent) => {
      const bounds = boundsRef.current;
      const from = viewRef.current;
      if (!bounds || !from) return;
      e.preventDefault();
      const box = host.getBoundingClientRect();
      const anchor = screenToCanvas(
        e.clientX - box.left,
        e.clientY - box.top,
        { width: box.width, height: box.height },
        from
      );
      stepZoom(STEP_FACTOR, anchor);
    };

    // DRAG-PAN — pointer down/move/up; transform-during-gesture, settle on up.
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let dragStartView: ViewBox | null = null;
    let movedPx = 0;
    let dragRaf: number | null = null;
    let pendingDrag: { dx: number; dy: number } | null = null;

    const applyPendingDrag = () => {
      dragRaf = null;
      const bounds = boundsRef.current;
      const host2 = containerRef.current;
      if (!bounds || !dragStartView || !host2 || !pendingDrag) return;
      const rect = { width: host2.clientWidth, height: host2.clientHeight };
      const vb = panByScreen(dragStartView, pendingDrag.dx, pendingDrag.dy, rect, bounds);
      previewView(vb); // compositor-only during the drag
    };

    // Drag threshold (px): below this, the pointer-down is a potential CLICK — we
    // must NOT capture the pointer (capture reparents the click target to the host,
    // which would break the chart→table mark-click delegation). We capture lazily
    // in onPointerMove only once movement crosses the threshold (a real drag).
    const DRAG_THRESHOLD = 4;
    let captured = false;
    const onPointerDown = (e: PointerEvent) => {
      // Only left-button / primary pointer drives pan.
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (!boundsRef.current || !viewRef.current) return;
      dragging = true;
      captured = false;
      movedPx = 0;
      startX = e.clientX;
      startY = e.clientY;
      dragStartView = viewRef.current;
      // NOTE: no setPointerCapture here — deferred to the threshold crossing so a
      // click's target stays the actual mark under the cursor.
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging || !dragStartView) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      movedPx = Math.max(movedPx, Math.abs(dx) + Math.abs(dy));
      // Only treat as a drag (and preview-pan) once past the threshold.
      if (movedPx <= DRAG_THRESHOLD) return;
      if (!captured) {
        captured = true;
        host.setPointerCapture?.(e.pointerId);
      }
      pendingDrag = { dx, dy };
      if (dragRaf == null) dragRaf = requestAnimationFrame(applyPendingDrag);
    };
    const endDrag = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (captured) host.releasePointerCapture?.(e.pointerId);
      captured = false;
      if (dragRaf != null) {
        cancelAnimationFrame(dragRaf);
        dragRaf = null;
      }
      const bounds = boundsRef.current;
      if (bounds && dragStartView && pendingDrag) {
        const rect = { width: host.clientWidth, height: host.clientHeight };
        const vb = panByScreen(dragStartView, pendingDrag.dx, pendingDrag.dy, rect, bounds);
        commitView(vb); // single settle write (publishes the readout)
      }
      dragStartView = null;
      pendingDrag = null;
    };

    // Suppress the click→deselect when the pointer actually dragged (>4px).
    const onClickCapture = (e: MouseEvent) => {
      if (movedPx > 4) {
        e.stopPropagation();
        e.preventDefault();
        movedPx = 0;
      }
    };

    // PINCH — two-pointer gesture. Track two active pointers; scale by the ratio of
    // their live distance to the start distance, anchored at the pinch midpoint.
    const active = new Map<number, { x: number; y: number }>();
    let pinchStartDist = 0;
    let pinchStartView: ViewBox | null = null;
    let pinchRaf: number | null = null;
    let pinchPending: { scale: number; midX: number; midY: number } | null = null;

    const applyPendingPinch = () => {
      pinchRaf = null;
      const bounds = boundsRef.current;
      const host2 = containerRef.current;
      if (!bounds || !pinchStartView || !host2 || !pinchPending) return;
      const box = host2.getBoundingClientRect();
      const anchor = screenToCanvas(
        pinchPending.midX - box.left,
        pinchPending.midY - box.top,
        { width: box.width, height: box.height },
        pinchStartView
      );
      const nextS = clampScale(scaleOf(pinchStartView, bounds.native) * pinchPending.scale, bounds);
      const vb = zoomAtPoint(pinchStartView, nextS, anchor, bounds);
      previewView(vb);
    };

    const onPointerDownPinch = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      active.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (active.size === 2) {
        // Enter pinch — cancel any single-drag in progress.
        dragging = false;
        const pts = [...active.values()];
        pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        pinchStartView = viewRef.current;
      }
    };
    const onPointerMovePinch = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      if (!active.has(e.pointerId)) return;
      active.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (active.size === 2 && pinchStartView) {
        const pts = [...active.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        pinchPending = {
          scale: dist / pinchStartDist,
          midX: (pts[0].x + pts[1].x) / 2,
          midY: (pts[0].y + pts[1].y) / 2,
        };
        if (pinchRaf == null) pinchRaf = requestAnimationFrame(applyPendingPinch);
      }
    };
    const onPointerUpPinch = (e: PointerEvent) => {
      if (!active.has(e.pointerId)) return;
      const wasPinch = active.size === 2 && !!pinchStartView;
      active.delete(e.pointerId);
      if (wasPinch) {
        if (pinchRaf != null) {
          cancelAnimationFrame(pinchRaf);
          pinchRaf = null;
        }
        const bounds = boundsRef.current;
        if (bounds && pinchStartView && pinchPending) {
          const box = host.getBoundingClientRect();
          const anchor = screenToCanvas(
            pinchPending.midX - box.left,
            pinchPending.midY - box.top,
            { width: box.width, height: box.height },
            pinchStartView
          );
          const nextS = clampScale(
            scaleOf(pinchStartView, bounds.native) * pinchPending.scale,
            bounds
          );
          commitView(zoomAtPoint(pinchStartView, nextS, anchor, bounds));
        }
        pinchStartView = null;
        pinchPending = null;
      }
    };

    host.addEventListener('wheel', onWheel, { passive: false });
    host.addEventListener('dblclick', onDblClick);
    host.addEventListener('pointerdown', onPointerDown);
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerup', endDrag);
    host.addEventListener('pointercancel', endDrag);
    host.addEventListener('click', onClickCapture, true); // capture-phase gate
    host.addEventListener('pointerdown', onPointerDownPinch);
    host.addEventListener('pointermove', onPointerMovePinch);
    host.addEventListener('pointerup', onPointerUpPinch);
    host.addEventListener('pointercancel', onPointerUpPinch);

    return () => {
      host.removeEventListener('wheel', onWheel);
      host.removeEventListener('dblclick', onDblClick);
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerup', endDrag);
      host.removeEventListener('pointercancel', endDrag);
      host.removeEventListener('click', onClickCapture, true);
      host.removeEventListener('pointerdown', onPointerDownPinch);
      host.removeEventListener('pointermove', onPointerMovePinch);
      host.removeEventListener('pointerup', onPointerUpPinch);
      host.removeEventListener('pointercancel', onPointerUpPinch);
      if (wheelRaf.current != null) cancelAnimationFrame(wheelRaf.current);
      if (dragRaf != null) cancelAnimationFrame(dragRaf);
      if (pinchRaf != null) cancelAnimationFrame(pinchRaf);
    };
  }, [enabled, containerRef, applyPendingWheel, previewView, commitView, stepZoom, svgMarkup]);

  // ---- Keyboard +/−/0 (native listener on the container; §8.1) ----
  useEffect(() => {
    const host = containerRef.current;
    if (!host || !enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        reset();
      }
    };
    host.addEventListener('keydown', handler);
    return () => host.removeEventListener('keydown', handler);
  }, [containerRef, enabled, zoomIn, zoomOut, reset]);

  // Render-visible values come from the published STATE (never a ref during render).
  return {
    bounds: readout.bounds,
    scale: readout.scale,
    canZoomIn: readout.canZoomIn,
    canZoomOut: readout.canZoomOut,
    zoomIn,
    zoomOut,
    reset,
    panToMark,
  };
}

/** Escape a value for a CSS attribute selector (mirrors atlasHighlight). */
function cssAttrEscape(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
