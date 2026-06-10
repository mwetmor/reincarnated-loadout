/**
 * TierTwoPanel.tsx — Phase 4 Tier 2 per-primitive selection UI shell.
 *
 * Drax Phase 4, 2026-06-09. Per dispatch:
 *   2026-06-09-drax-forge-phase-4-AMENDMENT-rune-per-group-two-tier.md
 *
 * Architecture:
 *   After Tier 1 rune selection commits to a primitive group, Tier 2 lets the player
 *   pick per-primitive values within the selected group via simple symbol icons.
 *
 *   Matt 2026-06-09 examples:
 *     - Water drop icon → water (Elements)
 *     - Lightning bolt icon → lightning (Elements)
 *     - Wind speed slider → movement speed
 *     - Jumping man icon → leap-strike (Movement)
 *     - Portal-teleporting man icon → teleport/blink (Movement)
 *
 *   Phase 4 scope: UI SHELL with PLACEHOLDER icons.
 *   Canonical per-primitive icon design DEFERRED to Pattern B (Matt 2026-06-09 verbatim:
 *   "we will have to have a design session around these at some later date").
 *
 * Discipline #40: All placeholder icons flagged with PLACEHOLDER comment.
 * D7: No LLM content. Icons are hand-curated placeholder symbols.
 * D8: Mobile-friendly. Panel responsive for iPad and mobile viewports.
 *
 * Surfaces:
 *   - Toggle-button grid for icon_button primitives
 *   - Slider for slider primitives
 *   - Selection state: which primitive value is currently selected per group
 *   - Commit / Reset affordances
 *
 * SCAFFOLD note: all icons in this panel are PLACEHOLDERS.
 * // TODO(drax): replace placeholder icons with canonical icon design post-Pattern-B
 */

import { useState, useCallback } from 'react';
import type { RunePrimitiveGroup } from '../../data/runeAnchorTypes';

interface TierTwoPanelProps {
  group: RunePrimitiveGroup;
  onClose: () => void;
}

type SelectionState = Record<string, string | number | null>;

export function TierTwoPanel({ group, onClose }: TierTwoPanelProps) {
  // Per-primitive selection state within the group
  const [selection, setSelection] = useState<SelectionState>(() => {
    const init: SelectionState = {};
    for (const prim of group.primitives) {
      if (prim.control_type === 'slider' && prim.slider_range) {
        // Default slider to middle value
        const { min, max } = prim.slider_range;
        init[prim.id] = Math.round((min + max) / 2);
      } else {
        init[prim.id] = null;  // unselected
      }
    }
    return init;
  });

  const [committed, setCommitted] = useState(false);

  const handleIconSelect = useCallback((primId: string, _currentVal: string | number | null) => {
    setSelection(prev => ({
      ...prev,
      // Toggle: clicking selected icon deselects it
      [primId]: prev[primId] === primId ? null : primId,
    }));
    setCommitted(false);
  }, []);

  const handleSliderChange = useCallback((primId: string, val: number) => {
    setSelection(prev => ({ ...prev, [primId]: val }));
    setCommitted(false);
  }, []);

  const handleCommit = useCallback(() => {
    setCommitted(true);
    // In Phase 4 scope: commit just marks selection as confirmed.
    // In production: would send primitive selection to kit-builder engine.
    console.info('[TierTwo] Commit:', group.id, selection);
  }, [group.id, selection]);

  const handleReset = useCallback(() => {
    const reset: SelectionState = {};
    for (const prim of group.primitives) {
      if (prim.control_type === 'slider' && prim.slider_range) {
        const { min, max } = prim.slider_range;
        reset[prim.id] = Math.round((min + max) / 2);
      } else {
        reset[prim.id] = null;
      }
    }
    setSelection(reset);
    setCommitted(false);
  }, [group.primitives]);

  const iconPrimitives = group.primitives.filter(p => p.control_type === 'icon_button');
  const sliderPrimitives = group.primitives.filter(p => p.control_type === 'slider');
  const selectedCount = iconPrimitives.filter(p => selection[p.id] !== null).length;

  return (
    <div
      className="absolute right-3 top-3 z-20 w-[220px] sm:w-[260px] max-h-[calc(100%-24px)] overflow-y-auto
                 rounded border border-gray-700/70 bg-gray-950/96 backdrop-blur-sm
                 shadow-xl shadow-black/60 flex flex-col"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-3 pt-3 pb-2 border-b border-gray-800/60">
        <div>
          {/* SCAFFOLD: placeholder icon in header */}
          {/* TODO(drax): replace with canonical icon post-Pattern-B */}
          <div className="text-2xl leading-none mb-1 select-none" aria-hidden="true">
            {group.rune.glyph}
          </div>
          <div className="text-[11px] font-semibold text-white/90 leading-tight tracking-wide">
            {group.label}
          </div>
          <div className="text-[9px] text-gray-500 font-mono mt-0.5 leading-tight">
            {group.rune.native_name} · {group.rune.system.replace('_', ' ')}
          </div>
        </div>
        <button
          onClick={onClose}
          title="Close (deselect group)"
          className="text-gray-600 hover:text-gray-400 text-[10px] font-mono mt-0.5 px-1"
        >
          ✕
        </button>
      </div>

      {/* Description */}
      <p className="text-[9px] text-gray-500 font-mono leading-relaxed px-3 pt-2 pb-1">
        {group.description}
      </p>

      {/* PLACEHOLDER badge */}
      {/* Criterion 12: placeholder icons flagged per Discipline #40 */}
      <div className="mx-3 mb-2 px-2 py-1 bg-amber-900/25 border border-amber-800/40 rounded text-[8px] text-amber-500/80 font-mono leading-relaxed">
        {/* PLACEHOLDER: icons below are scaffolding pending canonical design Pattern B */}
        {/* TODO(drax): remove PLACEHOLDER badge when canonical icons land post-Pattern-B */}
        PLACEHOLDER icons — canonical design deferred Pattern B
      </div>

      {/* Slider primitives */}
      {sliderPrimitives.length > 0 && (
        <div className="px-3 pb-2">
          {sliderPrimitives.map(prim => {
            const val = typeof selection[prim.id] === 'number'
              ? (selection[prim.id] as number)
              : (prim.slider_range ? Math.round((prim.slider_range.min + prim.slider_range.max) / 2) : 5);
            const range = prim.slider_range!;
            return (
              <div key={prim.id} className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-gray-400 font-mono">
                    {/* PLACEHOLDER icon */}
                    {/* TODO(drax): replace placeholder icon post-Pattern-B */}
                    {prim.placeholder_icon} {prim.label}
                  </span>
                  <span className="text-[10px] text-white/70 font-mono tabular-nums">
                    {val}{range.unit || ''}
                  </span>
                </div>
                <input
                  type="range"
                  min={range.min}
                  max={range.max}
                  step={range.step}
                  value={val}
                  onChange={e => handleSliderChange(prim.id, Number(e.target.value))}
                  className="w-full h-1 appearance-none bg-gray-700 rounded cursor-pointer
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                             [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                             [&::-webkit-slider-thumb]:bg-white/80 accent-white"
                />
                <div className="flex justify-between text-[8px] text-gray-700 font-mono mt-0.5">
                  <span>slow</span>
                  <span>fast</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Icon-button primitives */}
      {iconPrimitives.length > 0 && (
        <div className="px-3 pb-2">
          {sliderPrimitives.length > 0 && (
            <div className="text-[9px] text-gray-600 font-mono mb-1.5">Select type:</div>
          )}
          <div className="grid grid-cols-4 gap-1.5">
            {iconPrimitives.map(prim => {
              const isSelected = selection[prim.id] === prim.id;
              return (
                <button
                  key={prim.id}
                  onClick={() => handleIconSelect(prim.id, selection[prim.id])}
                  title={prim.label}
                  className={
                    'flex flex-col items-center gap-0.5 rounded px-1 py-1.5 transition-colors ' +
                    (isSelected
                      ? 'bg-white/20 border border-white/40 text-white'
                      : 'bg-gray-800/60 border border-gray-700/40 text-gray-500 hover:text-gray-300 hover:border-gray-600/60')
                  }
                >
                  {/* PLACEHOLDER icon — pending canonical design Pattern B */}
                  {/* TODO(drax): replace placeholder icon with canonical icon post-Pattern-B */}
                  <span className="text-base leading-none select-none" aria-hidden="true">
                    {prim.placeholder_icon}
                  </span>
                  <span className="text-[7px] font-mono leading-none text-center">
                    {prim.label}
                  </span>
                </button>
              );
            })}
          </div>
          {selectedCount > 0 && (
            <div className="text-[8px] text-white/50 font-mono mt-1.5">
              {selectedCount} selected
            </div>
          )}
        </div>
      )}

      {/* Commit / Reset affordances */}
      <div className="flex items-center gap-2 px-3 pb-3 pt-1">
        <button
          onClick={handleCommit}
          disabled={committed}
          className={
            'flex-1 rounded px-2 py-1 text-[10px] font-mono transition-colors ' +
            (committed
              ? 'bg-green-900/40 text-green-400/70 border border-green-800/40 cursor-default'
              : 'bg-white/10 text-white/80 border border-white/20 hover:bg-white/20')
          }
        >
          {committed ? 'committed' : 'Commit'}
        </button>
        <button
          onClick={handleReset}
          className="px-2 py-1 text-[10px] font-mono text-gray-600 hover:text-gray-400 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Semantic rationale footer (Discipline #25 rep-audit surface) */}
      <details className="px-3 pb-3">
        <summary className="text-[8px] text-gray-700 font-mono cursor-pointer hover:text-gray-500 select-none">
          rune semantic rationale
        </summary>
        <p className="text-[8px] text-gray-600 font-mono leading-relaxed mt-1">
          {group.rune.semantic_meaning}
        </p>
        <p className="text-[8px] text-gray-700 font-mono leading-relaxed mt-0.5">
          {group.rune.selection_rationale}
        </p>
      </details>
    </div>
  );
}
