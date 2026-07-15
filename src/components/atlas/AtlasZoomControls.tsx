// AtlasZoomControls — the +/−/reset chrome for the atlas v1 zoom (spec §8.1).
//
// Sits over the chart, opposite the legend (top-right). The buttons drive the
// useAtlasLens imperative API (×1.5 steps + reset to the emitted viewBox). The
// scale readout shows the current S and the derived bounds so the two-bound ruling
// is legible on screen ("max zoom out … max zoom in …", Matt 2026-07-15).
//
// Canvas-bound contrast (dark vs light) mirrors the legend — never skin-named.

interface AtlasZoomControlsProps {
  canvas: 'light' | 'dark';
  scale: number;
  sMin: number;
  sMax: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function AtlasZoomControls({
  canvas,
  scale,
  sMin,
  sMax,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onReset,
}: AtlasZoomControlsProps) {
  const dark = canvas === 'dark';
  const shell = dark
    ? 'border-white/10 bg-black/40 text-gray-200'
    : 'border-black/10 bg-white/70 text-gray-800';
  const btn = dark
    ? 'border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30'
    : 'border-black/10 bg-black/5 hover:bg-black/10 disabled:opacity-30';

  return (
    <div
      className={['inline-flex flex-col items-stretch gap-1 rounded-lg border p-1.5 backdrop-blur-sm', shell].join(
        ' '
      )}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onZoomOut}
          disabled={!canZoomOut}
          aria-label="Zoom out"
          title="Zoom out (−)"
          className={['h-7 w-7 rounded border font-mono text-sm leading-none', btn].join(' ')}
        >
          −
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          disabled={!canZoomIn}
          aria-label="Zoom in"
          title="Zoom in (+)"
          className={['h-7 w-7 rounded border font-mono text-sm leading-none', btn].join(' ')}
        >
          +
        </button>
        <button
          type="button"
          onClick={onReset}
          aria-label="Reset zoom"
          title="Reset (0)"
          className={['h-7 rounded border px-2 font-mono text-[11px] leading-none', btn].join(' ')}
        >
          Reset
        </button>
      </div>
      <div
        className={[
          'px-0.5 text-center font-mono text-[10px] tabular-nums',
          dark ? 'text-gray-400' : 'text-gray-500',
        ].join(' ')}
        title={`Bounds derived from the artifact: ${sMin.toFixed(2)}×–${sMax.toFixed(2)}×`}
      >
        {scale.toFixed(2)}× · {sMin.toFixed(2)}–{sMax.toFixed(1)}
      </div>
    </div>
  );
}
