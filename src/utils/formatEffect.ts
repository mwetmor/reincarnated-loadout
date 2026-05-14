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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatEffect(effect: RolledEffect): string {
  const label = EFFECT_LABELS[effect.effectType] ?? effect.effectType;
  const el = effect.element ? capitalize(effect.element) + ' ' : '';
  const trigger = TRIGGER_LABELS[effect.trigger] ?? effect.trigger;
  const mag = Math.round(effect.magnitude);
  return `${el}${label} ${trigger} (${mag})`;
}
