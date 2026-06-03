// useKitSpaceData — EAA-6 kit-space data loading hook
//
// Fetches kit_space JSON from public/kit-space/ at runtime (same fetch pattern as
// useEngineStateData.ts — no Vite glob; data served from public/ directory).
//
// Data source: public/kit-space/kits/*.json + public/kit-space/kit_space_chronicle.json
// These files are copied from reincarnated-engine/data/kit_space/ at data-staging time.
//
// QDX-7 (Note 3): Filter to current event kits by default.
//   - current = kse_20260602_008 (QDX-5 full fire; 37 kits)
//   - historical = kse_20260602_001 (EAA-5 v2; 25 kits) + smoke events 002-007
//   - Historical event kits preserved via Path α (pass showHistorical=true to hook)
//
// QDX-7 (Note 2): t4_selection.is_active guard applied at Loadout render layer (Loadout.tsx).
//   The hook loads raw data; rendering checks is_active before displaying T4 as active.
//
// LOCK O: this hook is the ONLY new non-UI code added for EAA-6; QDX-7 extends it minimally.

import { useState, useEffect, useCallback } from 'react';
import type { KitData, KitSpaceChronicle, FactionAssignments, KitFactionMap } from '../data/kitSpaceTypes';

// Current canonical event ID — QDX-5 full fire (37 kits)
// TODO(drax): update this constant when a future expansion event becomes canonical
export const CURRENT_KIT_EVENT_ID = 'kse_20260602_008';

// Historical event ID — EAA-5 v2 (25 kits); Path α preservation
export const HISTORICAL_KIT_EVENT_ID = 'kse_20260602_001';

export type KitSpaceLoadStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseKitSpaceDataOptions {
  // If true, load kits from HISTORICAL_KIT_EVENT_ID (EAA-5 v2 25-kit set)
  // rather than the current canonical event. Default: false.
  showHistorical?: boolean;
}

export interface UseKitSpaceDataResult {
  kits: KitData[];
  chronicle: KitSpaceChronicle | null;
  factionMap: KitFactionMap;
  status: KitSpaceLoadStatus;
  error: string | null;
  refresh: () => void;
  currentEventId: string;
  isHistorical: boolean;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json() as Promise<T>;
}

// Build kit_id → { faction_id, faction_name } reverse map from faction_assignments.json
function buildFactionMap(assignments: FactionAssignments): KitFactionMap {
  const map: KitFactionMap = {};
  for (const faction of assignments.factions) {
    for (const kitId of faction.kit_ids) {
      map[kitId] = { faction_id: faction.faction_id, faction_name: faction.faction_name };
    }
  }
  return map;
}

async function loadKitSpaceData(eventId: string): Promise<{ kits: KitData[]; chronicle: KitSpaceChronicle; factionMap: KitFactionMap }> {
  // Fetch chronicle + faction assignments in parallel
  const [chronicle, factionAssignments] = await Promise.all([
    fetchJson<KitSpaceChronicle>('/kit-space/kit_space_chronicle.json'),
    fetchJson<FactionAssignments>('/kit-space/faction_assignments.json').catch((err: unknown) => {
      console.warn('[useKitSpaceData] Failed to load faction_assignments.json:', err);
      return null;
    }),
  ]);

  const factionMap = factionAssignments ? buildFactionMap(factionAssignments) : {};

  // Note 3: filter to the specified event — historical kits (events 001-007) have
  // different schema shapes; mixing them causes render errors on QDX-5-only fields.
  const targetEvent = chronicle.events.find((e) => e.event_id === eventId);
  const kitIds = targetEvent?.kit_ids_generated ?? [];

  if (kitIds.length === 0) {
    console.warn(`[useKitSpaceData] No kit IDs found for event ${eventId} in chronicle`);
  }

  const kitPromises = kitIds.map((id) =>
    fetchJson<KitData>(`/kit-space/kits/${id}.json`).catch((err: unknown) => {
      // Graceful degradation: if a single kit fetch fails, log and skip
      console.warn(`[useKitSpaceData] Failed to load kit ${id}:`, err);
      return null;
    })
  );

  const settled = await Promise.all(kitPromises);
  const kits = settled.filter((k): k is KitData => k !== null);

  return { kits, chronicle, factionMap };
}

export function useKitSpaceData(options: UseKitSpaceDataOptions = {}): UseKitSpaceDataResult {
  const { showHistorical = false } = options;
  const eventId = showHistorical ? HISTORICAL_KIT_EVENT_ID : CURRENT_KIT_EVENT_ID;

  const [kits, setKits] = useState<KitData[]>([]);
  const [chronicle, setChronicle] = useState<KitSpaceChronicle | null>(null);
  const [factionMap, setFactionMap] = useState<KitFactionMap>({});
  const [status, setStatus] = useState<KitSpaceLoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [rev, setRev] = useState(0);

  const refresh = useCallback(() => setRev((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);

    loadKitSpaceData(eventId)
      .then(({ kits: loadedKits, chronicle: loadedChronicle, factionMap: loadedFactionMap }) => {
        if (cancelled) return;
        setKits(loadedKits);
        setChronicle(loadedChronicle);
        setFactionMap(loadedFactionMap);
        setStatus('success');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, rev]);

  return {
    kits,
    chronicle,
    factionMap,
    status,
    error,
    refresh,
    currentEventId: eventId,
    isHistorical: showHistorical,
  };
}
