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
  poleGroupLabel,
  type PivotItem,
  type PivotLevelDef,
} from '../utils/atlasPivot';
import type { AtlasKitRow, AtlasGhostRow } from '../data/atlasTypes';

// D1-e pole labels used as pivot group KEYS.
const E = poleGroupLabel('EAST'); // 'PERFORM · E'
const W = poleGroupLabel('WEST'); // 'DEPLOY · W'
const N = poleGroupLabel('NORTH'); // 'LAUNCH · N'
const S = poleGroupLabel('SOUTH'); // 'EMBODY · S'

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
      folk_name: null,
      game: null,
      era_year: null,
      stabilization_patch: null,
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

describe('atlas pivot — default hierarchy (D1-g: five structural levels)', () => {
  const levels = buildDefaultLevels();

  it('exposes EXACTLY the 5 structural levels (no ghost:* levels)', () => {
    const ids = levels.map((l) => l.id);
    // D1-g: the seven ghost core axes are COLUMNS now, not pivot levels.
    expect(ids).toEqual(['axis-x', 'axis-y', 'entity', 'kit-liveness', 'kit-condensation']);
    // Assert NO ghost:* level leaked into the default hierarchy / chip list.
    expect(ids.some((id) => id.startsWith('ghost:'))).toBe(false);
  });

  it('D1-e level labels carry the pole vocabulary', () => {
    const byId = new Map(levels.map((l) => [l.id, l.label]));
    expect(byId.get('axis-x')).toBe('Axis-X (DEPLOY | PERFORM)');
    expect(byId.get('axis-y')).toBe('Axis-Y (LAUNCH | EMBODY)');
    // D1-i community vocabulary on the structural levels.
    expect(byId.get('entity')).toBe('Builds | Ghosts');
    expect(byId.get('kit-liveness')).toBe('Live Builds | Graveyard');
    expect(byId.get('kit-condensation')).toBe('Build Families | Single');
  });

  it('top level splits DEPLOY·W | PERFORM·E (x sign -> pole, D1-e)', () => {
    const { children } = groupChildren(SAMPLE, levels, 0, '');
    const labels = children.map((c) => c.label).sort();
    expect(labels).toEqual([W, E].sort());
    // Counts reconcile with the sample.
    const total = children.reduce((n, c) => n + c.count, 0);
    expect(total).toBe(SAMPLE.length);
  });

  it('second level (within PERFORM·E) splits LAUNCH·N | EMBODY·S', () => {
    const { children } = groupChildren(SAMPLE, levels, 0, '');
    const east = children.find((c) => c.label === E)!;
    const { children: ns } = groupChildren(east.items, levels, 1, east.path);
    expect(ns.map((c) => c.label).sort()).toEqual([N, S].sort());
  });

  it('drills Builds -> Live Builds -> {Build Families, Single} (D1-i)', () => {
    // Isolate one quadrant bucket with mixed kit kinds (E/N: live-EN, whirl-EN).
    const east = groupChildren(SAMPLE, levels, 0, '').children.find((c) => c.label === E)!;
    const north = groupChildren(east.items, levels, 1, east.path).children.find(
      (c) => c.label === N
    )!;
    const entity = groupChildren(north.items, levels, 2, north.path).children;
    const builds = entity.find((c) => c.label === 'Builds')!;
    const liveness = groupChildren(builds.items, levels, 3, builds.path).children;
    const liveBuilds = liveness.find((c) => c.label === 'Live Builds')!;
    const fam = groupChildren(liveBuilds.items, levels, 4, liveBuilds.path).children;
    const famLabels = fam.map((c) => c.label).sort();
    // EN live builds: 'live-EN' (single) + 'whirl-EN' (WHIRLWIND family).
    expect(famLabels).toContain('Single');
    expect(famLabels).toContain('Family: WHIRLWIND');
  });

  it('D1-g: ghosts bottom out at the Ghosts node — no deeper core-axis grouping', () => {
    // Take E/N -> Ghosts branch. With ghost levels removed, the Ghosts node's items
    // have NO further applicable level => it is a LEAF group (columns render axes).
    const east = groupChildren(SAMPLE, levels, 0, '').children.find((c) => c.label === E)!;
    const north = groupChildren(east.items, levels, 1, east.path).children.find(
      (c) => c.label === N
    )!;
    const entity = groupChildren(north.items, levels, 2, north.path).children;
    const ghosts = entity.find((c) => c.label === 'Ghosts')!;
    // No further grouping: groupChildren returns zero children (leaf frontier).
    const sub = groupChildren(ghosts.items, levels, 3, ghosts.path).children;
    expect(sub.length).toBe(0);
    expect(ghosts.isLeafGroup).toBe(true);
  });
});

describe('atlas pivot — drag-reorder: Build Families ABOVE axes (Matt case, D1-i)', () => {
  it('build-family groups span all quadrants when moved to top', () => {
    const base = buildDefaultLevels();
    const condLevel = base.find((l) => l.id === 'kit-condensation')!;
    // Reordered: build-family FIRST, then axis-x, axis-y, then the rest.
    const reordered: PivotLevelDef[] = [
      condLevel,
      ...base.filter((l) => l.id !== 'kit-condensation'),
    ];
    const { children } = groupChildren(SAMPLE, reordered, 0, '');
    // WHIRLWIND is a single top-level node containing BOTH its EN and WS members.
    const whirl = children.find((c) => c.label === 'Family: WHIRLWIND');
    expect(whirl).toBeDefined();
    expect(whirl!.count).toBe(2); // whirl-EN + whirl-WS — spans EN and WS quadrants
    // Under WHIRLWIND, the NEXT level (axis-x) now splits its members by pole (D1-e).
    const byX = groupChildren(whirl!.items, reordered, 1, whirl!.path).children;
    expect(byX.map((c) => c.label).sort()).toEqual([W, E].sort());
  });
});
