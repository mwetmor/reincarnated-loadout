import type { ClassData, GearCatalog, SynthesizedSlot } from '../data/types';

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
