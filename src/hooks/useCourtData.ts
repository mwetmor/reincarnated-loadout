/**
 * useCourtData — React hook for Court of Forms data consumption.
 *
 * Data flow: Path A static export (MIGRATION.md §v1.2 D17 architecture decision).
 * Reads public/data/court.json — the JSON snapshot exported by rocket's
 * court_persistence.py export step (or an empty bootstrap file before first export).
 *
 * Cross-seam contract: drax-loadout D17, MIGRATION.md §v1.2.
 *
 * TODO(drax): remove Path A workaround when rocket ships export_json() step.
 * When rocket lands the export, the court.json will be populated with real data.
 * This hook reads it the same way regardless — no code change needed on loadout side.
 * Remove this TODO when rocket HANDOFF confirms export step is live.
 */

import { useState, useEffect } from 'react';
import type { CourtExport, CourtForm } from '../data/courtTypes';

export type CourtLoadState =
  | { status: 'loading' }
  | { status: 'empty'; reason: 'no-data' }
  | { status: 'ready'; export: CourtExport; forms: CourtForm[] }
  | { status: 'error'; message: string };

/**
 * Load Court of Forms data from public/data/court.json.
 *
 * Returns a discriminated union state so consumers can render:
 * - loading skeleton while fetch is in flight
 * - empty state when Court has no forms (first-time player or no export yet)
 * - ready state with typed forms array
 * - error state if fetch/parse fails
 */
export function useCourtData(): CourtLoadState {
  const [state, setState] = useState<CourtLoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/data/court.json');
        if (!res.ok) {
          if (!cancelled) {
            setState({ status: 'error', message: `Failed to load court.json: HTTP ${res.status}` });
          }
          return;
        }

        const raw: CourtExport = await res.json();

        if (cancelled) return;

        // Validate minimal envelope shape
        if (!raw || typeof raw !== 'object' || !Array.isArray(raw.forms)) {
          setState({
            status: 'error',
            message: 'court.json shape invalid: missing forms array.',
          });
          return;
        }

        if (raw.forms.length === 0) {
          setState({ status: 'empty', reason: 'no-data' });
          return;
        }

        // Sort by season_number ASC (mirrors Court.list_forms() order guarantee)
        const sorted = [...raw.forms].sort((a, b) => a.season_number - b.season_number);

        setState({ status: 'ready', export: raw, forms: sorted });
      } catch (err) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Unknown error loading court.json',
          });
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}
