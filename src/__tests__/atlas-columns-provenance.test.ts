// atlas-columns-provenance.test.ts — the D1-g column model + D1-h build names.
//
// D1-g: ghost core axes are COLUMNS. Build (kit) rows show — in axis columns;
//        ghost rows show their core[i] tuple values.
// D1-h: build leaf rows read `folk_name — game year (patch)` (patch only when
//        present, year omitted when absent); every string traces to a corpus field.

import { describe, it, expect } from 'vitest';
import { buildLeafColumns, totalGrow, NA } from '../utils/atlasColumns';
import { buildProvenanceName, displayGame, type PivotItem } from '../utils/atlasPivot';
import type { AtlasKitRow, AtlasGhostRow } from '../data/atlasTypes';

const CORE_ORDER = [
  'movement',
  'delivery',
  'treatment',
  'function',
  'proxy',
  'activation',
  'dependency',
];

function kit(partial: Partial<AtlasKitRow>): PivotItem {
  return {
    kind: 'kit',
    row: {
      kit_id: 'chr-arrow-storm-warden',
      cls: 'live',
      condensation: null,
      death_class: null,
      x: 1,
      y: 1,
      quadrant: 'EN',
      folk_name: 'Arrow Storm Warden',
      game: 'chronicon',
      era_year: 2020,
      stabilization_patch: null,
      ...partial,
    } as AtlasKitRow,
  };
}

function ghost(core: string[], partial: Partial<AtlasGhostRow> = {}): PivotItem {
  return {
    kind: 'ghost',
    row: { core, depth: 74340, lit: false, kit_count: 0, x: 1, y: 1, quadrant: 'EN', ...partial },
  };
}

describe('D1-g column model', () => {
  const columns = buildLeafColumns(CORE_ORDER);

  it('has build cols + 7 axis cols (core_order verbatim) + metric cols', () => {
    const axis = columns.filter((c) => c.group === 'axis');
    expect(axis.map((c) => c.label)).toEqual(CORE_ORDER); // verbatim, in order
    expect(axis.map((c) => c.id)).toEqual(CORE_ORDER.map((n) => `axis:${n}`));
    // Build cols present (name/family/death); metric cols present (depth/lit/builds).
    expect(columns.filter((c) => c.group === 'build').map((c) => c.id)).toEqual([
      'name',
      'family',
      'death',
    ]);
    expect(columns.filter((c) => c.group === 'metric').map((c) => c.id)).toEqual([
      'depth',
      'lit',
      'builds',
    ]);
    expect(totalGrow(columns)).toBeGreaterThan(0);
  });

  it('GHOST rows populate the 7 axis columns from core[i]; build cols show —', () => {
    const core = ['FREE-MOVE', 'BEAM', 'control', 'blind', 'heavy', 'active', 'one-shot'];
    const g = ghost(core, { depth: 74340, lit: true, kit_count: 3 });
    const axisCols = columns.filter((c) => c.group === 'axis');
    axisCols.forEach((col, i) => {
      expect(col.cell(g)).toBe(core[i]); // exact emitted tuple value
    });
    // Build columns are NA for ghosts.
    for (const col of columns.filter((c) => c.group === 'build')) {
      expect(col.cell(g)).toBe(NA);
    }
    // Metric columns populated for ghosts.
    expect(columns.find((c) => c.id === 'depth')!.cell(g)).toBe('74,340');
    expect(columns.find((c) => c.id === 'lit')!.cell(g)).toBe('LIT');
    expect(columns.find((c) => c.id === 'builds')!.cell(g)).toBe('3');
  });

  it('BUILD rows show — in ALL 7 axis columns (no per-kit core code exists)', () => {
    const k = kit({});
    for (const col of columns.filter((c) => c.group === 'axis')) {
      expect(col.cell(k)).toBe(NA); // never invent a single-valued core for builds
    }
    // Metric columns NA for builds.
    for (const col of columns.filter((c) => c.group === 'metric')) {
      expect(col.cell(k)).toBe(NA);
    }
  });
});

describe('D1-h build provenance names', () => {
  it('folk_name — Game year  (full: year present, no patch)', () => {
    const k = kit({ folk_name: 'Arrow Storm Warden', game: 'chronicon', era_year: 2020 });
    expect(k.kind).toBe('kit');
    if (k.kind === 'kit') expect(buildProvenanceName(k.row)).toBe('Arrow Storm Warden — Chronicon 2020');
  });

  it('appends the patch only when present', () => {
    const k = kit({ folk_name: 'Crown Proc Engine', game: 'chronicon', era_year: 2020, stabilization_patch: '1.52' });
    if (k.kind === 'kit')
      expect(buildProvenanceName(k.row)).toBe('Crown Proc Engine — Chronicon 2020 (1.52)');
  });

  it('omits the year when absent (name — Game only)', () => {
    const k = kit({ folk_name: 'Some Build', game: 'poe1', era_year: null, stabilization_patch: null });
    if (k.kind === 'kit') expect(buildProvenanceName(k.row)).toBe('Some Build — Poe1');
  });

  it('displayGame title-cases the corpus slug mechanically (zero invention)', () => {
    expect(displayGame('chronicon')).toBe('Chronicon');
    expect(displayGame('poe1')).toBe('Poe1'); // NOT 'Path of Exile' — that would fabricate
    expect(displayGame('d2')).toBe('D2');
    expect(displayGame(null)).toBeNull();
    expect(displayGame('')).toBeNull();
  });

  it('missing folk_name falls back to kit_id (defensive; build guard prevents on atlas)', () => {
    const k = kit({ folk_name: null, kit_id: 'zz-orphan' });
    if (k.kind === 'kit') expect(buildProvenanceName(k.row)).toBe('zz-orphan');
  });
});
