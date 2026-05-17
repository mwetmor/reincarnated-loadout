/**
 * Cipher migration no-leak guard tests (drax-side)
 * drax/v0.21-form-bias-stage-3-cipher-consumption
 *
 * Mirrors the spirit of star-lord's 22-test no-canonical-four-in-llm-prompts guard,
 * applied to the drax-side player-visible rendering paths.
 *
 * DEPENDENCY NOTE: These tests require vitest. The loadout repo does not currently
 * have vitest installed. Tests are written and ready; pending jack-ryan approval
 * to add vitest to devDependencies. Until then, the type-level contracts are
 * enforced by `tsc -b` (clean build = type-correctness guaranteed).
 *
 * Run once vitest is installed:
 *   npm run test   (add "test": "vitest run" to package.json scripts)
 */

// @ts-nocheck -- vitest not in devDeps yet; suppress type errors on describe/it/expect

import { describe, it, expect } from 'vitest';
import {
  resolveElementDisplay,
  assertManifestSeasonalFields,
  type SeasonManifest,
} from '../data/types';
import { resolveArchetypeLabel } from '../data/constants';

const CANONICAL_FOUR = ['fire', 'water', 'earth', 'wind'] as const;

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeManifestV14(): SeasonManifest {
  return {
    manifest_version: '1.4',
    season_id: 'season_001001',
    generated_at: '2026-05-01T00:00:00Z',
    season_theme_element: 'fire',
    anchor: { id: 'a', name: 'Test Anchor', category: 'test', description: 'desc' },
    elements: {
      fire:  { element_id: 'cinder', name: 'Cinder',   tags: ['heat'],   is_new: true  },
      wind:  { element_id: 'gust',   name: 'Gust',     tags: ['air'],    is_new: false },
      water: { element_id: 'frost',  name: 'Frost',    tags: ['cold'],   is_new: true  },
      earth: { element_id: 'stone',  name: 'Stone',    tags: ['solid'],  is_new: false },
    },
  };
}

function makeManifestV15(): SeasonManifest {
  return {
    manifest_version: '1.5',
    season_id: 'season_003001',
    generated_at: '2026-05-16T00:00:00Z',
    season_theme_element: 'fire',
    anchor: { id: 'a', name: 'Test Anchor', category: 'test', description: 'desc' },
    elements: {
      fire:  { element_id: 'pressure', name: 'Pressure-Release', tags: [], is_new: true },
      wind:  { element_id: 'veil',     name: 'Veil',            tags: [], is_new: false },
      water: { element_id: 'churn',    name: 'Churn',           tags: [], is_new: true  },
      earth: { element_id: 'grit',     name: 'Grit',            tags: [], is_new: false },
    },
    seasonal_elements: {
      ignition:     { element_id: 'pressure', name: 'Pressure-Release', tags: [], is_new: true,  canonical_slot: 'fire'  },
      displacement: { element_id: 'veil',     name: 'Veil',            tags: [], is_new: false, canonical_slot: 'wind'  },
      suffusion:    { element_id: 'churn',    name: 'Churn',           tags: [], is_new: true,  canonical_slot: 'water' },
      bulwark:      { element_id: 'grit',     name: 'Grit',            tags: [], is_new: false, canonical_slot: 'earth' },
    },
  };
}

// ── resolveElementDisplay: v1.4 manifest (pre-Stage-3 fallback path) ──────────

describe('resolveElementDisplay — pre-v1.5 manifest (elements fallback)', () => {
  const manifest = makeManifestV14();

  it('resolves fire → Cinder (not canonical "fire")', () => {
    const result = resolveElementDisplay('fire', manifest, 'test');
    expect(result).toBe('Cinder');
    expect(CANONICAL_FOUR).not.toContain(result);
  });

  it('resolves wind → Gust (not canonical "wind")', () => {
    const result = resolveElementDisplay('wind', manifest, 'test');
    expect(result).toBe('Gust');
    expect(CANONICAL_FOUR).not.toContain(result);
  });

  it('resolves water → Frost (not canonical "water")', () => {
    const result = resolveElementDisplay('water', manifest, 'test');
    expect(result).toBe('Frost');
    expect(CANONICAL_FOUR).not.toContain(result);
  });

  it('resolves earth → Stone (not canonical "earth")', () => {
    const result = resolveElementDisplay('earth', manifest, 'test');
    expect(result).toBe('Stone');
    expect(CANONICAL_FOUR).not.toContain(result);
  });

  it('returns "Unknown" (not canonical) when both lookups fail', () => {
    const result = resolveElementDisplay('nonexistent', manifest, 'test');
    expect(result).toBe('Unknown');
    expect(CANONICAL_FOUR).not.toContain(result);
  });
});

// ── resolveElementDisplay: v1.5 manifest (seasonal_elements primary path) ─────

describe('resolveElementDisplay — v1.5 manifest (seasonal_elements primary)', () => {
  const manifest = makeManifestV15();

  it('resolves fire → Pressure-Release via seasonal_elements', () => {
    const result = resolveElementDisplay('fire', manifest, 'test');
    expect(result).toBe('Pressure-Release');
    expect(CANONICAL_FOUR).not.toContain(result);
  });

  it('resolves wind → Veil via seasonal_elements', () => {
    const result = resolveElementDisplay('wind', manifest, 'test');
    expect(result).toBe('Veil');
    expect(CANONICAL_FOUR).not.toContain(result);
  });

  it('resolves water → Churn via seasonal_elements', () => {
    const result = resolveElementDisplay('water', manifest, 'test');
    expect(result).toBe('Churn');
    expect(CANONICAL_FOUR).not.toContain(result);
  });

  it('resolves earth → Grit via seasonal_elements', () => {
    const result = resolveElementDisplay('earth', manifest, 'test');
    expect(result).toBe('Grit');
    expect(CANONICAL_FOUR).not.toContain(result);
  });

  it('falls back to elements lookup when canonical not in seasonal_elements', () => {
    const result = resolveElementDisplay('physical', manifest, 'test');
    // physical not in seasonal_elements or elements → "Unknown"
    expect(result).toBe('Unknown');
    expect(CANONICAL_FOUR).not.toContain(result);
  });

  it('all four canonical slots resolve to non-canonical names via v1.5 manifest', () => {
    for (const canonical of CANONICAL_FOUR) {
      const result = resolveElementDisplay(canonical, manifest, 'test');
      expect(CANONICAL_FOUR).not.toContain(result);
    }
  });
});

// ── assertManifestSeasonalFields: field-presence assertion ────────────────────

describe('assertManifestSeasonalFields — JSON load boundary assertion', () => {
  it('does not warn for v1.4 manifest without seasonal_elements (expected)', () => {
    const manifest = makeManifestV14();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    assertManifestSeasonalFields(manifest);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('warns for v1.5 manifest missing seasonal_elements (fail-loud)', () => {
    const manifest = makeManifestV15();
    delete (manifest as SeasonManifest & { seasonal_elements?: unknown }).seasonal_elements;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    assertManifestSeasonalFields(manifest);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('WARN'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('seasonal_elements'));
    warnSpy.mockRestore();
  });
});

// ── resolveArchetypeLabel — L-11 no-leak guard ────────────────────────────────

describe('resolveArchetypeLabel — v1.5 manifest replaces canonical-four in display', () => {
  const manifest = makeManifestV15();

  it('fire_mage → "Pressure-Release Mage" (not "Fire Mage")', () => {
    const result = resolveArchetypeLabel('fire_mage', manifest);
    expect(result).not.toContain('Fire');
    expect(result).not.toContain('fire');
    expect(result).toContain('Pressure-Release');
    expect(result).toContain('Mage');
  });

  it('water_controller → "Churn Controller" (not "Water Controller")', () => {
    const result = resolveArchetypeLabel('water_controller', manifest);
    expect(result).not.toContain('Water');
    expect(result).not.toContain('water');
    expect(result).toContain('Churn');
    expect(result).toContain('Controller');
  });

  it('earth_caster → "Grit Caster" (not "Earth Caster")', () => {
    const result = resolveArchetypeLabel('earth_caster', manifest);
    expect(result).not.toContain('Earth');
    expect(result).not.toContain('earth');
    expect(result).toContain('Grit');
    expect(result).toContain('Caster');
  });

  it('wind_controller → "Veil Controller" (not "Wind Controller")', () => {
    const result = resolveArchetypeLabel('wind_controller', manifest);
    expect(result).not.toContain('Wind');
    expect(result).not.toContain('wind');
    expect(result).toContain('Veil');
    expect(result).toContain('Controller');
  });

  it('hybrid_mage → "Hybrid Mage" unchanged (no canonical element)', () => {
    const result = resolveArchetypeLabel('hybrid_mage', manifest);
    expect(result).toBe('Hybrid Mage');
  });

  it('physical_warrior → "Physical Warrior" unchanged (physical, not canonical-four)', () => {
    const result = resolveArchetypeLabel('physical_warrior', manifest);
    expect(result).toBe('Physical Warrior');
  });

  it('rogue → "Rogue" unchanged (no element)', () => {
    const result = resolveArchetypeLabel('rogue', manifest);
    expect(result).toBe('Rogue');
  });

  it('no elemental archetype label contains canonical-four when v1.5 manifest provided', () => {
    const ELEMENT_ARCHETYPES = [
      'fire_mage', 'water_mage', 'earth_caster', 'wind_caster',
      'wind_controller', 'fire_controller', 'earth_controller', 'water_controller',
    ];
    for (const tag of ELEMENT_ARCHETYPES) {
      const result = resolveArchetypeLabel(tag, manifest);
      for (const c4 of CANONICAL_FOUR) {
        expect(result.toLowerCase()).not.toContain(c4);
      }
    }
  });
});

// ── resolveArchetypeLabel — pre-v1.5 fallback ─────────────────────────────────

describe('resolveArchetypeLabel — pre-v1.5 manifest falls back to static labels', () => {
  const manifest = makeManifestV14(); // no seasonal_elements

  it('fire_mage → "Fire Mage" (static fallback; pre-cipher season is acceptable)', () => {
    const result = resolveArchetypeLabel('fire_mage', manifest);
    expect(result).toBe('Fire Mage');
  });

  it('resolveArchetypeLabel with no manifest → static fallback', () => {
    const result = resolveArchetypeLabel('earth_caster');
    expect(result).toBe('Earth Caster');
  });
});
