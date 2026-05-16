/**
 * useEncounterAnalytics — v0.7 encounter analytics hook
 *
 * Loads pre-computed encounter analytics JSON (generated from telemetry DB).
 * Data covers season_001005 until Yomi regen (gamora Option 2) lands.
 *
 * When gamora ships fresh Yomi data:
 *  - Regenerate data/encounter_analytics.json from the new season
 *  - Set tier1_populated: true in the JSON
 *  - avg_duration / std_duration / avg_heals will become non-null
 * TODO(drax): remove tier1_populated guard + update projection to damage×duration once gamora Option 2 regen ships
 */
import { useMemo } from 'react';
import rawData from '../../data/encounter_analytics.json';

export interface GeometryMix {
  aoe_pct: number;
  single_pct: number;
  buff_pct: number;
}

export interface EncounterPoint {
  monster_id: string;
  slot_type: string;
  is_pack: boolean;
  fight_count: number;
  avg_damage: number | null;
  std_damage: number | null;
  avg_duration: number | null;
  std_duration: number | null;
  avg_heals: number | null;
  std_heals: number | null;
  avg_potions: number | null;
  win_rate: number | null;
}

export interface ClassAnalytics {
  class_id: string;
  geometry_mix: GeometryMix;
  encounters: EncounterPoint[];
}

export interface EncounterSlotMeta {
  monster_id: string;
  slot_type: string;
  is_pack: boolean;
}

export interface EncounterAnalyticsData {
  generated_at: string;
  season_id: string;
  note: string;
  tier1_populated: boolean;
  classes: Record<string, ClassAnalytics>;
  encounter_slots: EncounterSlotMeta[];
  slot_type_colors: Record<string, string>;

  // Derived — computed by hook
  class_ids: string[];
  global_damage_extent: [number, number];
  /** Per-encounter-slot: list of all (class, encounter) pairs for that monster_id */
  by_slot: Record<string, Array<{ class_id: string; point: EncounterPoint; aoe_pct: number }>>;
}

export function useEncounterAnalytics(): EncounterAnalyticsData {
  return useMemo(() => {
    const data = rawData as Omit<EncounterAnalyticsData, 'class_ids' | 'global_damage_extent' | 'by_slot'>;

    const class_ids = Object.keys(data.classes).sort();

    // Compute global damage extent across all (class, encounter) pairs
    let minDmg = Infinity;
    let maxDmg = -Infinity;
    for (const cls of Object.values(data.classes)) {
      for (const enc of cls.encounters) {
        if (enc.avg_damage != null) {
          minDmg = Math.min(minDmg, enc.avg_damage - (enc.std_damage ?? 0));
          maxDmg = Math.max(maxDmg, enc.avg_damage + (enc.std_damage ?? 0));
        }
      }
    }
    if (!isFinite(minDmg)) minDmg = 0;
    if (!isFinite(maxDmg)) maxDmg = 1;

    // Index by encounter slot
    const by_slot: EncounterAnalyticsData['by_slot'] = {};
    for (const [cid, cls] of Object.entries(data.classes)) {
      for (const enc of cls.encounters) {
        if (!by_slot[enc.monster_id]) by_slot[enc.monster_id] = [];
        by_slot[enc.monster_id].push({
          class_id: cid,
          point: enc,
          aoe_pct: cls.geometry_mix.aoe_pct,
        });
      }
    }

    return {
      ...data,
      class_ids,
      global_damage_extent: [minDmg, maxDmg],
      by_slot,
    };
  }, []);
}
