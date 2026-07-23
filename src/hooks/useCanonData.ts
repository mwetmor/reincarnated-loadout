// useCanonData — fetches the /canon inspection surface data.
//
// Two hooks, matching the loadout's established idle/loading/success/error pattern:
//   useCanonIndex()          — fetches public/canon-data/index.json (267 summary rows)
//   useCanonKit(kitId)       — LAZY-fetches public/canon-data/kits/<kitId>.json on demand
//
// NOTE: data lives under public/canon-data/ (NOT public/canon/) so it does not squat
// on the React ROUTE path /canon. Vercel's static filesystem layer resolves a real
// file at the route path BEFORE the SPA rewrite fires — with data at public/canon/,
// GET /canon served raw index.json instead of the React page (Matt-observed 2026-07-22).
// Keep the data namespace distinct from the route.
//
// The 267 per-kit files are NOT bundled into the JS — each is fetched only when its
// detail route is visited (a plain runtime fetch of a static public/ asset). A tiny
// in-memory cache avoids re-fetching a kit within a session.

import { useState, useEffect } from 'react';
import type { CanonIndex, CanonKitDetail } from '../data/canonTypes';

export type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json() as Promise<T>;
}

// ---- index ----

let indexCache: CanonIndex | null = null;

export interface UseCanonIndexResult {
  index: CanonIndex | null;
  status: LoadStatus;
  error: string | null;
}

export function useCanonIndex(): UseCanonIndexResult {
  const [index, setIndex] = useState<CanonIndex | null>(indexCache);
  const [status, setStatus] = useState<LoadStatus>(indexCache ? 'success' : 'loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cache hit is already reflected in the initial state — nothing to fetch.
    if (indexCache) return;
    let cancelled = false;
    fetchJson<CanonIndex>('/canon-data/index.json')
      .then((data) => {
        if (cancelled) return;
        indexCache = data;
        setIndex(data);
        setStatus('success');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { index, status, error };
}

// ---- per-kit detail (lazy) ----

const kitCache = new Map<string, CanonKitDetail>();

export interface UseCanonKitResult {
  kit: CanonKitDetail | null;
  status: LoadStatus;
  error: string | null;
}

export function useCanonKit(kitId: string | undefined): UseCanonKitResult {
  // A monotonic fetch-result state; the currently-displayed kit is derived below
  // so a cache hit (incl. after navigation between kits) needs no in-effect setState.
  const [fetched, setFetched] = useState<{ id: string; kit: CanonKitDetail } | null>(null);
  const [errState, setErrState] = useState<{ id: string; msg: string } | null>(null);

  useEffect(() => {
    if (!kitId) return; // nothing to fetch
    if (kitCache.has(kitId)) return; // already cached — derived in render
    let cancelled = false;
    // encodeURIComponent guards kit_ids that contain path-unsafe characters.
    fetchJson<CanonKitDetail>(`/canon-data/kits/${encodeURIComponent(kitId)}.json`)
      .then((data) => {
        if (cancelled) return;
        kitCache.set(kitId, data);
        setFetched({ id: kitId, kit: data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrState({ id: kitId, msg: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [kitId]);

  // Derive the result for the CURRENT kitId (cache hit, fresh fetch, or error).
  if (!kitId) return { kit: null, status: 'idle', error: null };
  const cached = kitCache.get(kitId);
  if (cached) return { kit: cached, status: 'success', error: null };
  if (fetched && fetched.id === kitId) return { kit: fetched.kit, status: 'success', error: null };
  if (errState && errState.id === kitId) return { kit: null, status: 'error', error: errState.msg };
  return { kit: null, status: 'loading', error: null };
}
