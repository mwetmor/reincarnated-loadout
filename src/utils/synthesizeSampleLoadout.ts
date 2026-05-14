import type { ClassData, GearCatalog, GearEffectPoolEntry, RolledEffect, SynthesizedSlot } from '../data/types';

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function rollEffectsForItem(
  itemId: string,
  displaySlot: string,
  effectPool: GearEffectPoolEntry[]
): RolledEffect[] {
  const compatible = effectPool.filter((e) => e.compatible_slots.includes(itemId));
  if (compatible.length === 0) return [];

  const seed = hashStr(itemId + displaySlot);
  const count = Math.min(2 + (seed % 2), compatible.length);
  const rolled: RolledEffect[] = [];
  const used = new Set<string>();

  for (let i = 0; rolled.length < count; i++) {
    if (i >= compatible.length * 3) break;
    const entry = compatible[(seed + i * 7) % compatible.length];
    const key = entry.effect_type + '|' + entry.trigger;
    if (used.has(key)) continue;
    used.add(key);
    const [lo, hi] = entry.magnitude_range;
    const mag = lo + (((seed * (i + 1) * 1009) % 1000) / 1000) * (hi - lo);
    rolled.push({ effectType: entry.effect_type, element: entry.element, trigger: entry.trigger, magnitude: mag, rarityMin: entry.rarity_min });
  }
  return rolled;
}

function pickWeapon(archetype: string, range: string): string {
  if (range === 'long' && archetype === 'hunter') return 'bow';
  if (archetype === 'physical_warrior') return range === 'close' ? 'hammer' : 'greatsword';
  if (archetype === 'rogue') return 'dagger';
  if (archetype === 'physical_skirmisher') return 'sword';
  if (archetype.includes('mage') || archetype.includes('caster')) return 'staff';
  if (archetype.includes('controller')) return 'wand';
  return 'sword';
}

function pickOffHand(archetype: string): string {
  if (archetype.includes('mage') || archetype.includes('caster')) return 'grimoire';
  if (archetype.includes('controller')) return 'orb';
  if (archetype === 'physical_warrior') return 'shield';
  if (archetype === 'physical_skirmisher') return 'shield';
  if (archetype === 'rogue') return 'off_hand_dagger';
  if (archetype === 'hunter') return 'focus';
  return 'focus';
}

function isCaster(archetype: string): boolean {
  return archetype.includes('mage') || archetype.includes('caster') || archetype.includes('controller');
}

export function synthesizeSampleLoadout(
  classData: ClassData,
  catalog: GearCatalog
): SynthesizedSlot[] {
  const { archetype_tag, range_profile } = classData;
  const itemsById = Object.fromEntries(catalog.base_items.map((i) => [i.id, i]));

  const pick = (id: string, displaySlot: string): SynthesizedSlot => ({
    displaySlot,
    baseItemId: id,
    displayName: itemsById[id]?.name ?? id,
    synthesized: true,
    rolledEffects: rollEffectsForItem(id, displaySlot, catalog.effect_pool ?? []),
  });

  const caster = isCaster(archetype_tag);

  return [
    pick(caster ? 'hood' : 'helmet', 'Head'),
    pick(caster ? 'robe' : 'chest', 'Chest'),
    pick(pickWeapon(archetype_tag, range_profile), 'Main'),
    pick(pickOffHand(archetype_tag), 'Off'),
    pick('amulet', 'Neck'),
    pick('ring', 'Ring 1'),
    pick('ring', 'Ring 2'),
  ];
}
