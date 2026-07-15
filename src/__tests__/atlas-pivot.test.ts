// atlas-pivot.test.ts — pivot-engine conformance (spec §7 #33 pivot-conformance).
//
// Proves: (1) default hierarchy nests axis-x > axis-y > entity > kit-liveness
// > kit-condensation > ghost cores; (2) drag-reorder incl. condensations-ABOVE-
// axes yields condensation groups spanning all quadrants; (3) ghost rows group
// by core-axis levels; (4) grouping is progressive (built lazily per node).

import { describe, it, expect } from 'vitest';
import {
  buildDefaultLevels,
  groupChildren,
  type PivotItem,
  type PivotLevelDef,
} from '../utils/atlasPivot';
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
      kit_id: 'k',
      cls: 'live',
      condensation: null,
      death_class: null,
      x: 1,
      y: 1,
      quadrant: 'EN',
      ...partial,
    } as AtlasKitRow,
  };
}

function ghost(core: string[], partial: Partial<AtlasGhostRow> = {}): PivotItem {
  return {
    kind: 'ghost',
    row: {
      core,
      depth: 1000,
      lit: false,
      kit_count: 0,
      x: 1,
      y: 1,
      quadrant: 'EN',
      ...partial,
    } as AtlasGhostRow,
  };
}

// A small mixed sample covering all four quadrants + all kit sub-kinds + ghosts.
const SAMPLE: PivotItem[] = [
  // Live single kits in each quadrant
  kit({ kit_id: 'live-EN', x: 1, y: 1, quadrant: 'EN' }),
  kit({ kit_id: 'live-WS', x: -1, y: -1, quadrant: 'WS' }),
  // Condensation members across quadrants (WHIRLWIND spans EN + WS)
  kit({ kit_id: 'whirl-EN', condensation: 'WHIRLWIND', x: 1, y: 1, quadrant: 'EN' }),
  kit({ kit_id: 'whirl-WS', condensation: 'WHIRLWIND', x: -1, y: -1, quadrant: 'WS' }),
  kit({ kit_id: 'totem-ES', condensation: 'TOTEM-SENTRY', x: 1, y: -1, quadrant: 'ES' }),
  // Graveyard kit
  kit({ kit_id: 'grave-1', cls: 'graveyard', condensation: null, death_class: 'intrinsic-red', x: 1, y: -1, quadrant: 'ES' }),
  // Ghost rows
  ghost(['FREE-MOVE', 'BEAM', 'control', 'blind', 'heavy', 'active', 'one-shot'], { x: 1, y: 1 }),
  ghost(['WALK', 'NOVA', 'damage', 'none', 'solo', 'active', 'one-shot'], { x: -1, y: 1 }),
];

describe('atlas pivot — default hierarchy', () => {
  const levels = buildDefaultLevels(CORE_ORDER);

  it('exposes the 12 default levels in spec order', () => {
    const ids = levels.map((l) => l.id);
    expect(ids).toEqual([
      'axis-x',
      'axis-y',
      'entity',
      'kit-liveness',
      'kit-condensation',
      'ghost:movement',
      'ghost:delivery',
      'ghost:treatment',
      'ghost:function',
      'ghost:proxy',
      'ghost:activation',
      'ghost:dependency',
    ]);
  });

  it('top level splits WEST | EAST', () => {
    const { children } = groupChildren(SAMPLE, levels, 0, '');
    const labels = children.map((c) => c.label).sort();
    expect(labels).toEqual(['EAST', 'WEST']);
    // Counts reconcile with the sample.
    const total = children.reduce((n, c) => n + c.count, 0);
    expect(total).toBe(SAMPLE.length);
  });

  it('second level (within EAST) splits NORTH | SOUTH', () => {
    const { children } = groupChildren(SAMPLE, levels, 0, '');
    const east = children.find((c) => c.label === 'EAST')!;
    const { children: ns } = groupChildren(east.items, levels, 1, east.path);
    expect(ns.map((c) => c.label).sort()).toEqual(['NORTH', 'SOUTH']);
  });

  it('drills Kits -> Live Kits -> {Condensations, Single}', () => {
    // Isolate one quadrant bucket with mixed kit kinds (EAST/NORTH: live-EN, whirl-EN).
    const east = groupChildren(SAMPLE, levels, 0, '').children.find((c) => c.label === 'EAST')!;
    const north = groupChildren(east.items, levels, 1, east.path).children.find(
      (c) => c.label === 'NORTH'
    )!;
    const entity = groupChildren(north.items, levels, 2, north.path).children;
    const kits = entity.find((c) => c.label === 'Kits')!;
    const liveness = groupChildren(kits.items, levels, 3, kits.path).children;
    const liveKits = liveness.find((c) => c.label === 'Live Kits')!;
    const cond = groupChildren(liveKits.items, levels, 4, liveKits.path).children;
    const condLabels = cond.map((c) => c.label).sort();
    // EN live kits: 'live-EN' (single) + 'whirl-EN' (WHIRLWIND).
    expect(condLabels).toContain('Single');
    expect(condLabels).toContain('Condensation: WHIRLWIND');
  });

  it('ghost rows group by ghost core axes, not kit dimensions', () => {
    // Take EAST/NORTH -> Ghosts branch.
    const east = groupChildren(SAMPLE, levels, 0, '').children.find((c) => c.label === 'EAST')!;
    const north = groupChildren(east.items, levels, 1, east.path).children.find(
      (c) => c.label === 'NORTH'
    )!;
    const entity = groupChildren(north.items, levels, 2, north.path).children;
    const ghosts = entity.find((c) => c.label === 'Ghosts')!;
    // kit-liveness + kit-condensation are null for ghosts => fall through to ghost:movement.
    const sub = groupChildren(ghosts.items, levels, 3, ghosts.path).children;
    expect(sub.some((c) => c.label === 'FREE-MOVE')).toBe(true);
  });
});

describe('atlas pivot — drag-reorder: Condensations ABOVE axes (Matt case)', () => {
  it('condensation groups span all quadrants when moved to top', () => {
    const base = buildDefaultLevels(CORE_ORDER);
    const condLevel = base.find((l) => l.id === 'kit-condensation')!;
    // Reordered: condensation FIRST, then axis-x, axis-y, then the rest.
    const reordered: PivotLevelDef[] = [
      condLevel,
      ...base.filter((l) => l.id !== 'kit-condensation'),
    ];
    const { children } = groupChildren(SAMPLE, reordered, 0, '');
    // WHIRLWIND is a single top-level node containing BOTH its EN and WS members.
    const whirl = children.find((c) => c.label === 'Condensation: WHIRLWIND');
    expect(whirl).toBeDefined();
    expect(whirl!.count).toBe(2); // whirl-EN + whirl-WS — spans EN and WS quadrants
    // Under WHIRLWIND, the NEXT level (axis-x) now splits its members by quadrant.
    const byX = groupChildren(whirl!.items, reordered, 1, whirl!.path).children;
    expect(byX.map((c) => c.label).sort()).toEqual(['EAST', 'WEST']);
  });
});
