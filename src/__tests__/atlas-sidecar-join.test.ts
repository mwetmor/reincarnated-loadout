// atlas-sidecar-join.test.ts — the D1-h sidecar join + coverage floor (#48).
//
// Asserts the BUILT atlas-interactive.json (emitted by build-atlas-interactive.mjs)
// carries the joined corpus provenance on every kit, with the probed coverage, and
// that every displayed string traces to the vendored sidecar (zero invention).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { AtlasInteractiveData } from '../data/atlasTypes';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const ATLAS = resolve(REPO_ROOT, 'public/atlas/atlas-interactive.json');
const SIDECAR = resolve(REPO_ROOT, 'scripts/atlas/kit-provenance-sidecar.json');

const data = JSON.parse(readFileSync(ATLAS, 'utf8')) as AtlasInteractiveData & {
  provenance_coverage?: Record<string, number>;
};
const sidecar = JSON.parse(readFileSync(SIDECAR, 'utf8')) as {
  __provenance__: { source_db: string; query: string; export_date: string };
  rows: {
    kit_id: string;
    folk_name: string | null;
    game: string | null;
    era_year: number | null;
    stabilization_patch: string | null;
  }[];
};

describe('D1-h sidecar carries a provenance header (#48)', () => {
  it('header records the source DB path, exact query, and export date', () => {
    const h = sidecar.__provenance__;
    expect(h.source_db).toContain('corpus.db');
    expect(h.query).toMatch(/SELECT kit_id, folk_name, game, era_year, stabilization_patch FROM canon_corpus/);
    expect(h.export_date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('D1-h join coverage on the atlas 506 (#48)', () => {
  it('every atlas kit carries a folk_name (HARD floor 506/506)', () => {
    expect(data.kits.length).toBe(506);
    const missing = data.kits.filter((k) => !k.folk_name);
    expect(missing.length).toBe(0);
  });

  it('coverage matches the probed numbers (folk 506, game 506, year 506, patch 15)', () => {
    const cov = (pred: (k: (typeof data.kits)[number]) => boolean) =>
      data.kits.filter(pred).length;
    expect(cov((k) => !!k.folk_name)).toBe(506);
    expect(cov((k) => !!k.game)).toBe(506);
    expect(cov((k) => k.era_year != null)).toBe(506);
    expect(cov((k) => !!k.stabilization_patch)).toBe(15);
    // The build script also stamps the same counts.
    if (data.provenance_coverage) {
      expect(data.provenance_coverage.folk_name).toBe(506);
      expect(data.provenance_coverage.era_year).toBe(506);
      expect(data.provenance_coverage.stabilization_patch).toBe(15);
    }
  });

  it('ZERO invented strings: every kit field equals its sidecar row (traceability)', () => {
    const bySide = new Map(sidecar.rows.map((r) => [r.kit_id, r]));
    for (const k of data.kits) {
      const s = bySide.get(k.kit_id);
      expect(s, `kit ${k.kit_id} must have a sidecar row`).toBeTruthy();
      expect(k.folk_name).toBe(s!.folk_name);
      expect(k.game).toBe(s!.game);
      expect(k.era_year).toBe(s!.era_year);
      expect(k.stabilization_patch).toBe(s!.stabilization_patch);
    }
  });

  it('spot-check: chr-arrow-storm-warden -> Arrow Storm Warden / chronicon / 2020', () => {
    const k = data.kits.find((k) => k.kit_id === 'chr-arrow-storm-warden')!;
    expect(k.folk_name).toBe('Arrow Storm Warden');
    expect(k.game).toBe('chronicon');
    expect(k.era_year).toBe(2020);
  });
});
