// useKitSpaceData — EAA-6 kit-space data loading hook
//
// Fetches kit_space JSON from public/kit-space/ at runtime (same fetch pattern as
// useEngineStateData.ts — no Vite glob; data served from public/ directory).
//
// Data source: public/kit-space/kits/*.json + public/kit-space/kit_space_chronicle.json
// These files are copied from reincarnated-engine/data/kit_space/ at data-staging time.
//
// LOCK O: this hook is the ONLY new non-UI code added for EAA-6.
// No new UI component shells. Existing CourtBrowser-pattern list/grid + detail reused.

import { useState, useEffect, useCallback } from 'react';
import type { KitData, KitSpaceChronicle } from '../data/kitSpaceTypes';

// Kit IDs generated in kse_20260602_001 (canonical-7+1 round-robin, 25 kits)
const KIT_IDS = [
  'kit_fire_000001',
  'kit_water_000001',
  'kit_earth_000001',
  'kit_wind_000001',
  'kit_lightning_000001',
  'kit_holy_000001',
  'kit_shadow_000001',
  'kit_physical_000001',
  'kit_fire_000002',
  'kit_water_000002',
  'kit_earth_000002',
  'kit_wind_000002',
  'kit_lightning_000002',
  'kit_holy_000002',
  'kit_shadow_000002',
  'kit_physical_000002',
  'kit_fire_000003',
  'kit_water_000003',
  'kit_earth_000003',
  'kit_wind_000003',
  'kit_lightning_000003',
  'kit_holy_000003',
  'kit_shadow_000003',
  'kit_physical_000003',
  'kit_fire_000004',
] as const;

export type KitId = (typeof KIT_IDS)[number];

export type KitSpaceLoadStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseKitSpaceDataResult {
  kits: KitData[];
  chronicle: KitSpaceChronicle | null;
  status: KitSpaceLoadStatus;
  error: string | null;
  refresh: () => void;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json() as Promise<T>;
}

async function loadKitSpaceData(): Promise<{ kits: KitData[]; chronicle: KitSpaceChronicle }> {
  // Fetch chronicle first (it's a single file), then all kits in parallel
  const chronicle = await fetchJson<KitSpaceChronicle>('/kit-space/kit_space_chronicle.json');

  const kitPromises = KIT_IDS.map((id) =>
    fetchJson<KitData>(`/kit-space/kits/${id}.json`).catch((err: unknown) => {
      // Graceful degradation: if a single kit fetch fails, log and skip
      console.warn(`[useKitSpaceData] Failed to load kit ${id}:`, err);
      return null;
    })
  );

  const settled = await Promise.all(kitPromises);
  const kits = settled.filter((k): k is KitData => k !== null);

  return { kits, chronicle };
}

export function useKitSpaceData(): UseKitSpaceDataResult {
  const [kits, setKits] = useState<KitData[]>([]);
  const [chronicle, setChronicle] = useState<KitSpaceChronicle | null>(null);
  const [status, setStatus] = useState<KitSpaceLoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [rev, setRev] = useState(0);

  const refresh = useCallback(() => setRev((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);

    loadKitSpaceData()
      .then(({ kits: loadedKits, chronicle: loadedChronicle }) => {
        if (cancelled) return;
        setKits(loadedKits);
        setChronicle(loadedChronicle);
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
  }, [rev]);

  return { kits, chronicle, status, error, refresh };
}
