// DesignModeToggle — Amendment 1 (engine generation run, 2026-05-25)
// Global toggle switching Loadout between Player-mode (default) and Design-mode.
// Player-mode: current M1-M6 surface (weapon slots, T4 panel, Spirit Guide narration).
// Design-mode: adds DesignModePanel with engine-layer fields (named_bearer, bc_target_cell, etc.)
//
// Persistence: localStorage key "drax_design_mode" (bool string).
// Default: Player-mode (designMode = false) regardless of previous session state.
// Note: localStorage persists the choice ACROSS sessions. Default=Player-mode is enforced
// by the INITIAL state value (false) so first-ever sessions start in Player-mode.

export const DESIGN_MODE_STORAGE_KEY = 'drax_design_mode';

interface DesignModeToggleProps {
  designMode: boolean;
  onToggle: (next: boolean) => void;
  className?: string;
}

export function DesignModeToggle({ designMode, onToggle, className = '' }: DesignModeToggleProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-[10px] font-mono text-gray-600">View:</span>
      <button
        type="button"
        role="switch"
        aria-checked={!designMode}
        onClick={() => onToggle(!designMode)}
        className="flex items-center rounded border border-gray-700 bg-gray-900 overflow-hidden text-[10px] font-mono"
        title={`Switch to ${designMode ? 'Player' : 'Design'} mode`}
      >
        <span
          className={`px-2 py-1 transition-colors ${
            !designMode
              ? 'bg-violet-900 text-violet-200 border-r border-violet-700'
              : 'text-gray-600 border-r border-gray-800 hover:text-gray-400'
          }`}
        >
          Player
        </span>
        <span
          className={`px-2 py-1 transition-colors ${
            designMode
              ? 'bg-cyan-950 text-cyan-300'
              : 'text-gray-600 hover:text-gray-400'
          }`}
        >
          Design
        </span>
      </button>
      {designMode && (
        <span className="text-[9px] font-mono text-cyan-800 italic">
          engine-layer fields visible
        </span>
      )}
    </div>
  );
}
