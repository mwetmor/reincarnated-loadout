// useAtlasStage — the STATIC full-horizon map configuration for Build Horizon (§9.4 D4).
//
// D4 (spec §9.4, Matt 2026-07-15): "just barely encompass all of the horizon." The
// chart is a STATIC full-horizon map, NOT a scroll stage at S_max. This hook does ONE
// thing: at markup inline (initial mount AND each skin flip), it writes the DERIVED
// FIT BOX (union(canvas ∪ hull) + FIT_MARGIN, aspect-pinned, centered — the old S_min
// view) to the live SVG's `viewBox` attribute AND the `planeClip` <rect> ONCE. The
// planeClip rewrite is what reveals plane-layer content beyond the emitted clip — the
// hull's beyond-canvas extent must render for the dashed line to close on screen.
//
// (SUPERSESSION, §9.4: D3-b's model — mount at S_max, size the SVG to stageWidth×S_max,
// native scroll, and "the emitted viewBox + planeClip serve VERBATIM, never mutated"
// — is RETIRED. §9.4 rules ONE mount-time configuration write to the derived fit box
// as lawful; there is NO interaction-driven mutation after mount. The old
// centerScroll / renderedSize / scrollToMark navigation math is gone with the scroll
// stage — table→chart is now a page-level scrollIntoView of the chart region.)
//
// The load-bearing arithmetic lives in the pure ../utils/atlasLens module (unit-tested,
// node env); this hook binds it to the DOM. No literals: a doctored hull in the source
// shifts the mount box with zero code change (deriveBounds reads the artifact bytes).
//
// Spec: agentic_orchestration/gandalf/notes/2026-07-15-atlas-interactive-glance-spec.md §9.4

import { useCallback, useEffect, useMemo } from 'react';
import {
  deriveBounds,
  viewBoxToAttr,
  viewBoxToRectAttrs,
  type AtlasBounds,
} from '../utils/atlasLens';

export interface UseAtlasStageResult {
  /** Derived bounds (null until the SVG markup mounts). Exposed for the receipt UI. */
  bounds: AtlasBounds | null;
}

/**
 * @param svgHostRef the div whose innerHTML is the inlined SVG (set imperatively)
 * @param svgMarkup  the fetched SVG source (the fit box is derived from it)
 * @param enabled    gate — only configure once the SVG is actually in the DOM
 */
export function useAtlasStage(
  svgHostRef: React.RefObject<HTMLDivElement | null>,
  svgMarkup: string | null,
  enabled: boolean
): UseAtlasStageResult {
  // Bounds are a PURE function of the markup SOURCE STRING (deriveBounds parses the
  // bytes — no DOM needed), so we derive them synchronously via useMemo. The fit box
  // (viewBox + planeClip target) is read from the artifact — a doctored hull shifts it
  // with zero code change (acceptance #60/#62). The ≈8.276 S_max ceiling is gone.
  const bounds = useMemo<AtlasBounds | null>(() => {
    if (!enabled || !svgMarkup) return null;
    try {
      return deriveBounds(svgMarkup);
    } catch {
      // Unexpected artifact — leave the SVG at its emitted viewBox (still renders).
      return null;
    }
  }, [enabled, svgMarkup]);

  // Resolve the current live <svg> from the (stable) host div on demand. React
  // re-inlines the SVG on skin flip; a cached element reference can detach.
  const liveSvg = useCallback((): SVGSVGElement | null => {
    return (svgHostRef.current?.querySelector('svg') as SVGSVGElement | null) ?? null;
  }, [svgHostRef]);

  // ---- Configure the STATIC fit view ONCE per markup mount (§9.4 D4-a) ----
  // At inline (initial mount AND skin flip), write the derived fit box to the live
  // SVG's `viewBox` AND the planeClip <rect>. This is the ONE lawful mount-time write
  // (§9.4 D4-c supersedes D3-b's "verbatim, never mutated"); no interaction mutates it
  // after. CSS (on the host) makes the SVG fill the fluid width at height:auto — the
  // whole horizon shows at page flow, height following the fit-box aspect. No scroll.
  useEffect(() => {
    if (!enabled || !svgMarkup || !bounds) return;
    // The host div's innerHTML is set imperatively by the page effect (keyed on the
    // same markup), which runs BEFORE this hook effect in commit order — so the SVG
    // is in the DOM here. Bounds are already derived (useMemo above).
    const svg = liveSvg();
    if (!svg) return;

    // (1) viewBox → the fit box: a viewBox WIDER than native (0 0 1600 1200) is a view
    //     "zoomed out" from native, so the whole hull incl. beyond-canvas extent frames.
    svg.setAttribute('viewBox', viewBoxToAttr(bounds.fitBox));

    // (2) planeClip <rect> → the fit box: the emitted clip trims plane content to the
    //     canvas rect; widening it to the fit box lets the hull's beyond-canvas dashes
    //     (and the 27/1,130 emitted-and-masked marks, §8.2) render. Same mechanism as
    //     the old lens's clip-tracks-view — applied ONCE, static thereafter.
    const rect = svg.querySelector('#planeClip rect') as SVGRectElement | null;
    if (rect) {
      const r = viewBoxToRectAttrs(bounds.fitBox);
      rect.setAttribute('x', r.x);
      rect.setAttribute('y', r.y);
      rect.setAttribute('width', r.width);
      rect.setAttribute('height', r.height);
    }
    // Re-run when the markup changes (skin flip) or bounds resolve. No resize handler:
    // the viewBox is static; CSS scales the SVG to the container at a fixed aspect.
  }, [enabled, svgMarkup, bounds, liveSvg]);

  return { bounds };
}
