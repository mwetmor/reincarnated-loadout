// Selects best-fitting gear from the season gear pool for each display slot.
// Uses the same fit-score formula as the engine's spirit_guide:
//   fit = (energy_type × range_profile × role_orientation)^(1/3)
//   value = power_score × fit
// Items are ranked per engine-slot bucket; each display slot picks by rank.

import type { ClassData, GearPoolEntry, LoadoutSlot } from '../data/types';

// Map display slots to engine gear slots + rank within that slot's sorted list.
// Rank 0 = best-fit item, rank 1 = second-best, etc.
// Hands / Legs / Feet are not in the season gear pool — omitted intentionally.
const SLOT_MAP: { displaySlot: string; engineSlot: string; rank: number }[] = [
  { displaySlot: 'Main',   engineSlot: 'weapon',    rank: 0 },
  { displaySlot: 'Off',    engineSlot: 'off_hand',  rank: 0 },
  { displaySlot: 'Head',   engineSlot: 'armor',     rank: 0 },
  { displaySlot: 'Chest',  engineSlot: 'armor',     rank: 1 },
  { displaySlot: 'Neck',   engineSlot: 'accessory', rank: 0 },
  { displaySlot: 'Ring 1', engineSlot: 'accessory', rank: 1 },
  { displaySlot: 'Ring 2', engineSlot: 'accessory', rank: 2 },
];

function fitScore(item: GearPoolEntry, classData: ClassData): number {
  const e = item.fit_energy_type[classData.energy_type] ?? 0;
  const r = item.fit_range_profile[classData.range_profile] ?? 0;
  const o = item.fit_role_orientation[classData.role_orientation] ?? 0;
  if (e <= 0 || r <= 0 || o <= 0) return 0;
  return item.power_score * Math.pow(e * r * o, 1 / 3);
}

export function synthesizeSampleLoadout(
  classData: ClassData,
  gearPool: GearPoolEntry[]
): LoadoutSlot[] {
  // Group items by engine slot and score each one for this class
  const bySlot: Record<string, { score: number; item: GearPoolEntry }[]> = {};
  for (const item of gearPool) {
    if (!bySlot[item.slot]) bySlot[item.slot] = [];
    bySlot[item.slot].push({ score: fitScore(item, classData), item });
  }

  // Sort each bucket descending by fit score (deterministic for a given class)
  for (const key of Object.keys(bySlot)) {
    bySlot[key].sort((a, b) => b.score - a.score);
  }

  const result: LoadoutSlot[] = [];
  for (const { displaySlot, engineSlot, rank } of SLOT_MAP) {
    const candidates = bySlot[engineSlot] ?? [];
    const entry = candidates[rank];
    if (!entry) continue;
    result.push({ displaySlot, engineSlot, item: entry.item });
  }
  return result;
}
