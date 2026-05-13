import { Card } from '../ui/Card';
import { FlavorTip } from '../ui/FlavorTip';

const SLOTS = [
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

export function GearGrid() {
  return (
    <Card>
      <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wide mb-3">
        Gear Slots
      </h3>
      <div className="grid grid-cols-5 gap-2">
        {SLOTS.map(({ label, tip }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 p-2 rounded-md border border-dashed border-gray-700 bg-gray-800/40 group"
          >
            <div className="relative w-8 h-8 rounded border border-gray-700 bg-gray-900 flex items-center justify-center text-gray-700 text-lg group-hover:border-gray-600">
              ◻
              <span className="absolute -top-1 -right-1" onClick={(e) => e.stopPropagation()}>
                <FlavorTip mode="modal" title={`${label} slot`}>
                  {tip} Gear wiring ships in v1.
                </FlavorTip>
              </span>
            </div>
            <span className="text-[10px] text-gray-600 font-mono text-center leading-tight">
              {label}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-700 font-mono text-center mt-3">
        Gear wiring — v1
      </p>
    </Card>
  );
}
