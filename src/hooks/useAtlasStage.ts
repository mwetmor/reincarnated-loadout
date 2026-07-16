// useAtlasStage — the STATIC full-horizon map configuration for Build Horizon (§9.4 D4
// + §9.5 D5 + §9.6 D6). At markup inline (initial mount AND each skin flip) this hook
// applies ONE mount-time configuration WRITE-SET (spec §9.6, extending §9.5 D5-c) to the
// live SVG, all derived from the same FIT BOX (union(canvas ∪ hull) + FIT_MARGIN, aspect-
// pinned, centered — the old S_min view), then leaves the chart static (no interaction-
// driven mutation):
//
//   (1) the `viewBox` attribute        → the fit box              (§9.4 D4-a)
//   (2) the `planeClip` <rect> x/y/w/h → the fit box              (§9.4 D4-a)
//   (3) the canvas PLATE rect x/y/w/h  → the fit box              (§9.5 D5-a)
//   (4) REMOVE the svg's width/height presentation attrs          (§9.5 D5-b)
//   (5) the decorative FRAME rect x/y/w/h → the fit box INSET 12u (§9.6 D6-a)
//
// (1) frames the whole hull; (2) reveals plane-layer content beyond the emitted clip so
// the hull's beyond-canvas dashes render (the line closes on screen); (3) grows the dark
// backdrop to the fit box so every mark/rail/footer sits ON the plate and no page-
// background band shows inside the frame; (4) lets CSS (`w-full h-auto` block flow) + the
// viewBox's 4:3 aspect govern rendered size, so the SVG is responsive at every viewport
// (no fixed 1600×1200 CSS-px → no h-overflow); (5) grows the DRAWN plot boundary (what
// Matt reads as "the box") to just inside the fit box so ALL content sits inside it —
// "the box fits the zoom."
//
// The PLATE (§9.5) and the FRAME (§9.6) are identified STRUCTURALLY and FAIL-LOUD from the
// svg's DIRECT-CHILD rects — COMPLEMENTARY laws over the SAME candidate descriptors:
//   - PLATE = the rect whose width/height equal the native canvas dims (bounds.native) AND
//     which carries a fill (identifyPlateRect).
//   - FRAME = the rect with fill="none" AND a stroke present (identifyFrameRect).
// Each requires EXACTLY ONE match; 0 or >1 → throw (no fill/stroke-literal matching, no
// positional index, no coordinate literals — the 12u inset is the only legislated number).
// The pure predicates live in ../utils/atlasLens (node-testable); this hook only builds the
// candidate descriptors from the live svg's direct-child rects and writes to each match.
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
  FRAME_INSET,
  deriveBounds,
  identifyFrameRect,
  identifyPlateRect,
  insetViewBox,
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
  // bytes — no DOM needed), so we derive them synchronously via useMemo. The fit box (the
  // target for the viewBox · planeClip · PLATE · FRAME write-set — the frame at fit-box
  // INSET 12u) is read from the artifact — a doctored hull shifts them all with zero code
  // change (acceptance #60/#62/#63/#65/#66). The ≈8.276 S_max ceiling is gone.
  // `bounds.native` is the plate's structural-match key.
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

  // ---- Configure the STATIC fit view ONCE per markup mount (§9.6 D6 write-set) ----
  // At inline (initial mount AND skin flip), apply the mount-time WRITE-SET — viewBox ·
  // planeClip · PLATE · svg-sizing · FRAME (§9.6 D6-a extends §9.5 D5-c's write-set; the
  // frame is written to the fit box INSET 12u, the rest to the fit box). This is the ONE
  // lawful mount-time write-set (§9.5/§9.6 amend §9.4 D4-c's single write, which itself
  // superseded D3-b's "verbatim, never mutated"); no interaction mutates it after.
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

    // Enumerate the svg's DIRECT-CHILD rects ONCE (shared by the plate + frame identity
    // laws, §9.5 + §9.6). Each descriptor carries the structural signals both predicates
    // read: native-dim + fill (plate), fill="none" + stroke (frame). Building from the
    // live DOM keeps identity structural (no fill/stroke-literal matching, no index).
    const directRects = Array.from(svg.children).filter(
      (el): el is SVGRectElement => el.tagName.toLowerCase() === 'rect'
    );
    const candidates: PlateRectCandidate[] = directRects.map((el) => {
      const fill = (el.getAttribute('fill') ?? '').trim();
      const stroke = (el.getAttribute('stroke') ?? '').trim();
      return {
        ref: el,
        width: Number(el.getAttribute('width')),
        height: Number(el.getAttribute('height')),
        hasFill: fill !== '',
        fillIsNone: fill.toLowerCase() === 'none',
        hasStroke: stroke !== '',
      };
    });

    // (3) canvas PLATE rect → the fit box (§9.5 D5-a). D4 grew viewBox + planeClip but
    //     left the dark backdrop at canvas geometry, so marks/rails/footer rendered off
    //     the plate and page-background bands sat inside the frame. Grow the plate to the
    //     fit box so every mark/rail/footer sits ON the plate. Identify the plate
    //     STRUCTURALLY and FAIL-LOUD (spec §9.5 D5-a): the direct-child rect at native
    //     dims + a fill; the pure identifyPlateRect picks the single match (0 or >1 →
    //     throws). A doctored hull → wider fit box → the plate follows, zero code change.
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

    // (5) decorative FRAME rect → the fit box INSET by FRAME_INSET (12u) on all sides
    //     (§9.6 D6-a). Under the D4 full-horizon mount, the emitted frame (still at canvas
    //     geometry `96,132 1408×972`) sits INSIDE the content — hull/ghost marks render
    //     outside it, so the drawn box (what Matt reads as "the box") no longer contains
    //     the chart. Grow it to just inside the fit box: its stroke stays fully on-plate
    //     and reads as a boundary, not an edge-clip. Identify the frame STRUCTURALLY and
    //     FAIL-LOUD (spec §9.6 D6-a) — the COMPLEMENT of the plate law: fill="none" AND a
    //     stroke present; identifyFrameRect picks the single match (0 or >1 → throws; no
    //     stroke-literal matching, no index). A doctored hull → wider fit box → the frame
    //     follows here (via insetViewBox) with zero code change (acceptance #66).
    const frameRect = viewBoxToRectAttrs(insetViewBox(bounds.fitBox, FRAME_INSET));
    const frame = identifyFrameRect(candidates).ref as SVGRectElement;
    frame.setAttribute('x', frameRect.x);
    frame.setAttribute('y', frameRect.y);
    frame.setAttribute('width', frameRect.width);
    frame.setAttribute('height', frameRect.height);
    // Re-run when the markup changes (skin flip) or bounds resolve. No resize handler:
    // the viewBox is static; CSS scales the SVG to the container at a fixed 4:3 aspect.
  }, [enabled, svgMarkup, bounds, liveSvg]);

  return { bounds };
}
