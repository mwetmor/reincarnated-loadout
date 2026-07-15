// useAtlasData — fetches the slim atlas-interactive.json + render-provenance.json.
//
// Both live in public/atlas/ and are fetched at runtime (NOT bundled). The fat
// 7.49MB atlas-edition2.json never reaches the client; only the ~1.85MB slim
// derivative does. render-provenance.json carries the skin->canvas map so the
// page binds the black-copy lead by CANVAS, never by skin name (spec §6).

import { useState, useEffect, useCallback } from 'react';
import type { AtlasInteractiveData, RenderProvenance } from '../data/atlasTypes';

export type AtlasLoadStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseAtlasDataResult {
  data: AtlasInteractiveData | null;
  provenance: RenderProvenance | null;
  status: AtlasLoadStatus;
  error: string | null;
  refresh: () => void;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json() as Promise<T>;
}

export function useAtlasData(): UseAtlasDataResult {
  const [data, setData] = useState<AtlasInteractiveData | null>(null);
  const [provenance, setProvenance] = useState<RenderProvenance | null>(null);
  const [status, setStatus] = useState<AtlasLoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [rev, setRev] = useState(0);

  const refresh = useCallback(() => setRev((r) => r + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    Promise.all([
      fetchJson<AtlasInteractiveData>('/atlas/atlas-interactive.json'),
      fetchJson<RenderProvenance>('/atlas/render-provenance.json'),
    ])
      .then(([d, p]) => {
        if (cancelled) return;
        setData(d);
        setProvenance(p);
        setStatus('success');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [rev]);

  return { data, provenance, status, error, refresh };
}
