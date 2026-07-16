// useAtlasStage — the FIXED-SCALE chart stage for Build Horizon (spec §9.3 D3-b).
//
// D3 (Matt 2026-07-15): the v1 zoom lens is retired. The chart mounts at a FIXED
// magnification = S_max, DERIVED from the mounted artifact bytes at runtime (no
// scale literal in source), and navigation is NATIVE browser scrolling. All the
// load-bearing arithmetic lives in the pure ../utils/atlasLens module (unit-tested);
// this hook binds it to the DOM:
//
//   - Derives S_max from the fetched SVG markup (§8.2 derivation law survives).
//   - Sizes the inlined <svg> to (stage clientWidth × S_max); height follows the
//     intrinsic 4:3 aspect automatically (CSS width only; height:auto).
//   - Sets the INITIAL scroll to the plane-rect center (parse planeClip → canvas
//     center → rendered px → scrollLeft/Top). Re-applies on skin flip (markup
//     re-inline) but NOT on selection changes.
//   - On window resize, recomputes the rendered width from the new stage width
//     (same S_max) and preserves the scroll FRACTION (nice-to-have, §9.3).
//   - The SVG's emitted viewBox + planeClip serve VERBATIM — NEVER mutated. The
//     inlined artifact stays byte-equal to the vendored file (acceptance #58).
//   - Exposes scrollToMark(sel): center a mark's canvas cx/cy in the stage (the
//     table→chart center-scroll; pan-only, no ease-scale — at S_max every wirable
//     mark renders ≥ TARGET_D by construction, §9.3).
//
// Spec: agentic_orchestration/gandalf/notes/2026-07-15-atlas-interactive-glance-spec.md §9.3

import { useCallback, useEffect, useMemo } from 'react';
import {
  deriveBounds,
  renderedSize,
  centerScroll,
  planeCenterCanvas,
  type AtlasBounds,
} from '../utils/atlasLens';

export interface UseAtlasStageResult {
  /** Derived bounds (null until the SVG markup mounts). Exposed for the receipt UI. */
  bounds: AtlasBounds | null;
  /**
   * Table→chart center-scroll (§9.3): smooth-scroll the stage so the mark under
   * `sel` sits at the stage center. `sel` is the CSS attribute selector value
   * (kit_id or |-joined core); we read the mark's cx/cy off the mounted DOM (copy
   * the artifact, never restate coords). No ease-scale — S is fixed at S_max.
   */
  scrollToMark: (sel: { kind: 'kit'; kitId: string } | { kind: 'ghost'; core: string }) => void;
}

/**
 * @param stageRef   the overflow-auto stage div (owns the native scrollbars)
 * @param svgHostRef the div whose innerHTML is the inlined SVG (set imperatively)
 * @param svgMarkup  the fetched SVG source (S_max is derived from it)
 * @param enabled    gate — only wire once the SVG is actually in the DOM
 */
export function useAtlasStage(
  stageRef: React.RefObject<HTMLDivElement | null>,
  svgHostRef: React.RefObject<HTMLDivElement | null>,
  svgMarkup: string | null,
  enabled: boolean
): UseAtlasStageResult {
  // Bounds are a PURE function of the markup SOURCE STRING (deriveBounds parses the
  // bytes — no DOM needed), so we derive them synchronously via useMemo. This keeps
  // the effect free of a setState-in-effect (it only does DOM sizing + scrolling).
  // Both the geometry (viewBox 0 0 1600 1200) and the min selectable radius are read
  // from the markup — a doctored radius shifts sMax with zero code change (#57).
  const bounds = useMemo<AtlasBounds | null>(() => {
    if (!enabled || !svgMarkup) return null;
    try {
      return deriveBounds(svgMarkup);
    } catch {
      // Unexpected artifact — leave the stage inert (the SVG still renders fluid).
      return null;
    }
  }, [enabled, svgMarkup]);

  // Resolve the current live <svg> from the (stable) host div on demand. React
  // re-inlines the SVG on skin flip; a cached element reference can detach.
  const liveSvg = useCallback((): SVGSVGElement | null => {
    return (svgHostRef.current?.querySelector('svg') as SVGSVGElement | null) ?? null;
  }, [svgHostRef]);

  /**
   * Apply the fixed rendered WIDTH to the live SVG from the current stage width.
   * The SVG's own viewBox is native (`0 0 1600 1200`) so height follows via
   * height:auto — we never touch the viewBox. Returns the rendered size (or null).
   * `bounds` is closed over from the memo (no ref) so this recomputes on skin flip.
   */
  const applyRenderedWidth = useCallback((): { width: number; height: number } | null => {
    const stage = stageRef.current;
    const svg = liveSvg();
    if (!stage || !svg || !bounds) return null;
    // clientWidth excludes the scrollbar gutter — the honest content width.
    const stageWidth = stage.clientWidth;
    const rendered = renderedSize(bounds.native, stageWidth, bounds.sMax);
    // CSS width only; height:auto keeps the intrinsic aspect (no viewBox touch).
    svg.style.width = `${rendered.width}px`;
    svg.style.height = 'auto';
    svg.style.maxWidth = 'none'; // defeat any inherited [&>svg]:w-full / max-w rule
    return rendered;
  }, [stageRef, liveSvg, bounds]);

  // ---- Size the SVG + center on the plane whenever markup mounts (bounds ready) ----
  useEffect(() => {
    if (!enabled || !svgMarkup || !bounds) return;
    // The host div's innerHTML is set imperatively by the page effect (keyed on the
    // same markup), which runs BEFORE this hook effect in commit order — so the SVG
    // is in the DOM here. Bounds are already derived (useMemo above); we only do DOM
    // sizing + the initial scroll here (no setState-in-effect).
    const svg = liveSvg();
    if (!svg) return;
    const stage = stageRef.current;
    const rendered = applyRenderedWidth();
    if (stage && rendered) {
      // Initial scroll = plane-rect center (§9.3). Re-applied on every markup mount
      // (first mount AND skin flip), NOT on selection changes.
      const { cx, cy } = planeCenterCanvas(bounds);
      const { scrollLeft, scrollTop } = centerScroll(cx, cy, bounds.native, rendered, {
        width: stage.clientWidth,
        height: stage.clientHeight,
      });
      stage.scrollLeft = scrollLeft;
      stage.scrollTop = scrollTop;
    }
    // Re-run when the markup changes (skin flip) or bounds resolve.
  }, [enabled, svgMarkup, bounds, liveSvg, applyRenderedWidth, stageRef]);

  // ---- Window resize: recompute rendered width; preserve scroll FRACTION ----
  useEffect(() => {
    if (!enabled || !bounds) return;
    const stage = stageRef.current;
    if (!stage) return;
    let raf: number | null = null;
    const onResize = () => {
      if (raf != null) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const svg = liveSvg();
        if (!svg) return;
        // Capture the pre-resize scroll fraction (center of the viewport in content).
        const prevW = svg.clientWidth || 1;
        const prevH = svg.clientHeight || 1;
        const fx = (stage.scrollLeft + stage.clientWidth / 2) / prevW;
        const fy = (stage.scrollTop + stage.clientHeight / 2) / prevH;
        const rendered = applyRenderedWidth();
        if (!rendered) return;
        // Re-apply the same fraction so the same content point stays centered.
        stage.scrollLeft = clamp(fx * rendered.width - stage.clientWidth / 2, rendered.width - stage.clientWidth);
        stage.scrollTop = clamp(fy * rendered.height - stage.clientHeight / 2, rendered.height - stage.clientHeight);
      });
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [enabled, bounds, stageRef, liveSvg, applyRenderedWidth]);

  // ---- Table→chart center-scroll (§9.3): center the mark; smooth; pan-only ----
  const scrollToMark = useCallback<UseAtlasStageResult['scrollToMark']>(
    (sel) => {
      const stage = stageRef.current;
      const svg = liveSvg();
      if (!stage || !svg || !bounds) return;
      const attrSel =
        sel.kind === 'kit'
          ? `[data-kit="${cssAttrEscape(sel.kitId)}"]`
          : `[data-core="${cssAttrEscape(sel.core)}"]`;
      const mark = svg.querySelector(attrSel) as SVGCircleElement | null;
      if (!mark) return;
      const cx = Number(mark.getAttribute('cx'));
      const cy = Number(mark.getAttribute('cy'));
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
      const rendered = { width: svg.clientWidth, height: svg.clientHeight };
      const { scrollLeft, scrollTop } = centerScroll(cx, cy, bounds.native, rendered, {
        width: stage.clientWidth,
        height: stage.clientHeight,
      });
      stage.scrollTo({ left: scrollLeft, top: scrollTop, behavior: 'smooth' });
    },
    [stageRef, liveSvg, bounds]
  );

  return { bounds, scrollToMark };
}

/** Clamp a scroll offset into [0, max]; max<0 (content smaller than view) → 0. */
function clamp(v: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(Math.max(v, 0), max);
}

/** Escape a value for a CSS attribute selector (mirrors atlasHighlight). */
function cssAttrEscape(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
