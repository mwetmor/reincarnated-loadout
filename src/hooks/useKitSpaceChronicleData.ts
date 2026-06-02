// useKitSpaceChronicleData — EAA-7 chronicle-only data loading hook
//
// Fetches kit_space_chronicle.json from public/kit-space/ at runtime.
// Chronicle-only (lighter than useKitSpaceData which also loads all 25 kit JSONs).
// Used by EngineState engine page to render chronicle events[].
//
// Data source: public/kit-space/kit_space_chronicle.json
// Schema: reincarnated-engine/data/kit_space/chronicle/CHRONICLE_SCHEMA.md
//
// LOCK O: reuses fetch pattern from useEngineStateData + useKitSpaceData (no new pattern).

import { useState, useEffect, useCallback } from 'react';
import type { KitSpaceChronicle } from '../data/kitSpaceTypes';

export type ChronicleLoadStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseKitSpaceChronicleDataResult {
  chronicle: KitSpaceChronicle | null;
  status: ChronicleLoadStatus;
  error: string | null;
  refresh: () => void;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json() as Promise<T>;
}

export function useKitSpaceChronicleData(): UseKitSpaceChronicleDataResult {
  const [chronicle, setChronicle] = useState<KitSpaceChronicle | null>(null);
  const [status, setStatus] = useState<ChronicleLoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [rev, setRev] = useState(0);

  const refresh = useCallback(() => setRev((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);

    fetchJson<KitSpaceChronicle>('/kit-space/kit_space_chronicle.json')
      .then((loaded) => {
        if (cancelled) return;
        setChronicle(loaded);
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

  return { chronicle, status, error, refresh };
}
