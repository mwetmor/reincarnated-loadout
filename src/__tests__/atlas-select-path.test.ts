// atlas-select-path.test.ts — the chart<->table bridge helpers (spec §5, §9.3, #56).
//
// D3 (spec §9.3, Matt 2026-07-15): pivot grouping + lens interaction retired —
// pivots→filters, zoom→fixed S_max. The ancestorPathsForItem drill-path derivation
// (which expanded pivot node paths) is DELETED with its tests — the body is ONE flat
// table now, so a chart→table reveal scrollIntoView's the flat leaf row by leafDomId.
// What SURVIVES + is asserted here: the ruled data seams and the leaf-selection bridge.
//   Seam A: aggregate meso glyph -> select by its representative data-core.
//   Seam B: drill-in ground (data-el=ghost, NO data-core) is UNWIRABLE -> null.

import { describe, it, expect } from 'vitest';
import {
  hookToSelection,
  itemToSelection,
  isSelectedItem,
  selectionKey,
  leafDomId,
} from '../utils/atlasSelectPath';
import type { PivotItem } from '../utils/atlasPivot';
import type { AtlasKitRow, AtlasGhostRow } from '../data/atlasTypes';

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

describe('isSelectedItem + selectionKey', () => {
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

  it('selectionKey mirrors leafSelectionKey form (k:<id> / g:<core>)', () => {
    expect(selectionKey({ kind: 'kit', kitId: 'a' })).toBe('k:a');
    expect(selectionKey({ kind: 'ghost', core: 'A|B|C' })).toBe('g:A|B|C');
    expect(selectionKey(null)).toBeNull();
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
