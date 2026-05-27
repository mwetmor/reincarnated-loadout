/**
 * cycle13-normal-season.test.ts — Cycle 13 normal-season integration tests
 *
 * Dispatch: 2026-05-27-drax-cycle-13-track-c-revised-step-2-consume-normal-season-plus-retire-gap-fill.md
 * MIGRATION.md § v2.3
 *
 * Coverage:
 *   - cycle-13-mechanical-season-001 manifest is discoverable (manifest.json present + valid)
 *   - 16 classes load correctly from data/cycle-13-mechanical-season-001/classes/
 *   - Per-class skills array is present (20 skills per class)
 *   - phase5_is_placeholder flag detected on skill[0] for all 16 classes
 *   - manifest.placeholder_skill_content === true
 *   - manifest.manifest_version === "1.9"
 *   - Gap-fill tab no longer accessible (sampleView state removed from Sample.tsx)
 *   - Placeholder indicator renders for placeholder seasons
 *
 * NOTE: These tests operate on the JSON files directly (Node.js fs reads) since the hook
 * uses import.meta.glob which is not available in vitest node environment. This is the
 * correct empirical verification approach for the data contract.
 *
 * @ts-nocheck — vitest globals not in tsconfig; @ts-nocheck suppresses type errors on
 * describe/it/expect per existing test pattern (cipher-no-leak.test.ts).
 */

// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

// ── Path constants ────────────────────────────────────────────────────────────

const DATA_ROOT = join(process.cwd(), 'data');
const CYCLE13_DIR = join(DATA_ROOT, 'cycle-13-mechanical-season-001');
const MANIFEST_PATH = join(CYCLE13_DIR, 'manifest.json');
const CLASSES_DIR = join(CYCLE13_DIR, 'classes');

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadManifest() {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
}

function loadClassFiles() {
  const files = readdirSync(CLASSES_DIR).filter((f) => f.endsWith('.json'));
  return files.map((f) => ({
    filename: f,
    data: JSON.parse(readFileSync(join(CLASSES_DIR, f), 'utf-8')),
  }));
}

// ── § Step 1 — Hook discovery verification (data-level) ──────────────────────

describe('Cycle 13 normal season — hook discovery verification (data contract)', () => {
  it('cycle-13-mechanical-season-001 directory exists in data/', () => {
    expect(existsSync(CYCLE13_DIR)).toBe(true);
  });

  it('manifest.json exists at data/cycle-13-mechanical-season-001/manifest.json', () => {
    expect(existsSync(MANIFEST_PATH)).toBe(true);
  });

  it('classes/ directory exists', () => {
    expect(existsSync(CLASSES_DIR)).toBe(true);
  });

  it('manifest season_id matches directory name (hook glob key contract)', () => {
    const manifest = loadManifest();
    expect(manifest.season_id).toBe('cycle-13-mechanical-season-001');
  });

  it('manifest_version is "1.9" (§ v2.2 schema version)', () => {
    const manifest = loadManifest();
    expect(manifest.manifest_version).toBe('1.9');
  });
});

// ── § Step 2 — 16-class season data contract ─────────────────────────────────

describe('Cycle 13 normal season — 16-class data contract', () => {
  it('exactly 16 class JSON files in classes/', () => {
    const files = readdirSync(CLASSES_DIR).filter((f) => f.endsWith('.json'));
    expect(files).toHaveLength(16);
  });

  it('each class file has a non-empty skills array', () => {
    const classes = loadClassFiles();
    for (const { filename, data } of classes) {
      expect(Array.isArray(data.skills), `${filename}: skills must be array`).toBe(true);
      expect(data.skills.length, `${filename}: skills must be non-empty`).toBeGreaterThan(0);
    }
  });

  it('each class has exactly 20 skills (3 chains: 7+7+6)', () => {
    const classes = loadClassFiles();
    for (const { filename, data } of classes) {
      expect(data.skills.length, `${filename}: expected 20 skills`).toBe(20);
    }
  });

  it('each class has required top-level fields (id, name, archetype_tag, dominant_element)', () => {
    const classes = loadClassFiles();
    for (const { filename, data } of classes) {
      expect(typeof data.id, `${filename}: id must be string`).toBe('string');
      expect(typeof data.archetype_tag, `${filename}: archetype_tag must be string`).toBe('string');
      expect(typeof data.dominant_element, `${filename}: dominant_element must be string`).toBe('string');
    }
  });

  it('class ids match S1_endgame_<attr>_<nn>_<class> naming pattern', () => {
    const classes = loadClassFiles();
    const ID_PATTERN = /^S1_endgame_(str|dex|int|wis)_\d{2}_.+$/;
    for (const { filename, data } of classes) {
      expect(ID_PATTERN.test(data.id), `${filename}: id "${data.id}" does not match pattern`).toBe(true);
    }
  });

  it('covers all 4 attribute groups (STR/DEX/INT/WIS)', () => {
    const classes = loadClassFiles();
    const attrs = new Set(classes.map(({ data }) => data.id.split('_')[2].toUpperCase()));
    expect(attrs.has('STR')).toBe(true);
    expect(attrs.has('DEX')).toBe(true);
    expect(attrs.has('INT')).toBe(true);
    expect(attrs.has('WIS')).toBe(true);
  });
});

// ── § Step 4 — Placeholder flag detection ────────────────────────────────────

describe('Cycle 13 normal season — placeholder flag detection', () => {
  it('manifest.placeholder_skill_content === true', () => {
    const manifest = loadManifest();
    expect(manifest.placeholder_skill_content).toBe(true);
  });

  it('manifest.cycle_14_refresh_pending === true', () => {
    const manifest = loadManifest();
    expect(manifest.cycle_14_refresh_pending).toBe(true);
  });

  it('skills[0].phase5_is_placeholder === true on all 16 classes', () => {
    const classes = loadClassFiles();
    for (const { filename, data } of classes) {
      expect(
        data.skills[0].phase5_is_placeholder,
        `${filename}: skills[0].phase5_is_placeholder must be true`
      ).toBe(true);
    }
  });

  it('all skills in all classes carry phase5_is_placeholder: true', () => {
    const classes = loadClassFiles();
    let totalSkills = 0;
    let placeholderSkills = 0;
    for (const { data } of classes) {
      for (const skill of data.skills) {
        totalSkills++;
        if (skill.phase5_is_placeholder === true) placeholderSkills++;
      }
    }
    expect(totalSkills).toBe(320); // 16 classes × 20 skills
    expect(placeholderSkills).toBe(320); // all are placeholders
  });

  it('placeholder indicator detection logic (manifest path): placeholder_skill_content === true', () => {
    const manifest = loadManifest();
    // This mirrors the isPlaceholderSeason detection in Loadout.tsx and Sample.tsx
    const isPlaceholder =
      manifest.placeholder_skill_content === true ||
      false; // skill[0] fallback omitted here (manifest path is sufficient)
    expect(isPlaceholder).toBe(true);
  });

  it('placeholder indicator detection logic (skill path): skills[0].phase5_is_placeholder === true', () => {
    const classes = loadClassFiles();
    // Verify the per-skill fallback detection also works for all classes
    for (const { filename, data } of classes) {
      const isPlaceholderViaSkilllFlag =
        data.skills.length > 0 && data.skills[0].phase5_is_placeholder === true;
      expect(
        isPlaceholderViaSkilllFlag,
        `${filename}: skill-path indicator detection failed`
      ).toBe(true);
    }
  });
});

// ── § Step 3 — Gap-fill tab retirement verification ───────────────────────────

describe('Gap-fill tab retirement — Sample.tsx regression guard', () => {
  it('Sample.tsx does not import Cycle13SampleSection', () => {
    const sampleSrc = readFileSync(
      join(process.cwd(), 'src/pages/Sample.tsx'),
      'utf-8'
    );
    expect(sampleSrc).not.toContain('Cycle13SampleSection');
  });

  it('Sample.tsx does not contain sampleView state variable', () => {
    const sampleSrc = readFileSync(
      join(process.cwd(), 'src/pages/Sample.tsx'),
      'utf-8'
    );
    expect(sampleSrc).not.toContain('sampleView');
  });

  it('Sample.tsx does not contain the view toggle button for Cycle 13 Characters tab', () => {
    const sampleSrc = readFileSync(
      join(process.cwd(), 'src/pages/Sample.tsx'),
      'utf-8'
    );
    expect(sampleSrc).not.toContain('Cycle 13 Characters');
  });

  it('Sample.tsx retains the season picker (selectableSeasons) — no regression', () => {
    const sampleSrc = readFileSync(
      join(process.cwd(), 'src/pages/Sample.tsx'),
      'utf-8'
    );
    expect(sampleSrc).toContain('selectableSeasons');
  });
});

// ── § Step 4 — Placeholder indicator UX surface verification ─────────────────

describe('Placeholder indicator UX — Loadout.tsx and Sample.tsx surface', () => {
  it('Loadout.tsx contains placeholder-season-indicator data-testid', () => {
    const loadoutSrc = readFileSync(
      join(process.cwd(), 'src/pages/Loadout.tsx'),
      'utf-8'
    );
    expect(loadoutSrc).toContain('data-testid="placeholder-season-indicator"');
  });

  it('Sample.tsx contains placeholder-season-indicator data-testid', () => {
    const sampleSrc = readFileSync(
      join(process.cwd(), 'src/pages/Sample.tsx'),
      'utf-8'
    );
    expect(sampleSrc).toContain('data-testid="placeholder-season-indicator"');
  });

  it('Loadout.tsx checks manifest.placeholder_skill_content for indicator', () => {
    const loadoutSrc = readFileSync(
      join(process.cwd(), 'src/pages/Loadout.tsx'),
      'utf-8'
    );
    expect(loadoutSrc).toContain('placeholder_skill_content');
  });

  it('Sample.tsx checks manifest.placeholder_skill_content for indicator', () => {
    const sampleSrc = readFileSync(
      join(process.cwd(), 'src/pages/Sample.tsx'),
      'utf-8'
    );
    expect(sampleSrc).toContain('placeholder_skill_content');
  });

  it('Loadout.tsx checks phase5_is_placeholder as fallback indicator', () => {
    const loadoutSrc = readFileSync(
      join(process.cwd(), 'src/pages/Loadout.tsx'),
      'utf-8'
    );
    expect(loadoutSrc).toContain('phase5_is_placeholder');
  });

  it('Sample.tsx checks phase5_is_placeholder as fallback indicator', () => {
    const sampleSrc = readFileSync(
      join(process.cwd(), 'src/pages/Sample.tsx'),
      'utf-8'
    );
    expect(sampleSrc).toContain('phase5_is_placeholder');
  });
});

// ── § Manifest schema — seasonal_elements present (assertManifestSeasonalFields will not warn) ──

describe('Cycle 13 manifest — seasonal_elements present (cipher-no-warn path)', () => {
  it('manifest has seasonal_elements (assertManifestSeasonalFields will not warn)', () => {
    const manifest = loadManifest();
    expect(manifest.seasonal_elements).toBeDefined();
    expect(typeof manifest.seasonal_elements).toBe('object');
  });

  it('seasonal_elements has 4 grouping keys', () => {
    const manifest = loadManifest();
    const keys = Object.keys(manifest.seasonal_elements);
    expect(keys).toHaveLength(4);
  });

  it('seasonal_elements has ignition, displacement, suffusion, bulwark grouping keys', () => {
    const manifest = loadManifest();
    const keys = Object.keys(manifest.seasonal_elements);
    expect(keys).toContain('ignition');
    expect(keys).toContain('displacement');
    expect(keys).toContain('suffusion');
    expect(keys).toContain('bulwark');
  });

  it('each seasonal_elements entry has canonical_slot field', () => {
    const manifest = loadManifest();
    for (const [key, entry] of Object.entries(manifest.seasonal_elements)) {
      expect(
        typeof (entry as Record<string, unknown>).canonical_slot,
        `seasonal_elements.${key} missing canonical_slot`
      ).toBe('string');
    }
  });
});
