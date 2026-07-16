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
// the SVG" law is superseded by Matt's order). This component is now an ABSOLUTELY
// POSITIONED overlay INSIDE the chart region — BOTTOM-LEFT (the title/provenance block is
// top-left, the condensation key top-right; the pole labels are mid-edges + bottom-center;
// the graveyard ledger + footer sit in the lower-left INTERIOR, so the extreme bottom-left
// CORNER margin is clear). A translucent plate-toned backdrop; `pointer-events` scoped so
// chart clicks pass everywhere OUTSIDE the legend's own bounds (the wrapper is
// pointer-events-none; the panel re-enables them). Binding occlusion law (§9.6 D6-b): zero
// occlusion of the title block, axis-pole labels, condensation key, or drill-in dots.
//
// Mobile (375): same overlay, COLLAPSED-by-default (the parent passes
// `defaultCollapsed`) — a compact toggle chip that expands to the full legend. Keeps the
// expanded width from covering >25% of the region on a narrow viewport.

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
  // glass. Kept fairly opaque (/80 dark, /90 light) so the in-artifact footer provenance
  // strings behind the bottom-left corner don't bleed through and read muddy — while still
  // translucent enough to read as an overlay ON the plate. (The BINDING occlusion set —
  // title / pole labels / condensation key / drill-in dots — is elsewhere; the footer is
  // not binding, but a clean panel reads better. Judgment call, noted for eyes-verify.)
  const panelTone = dark
    ? 'border-white/10 bg-black/80 text-gray-200'
    : 'border-black/10 bg-white/90 text-gray-800';

  return (
    // WRAPPER: absolutely positioned in the bottom-left of the chart REGION (the region is
    // `relative`). pointer-events-none so chart clicks pass THROUGH the empty wrapper area
    // (§9.6 D6-b) — only the panel/chip below re-enables pointer events on its own bounds.
    <div className="pointer-events-none absolute bottom-2 left-2 z-10 max-w-[45%] sm:max-w-[240px]">
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
