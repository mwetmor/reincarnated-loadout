// AtlasSkinToggle — skin selector that binds by CANVAS, never by skin name.
//
// NAMING TRUTH (caught + ratified 2026-07-15): the skin names are inverted vs
// intuition. 'archive' = DARK #0e1016 (the BLACK COPY that LEADS); 'instrument'
// = LIGHT #f7f8fa. The toggle presents CANVAS labels (Dark / Light) and resolves
// the underlying skin through the provenance skin_canvas_map — so the wiring can
// never invert. (spec §4 skin-naming correction, §6.)

import type { SkinName, CanvasKind, RenderProvenance } from '../../data/atlasTypes';

interface AtlasSkinToggleProps {
  provenance: RenderProvenance;
  activeSkin: SkinName;
  onSelectSkin: (skin: SkinName) => void;
}

// Present canvases in a stable order: dark first (the lead), then light.
const CANVAS_ORDER: CanvasKind[] = ['dark', 'light'];
const CANVAS_LABEL: Record<CanvasKind, string> = { dark: 'Dark', light: 'Light' };

export function AtlasSkinToggle({ provenance, activeSkin, onSelectSkin }: AtlasSkinToggleProps) {
  const map = provenance.skin_canvas_map;
  // Invert the map: canvas -> skin name (the binding that resists name-confusion).
  const skinForCanvas = (canvas: CanvasKind): SkinName | null => {
    const entry = (Object.entries(map) as [SkinName, { canvas: CanvasKind; hex: string }][]).find(
      ([, v]) => v.canvas === canvas
    );
    return entry ? entry[0] : null;
  };
  const activeCanvas = map[activeSkin]?.canvas;

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-gray-800 bg-gray-900/60 p-1 font-mono text-[11px]">
      <span className="px-1 text-[10px] uppercase tracking-wider text-gray-500">Canvas</span>
      {CANVAS_ORDER.map((canvas) => {
        const skin = skinForCanvas(canvas);
        if (!skin) return null;
        const on = activeCanvas === canvas;
        const hex = map[skin].hex;
        return (
          <button
            key={canvas}
            onClick={() => onSelectSkin(skin)}
            aria-pressed={on}
            title={`${CANVAS_LABEL[canvas]} canvas (${hex}) — skin "${skin}"`}
            className={[
              'flex items-center gap-1.5 rounded px-2 py-1 transition-colors',
              on ? 'bg-indigo-700/70 text-indigo-50' : 'text-gray-400 hover:bg-gray-800',
            ].join(' ')}
          >
            <span
              className="h-3 w-3 rounded-sm border border-white/20"
              style={{ backgroundColor: hex }}
            />
            {CANVAS_LABEL[canvas]}
            {/* subtle: expose the underlying skin name so the inversion is auditable */}
            <span className="text-[9px] opacity-50">{skin}</span>
          </button>
        );
      })}
    </div>
  );
}
