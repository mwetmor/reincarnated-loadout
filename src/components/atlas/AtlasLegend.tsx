// AtlasLegend — basic legend, moved INSIDE the chart box (spec §4, §6, §9.6 D6-b).
//
// Four entries in Matt's vocabulary: Condensations, Live Kits, Graveyard, Ghosts.
// Multi-select. The selected Set drives the page-injected class-highlight CSS
// (atlasHighlight.buildHighlightCss) that targets the r7 SVG's data-el hooks:
// a stroke halo <= 0.75px, NO fill change, NO dimming of non-selected marks
// ("very slim, almost non-existent; dots never obscured"). (spec §3, §4; acc #32)
//
// D6-b (spec §9.6, Matt 2026-07-15): "the legend needs to be moved INTO the Atlas box
// (not above the Atlas itself)." The D1-a normal-flow band RETIRES (its "NEVER overlays
// the SVG" law is superseded by Matt's order). This component is an ABSOLUTELY POSITIONED
// overlay INSIDE the chart region.
//
// D6-b OCCLUSION LAW v2 (spec §9.6, gandalf verify-gate finding 2026-07-15 — SUPERSEDES
// the earlier corner-enumeration law). The v1 bottom-LEFT placement passed every enumerated
// check (title / poles / key / dots) yet OCCLUDED the leading words of the in-artifact
// footer honesty block (feasible-kit denominators at canvas x=96, lit/unmapped/sealed
// counts, emission provenance). Corner enumeration protects a LIST when the invariant is a
// CLASS. The v2 binding set: the overlay may intersect the screen-space bbox of NO
// in-artifact `<text>` node (±4px pad) and no drill-in dot — one rule over ALL text (title,
// poles, condensation key, footer honesty block, points-denominator line, GHOST FIELD +
// graveyard annotations, all current and future). Non-binding for the translucent panel:
// ghost-lattice speckle + dashed boundary curves (a blurred backdrop over a segment of a
// long dashed curve leaves it inferable; text under a panel is information DESTROYED).
//
// PLACEMENT (v2): BOTTOM-RIGHT, right-anchored inside the chart region, with the region's
// existing inset/margin convention. The one clearance risk is the points-denominator line
// (an SVG <text> node, right-anchored at canvas x=1504, its tail reaching ≈x=1210 of the
// 1440 display) — a naive bottom-right panel clips that tail. The panel's LEFT edge must
// clear it. The clearance is NOT a hardcoded magic pixel offset: the panel is right-anchored
// with a small right/bottom inset and its width is capped at ~14% of the region (< the
// points-line's clear zone at the right edge). Because the SVG scales WITH the region, that
// text position scales too, so a right-anchored ≤14%-width panel with a small inset stays
// clear under the region's proportional scaling — verified by the d6-verify probe's per-text
// -node bbox intersection assertion (fail-loud, both viewports, both skins), NOT assumed.
//
// A translucent plate-toned backdrop; `pointer-events` scoped so chart clicks pass
// everywhere OUTSIDE the legend's own bounds (the wrapper is pointer-events-none; the panel
// re-enables them).
//
// Mobile (375): same overlay, SAME bottom-right corner, COLLAPSED-by-default (the parent
// passes `defaultCollapsed`) — a compact toggle chip that expands to the full legend. The
// v2 law applies at 375 too; the collapsed chip is the smallest footprint, so the corner
// must be clear of text at the narrow viewport as well (probe asserts it).

import { useState } from 'react';
import type { LegendClass } from '../../data/atlasTypes';
import { LEGEND_ENTRIES } from '../../data/atlasTypes';

interface AtlasLegendProps {
  /** Currently multi-selected classes. */
  selected: Set<LegendClass>;
  onToggle: (id: LegendClass) => void;
  /** Canvas the chart is on — drives swatch/backdrop contrast (dark vs light). */
  canvas: 'light' | 'dark';
  /**
   * Start collapsed (mobile 375 — the expanded legend would cover >25% of the region).
   * The user can still expand it; the collapse is only the initial state per breakpoint.
   */
  defaultCollapsed?: boolean;
}

export function AtlasLegend({ selected, onToggle, canvas, defaultCollapsed = false }: AtlasLegendProps) {
  const dark = canvas === 'dark';
  // Collapsed state — initialized per breakpoint (mobile starts collapsed). Keyed on
  // defaultCollapsed so a viewport change across the breakpoint re-seeds the initial state.
  const [expanded, setExpanded] = useState(!defaultCollapsed);

  // Translucent PLATE-TONED backdrop (§9.6 D6-b): dark canvas → dark glass; light → light
  // glass. Kept fairly opaque (/80 dark, /90 light) so whatever plate texture sits behind
  // the panel (ghost-lattice speckle / a dashed-curve segment — both NON-binding under the
  // v2 law) doesn't bleed through and read muddy, while still reading as an overlay ON the
  // plate. Under v2 the panel intersects NO in-artifact <text> bbox (the binding invariant),
  // so opacity is purely a legibility choice over non-text texture, not an occlusion crutch.
  const panelTone = dark
    ? 'border-white/10 bg-black/80 text-gray-200'
    : 'border-black/10 bg-white/90 text-gray-800';

  return (
    // WRAPPER: absolutely positioned in the bottom-RIGHT of the chart REGION (the region is
    // `relative`), per the D6-b v2 law. pointer-events-none so chart clicks pass THROUGH the
    // empty wrapper area (§9.6 D6-b) — only the panel/chip below re-enables pointer events on
    // its own bounds. `justify-end` right-aligns the inner panel/chip so it grows leftward
    // from the region's right edge.
    //
    // WIDTH CAP — `sm:max-w-[14.5%]` of the REGION, NOT a fixed px, and this is load-bearing:
    // the points-denominator <text> tail reaches ≈84.1% of region width, so a right-anchored
    // panel clears it (±4px pad) iff its width ≤ ≈14.9% region. Both the panel's right inset
    // AND that tail are fixed FRACTIONS of the region, so a fractional cap clears it at EVERY
    // desktop width — a fixed 240px cap did NOT (it clipped the tail at 1280, where the fixed
    // panel is a bigger fraction of the narrower region). 14.5% fits the panel's natural
    // content at 1440 (~14.4%, no squeeze). Probe-asserted 0 text hits at 1440 + 1280.
    //
    // VERTICAL — desktop `sm:bottom-2` hugs the corner (at ≥640px the footer honesty block
    // ends far LEFT of the panel; probe confirms 0 hits at 1440). MOBILE `bottom-[23%]` is the
    // ONE lawful bottom-right seat at 375, and the % is load-bearing: buttons keep a 44px
    // touch-target floor (globals.css @media max-width:640px — a11y invariant, never shrunk),
    // but at 375 that 44px chip is TALLER than the ≈35px clear strip below the footer honesty
    // band, and just above the band the interior is dense with drill-in dot labels. The chip
    // fits ONLY in a narrow window (chip-bottom ≈396–401 display-px); 23% region-height centers
    // it there (≈6px margin each side). No shrink, no drop, no scroll. KNOWN EDGE (AGENT_STATE):
    // the window is narrow because a FIXED 44px chip must fit between two SCALING text bands —
    // below ≈360px viewport width it can close; 375 (the spec's mobile viewport) is clean. The
    // sub-360 fix, if ever needed, is a collapse-to-icon (no word), not a nudge. (Eyes-verify.)
    <div className="pointer-events-none absolute bottom-[23%] right-2 z-10 flex max-w-[45%] justify-end sm:bottom-2 sm:max-w-[14.5%]">
      {expanded ? (
        <div
          className={[
            'pointer-events-auto inline-flex flex-col gap-1 rounded-lg border p-2 shadow-lg backdrop-blur-md',
            panelTone,
          ].join(' ')}
        >
          <div
            className={[
              'mb-0.5 flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-wider',
              dark ? 'text-gray-400' : 'text-gray-500',
            ].join(' ')}
          >
            <span className="flex items-center gap-1.5">
              Legend
              {selected.size > 0 && (
                <span className={dark ? 'text-indigo-300' : 'text-indigo-600'}>
                  {selected.size} on
                </span>
              )}
            </span>
            {/* Collapse control — lets a mobile user re-hide, and a desktop user tuck it
                away if it ever crowds a mark they're inspecting. */}
            <button
              onClick={() => setExpanded(false)}
              aria-label="Collapse legend"
              className={[
                'rounded px-1 leading-none',
                dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600',
              ].join(' ')}
            >
              −
            </button>
          </div>
          {LEGEND_ENTRIES.map((e) => {
            const on = selected.has(e.id);
            return (
              <button
                key={e.id}
                onClick={() => onToggle(e.id)}
                title={e.hint}
                aria-pressed={on}
                className={[
                  'group flex items-center gap-2 rounded px-1.5 py-1 text-left text-[11px] font-mono transition-colors',
                  on
                    ? dark
                      ? 'bg-white/10 ring-1 ring-inset ring-indigo-400/60'
                      : 'bg-black/5 ring-1 ring-inset ring-indigo-500/50'
                    : dark
                      ? 'hover:bg-white/5'
                      : 'hover:bg-black/5',
                ].join(' ')}
              >
                <span
                  className={[
                    'h-2.5 w-2.5 shrink-0 rounded-full',
                    e.swatch,
                    on ? 'opacity-100' : 'opacity-50',
                  ].join(' ')}
                />
                <span className={dark ? 'text-gray-200' : 'text-gray-800'}>{e.label}</span>
              </button>
            );
          })}
          <p
            className={[
              'mt-0.5 max-w-[180px] text-[9px] leading-tight',
              dark ? 'text-gray-600' : 'text-gray-400',
            ].join(' ')}
          >
            Toggle to halo a class. Slim stroke only — dots never obscured.
          </p>
        </div>
      ) : (
        // COLLAPSED chip — a compact toggle that reveals the full legend. Same plate-toned
        // glass; the "N on" badge keeps active state visible while collapsed.
        <button
          onClick={() => setExpanded(true)}
          aria-label="Expand legend"
          aria-expanded={false}
          className={[
            'pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-mono uppercase tracking-wider shadow-lg backdrop-blur-md',
            panelTone,
          ].join(' ')}
        >
          <span
            className={[
              'h-2 w-2 rounded-full',
              dark ? 'bg-indigo-400/70' : 'bg-indigo-500/70',
            ].join(' ')}
          />
          Legend
          {selected.size > 0 && (
            <span className={dark ? 'text-indigo-300' : 'text-indigo-600'}>{selected.size} on</span>
          )}
        </button>
      )}
    </div>
  );
}
