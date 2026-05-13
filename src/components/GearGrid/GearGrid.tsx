import type { SynthesizedSlot } from '../../data/types';
import { Card } from '../ui/Card';
import { FlavorTip } from '../ui/FlavorTip';

const EMPTY_SLOTS = [
  { label: 'Head',   tip: 'Helmets, hoods, crowns — protect the mind and channel focus.' },
  { label: 'Chest',  tip: 'Robes, plate, coats — your primary defense layer.' },
  { label: 'Hands',  tip: 'Gloves, bracers — affect casting speed and grip.' },
  { label: 'Legs',   tip: 'Leggings, greaves — movement and dodge modifiers.' },
  { label: 'Feet',   tip: 'Boots, sandals — affects mobility skill distances.' },
  { label: 'Main',   tip: 'Primary weapon — determines base attack pattern.' },
  { label: 'Off',    tip: 'Off-hand: shield, focus, second blade, or tome.' },
  { label: 'Neck',   tip: 'Amulets and talismans — passive elemental resonance.' },
  { label: 'Ring 1', tip: 'Enhances a single skill tier when equipped.' },
  { label: 'Ring 2', tip: 'Synergy ring — bonus when paired with Ring 1 of same element.' },
];

interface GearGridProps {
  mode?: 'empty' | 'sample';
  synthesized?: SynthesizedSlot[];
}

export function GearGrid({ mode = 'empty', synthesized = [] }: GearGridProps) {
  const synthMap = Object.fromEntries(synthesized.map((s) => [s.displaySlot, s]));

  return (
    <Card>
      <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wide mb-3">
        Gear Slots
        {mode === 'sample' && (
          <span className="ml-2 text-violet-400 normal-case">— synthesized</span>
        )}
      </h3>
      <div className="grid grid-cols-5 gap-2">
        {EMPTY_SLOTS.map(({ label, tip }) => {
          const filled = mode === 'sample' ? synthMap[label] : undefined;
          return (
            <div
              key={label}
              className={`flex flex-col items-center gap-1 p-2 rounded-md border group ${
                filled
                  ? 'border-gray-600 bg-gray-800/60'
                  : 'border-dashed border-gray-700 bg-gray-800/40'
              }`}
            >
              <div className="relative w-8 h-8 rounded border bg-gray-900 flex items-center justify-center text-lg group-hover:border-gray-600 border-gray-700">
                {filled ? (
                  <span className="text-gray-300 text-xs font-mono text-center leading-tight px-0.5">
                    {filled.displayName.slice(0, 4)}
                  </span>
                ) : (
                  <span className="text-gray-700">◻</span>
                )}
                <span
                  className="absolute -top-1 -right-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FlavorTip
                    mode="modal"
                    title={filled ? `${label}: ${filled.displayName}` : `${label} slot`}
                  >
                    {filled
                      ? `${filled.displayName} — synthesized from class affinity (range, archetype) for visualization. Concrete loot rolls in-game will have effect procs from the season's effect pool. ${tip}`
                      : `${tip} Gear wiring ships in v1.`}
                  </FlavorTip>
                </span>
              </div>
              <span
                className={`text-[10px] font-mono text-center leading-tight ${
                  filled ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                {filled ? filled.displayName.slice(0, 6) : label}
              </span>
              {!filled && (
                <span className="text-[9px] text-gray-700 font-mono">{label}</span>
              )}
            </div>
          );
        })}
      </div>
      {mode === 'empty' && (
        <p className="text-xs text-gray-700 font-mono text-center mt-3">
          Gear wiring — v1
        </p>
      )}
      {mode === 'sample' && (
        <p className="text-xs text-gray-700 font-mono text-center mt-3">
          Hands / Legs / Feet — not in season gear pool
        </p>
      )}
    </Card>
  );
}
