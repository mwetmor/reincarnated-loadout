// AtlasLegend — basic top-left legend scaffold (spec §4).
//
// Four entries in Matt's vocabulary: Condensations, Live Kits, Graveyard, Ghosts.
// Multi-select. This pass ships VISUAL SCAFFOLD + STATE ONLY.
//
// TODO(drax): r7 highlight wiring. The slim class-highlight CSS (stroke halo
//   <= 0.75px, NO fill change, NO dimming of non-selected marks) targets the r7
//   layer groups (<g id="layer-live"> etc.) / data-el attributes, which do NOT
//   exist yet (r6 SVG is flat: zero class=, zero <g id=>). When galadriel's r7
//   hooked SVG lands, this component's `selected` set drives a page-injected
//   <style> targeting those groups. Until then, selection only updates state +
//   the swatch active ring — no marks are touched. (spec §3, §4; acceptance #32)

import type { LegendClass } from '../../data/atlasTypes';
import { LEGEND_ENTRIES } from '../../data/atlasTypes';

interface AtlasLegendProps {
  /** Currently multi-selected classes. */
  selected: Set<LegendClass>;
  onToggle: (id: LegendClass) => void;
  /** Canvas the chart is on — drives swatch contrast (dark vs light). */
  canvas: 'light' | 'dark';
}

export function AtlasLegend({ selected, onToggle, canvas }: AtlasLegendProps) {
  const dark = canvas === 'dark';
  return (
    <div
      className={[
        'inline-flex flex-col gap-1 rounded-lg border p-2 backdrop-blur-sm',
        dark ? 'border-white/10 bg-black/40' : 'border-black/10 bg-white/70',
      ].join(' ')}
    >
      <div
        className={[
          'mb-0.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider',
          dark ? 'text-gray-400' : 'text-gray-500',
        ].join(' ')}
      >
        <span>Legend</span>
        {selected.size > 0 && (
          <span className={dark ? 'text-indigo-300' : 'text-indigo-600'}>
            {selected.size} on
          </span>
        )}
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
      {/* TODO(drax): r7 highlight wiring seam — see file header. */}
      <p
        className={[
          'mt-0.5 max-w-[180px] text-[9px] leading-tight',
          dark ? 'text-gray-600' : 'text-gray-400',
        ].join(' ')}
      >
        Highlight wiring lands with r7 hooks.
      </p>
    </div>
  );
}
