/**
 * flagFamilies.ts
 * Groups raw flag enum strings from flag_enum_attachments.json into named families.
 *
 * Per dispatch § 5.4 + hypothesis-flow doc § 4 (canonical/story/2026-05-31-hypothesis-flow-pattern-library-architecture.md).
 * Flags are heuristic-derived from the simulated primitive set — not playtest-validated.
 * Engine has not yet composed these patterns.
 *
 * Discipline #41 (substrate-led): render what flag_enum_attachments says.
 * Do not manufacture flag families. Do not add tooltips that over-interpret heuristic data.
 */

import type { FlagFamilyGroup } from '../data/cosmographTypes';

// ─── Flag family definitions (ordered for side panel display) ─────────────────

interface FamilyDef {
  groupLabel: string;
  prefixes: string[];
  chipStyle: FlagFamilyGroup['chipStyle'];
  tooltip: string; // brief explanation for hover; honest about heuristic derivation
}

const FLAG_FAMILY_DEFS: FamilyDef[] = [
  {
    groupLabel: 'Validation',
    prefixes: ['VALIDATION_'],
    chipStyle: 'faded',
    tooltip: 'Validation status flags — PROVISIONAL indicates this constellation has not been validated by the engine.',
  },
  {
    groupLabel: 'Substrate',
    prefixes: ['SUBSTRATE_ELEMENT_', 'SUBSTRATE_ATTRIBUTE_', 'SUBSTRATE_CULTURAL_'],
    chipStyle: 'earth',
    tooltip: 'Substrate identity flags derived from the primitive set: element coupling, attribute alignment, cultural tradition.',
  },
  {
    groupLabel: 'T4 Strategy',
    prefixes: ['T4_'],
    chipStyle: 'capstone',
    tooltip: 'T4 capstone strategy flags. Build-defining intensity (HIGH/MEDIUM) and strategy type derived from kit primitive composition.',
  },
  {
    groupLabel: 'Kit Architecture',
    prefixes: ['KIT_'],
    chipStyle: 'structural',
    tooltip: 'Kit structure flags: single-element or hybrid-2-element composition.',
  },
  {
    groupLabel: 'Coupling',
    prefixes: ['COUPLING_'],
    chipStyle: 'mechanical',
    tooltip: 'Chain coupling depth flags: LIGHT_3_LAYER or MEDIUM_4_5_LAYER — indicates how many skill-chain layers the kit uses.',
  },
  {
    groupLabel: 'Variant',
    prefixes: ['VARIANT_'],
    chipStyle: 'tactical',
    tooltip: 'Player-facing variant flags: PUSH (hard content optimization), SPEEDFARM (clear-speed optimization), or BALANCED.',
  },
  {
    groupLabel: 'Investment',
    prefixes: ['INVESTMENT_'],
    chipStyle: 'default',
    tooltip: 'Investment level flag — how gear-intensive this kit pattern is expected to be.',
  },
  {
    groupLabel: 'Power Plane',
    prefixes: ['PLANE_'],
    chipStyle: 'default',
    tooltip: 'Power plane flag — whether this kit holds power across all content types or is specialized.',
  },
  {
    groupLabel: 'Target Pattern',
    prefixes: ['TARGET_PATTERN_'],
    chipStyle: 'tactical',
    tooltip: 'Target content flags: BOSSING, SPEEDFARMING, or BALANCED — what content type this kit targets.',
  },
  {
    groupLabel: 'Cell Shape',
    prefixes: ['CELL_SHAPE_'],
    chipStyle: 'default',
    tooltip: 'BC-space cell shape flag — SPECIALIZED indicates the kit occupies a narrow niche in the balance space.',
  },
  {
    groupLabel: 'Emergent Label',
    prefixes: ['EMERGENT_LABEL_'],
    chipStyle: 'faded',
    tooltip: 'Emergent naming status. AMBIGUOUS = pending cohesion-judge LLM naming (cycle 15+). All sim kits are AMBIGUOUS.',
  },
];

// ─── Grouping function ─────────────────────────────────────────────────────────

/**
 * Parse a raw flag array into named family groups per dispatch § 5.4.
 * Flags that match no family are placed in an "Other" group.
 *
 * @param flags - parsed flag strings from flag_set_json
 * @returns ordered list of family groups (families with 0 flags are omitted)
 */
export function groupFlags(flags: string[]): FlagFamilyGroup[] {
  const groups: FlagFamilyGroup[] = [];
  const assigned = new Set<string>();

  for (const def of FLAG_FAMILY_DEFS) {
    const matched = flags.filter(f => def.prefixes.some(prefix => f.startsWith(prefix)));
    if (matched.length === 0) continue;

    matched.forEach(f => assigned.add(f));
    groups.push({
      groupLabel: def.groupLabel,
      flags: matched,
      chipStyle: def.chipStyle,
    });
  }

  // Unmatched flags — should not occur for well-formed packets but handle gracefully
  const unmatched = flags.filter(f => !assigned.has(f));
  if (unmatched.length > 0) {
    groups.push({
      groupLabel: 'Other',
      flags: unmatched,
      chipStyle: 'default',
    });
  }

  return groups;
}

/**
 * Returns the tooltip string for a given flag prefix family.
 * Used for chip hover tooltips in SidePanel.
 */
export function getFamilyTooltip(groupLabel: string): string {
  const def = FLAG_FAMILY_DEFS.find(d => d.groupLabel === groupLabel);
  return def?.tooltip ?? 'Flag attachment from hypothesis-flow heuristic analysis.';
}

/**
 * Format a raw flag enum string into a readable short label.
 * e.g. "SUBSTRATE_ELEMENT_PHYSICAL" → "ELEMENT_PHYSICAL"
 *      "T4_BUILD_DEFINING_HIGH" → "T4 BUILD_DEFINING HIGH"
 */
export function formatFlagLabel(flag: string): string {
  // Strip known family prefixes to keep chip text short
  for (const def of FLAG_FAMILY_DEFS) {
    for (const prefix of def.prefixes) {
      if (flag.startsWith(prefix)) {
        return flag.slice(prefix.length).replace(/_/g, ' ');
      }
    }
  }
  return flag.replace(/_/g, ' ');
}
