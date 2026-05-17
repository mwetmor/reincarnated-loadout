export const SP_BUDGET = 120;
export const MAX_SKILL_RANK = 15;
export const TIER_UNLOCK_THRESHOLDS: Record<number, number> = { 2: 3, 3: 5, 4: 8 };

export const ROLE_ABBREV: Record<string, string> = {
  primary_attack: 'ATK',
  burst_damage: 'BRST',
  area_damage: 'AOE',
  damage_over_time: 'DoT',
  defensive: 'DEF',
  sustain: 'SUST',
  utility: 'UTIL',
  control: 'CTRL',
  mobility: 'MOB',
  support: 'SUPP',
};

export const ROLE_LABEL: Record<string, string> = {
  primary_attack: 'Primary Attack',
  burst_damage: 'Burst Damage',
  area_damage: 'Area Damage',
  damage_over_time: 'Damage over Time',
  defensive: 'Defensive',
  sustain: 'Sustain',
  utility: 'Utility',
  control: 'Control',
  mobility: 'Mobility',
  support: 'Support',
};

export const ELEMENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  fire:      { bg: 'bg-orange-950', text: 'text-orange-300', border: 'border-orange-700' },
  wind:      { bg: 'bg-teal-950',   text: 'text-teal-300',   border: 'border-teal-700'   },
  water:     { bg: 'bg-blue-950',   text: 'text-blue-300',   border: 'border-blue-700'   },
  earth:     { bg: 'bg-amber-950',  text: 'text-amber-300',  border: 'border-amber-700'  },
  physical:  { bg: 'bg-slate-800',  text: 'text-slate-300',  border: 'border-slate-600'  },
  // Canonical-7 additions (MIGRATION.md v1.3 — standard-demo-regen-2026-05-17)
  lightning: { bg: 'bg-yellow-950', text: 'text-yellow-300', border: 'border-yellow-700' },
  holy:      { bg: 'bg-violet-950', text: 'text-violet-300', border: 'border-violet-700' },
  shadow:    { bg: 'bg-purple-950', text: 'text-purple-300', border: 'border-purple-700' },
};

export const STAT_LABELS: Record<string, string> = {
  strength:     'STR',
  dexterity:    'DEX',
  intelligence: 'INT',
  wisdom:       'WIS',
  vitality:     'VIT',
};

// L-11 fix (cipher migration): archetype display labels with canonical-four embedded.
// These static values are used as FALLBACK for pre-v1.5 seasons and as the lookup
// structure for resolveArchetypeLabel(). The canonical element names in the display
// values ("Fire Mage", "Water Mage", etc.) are acceptable for pre-Stage-3 seasons
// where canonical = player-visible. For v1.5+ seasons, resolveArchetypeLabel() below
// substitutes the seasonal name dynamically.
// Keys are INTENDED-INTERNAL per paths-audit §5.3 — do NOT render keys as player text.
export const ARCHETYPE_LABEL: Record<string, string> = {
  hybrid_mage:          'Hybrid Mage',
  fire_mage:            'Fire Mage',
  water_mage:           'Water Mage',
  earth_caster:         'Earth Caster',
  wind_caster:          'Wind Caster',
  wind_controller:      'Wind Controller',
  fire_controller:      'Fire Controller',
  earth_controller:     'Earth Controller',
  water_controller:     'Water Controller',
  physical_warrior:     'Physical Warrior',
  physical_skirmisher:  'Physical Skirmisher',
  physical_grappler:    'Physical Grappler',
  rogue:                'Rogue',
  hunter:               'Hunter',
  experimental:         'Experimental',
  // Canonical-7 archetypes (MIGRATION.md v1.3 — standard-demo-regen-2026-05-17)
  lightning_mage:       'Lightning Mage',
  lightning_controller: 'Lightning Controller',
  holy_caster:          'Holy Caster',
  holy_controller:      'Holy Controller',
  shadow_mage:          'Shadow Mage',
  shadow_controller:    'Shadow Controller',
};

// Archetype tag → which canonical-four element is embedded in the display label.
// Used by resolveArchetypeLabel() to substitute the seasonal name for v1.5+ seasons.
// INTENDED-INTERNAL: these canonical keys are routing infrastructure, not player text.
const ARCHETYPE_CANONICAL_ELEMENT: Record<string, string> = {
  fire_mage:        'fire',
  water_mage:       'water',
  earth_caster:     'earth',
  wind_caster:      'wind',
  wind_controller:  'wind',
  fire_controller:  'fire',
  earth_controller: 'earth',
  water_controller: 'water',
};

// Archetype tag → the role suffix (the part after the element name in the display label).
// Used by resolveArchetypeLabel() to reconstruct the label with a seasonal element name.
const ARCHETYPE_ROLE_SUFFIX: Record<string, string> = {
  fire_mage:        'Mage',
  water_mage:       'Mage',
  earth_caster:     'Caster',
  wind_caster:      'Caster',
  wind_controller:  'Controller',
  fire_controller:  'Controller',
  earth_controller: 'Controller',
  water_controller: 'Controller',
};

// L-11 fix: resolve a player-visible archetype label using the seasonal manifest.
// For v1.5+ manifests: substitutes the seasonal element name for the canonical-four
// label embedded in the static ARCHETYPE_LABEL values.
// For pre-v1.5 manifests (no seasonal_elements): returns the static ARCHETYPE_LABEL value.
// For archetype tags without a canonical element (hybrid_mage, rogue, etc.): static label.
// manifest is optional — when absent falls back to static label.
export function resolveArchetypeLabel(
  archetypeTag: string,
  manifest?: { seasonal_elements?: Record<string, { canonical_slot: string; name: string }> | null }
): string {
  const staticLabel = ARCHETYPE_LABEL[archetypeTag] ?? archetypeTag.replace(/_/g, ' ');

  if (!manifest?.seasonal_elements) return staticLabel;

  const canonical = ARCHETYPE_CANONICAL_ELEMENT[archetypeTag];
  const suffix = ARCHETYPE_ROLE_SUFFIX[archetypeTag];
  if (!canonical || !suffix) return staticLabel;

  // Find the seasonal entry whose canonical_slot matches this archetype's element
  const seasonalEntry = Object.values(manifest.seasonal_elements).find(
    (e) => e.canonical_slot === canonical
  );
  if (!seasonalEntry?.name) return staticLabel;

  return `${seasonalEntry.name} ${suffix}`;
}

export const LS_KEY = 'reincarnated-loadout-build';
