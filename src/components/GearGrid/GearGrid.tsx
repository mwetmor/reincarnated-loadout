import type { RolledEffect, SynthesizedSlot } from '../../data/types';
import { formatEffect } from '../../utils/formatEffect';
import { Card } from '../ui/Card';
import { FlavorTip } from '../ui/FlavorTip';

const ITEM_FLAVOR: Record<string, string> = {
  sword:          'Balanced steel, honed for those who trust their arm over their mind.',
  staff:          'Channels elemental force through its core. The wood still hums.',
  dagger:         'Light enough to forget. Sharp enough to remember.',
  hammer:         'Leaves craters where it lands. Subtlety was never the goal.',
  bow:            'Every shot is a question. Every hit is the answer.',
  wand:           'Precise. Controlled. The controller\'s preferred extension.',
  greatsword:     'Two-handed and uncompromising. It doesn\'t block — it ends things.',
  helmet:         'Forged to outlast its wearer.',
  chest:          'Plate and padding. The body\'s last argument.',
  robe:           'Woven to amplify, not absorb.',
  hood:           'Conceals intent. Focuses purpose.',
  ring:           'A small loop of compressed potential.',
  amulet:         'Worn close to the pulse for a reason.',
  shield:         'It has seen worse. It will see worse still.',
  off_hand_dagger:'The second strike they didn\'t see coming.',
  off_hand_sword: 'Offhand only to those who don\'t know how to use it.',
  grimoire:       'Pages that rewrite themselves when no one is looking.',
  orb:            'Spins in the palm. Answers when asked.',
  focus:          'Channels what the mind cannot hold alone.',
};

const RARITY_ORDER: Record<string, number> = { common: 0, uncommon: 1, rare: 2 };

const TIER_LABEL: Record<string, string> = {
  common:   'Common',
  uncommon: 'Uncommon',
  rare:     'Rare',
};

const TIER_COLOR: Record<string, string> = {
  common:   'text-gray-400 border-gray-600',
  uncommon: 'text-green-400 border-green-700',
  rare:     'text-blue-400 border-blue-700',
};

const STAT_COLOR: Record<string, string> = {
  common:   'text-gray-300',
  uncommon: 'text-green-400',
  rare:     'text-blue-400',
};

function itemTier(effects: RolledEffect[]): string {
  if (effects.length === 0) return 'common';
  return effects.reduce(
    (best, e) =>
      (RARITY_ORDER[e.rarityMin] ?? 0) > (RARITY_ORDER[best] ?? 0) ? e.rarityMin : best,
    'common'
  );
}

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
                    title={filled ? filled.displayName : `${label} slot`}
                  >
                    {filled ? (() => {
                      const tier = itemTier(filled.rolledEffects);
                      const tierLabel = TIER_LABEL[tier] ?? tier;
                      const tierColor = TIER_COLOR[tier] ?? 'text-gray-400 border-gray-600';
                      const flavor = ITEM_FLAVOR[filled.baseItemId];
                      return (
                        <>
                          <span className="block text-xs text-gray-500 not-italic mb-2 uppercase tracking-wide">{label} slot</span>
                          <span className={`inline-block text-xs font-mono not-italic border rounded px-1.5 py-0.5 mb-3 ${tierColor}`}>
                            {tierLabel}
                          </span>
                          {filled.rolledEffects.length > 0 && (
                            <span className="block mb-3">
                              {filled.rolledEffects.map((e, i) => (
                                <span key={i} className={`block text-sm font-mono not-italic ${STAT_COLOR[e.rarityMin] ?? 'text-gray-300'}`}>
                                  {formatEffect(e)}
                                </span>
                              ))}
                            </span>
                          )}
                          {flavor && (
                            <span className="block text-gray-500 text-sm">{flavor}</span>
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
                  filled ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                {filled ? filled.displayName.slice(0, 6) : label}
              </span>
              {filled && filled.rolledEffects.length > 0 && (
                <span className="text-[9px] text-violet-400 font-mono">{filled.rolledEffects.length}fx</span>
              )}
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
