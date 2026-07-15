// atlas-community-vocabulary.test.ts — the D1-i vocabulary audit (#49).
//
// Matt: "internally kits, to the community builds." ALL user-visible page STRINGS
// on the atlas route swap: kit(s) -> build(s); condensation(s) -> build family /
// build families. INTERNAL identifiers are UNTOUCHED (kit_id, data-kit, TS types,
// emitted field names, test ids). This audits the string CONSTANTS that render to
// the user (the runtime DOM audit is done live via CDP in the return receipts; this
// locks the source constants so a regression is caught in CI).

import { describe, it, expect } from 'vitest';
import { LEGEND_ENTRIES } from '../data/atlasTypes';
import { buildDefaultLevels, leafLabel, poleGroupLabel, type PivotItem } from '../utils/atlasPivot';
import { buildLeafColumns } from '../utils/atlasColumns';
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

/** Case-insensitive: does a user-visible string leak 'kit' or 'condensation'? */
function leaksInternalVocab(s: string): boolean {
  return /\bkits?\b/i.test(s) || /\bcondensations?\b/i.test(s);
}

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
function ghost(core: string[]): PivotItem {
  return {
    kind: 'ghost',
    row: { core, depth: 1, lit: false, kit_count: 0, x: 1, y: 1, quadrant: 'EN' } as AtlasGhostRow,
  };
}

describe('D1-i community vocabulary — user-visible strings (#49)', () => {
  it('legend labels + hints use build(s) / build families', () => {
    for (const e of LEGEND_ENTRIES) {
      expect(leaksInternalVocab(e.label), `legend label "${e.label}"`).toBe(false);
      expect(leaksInternalVocab(e.hint), `legend hint "${e.hint}"`).toBe(false);
    }
    // Positive checks: the vocabulary actually landed.
    const labels = LEGEND_ENTRIES.map((e) => e.label);
    expect(labels).toContain('Live Builds');
    expect(labels).toContain('Build Families');
  });

  it('pivot level labels use build / build-family vocabulary', () => {
    for (const l of buildDefaultLevels()) {
      expect(leaksInternalVocab(l.label), `level label "${l.label}"`).toBe(false);
    }
    const byId = new Map(buildDefaultLevels().map((l) => [l.id, l.label]));
    expect(byId.get('entity')).toBe('Builds | Ghosts');
    expect(byId.get('kit-liveness')).toBe('Live Builds | Graveyard');
    expect(byId.get('kit-condensation')).toBe('Build Families | Single');
    // D1-e pole vocabulary rides along.
    expect(byId.get('axis-x')).toBe('Axis-X (DEPLOY | PERFORM)');
  });

  it('pivot group KEYS (the rendered path segments) carry no internal vocab', () => {
    const levels = buildDefaultLevels();
    const samples: PivotItem[] = [
      kit({ x: 1, y: 1 }),
      kit({ condensation: 'WHIRLWIND', x: -1, y: -1 }),
      kit({ cls: 'graveyard', death_class: 'intrinsic-red', x: -1, y: 1 }),
      ghost(['A', 'B', 'C', 'D', 'E', 'F', 'G']),
    ];
    for (const lvl of levels) {
      for (const it of samples) {
        const key = lvl.keyOf(it);
        if (key != null) expect(leaksInternalVocab(key), `group key "${key}"`).toBe(false);
      }
    }
    // The build-family group prefix is `Family: X`, never `Condensation: X`.
    const cond = levels.find((l) => l.id === 'kit-condensation')!;
    expect(cond.keyOf(kit({ condensation: 'WHIRLWIND' }))).toBe('Family: WHIRLWIND');
  });

  it('column HEADER labels carry no internal vocab (axis labels are core_order terms)', () => {
    for (const c of buildLeafColumns(CORE_ORDER)) {
      // 'Builds' (metric) is fine; assert no 'kit'/'condensation' leaks.
      expect(leaksInternalVocab(c.label), `column "${c.label}"`).toBe(false);
    }
  });

  it('leaf label for a build shows the build NAME (not the kit_id slug) + community family', () => {
    const l = leafLabel(kit({ condensation: 'WHIRLWIND' }));
    // The community NAME leads (not 'chr-arrow-storm-warden').
    expect(l).toContain('Arrow Storm Warden');
    expect(l).not.toMatch(/\bcondensation\b/i);
  });

  it('INTERNAL identifiers are UNTOUCHED (kit_id, data-kit, field names stay)', () => {
    // The kit ROW field is still kit_id; the sidecar-join fields are folk_name/game/…
    const k = kit({});
    if (k.kind === 'kit') {
      expect('kit_id' in k.row).toBe(true); // internal identifier preserved
      expect(k.row.kit_id).toBe('chr-arrow-storm-warden');
    }
    // poleGroupLabel is a helper name (code identifier) — not a user string; sanity.
    expect(poleGroupLabel('EAST')).toBe('PERFORM · E');
  });
});
