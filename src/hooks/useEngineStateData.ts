// useEngineStateData — fetches engine state JSON files for a given season
// Phase α dashboard: status surface only. No Phase β/γ control plane.
//
// Data lives in public/engine-state/season-{001,002,003}/ — fetched at runtime (not bundled).
// phase2_kit_candidates.json is NOT fetched here; BackwardTrace lazy-loads it separately.

import { useState, useEffect, useCallback } from 'react';
import type {
  SeasonId,
  EngineSeasonData,
  EngineSeasonSummary,
  Phase4ArchiveFile,
  Phase5FactionClustersFile,
  WaveBIdentitiesFile,
  Phase7KitVerdictsFile,
} from '../data/engineStateTypes';

export type EngineStateLoadStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseEngineStateDataResult {
  data: EngineSeasonData | null;
  status: EngineStateLoadStatus;
  error: string | null;
  refresh: () => void;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json() as Promise<T>;
}

function buildSeasonUrl(seasonSlug: SeasonId, file: string): string {
  return `/engine-state/${seasonSlug}/${file}`;
}

async function loadSeasonData(seasonSlug: SeasonId): Promise<EngineSeasonData> {
  const base = (file: string) => buildSeasonUrl(seasonSlug, file);

  const [summary, phase4, clusters, waveBIdentities, phase7Verdicts] = await Promise.all([
    fetchJson<EngineSeasonSummary>(base('season_summary.json')),
    fetchJson<Phase4ArchiveFile>(base('phase4_archive_insertion.json')),
    fetchJson<Phase5FactionClustersFile>(base('phase5_faction_clusters.json')),
    fetchJson<WaveBIdentitiesFile>(base('wave_b_identities.json')),
    fetchJson<Phase7KitVerdictsFile>(base('phase7_kit_verdicts.json')),
  ]);

  return { seasonSlug, summary, phase4, clusters, waveBIdentities, phase7Verdicts };
}

export function useEngineStateData(seasonSlug: SeasonId): UseEngineStateDataResult {
  const [data, setData] = useState<EngineSeasonData | null>(null);
  const [status, setStatus] = useState<EngineStateLoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [rev, setRev] = useState(0);

  const refresh = useCallback(() => setRev((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);

    loadSeasonData(seasonSlug)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setStatus('success');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStatus('error');
      });

    return () => { cancelled = true; };
  }, [seasonSlug, rev]);

  return { data, status, error, refresh };
}
