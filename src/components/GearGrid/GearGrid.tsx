import type { GearStats, GearRolledEffect, LoadoutSlot } from '../../data/types';
import { Card } from '../ui/Card';
import { FlavorTip } from '../ui/FlavorTip';

// Stage 3 cipher migration: resolve the player-visible element name for a gear item.
// Uses seasonal_dominant_element (v1.5+) first; falls back to dominant_element (pre-v1.5).
// Returns null if the item has no element (physical / null).
function resolveGearElementName(item: LoadoutSlot['item']): string | null {
  const name = item.seasonal_dominant_element ?? item.dominant_element;
  return name ?? null;
}

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

// Bug A fix: slot label in modal derived from engine slot type, not display slot position.
// Avoids "Helmet" label on a robe item — armor pool contains both head and chest armors
// with no sub-slot distinction in the engine schema.
const ENGINE_SLOT_LABEL: Record<string, string> = {
  weapon:    'Weapon',
  armor:     'Armor',
  off_hand:  'Off-Hand',
  accessory: 'Accessory',
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

// --- stat formatting helpers ---

function buildStatLines(s: GearStats): string[] {
  const lines: string[] = [];
  if (s.bonus_damage_flat > 0)    lines.push(`Damage +${Math.round(s.bonus_damage_flat)}`);
  if (s.bonus_hp > 0)             lines.push(`HP +${Math.round(s.bonus_hp)}`);
  if (s.bonus_armor > 0)          lines.push(`Armor +${Math.round(s.bonus_armor)}`);
  if (s.bonus_crit_chance > 0)    lines.push(`Crit +${(s.bonus_crit_chance * 100).toFixed(1)}%`);
  if (s.bonus_damage_percent > 0) lines.push(`Dmg +${(s.bonus_damage_percent * 100).toFixed(1)}%`);
  if (s.bonus_mana_regen > 0)     lines.push(`Mana Regen +${s.bonus_mana_regen.toFixed(1)}/s`);
  if (s.block_chance > 0)         lines.push(`Block +${(s.block_chance * 100).toFixed(1)}%`);
  if (s.block_value > 0)          lines.push(`Block Value ${(s.block_value * 100).toFixed(1)}%`);
  Object.entries(s.elemental_resistances ?? {}).forEach(([el, val]) => {
    if (val > 0) lines.push(`${el} Resist +${(val * 100).toFixed(0)}%`);
  });
  return lines;
}

const TRIGGER_LABEL: Record<string, string> = {
  on_hit:  'On Hit',
  on_crit: 'On Crit',
  on_kill: 'On Kill',
  passive: 'Passive',
};

function fmtEffect(eff: GearRolledEffect): string {
  const trigger = TRIGGER_LABEL[eff.trigger] ?? eff.trigger;
  const el = eff.element ? ` ${eff.element}` : '';
  return `${trigger}: ${Math.round(eff.magnitude)}${el} ${eff.effect_type}`;
}

function fmtModifier(key: string, val: number): string {
  if (key === 'cooldown_factor')        return `Cooldown ×${val.toFixed(2)}`;
  if (key === 'energy_cost_factor')     return `Cost ×${val.toFixed(2)}`;
  if (key === 'crit_bonus_damage')      return `Crit +${(val * 100).toFixed(1)}%`;
  if (key === 'control_duration_bonus') return `Control +${val.toFixed(1)}s`;
  return `${key}: ${val}`;
}

// --- component ---

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
      </h3>
      <div className="grid grid-cols-5 gap-2">
        {EMPTY_SLOTS.map(({ label, tip }) => {
          const slot = mode === 'sample' ? synthMap[label] : undefined;
          // L-06/L-07 fix (cipher migration): resolve seasonal name first (v1.5+),
          // fall back to canonical dominant_element for pre-Stage-3 seasons.
          const resolvedElName = slot ? resolveGearElementName(slot.item) : null;
          const elColor = slot?.item.dominant_element
            ? (ELEMENT_COLORS[slot.item.dominant_element] ?? 'text-gray-400')
            : null;

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
                      const statLines = slot.item.stats ? buildStatLines(slot.item.stats) : [];
                      const effects = slot.item.rolled_effects ?? [];
                      const modifiers = Object.entries(slot.item.ability_modifiers ?? {});

                      return (
                        <>
                          {/* Bug A fix: slot type derived from engineSlot (armor/weapon/etc.)
                              — not from display position (Head/Chest) which assumed sub-slots
                              the engine doesn't track. */}
                          <span className="block text-xs text-gray-500 not-italic mb-2 uppercase tracking-wide">
                            {ENGINE_SLOT_LABEL[slot.engineSlot] ?? slot.engineSlot}
                          </span>

                          {/* Tier badge + element — Bug B: element already shown here in modal */}
                          {/* L-06 fix: display seasonal name (v1.5+) or canonical (pre-v1.5);
                              resolvedElName is null for physical/no-element items. */}
                          <span className={`inline-block text-xs font-mono not-italic border rounded px-1.5 py-0.5 mb-3 ${tierColor}`}>
                            {tierLabel}
                          </span>
                          {resolvedElName && (
                            <span className={`ml-2 text-xs font-mono not-italic ${elColor}`}>
                              {resolvedElName}
                            </span>
                          )}

                          {/* Flavor text */}
                          {slot.item.flavor_text && (
                            <span className="block text-gray-500 text-sm mt-1">
                              {slot.item.flavor_text}
                            </span>
                          )}

                          {/* Bug 5: Stats — primary and secondary stat lines */}
                          {statLines.length > 0 && (
                            <span className="block mt-3 pt-2 border-t border-gray-700/50 not-italic">
                              {statLines.map((l, i) => (
                                <span key={i} className="block text-xs font-mono text-cyan-300">{l}</span>
                              ))}
                            </span>
                          )}

                          {/* Bug 5: Rolled effects — "On Hit: 623 fire damage" */}
                          {effects.length > 0 && (
                            <span className="block mt-2 not-italic">
                              {effects.map((eff, i) => (
                                <span key={i} className="block text-xs font-mono text-yellow-400/80">
                                  {fmtEffect(eff)}
                                </span>
                              ))}
                            </span>
                          )}

                          {/* Bug 5: Ability modifiers — "Cooldown ×0.89" */}
                          {modifiers.length > 0 && (
                            <span className="block mt-2 not-italic">
                              {modifiers.map(([key, val]) => (
                                <span key={key} className="block text-xs font-mono text-violet-300">
                                  {fmtModifier(key, val)}
                                </span>
                              ))}
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

              {/* Grid cell: name abbreviation */}
              <span
                className={`text-[10px] font-mono text-center leading-tight ${
                  slot ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                {slot ? slot.item.name.slice(0, 6) : label}
              </span>

              {/* Grid cell: tier abbreviation */}
              {slot && (
                <span className={`text-[9px] font-mono ${TIER_BADGE[slot.item.tier]?.split(' ')[0] ?? 'text-gray-500'}`}>
                  {(slot.item.tier ?? '').slice(0, 3)}
                </span>
              )}

              {/* Bug B fix: element on card cell — small colored text below tier */}
              {/* L-07 fix: display seasonal name (v1.5+) or canonical (pre-v1.5);
                  slice(0,4) kept for compact cell display — seasonal names may be
                  longer than 4 chars but the cell is narrow; player sees full name in modal. */}
              {slot && resolvedElName && (
                <span className={`text-[8px] font-mono ${ELEMENT_COLORS[slot.item.dominant_element ?? ''] ?? 'text-gray-400'}`}>
                  {resolvedElName.slice(0, 4)}
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
