import type { LoadoutSlot } from '../../data/types';
import { Card } from '../ui/Card';
import { FlavorTip } from '../ui/FlavorTip';

const TIER_BADGE: Record<string, string> = {
  legendary: 'text-amber-400 border-amber-600',
  epic:      'text-purple-400 border-purple-700',
  rare:      'text-blue-400 border-blue-700',
  uncommon:  'text-green-400 border-green-700',
  common:    'text-gray-400 border-gray-600',
};

const TIER_LABEL: Record<string, string> = {
  legendary: 'Legendary',
  epic:      'Epic',
  rare:      'Rare',
  uncommon:  'Uncommon',
  common:    'Common',
};

const ELEMENT_COLORS: Record<string, string> = {
  fire:     'text-orange-400',
  wind:     'text-cyan-400',
  water:    'text-blue-400',
  earth:    'text-lime-400',
  physical: 'text-gray-400',
};

// Maps EMPTY_SLOTS display labels to player-readable slot type names shown in the gear modal.
// Keeps "Main" / "Off" internal shorthand separate from player-facing copy.
const SLOT_TYPE_LABEL: Record<string, string> = {
  Head:    'Helmet',
  Chest:   'Chest Armor',
  Hands:   'Gloves',
  Legs:    'Leggings',
  Feet:    'Boots',
  Main:    'Weapon',
  Off:     'Off-Hand',
  Neck:    'Necklace',
  'Ring 1': 'Ring',
  'Ring 2': 'Ring',
};

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
  synthesized?: LoadoutSlot[];
}

export function GearGrid({ mode = 'empty', synthesized = [] }: GearGridProps) {
  const synthMap = Object.fromEntries(synthesized.map((s) => [s.displaySlot, s]));

  return (
    <Card>
      <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wide mb-3">
        Gear Slots
        {mode === 'sample' && (
          <span className="ml-2 text-violet-400 normal-case">— Yomi Season</span>
        )}
      </h3>
      <div className="grid grid-cols-5 gap-2">
        {EMPTY_SLOTS.map(({ label, tip }) => {
          const slot = mode === 'sample' ? synthMap[label] : undefined;
          return (
            <div
              key={label}
              className={`flex flex-col items-center gap-1 p-2 rounded-md border group ${
                slot
                  ? 'border-gray-600 bg-gray-800/60'
                  : 'border-dashed border-gray-700 bg-gray-800/40'
              }`}
            >
              <div className="relative w-8 h-8 rounded border bg-gray-900 flex items-center justify-center text-lg group-hover:border-gray-600 border-gray-700">
                {slot ? (
                  <span className="text-gray-300 text-xs font-mono text-center leading-tight px-0.5">
                    {slot.item.name.slice(0, 4)}
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
                    title={slot ? slot.item.name : `${label} slot`}
                  >
                    {slot ? (() => {
                      const tierLabel = TIER_LABEL[slot.item.tier] ?? slot.item.tier;
                      const tierColor = TIER_BADGE[slot.item.tier] ?? 'text-gray-400 border-gray-600';
                      const elColor = slot.item.dominant_element
                        ? (ELEMENT_COLORS[slot.item.dominant_element] ?? 'text-gray-400')
                        : null;
                      return (
                        <>
                          <span className="block text-xs text-gray-500 not-italic mb-2 uppercase tracking-wide">
                            {SLOT_TYPE_LABEL[label] ?? label}
                          </span>
                          <span className={`inline-block text-xs font-mono not-italic border rounded px-1.5 py-0.5 mb-3 ${tierColor}`}>
                            {tierLabel}
                          </span>
                          {slot.item.dominant_element && (
                            <span className={`ml-2 text-xs font-mono not-italic ${elColor}`}>
                              {slot.item.dominant_element}
                            </span>
                          )}
                          {slot.item.flavor_text && (
                            <span className="block text-gray-500 text-sm mt-1">
                              {slot.item.flavor_text}
                            </span>
                          )}
                        </>
                      );
                    })() : (
                      `${tip} Gear wiring ships in v1.`
                    )}
                  </FlavorTip>
                </span>
              </div>
              <span
                className={`text-[10px] font-mono text-center leading-tight ${
                  slot ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                {slot ? slot.item.name.slice(0, 6) : label}
              </span>
              {slot && (
                <span className={`text-[9px] font-mono ${TIER_BADGE[slot.item.tier]?.split(' ')[0] ?? 'text-gray-500'}`}>
                  {(slot.item.tier ?? '').slice(0, 3)}
                </span>
              )}
              {!slot && (
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
