// useAtlasStage — the STATIC full-horizon map configuration for Build Horizon (§9.4 D4
// + §9.5 D5). At markup inline (initial mount AND each skin flip) this hook applies ONE
// mount-time configuration WRITE-SET (spec §9.5 D5-c) to the live SVG, all to the same
// DERIVED FIT BOX (union(canvas ∪ hull) + FIT_MARGIN, aspect-pinned, centered — the old
// S_min view), then leaves the chart static (no interaction-driven mutation):
//
//   (1) the `viewBox` attribute        → the fit box              (§9.4 D4-a)
//   (2) the `planeClip` <rect> x/y/w/h → the fit box              (§9.4 D4-a)
//   (3) the canvas PLATE rect x/y/w/h  → the fit box              (§9.5 D5-a)
//   (4) REMOVE the svg's width/height presentation attrs          (§9.5 D5-b)
//
// (1) frames the whole hull; (2) reveals plane-layer content beyond the emitted clip so
// the hull's beyond-canvas dashes render (the line closes on screen); (3) grows the dark
// backdrop to the fit box so every mark/rail/footer sits ON the plate and no page-
// background band shows inside the frame — "the screen box fits the current zoom"; (4)
// lets CSS (`w-full h-auto` block flow) + the viewBox's 4:3 aspect govern rendered size,
// so the SVG is responsive at every viewport (no fixed 1600×1200 CSS-px → no h-overflow).
//
// The PLATE is identified STRUCTURALLY and FAIL-LOUD (spec §9.5 D5-a): the direct-child
// <rect> of the svg whose width/height equal the parsed native canvas dims (bounds.native)
// AND which carries a fill. Zero or >1 candidates → throw (no fill-literal matching, no
// positional index, no coordinate literals). The identity predicate is the pure
// identifyPlateRect in ../utils/atlasLens (node-testable); this hook only builds the
// candidate descriptors from the live svg's direct-child rects and writes to the match.
//
// (SUPERSESSION, §9.4: D3-b's model — mount at S_max, size the SVG to stageWidth×S_max,
// native scroll, and "the emitted viewBox + planeClip serve VERBATIM, never mutated"
// — is RETIRED. §9.4 ruled ONE mount-time configuration write; §9.5 amends that to the
// WRITE-SET above. There is NO interaction-driven mutation after mount. The old
// centerScroll / renderedSize / scrollToMark navigation math is gone with the scroll
// stage — table→chart is now a page-level scrollIntoView of the chart region.)
//
// The load-bearing arithmetic lives in the pure ../utils/atlasLens module (unit-tested,
// node env); this hook binds it to the DOM. No literals: a doctored hull in the source
// shifts the mount box (viewBox · planeClip · PLATE) with zero code change (deriveBounds
// reads the artifact bytes; the plate follows via identifyPlateRect + viewBoxToRectAttrs).
//
// Spec: agentic_orchestration/gandalf/notes/2026-07-15-atlas-interactive-glance-spec.md §9.4 + §9.5

import { useCallback, useEffect, useMemo } from 'react';
import {
  deriveBounds,
  identifyPlateRect,
  viewBoxToAttr,
  viewBoxToRectAttrs,
  type AtlasBounds,
  type PlateRectCandidate,
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
  // (the target for the viewBox · planeClip · PLATE write-set) is read from the artifact
  // — a doctored hull shifts it with zero code change (acceptance #60/#62/#63/#65). The
  // ≈8.276 S_max ceiling is gone. `bounds.native` is the plate's structural-match key.
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

  // ---- Configure the STATIC fit view ONCE per markup mount (§9.5 D5 write-set) ----
  // At inline (initial mount AND skin flip), apply the mount-time WRITE-SET (§9.5 D5-c)
  // — viewBox · planeClip · PLATE · svg-sizing — all to the derived fit box. This is the
  // ONE lawful mount-time write-set (§9.5 D5-c amends §9.4 D4-c's single write, which
  // itself superseded D3-b's "verbatim, never mutated"); no interaction mutates it after.
  // With the svg's width/height removed, CSS (on the region) makes the SVG fill the fluid
  // width at height:auto — the whole horizon shows at page flow, height following the
  // fit-box 4:3 aspect, responsive at every viewport. No scroll, no fixed px.
  useEffect(() => {
    if (!enabled || !svgMarkup || !bounds) return;
    // The host div's innerHTML is set imperatively by the page effect (keyed on the
    // same markup), which runs BEFORE this hook effect in commit order — so the SVG
    // is in the DOM here. Bounds are already derived (useMemo above).
    const svg = liveSvg();
    if (!svg) return;

    const fitRect = viewBoxToRectAttrs(bounds.fitBox);

    // (1) viewBox → the fit box: a viewBox WIDER than native (0 0 1600 1200) is a view
    //     "zoomed out" from native, so the whole hull incl. beyond-canvas extent frames.
    svg.setAttribute('viewBox', viewBoxToAttr(bounds.fitBox));

    // (2) planeClip <rect> → the fit box: the emitted clip trims plane content to the
    //     canvas rect; widening it to the fit box lets the hull's beyond-canvas dashes
    //     (and the 27/1,130 emitted-and-masked marks, §8.2) render. Same mechanism as
    //     the old lens's clip-tracks-view — applied ONCE, static thereafter.
    const clipRect = svg.querySelector('#planeClip rect') as SVGRectElement | null;
    if (clipRect) {
      clipRect.setAttribute('x', fitRect.x);
      clipRect.setAttribute('y', fitRect.y);
      clipRect.setAttribute('width', fitRect.width);
      clipRect.setAttribute('height', fitRect.height);
    }

    // (3) canvas PLATE rect → the fit box (§9.5 D5-a). D4 grew viewBox + planeClip but
    //     left the dark backdrop at canvas geometry, so marks/rails/footer rendered off
    //     the plate and page-background bands sat inside the frame. Grow the plate to the
    //     fit box: plate edge == clip edge == frame edge — "the screen box fits the zoom."
    //     Identify the plate STRUCTURALLY and FAIL-LOUD (spec §9.5 D5-a): enumerate the
    //     svg's DIRECT-CHILD rects, describe each (native-dim + fill), and let the pure
    //     identifyPlateRect pick the single match (0 or >1 → it throws; no fill-literal
    //     matching, no positional index). A doctored hull → wider fit box → the plate
    //     follows here with zero code change (acceptance #63/#65).
    const directRects = Array.from(svg.children).filter(
      (el): el is SVGRectElement => el.tagName.toLowerCase() === 'rect'
    );
    const candidates: PlateRectCandidate[] = directRects.map((el) => ({
      ref: el,
      width: Number(el.getAttribute('width')),
      height: Number(el.getAttribute('height')),
      hasFill: (el.getAttribute('fill') ?? '').trim() !== '',
    }));
    // FAIL-LOUD: identifyPlateRect throws on 0 or >1 native-dim filled candidates. A
    // missing/renamed plate is a shape change we refuse to guess through (spec §9.5 D5-a).
    const plate = identifyPlateRect(candidates, bounds.native).ref as SVGRectElement;
    plate.setAttribute('x', fitRect.x);
    plate.setAttribute('y', fitRect.y);
    plate.setAttribute('width', fitRect.width);
    plate.setAttribute('height', fitRect.height);

    // (4) REMOVE the svg's width/height presentation attrs (§9.5 D5-b). The emitted
    //     svg renders at a FIXED 1600×1200 CSS px regardless of container (→ horizontal
    //     page overflow at narrow viewports). Dropping them hands rendered size to CSS
    //     (`w-full h-auto` block flow) + the viewBox's 4:3 aspect — responsive, zero
    //     h-overflow at any width. The FROZEN source SVG is byte-untouched (DOM-side only).
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    // Re-run when the markup changes (skin flip) or bounds resolve. No resize handler:
    // the viewBox is static; CSS scales the SVG to the container at a fixed 4:3 aspect.
  }, [enabled, svgMarkup, bounds, liveSvg]);

  return { bounds };
}
