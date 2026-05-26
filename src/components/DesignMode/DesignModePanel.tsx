// DesignModePanel — Amendment 1 (engine generation run, 2026-05-25)
// Surfaces engine-layer fields for T4 post-mortem review when Design-mode toggle is active.
// Only shown when designMode === true. Null-safe throughout — pre-v2.0 classes degrade to "—".
//
// Fields surfaced (per parked-amendments § Amendment 1 + MIGRATION.md § v1.4-layer-2):
//   - named_bearer / named_mythological_match (Sketch F anchor identity)
//   - mechanical_substrate_triple (L9 opportunity-scan; element + weapon_kind + profile)
//   - source_library (provenance discriminator — design-mode labeled form; M5 badge still shows)
//   - bc_target_cell (5-tuple identity: range/tempo/amplitude/attribute/proxy_density)
//   - converged_modifier (Layer 4 W1.13 multi-dim convergence output)
//   - t4_alteration_output raw struct (collapsed/expandable; alongside Spirit Guide narration)
//   - engine_version (v2.0 discriminator)

import { useState } from 'react';
import type { ClassData, BcTargetCell, MechanicalSubstrateTriple } from '../../data/types';

// ---- Sub-components ----

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  const display = value == null ? '—' : String(value);
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className="text-[10px] font-mono text-gray-600 flex-shrink-0 w-40 pt-0.5">{label}</span>
      <span className={`text-[11px] font-mono break-all ${value == null ? 'text-gray-700 italic' : 'text-gray-300'}`}>
        {display}
      </span>
    </div>
  );
}

function BcTargetCellDisplay({ cell }: { cell: BcTargetCell | null | undefined }) {
  if (!cell) {
    return <FieldRow label="bc_target_cell" value={null} />;
  }
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className="text-[10px] font-mono text-gray-600 flex-shrink-0 w-40 pt-0.5">bc_target_cell</span>
      <div className="flex flex-wrap gap-1">
        {[
          { k: 'range', v: cell.range },
          { k: 'tempo', v: cell.tempo },
          { k: 'amplitude', v: cell.amplitude },
          { k: 'attribute', v: cell.attribute },
          ...(cell.proxy_density ? [{ k: 'density', v: cell.proxy_density }] : []),
        ].map(({ k, v }) => (
          <span key={k}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-mono bg-gray-900 text-gray-400 border-gray-700">
            <span className="text-gray-600">{k}:</span>
            <span>{v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function MechanicalSubstrateDisplay({ triple }: { triple: MechanicalSubstrateTriple | null | undefined }) {
  if (!triple) {
    return <FieldRow label="mechanical_substrate_triple" value={null} />;
  }
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className="text-[10px] font-mono text-gray-600 flex-shrink-0 w-40 pt-0.5">mechanical_substrate_triple</span>
      <div className="flex flex-wrap gap-1">
        {[
          { k: 'element', v: triple.element },
          { k: 'weapon_kind', v: triple.weapon_kind },
          { k: 'profile', v: triple.weapon_mechanical_profile },
        ].map(({ k, v }) => (
          <span key={k}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-mono bg-gray-900 text-gray-400 border-gray-700">
            <span className="text-gray-600">{k}:</span>
            <span>{v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function T4RawExpander({ t4Output }: { t4Output: ClassData['t4_alteration_output'] }) {
  const [open, setOpen] = useState(false);
  if (!t4Output) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[10px] font-mono text-gray-600 hover:text-gray-400 transition-colors"
        aria-expanded={open}
      >
        <span className={`transition-transform duration-150 text-gray-700 ${open ? 'rotate-90' : ''}`} aria-hidden="true">
          ▶
        </span>
        <span>t4_alteration_output raw struct</span>
        <span className="text-gray-700">({open ? 'collapse' : 'expand'})</span>
      </button>
      {open && (
        <pre className="mt-1.5 text-[9px] font-mono text-gray-600 bg-gray-950 border border-gray-800 rounded p-2 overflow-x-auto leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
          {JSON.stringify(t4Output, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ---- Main DesignModePanel ----

interface DesignModePanelProps {
  classData: ClassData;
  className?: string;
}

export function DesignModePanel({ classData, className = '' }: DesignModePanelProps) {
  return (
    <div className={`rounded-lg border border-cyan-900/50 bg-gray-950/80 overflow-hidden ${className}`}>
      {/* Header strip */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-cyan-900/40 bg-gray-900/80">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border-cyan-700">
            Design
          </span>
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wide">
            Engine-layer fields
          </span>
        </div>
        <span className="text-[9px] font-mono text-gray-700 italic">
          {classData.engine_version ? `engine_version: ${classData.engine_version}` : 'engine_version: — (pre-v2.0)'}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-3 space-y-2.5">
        {/* Named-personage anchor fields (Sketch F) */}
        {(classData.named_bearer !== undefined || classData.named_mythological_match !== undefined) ? (
          <>
            <FieldRow label="named_bearer" value={classData.named_bearer} />
            <FieldRow label="named_mythological_match" value={classData.named_mythological_match} />
          </>
        ) : (
          <>
            <FieldRow label="named_bearer" value={null} />
            <FieldRow label="named_mythological_match" value={null} />
          </>
        )}

        {/* BC-target cell 5-tuple */}
        <BcTargetCellDisplay cell={classData.bc_target_cell} />

        {/* Mechanical substrate triple */}
        <MechanicalSubstrateDisplay triple={classData.mechanical_substrate_triple} />

        {/* Source library (labeled, design-mode-explicit; M5 badge still shows in header) */}
        <FieldRow label="source_library" value={classData.source_library} />

        {/* Converged modifier (Layer 4 output) */}
        <FieldRow
          label="converged_modifier"
          value={classData.converged_modifier != null ? classData.converged_modifier.toFixed(6) : null}
        />

        {/* T4 alteration output raw struct (collapsible) */}
        {classData.t4_alteration_output && (
          <div className="pt-1 border-t border-gray-800">
            <T4RawExpander t4Output={classData.t4_alteration_output} />
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="px-3 py-1.5 border-t border-gray-800 bg-gray-900/40">
        <p className="text-[9px] font-mono text-gray-700">
          Fields absent on pre-Cycle-12 classes (non-v2.0 engine). Design-mode degrades to "—" for missing fields.
          source_library above = class-level provenance (M5 badge also in header).
        </p>
      </div>
    </div>
  );
}
