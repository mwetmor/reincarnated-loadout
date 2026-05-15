// Selects best-fitting gear from the season gear pool for each display slot.
// Uses the same fit-score formula as the engine's spirit_guide:
//   fit = (energy_type × range_profile × role_orientation)^(1/3)
//   value = fit (power_score removed from player-facing selection to avoid all-legendary bias)
//
// Each display slot targets a specific tier to ensure tier diversity.
// Hands / Legs / Feet are not in the season gear pool — omitted intentionally.

import type { ClassData, GearPoolEntry, LoadoutSlot } from '../data/types';

// Explicit tier per display slot → guarantees all 5 tiers appear across a 7-slot loadout.
// Tier assignment is a display-layer policy decision, not engine data.
const SLOT_MAP: { displaySlot: string; engineSlot: string; tier: string }[] = [
  { displaySlot: 'Main',   engineSlot: 'weapon',    tier: 'legendary' },
  { displaySlot: 'Off',    engineSlot: 'off_hand',  tier: 'rare'      },
  { displaySlot: 'Head',   engineSlot: 'armor',     tier: 'epic'      },
  { displaySlot: 'Chest',  engineSlot: 'armor',     tier: 'uncommon'  },
  { displaySlot: 'Neck',   engineSlot: 'accessory', tier: 'epic'      },
  { displaySlot: 'Ring 1', engineSlot: 'accessory', tier: 'common'    },
  { displaySlot: 'Ring 2', engineSlot: 'accessory', tier: 'rare'      },
];

function fitScore(item: GearPoolEntry, classData: ClassData): number {
  const e = item.fit_energy_type[classData.energy_type] ?? 0;
  const r = item.fit_range_profile[classData.range_profile] ?? 0;
  const o = item.fit_role_orientation[classData.role_orientation] ?? 0;
  if (e <= 0 || r <= 0 || o <= 0) return 0;
  // Omit power_score from selection: power_score is tier-correlated, so including it
  // would override the explicit tier targets above and bias selection back toward legendary.
  return Math.pow(e * r * o, 1 / 3);
}

export function synthesizeSampleLoadout(
  classData: ClassData,
  gearPool: GearPoolEntry[]
): LoadoutSlot[] {
  // Group items by engine slot × tier, scored by fit
  const bySlotAndTier: Record<string, Record<string, { score: number; item: GearPoolEntry }[]>> = {};
  for (const item of gearPool) {
    if (!bySlotAndTier[item.slot]) bySlotAndTier[item.slot] = {};
    if (!bySlotAndTier[item.slot][item.tier]) bySlotAndTier[item.slot][item.tier] = [];
    bySlotAndTier[item.slot][item.tier].push({ score: fitScore(item, classData), item });
  }

  // Sort each bucket descending by fit score (deterministic for a given class)
  for (const slotBuckets of Object.values(bySlotAndTier)) {
    for (const tierList of Object.values(slotBuckets)) {
      tierList.sort((a, b) => b.score - a.score);
    }
  }

  // Track used item ids to prevent the same item from filling two display slots
  const usedIds = new Set<string>();
  const result: LoadoutSlot[] = [];

  for (const { displaySlot, engineSlot, tier } of SLOT_MAP) {
    const candidates = bySlotAndTier[engineSlot]?.[tier] ?? [];
    const entry = candidates.find((c) => !usedIds.has(c.item.gear_id));
    if (!entry) continue;
    usedIds.add(entry.item.gear_id);
    result.push({ displaySlot, engineSlot, item: entry.item });
  }
  return result;
}
