// atlas-select-path.test.ts — the chart<->table bridge helpers (spec §5, #34).
//
// Covers the ruled data seams (gandalf):
//   Seam A: aggregate meso glyph -> select by its representative data-core.
//   Seam B: drill-in ground (data-el=ghost, NO data-core) is UNWIRABLE -> null.
// And the path derivation used to drill the table open to a leaf (chart->table),
// asserted to mirror atlasPivot.groupChildren's real node paths.

import { describe, it, expect } from 'vitest';
import {
  hookToSelection,
  itemToSelection,
  ancestorPathsForItem,
  isSelectedItem,
  leafDomId,
} from '../utils/atlasSelectPath';
import { buildDefaultLevels, groupChildren, type PivotItem } from '../utils/atlasPivot';
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
    row: { core, depth: 1, lit: false, kit_count: 0, x: 1, y: 1, quadrant: 'EN', ...partial },
  };
}

describe('hookToSelection — ruled data seams', () => {
  it('live single -> kit selection by data-kit', () => {
    expect(hookToSelection({ el: 'live', kit: 'chr-arrow-storm-warden', core: null })).toEqual({
      kind: 'kit',
      kitId: 'chr-arrow-storm-warden',
    });
  });

  it('condensation member -> kit selection by its OWN data-kit (member list is display-only)', () => {
    expect(hookToSelection({ el: 'condensation', kit: 'd2-bvc', core: null })).toEqual({
      kind: 'kit',
      kitId: 'd2-bvc',
    });
  });

  it('graveyard -> kit selection by data-kit', () => {
    expect(hookToSelection({ el: 'graveyard', kit: 'd2-blade-sin', core: null })).toEqual({
      kind: 'kit',
      kitId: 'd2-blade-sin',
    });
  });

  it('meso ghost (has data-core) -> ghost selection (seam A representative)', () => {
    const core = 'FREE-MOVE|BEAM|control|taunt|light|active|one-shot';
    expect(hookToSelection({ el: 'ghost', kit: null, core })).toEqual({ kind: 'ghost', core });
  });

  it('SEAM B: drill-in ground (data-el=ghost, NO data-core) is UNWIRABLE -> null', () => {
    expect(hookToSelection({ el: 'ghost', kit: null, core: null })).toBeNull();
  });

  it('no data-el (empty canvas / chrome) -> null', () => {
    expect(hookToSelection({ el: null, kit: null, core: null })).toBeNull();
  });
});

describe('itemToSelection — table row -> selection', () => {
  it('kit row -> kit_id', () => {
    expect(itemToSelection(kit({ kit_id: 'x' }))).toEqual({ kind: 'kit', kitId: 'x' });
  });
  it('ghost row -> |-joined core (byte-matches SVG data-core)', () => {
    const core = ['WALK', 'NOVA', 'damage', 'none', 'solo', 'active', 'one-shot'];
    expect(itemToSelection(ghost(core))).toEqual({ kind: 'ghost', core: core.join('|') });
  });
});

describe('isSelectedItem', () => {
  it('matches kit by id, ghost by core; null selection => false', () => {
    const k = kit({ kit_id: 'a' });
    const g = ghost(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(isSelectedItem(k, { kind: 'kit', kitId: 'a' })).toBe(true);
    expect(isSelectedItem(k, { kind: 'kit', kitId: 'b' })).toBe(false);
    expect(isSelectedItem(g, { kind: 'ghost', core: 'A|B|C|D|E|F|G' })).toBe(true);
    expect(isSelectedItem(g, null)).toBe(false);
    // Cross-kind never matches.
    expect(isSelectedItem(k, { kind: 'ghost', core: 'A|B|C|D|E|F|G' })).toBe(false);
  });
});

describe('leafDomId — DOM-id-safe', () => {
  it('sanitises pipe + special chars to id-safe tokens', () => {
    const id = leafDomId(ghost(['FREE-MOVE', 'BEAM', 'x', 'y', 'z', 'active', 'build→spend']));
    expect(id).toMatch(/^atlas-leaf-[-\w]+$/); // only [-\w] after prefix
    expect(id).not.toContain('|');
    expect(id).not.toContain('→');
  });
});

describe('ancestorPathsForItem — mirrors groupChildren real node paths', () => {
  const levels = buildDefaultLevels(CORE_ORDER);

  // Walk the real tree following the derived paths; assert each is a real node.
  function walk(item: PivotItem, root: PivotItem[]) {
    const paths = ancestorPathsForItem(item, levels);
    let items = root;
    let levelIndex = 0;
    let parentPath = '';
    for (const expectPath of paths) {
      const { children, nextLevelIndex } = groupChildren(items, levels, levelIndex, parentPath);
      const node = children.find((c) => c.path === expectPath);
      expect(node, `path "${expectPath}" should be a real node`).toBeTruthy();
      items = node!.items;
      levelIndex = nextLevelIndex;
      parentPath = node!.path;
      if (node!.isLeafGroup) break;
    }
    // The leaf must be present under the last opened node.
    return items.some((it) => isSelectedItem(it, itemToSelection(item)));
  }

  const SAMPLE: PivotItem[] = [
    kit({ kit_id: 'live-EN', x: 1, y: 1 }),
    kit({ kit_id: 'whirl-ES', condensation: 'WHIRLWIND', x: 1, y: -1, quadrant: 'ES' }),
    kit({ kit_id: 'grave-1', cls: 'graveyard', death_class: 'intrinsic-red', x: -1, y: 1 }),
    ghost(['FREE-MOVE', 'BEAM', 'control', 'taunt', 'light', 'active', 'one-shot'], {
      x: 1,
      y: -1,
    }),
  ];

  it('live single: EAST/NORTH/Kits/Live Kits/Single leaf mounts', () => {
    expect(walk(SAMPLE[0], SAMPLE)).toBe(true);
    expect(ancestorPathsForItem(SAMPLE[0], levels)).toEqual([
      'EAST',
      'EAST/NORTH',
      'EAST/NORTH/Kits',
      'EAST/NORTH/Kits/Live Kits',
      'EAST/NORTH/Kits/Live Kits/Single',
    ]);
  });

  it('condensation member: drills to Condensation: WHIRLWIND leaf', () => {
    expect(walk(SAMPLE[1], SAMPLE)).toBe(true);
    expect(ancestorPathsForItem(SAMPLE[1], levels).at(-1)).toBe(
      'EAST/SOUTH/Kits/Live Kits/Condensation: WHIRLWIND'
    );
  });

  it('graveyard kit: drills to the Graveyard leaf group', () => {
    expect(walk(SAMPLE[2], SAMPLE)).toBe(true);
    expect(ancestorPathsForItem(SAMPLE[2], levels).at(-1)).toBe('WEST/NORTH/Kits/Graveyard');
  });

  it('meso ghost: drills through all 7 core axes to the cell leaf', () => {
    expect(walk(SAMPLE[3], SAMPLE)).toBe(true);
    const paths = ancestorPathsForItem(SAMPLE[3], levels);
    expect(paths.at(-1)).toBe(
      'EAST/SOUTH/Ghosts/FREE-MOVE/BEAM/control/taunt/light/active/one-shot'
    );
  });

  it('respects drag-reorder: condensation ABOVE axes spans quadrants', () => {
    const base = buildDefaultLevels(CORE_ORDER);
    const cond = base.find((l) => l.id === 'kit-condensation')!;
    const reordered = [cond, ...base.filter((l) => l.id !== 'kit-condensation')];
    const paths = ancestorPathsForItem(SAMPLE[1], reordered);
    // Condensation keys FIRST now.
    expect(paths[0]).toBe('Condensation: WHIRLWIND');
  });
});
