import type { RolledEffect } from '../data/types';

const EFFECT_LABELS: Record<string, string> = {
  damage: 'Damage',
  burn: 'Burn',
  chill: 'Chill',
  root: 'Root',
  knockback: 'Knockback',
  bleed: 'Bleed',
  heal: 'Heal',
  shield: 'Shield',
  buff_damage: 'Damage Buff',
  buff_defense: 'Defense Buff',
  buff_dodge: 'Dodge Buff',
  buff_mana_regen: 'Mana Regen',
};

const TRIGGER_LABELS: Record<string, string> = {
  on_hit: 'on hit',
  on_crit: 'on crit',
  on_kill: 'on kill',
  passive: 'passive',
};

// These effect types already imply their element (Burn=fire, Chill=water, etc.)
const IMPLICIT_ELEMENT = new Set(['burn', 'chill', 'root', 'knockback', 'bleed']);

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatEffect(effect: RolledEffect): string {
  const label = EFFECT_LABELS[effect.effectType] ?? effect.effectType;
  const el = effect.element && !IMPLICIT_ELEMENT.has(effect.effectType)
    ? capitalize(effect.element) + ' '
    : '';
  const mag = Math.round(effect.magnitude);
  const triggerSuffix = effect.trigger !== 'passive'
    ? ` ${TRIGGER_LABELS[effect.trigger] ?? effect.trigger}`
    : '';
  return `+${mag} ${el}${label}${triggerSuffix}`;
}
