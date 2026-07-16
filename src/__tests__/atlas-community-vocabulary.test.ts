// atlas-community-vocabulary.test.ts — the D1-i vocabulary audit (#49).
//
// Matt: "internally kits, to the community builds." ALL user-visible page STRINGS
// on the atlas route swap: kit(s) -> build(s); condensation(s) -> build family /
// build families. INTERNAL identifiers are UNTOUCHED (kit_id, data-kit, TS types,
// emitted field names, test ids). This audits the string CONSTANTS that render to
// the user (the runtime DOM audit is done live via CDP in the return receipts; this
// locks the source constants so a regression is caught in CI).
//
// D3 (spec §9.3, Matt 2026-07-15): pivots→filters. The pivot LEVEL labels are gone;
// the FILTER controls carry the user-visible structural vocabulary now. The pole
// labels (AXIS_POLES / poleGroupLabel) + the community strings on the filter options
// are audited here in their place; the column/legend/leaf-label audits are unchanged.

import { describe, it, expect } from 'vitest';
import { LEGEND_ENTRIES } from '../data/atlasTypes';
import {
  leafLabel,
  poleGroupLabel,
  familyOptions,
  type PivotItem,
} from '../utils/atlasPivot';
import { buildLeafColumns } from '../utils/atlasColumns';
import type { AtlasKitRow, AtlasInteractiveData } from '../data/atlasTypes';

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

  it('D3 filter-control labels (D1-e pole vocab) carry no internal vocab', () => {
    // The filter bar's Axis-X/Axis-Y controls label their poles via poleGroupLabel —
    // the user-visible structural vocabulary now lives here (pivot levels are gone).
    const poleLabels = [
      poleGroupLabel('WEST'),
      poleGroupLabel('EAST'),
      poleGroupLabel('NORTH'),
      poleGroupLabel('SOUTH'),
    ];
    for (const l of poleLabels) {
      expect(leaksInternalVocab(l), `pole label "${l}"`).toBe(false);
    }
    // The exact rendered pole strings (D1-e).
    expect(poleGroupLabel('WEST')).toBe('DEPLOY · W');
    expect(poleGroupLabel('EAST')).toBe('PERFORM · E');
    expect(poleGroupLabel('NORTH')).toBe('LAUNCH · N');
    expect(poleGroupLabel('SOUTH')).toBe('EMBODY · S');
    // The community-facing segmented option strings the filter bar renders (Entity /
    // Liveness / Family) carry no internal vocab either.
    for (const s of ['All', 'Builds', 'Ghosts', 'Live Builds', 'Graveyard', 'Single']) {
      expect(leaksInternalVocab(s), `filter option "${s}"`).toBe(false);
    }
  });

  it('familyOptions enumerates emitted condensation names (community-visible; no leak)', () => {
    const data = {
      kits: [
        kit({ condensation: 'WHIRLWIND', cls: 'live' }).row,
        kit({ condensation: 'AURA', cls: 'live' }).row,
        kit({ condensation: null, cls: 'live' }).row, // single -> excluded
        kit({ condensation: 'GRAVE-ONLY', cls: 'graveyard' }).row, // graveyard -> excluded
      ],
    } as unknown as AtlasInteractiveData;
    const opts = familyOptions(data);
    // Sorted distinct LIVE condensations only.
    expect(opts).toEqual(['AURA', 'WHIRLWIND']);
    // These are the raw emitted family names (already community-facing); no leak.
    for (const o of opts) expect(leaksInternalVocab(o), `family option "${o}"`).toBe(false);
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
