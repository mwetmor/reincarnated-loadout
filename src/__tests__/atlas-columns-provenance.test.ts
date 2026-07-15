// atlas-columns-provenance.test.ts — the D2 UNION column model + D1-h build names.
//
// D2-b/c: the leaf grid is a UNION of the ghost meso-7 + the build 14-axis engine key.
//   shared(5)   treatment · function · proxy · activation · dependency — BOTH grains
//   meso-only(2) movement · delivery — ghost populates (transformed register value);
//                builds show — (they carry their OWN key in the kit-only columns)
//   kit-only(9)  movement · delivery · amplitude · geometry · defense · economy · range
//                · tempo · commit — builds populate from engine_key; ghosts show —
//   `unknown` (curated) renders LITERALLY; `—` (NA) means NO DATA (blank/off-kind).
// D1-h: build leaf rows read `folk_name — game year (patch)`; every string traces to a
//   corpus field.

import { describe, it, expect } from 'vitest';
import {
  buildLeafColumns,
  totalGrow,
  prettifyAxis,
  SHARED_AXES,
  NA,
} from '../utils/atlasColumns';
import { buildProvenanceName, displayGame, type PivotItem } from '../utils/atlasPivot';
import type { AtlasKitRow, AtlasGhostRow, AtlasEngineKeyAxis } from '../data/atlasTypes';

// The ghost meso core order (verbatim, as emitted in pole_vocabulary.core_order).
const CORE_ORDER = [
  'movement',
  'delivery',
  'treatment',
  'function',
  'proxy',
  'activation',
  'dependency',
];

// The DERIVED 14-axis engine-key schema (mirrors pole_vocabulary.engine_key_axes; the
// part-order is the emitter's CK_IDX extended to 14 per the sidecar derivation receipt).
const ENGINE_KEY_AXES: AtlasEngineKeyAxis[] = [
  { pos: 0, axis: 'movement', column: 'mob_policy_while_casting', grain: 'kit', values: [] },
  { pos: 1, axis: 'delivery', column: 'delivery_value', grain: 'kit', values: [] },
  { pos: 2, axis: 'amplitude', column: 'amp_val', grain: 'kit', values: [] },
  { pos: 3, axis: 'geometry', column: 'geometry_value', grain: 'kit', values: [] },
  { pos: 4, axis: 'treatment', column: 'ctrl_treatment', grain: 'kit', values: [] },
  { pos: 5, axis: 'function', column: 'ctrl_function', grain: 'kit', values: [] },
  { pos: 6, axis: 'defense', column: 'def_bin', grain: 'kit', values: [] },
  { pos: 7, axis: 'economy', column: 'economy_model', grain: 'kit', values: [] },
  { pos: 8, axis: 'proxy', column: 'proxy_val', grain: 'kit', values: [] },
  { pos: 9, axis: 'range', column: 'range_val', grain: 'kit', values: [] },
  { pos: 10, axis: 'tempo', column: 'tempo_val', grain: 'kit', values: [] },
  { pos: 11, axis: 'commit', column: 'commit_val', grain: 'kit', values: [] },
  { pos: 12, axis: 'activation', column: 'activation_val', grain: 'kit', values: [] },
  { pos: 13, axis: 'dependency', column: 'dependency_val', grain: 'kit', values: [] },
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
      engine_key: null,
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

describe('D2 union column model', () => {
  const columns = buildLeafColumns(CORE_ORDER, ENGINE_KEY_AXES);

  it('shared axes are exactly the 5 emitter-proven-identical ones', () => {
    // Movement + delivery are NOT shared (emitter fit2reg transforms rename tokens).
    expect([...SHARED_AXES].sort()).toEqual(
      ['activation', 'dependency', 'function', 'proxy', 'treatment'].sort()
    );
  });

  it('column layout: build · shared(5) · meso-only(2) · kit-only(9) · metric', () => {
    const build = columns.filter((c) => c.group === 'build');
    const metric = columns.filter((c) => c.group === 'metric');
    const shared = columns.filter((c) => c.axisGrain === 'shared');
    const meso = columns.filter((c) => c.axisGrain === 'meso');
    const kitOnly = columns.filter((c) => c.axisGrain === 'kit');

    expect(build.map((c) => c.id)).toEqual(['name', 'family', 'death']);
    expect(metric.map((c) => c.id)).toEqual(['depth', 'lit', 'builds']);

    // shared = the 5, ordered by ghost core_order (treatment, function, proxy, ...).
    expect(shared.map((c) => c.id)).toEqual([
      'axis:treatment',
      'axis:function',
      'axis:proxy',
      'axis:activation',
      'axis:dependency',
    ]);
    // meso-only = the ghost core axes NOT shared, in core_order: movement, delivery.
    expect(meso.map((c) => c.id)).toEqual(['axis:meso:movement', 'axis:meso:delivery']);
    // kit-only = engine-key axes NOT shared, ordered by pos: movement(0), delivery(1),
    // amplitude(2), geometry(3), defense(6), economy(7), range(9), tempo(10), commit(11).
    expect(kitOnly.map((c) => c.id)).toEqual([
      'axis:kit:movement',
      'axis:kit:delivery',
      'axis:kit:amplitude',
      'axis:kit:geometry',
      'axis:kit:defense',
      'axis:kit:economy',
      'axis:kit:range',
      'axis:kit:tempo',
      'axis:kit:commit',
    ]);

    // Ordering: shared block before meso block before kit block, between build & metric.
    const ids = columns.map((c) => c.id);
    expect(ids.indexOf('axis:treatment')).toBeLessThan(ids.indexOf('axis:meso:movement'));
    expect(ids.indexOf('axis:meso:delivery')).toBeLessThan(ids.indexOf('axis:kit:movement'));
    expect(ids.indexOf('name')).toBeLessThan(ids.indexOf('axis:treatment'));
    expect(ids.indexOf('axis:kit:commit')).toBeLessThan(ids.indexOf('depth'));
    expect(totalGrow(columns)).toBeGreaterThan(0);
  });

  it('SHARED columns: GHOST reads core[i]; BUILD reads engine_key[axis] (both grains)', () => {
    const core = ['FREE-MOVE', 'BEAM', 'control', 'blind', 'heavy', 'active', 'one-shot'];
    const g = ghost(core, { depth: 74340, lit: true, kit_count: 3 });
    // ghost: treatment=control(idx2), function=blind(3), proxy=heavy(4), activation=active(5), dependency=one-shot(6)
    expect(columns.find((c) => c.id === 'axis:treatment')!.cell(g)).toBe('control');
    expect(columns.find((c) => c.id === 'axis:function')!.cell(g)).toBe('blind');
    expect(columns.find((c) => c.id === 'axis:proxy')!.cell(g)).toBe('heavy');
    expect(columns.find((c) => c.id === 'axis:activation')!.cell(g)).toBe('active');
    expect(columns.find((c) => c.id === 'axis:dependency')!.cell(g)).toBe('one-shot');

    const k = kit({
      engine_key: {
        movement: 'walk',
        delivery: 'at-target',
        amplitude: 'var',
        geometry: 'ground_targeted_circle',
        treatment: 'damage',
        function: 'none',
        defense: 'mitigate',
        economy: 'unknown',
        proxy: 'solo',
        range: 'ranged',
        tempo: 'med',
        commit: 'instant',
        activation: 'active',
        dependency: 'one-shot',
      },
    });
    // build reads the SAME shared columns from engine_key.
    expect(columns.find((c) => c.id === 'axis:treatment')!.cell(k)).toBe('damage');
    expect(columns.find((c) => c.id === 'axis:function')!.cell(k)).toBe('none');
    expect(columns.find((c) => c.id === 'axis:proxy')!.cell(k)).toBe('solo');
    expect(columns.find((c) => c.id === 'axis:activation')!.cell(k)).toBe('active');
    expect(columns.find((c) => c.id === 'axis:dependency')!.cell(k)).toBe('one-shot');
  });

  it('MESO-only columns: ghost populates from core[i]; build shows —', () => {
    const core = ['FREE-MOVE', 'BEAM', 'control', 'blind', 'heavy', 'active', 'one-shot'];
    const g = ghost(core);
    expect(columns.find((c) => c.id === 'axis:meso:movement')!.cell(g)).toBe('FREE-MOVE');
    expect(columns.find((c) => c.id === 'axis:meso:delivery')!.cell(g)).toBe('BEAM');
    // build shows — in meso-only columns (it carries its own token in kit-only cols).
    const k = kit({ engine_key: { movement: 'walk', delivery: 'at-target' } });
    expect(columns.find((c) => c.id === 'axis:meso:movement')!.cell(k)).toBe(NA);
    expect(columns.find((c) => c.id === 'axis:meso:delivery')!.cell(k)).toBe(NA);
  });

  it('KIT-only columns: build populates from engine_key; ghost shows —', () => {
    const k = kit({
      engine_key: {
        movement: 'walk',
        delivery: 'at-target',
        amplitude: 'var',
        geometry: 'ground_targeted_circle',
        defense: 'mitigate',
        economy: 'unknown',
        range: 'ranged',
        tempo: 'med',
        commit: 'instant',
      },
    });
    expect(columns.find((c) => c.id === 'axis:kit:movement')!.cell(k)).toBe('walk');
    expect(columns.find((c) => c.id === 'axis:kit:delivery')!.cell(k)).toBe('at-target');
    expect(columns.find((c) => c.id === 'axis:kit:amplitude')!.cell(k)).toBe('var');
    expect(columns.find((c) => c.id === 'axis:kit:geometry')!.cell(k)).toBe('ground_targeted_circle');
    expect(columns.find((c) => c.id === 'axis:kit:defense')!.cell(k)).toBe('mitigate');
    expect(columns.find((c) => c.id === 'axis:kit:range')!.cell(k)).toBe('ranged');
    expect(columns.find((c) => c.id === 'axis:kit:tempo')!.cell(k)).toBe('med');
    expect(columns.find((c) => c.id === 'axis:kit:commit')!.cell(k)).toBe('instant');
    // ghost shows — in kit-only columns.
    const g = ghost(['FREE-MOVE', 'BEAM', 'control', 'blind', 'heavy', 'active', 'one-shot']);
    expect(columns.find((c) => c.id === 'axis:kit:movement')!.cell(g)).toBe(NA);
    expect(columns.find((c) => c.id === 'axis:kit:geometry')!.cell(g)).toBe(NA);
  });

  it('D2-b: `unknown` is a CURATED value rendered LITERALLY; blank/null -> NA (no data)', () => {
    // economy=unknown (curated) must render 'unknown', NOT NA.
    const k = kit({ engine_key: { economy: 'unknown', defense: null } });
    expect(columns.find((c) => c.id === 'axis:kit:economy')!.cell(k)).toBe('unknown');
    // defense=null (blank sentinel normalised to null) -> NA (no data).
    expect(columns.find((c) => c.id === 'axis:kit:defense')!.cell(k)).toBe(NA);
    // an axis absent from the engine_key map -> NA.
    expect(columns.find((c) => c.id === 'axis:kit:geometry')!.cell(k)).toBe(NA);
  });

  it('a build with NO engine_key shows — in every axis column (soft join)', () => {
    const k = kit({ engine_key: null });
    for (const col of columns.filter((c) => c.group === 'axis')) {
      expect(col.cell(k)).toBe(NA);
    }
  });

  it('header labels are the derived axis names, mechanically prettified (no new words)', () => {
    // prettify only title-cases + underscore->space; the token still traces to the axis.
    expect(prettifyAxis('movement')).toBe('Movement');
    expect(prettifyAxis('ground_targeted_circle')).toBe('Ground Targeted Circle');
    expect(prettifyAxis('apply→detonate')).toBe('Apply→detonate');
    // every axis column label is prettify(axisName) — never an invented string.
    const shared = columns.find((c) => c.id === 'axis:treatment')!;
    expect(shared.label).toBe('Treatment');
    const kitGeo = columns.find((c) => c.id === 'axis:kit:geometry')!;
    expect(kitGeo.label).toBe('Geometry');
    // tooltips carry the derived axis name + grain verbatim (D2-c).
    expect(shared.tooltip).toContain('treatment');
    expect(shared.tooltip).toContain('shared');
    expect(columns.find((c) => c.id === 'axis:meso:movement')!.tooltip).toContain('meso');
    expect(kitGeo.tooltip).toContain('geometry');
  });

  it('degrades to ghost-only axis columns when engine_key_axes is absent (pre-D2 JSON)', () => {
    const cols = buildLeafColumns(CORE_ORDER); // no engine-key schema
    // No kit-only columns; shared columns show — for builds (no engine_key source).
    expect(cols.filter((c) => c.axisGrain === 'kit')).toHaveLength(0);
    const g = ghost(['FREE-MOVE', 'BEAM', 'control', 'blind', 'heavy', 'active', 'one-shot']);
    // ghost still populates shared + meso columns from core[i].
    expect(cols.find((c) => c.id === 'axis:treatment')!.cell(g)).toBe('control');
    expect(cols.find((c) => c.id === 'axis:meso:movement')!.cell(g)).toBe('FREE-MOVE');
    // build shows — in shared columns when there is no engine-key source.
    const k = kit({ engine_key: { treatment: 'damage' } });
    expect(cols.find((c) => c.id === 'axis:treatment')!.cell(k)).toBe(NA);
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
