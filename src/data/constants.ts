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
  fire:     { bg: 'bg-orange-950', text: 'text-orange-300', border: 'border-orange-700' },
  wind:     { bg: 'bg-teal-950',   text: 'text-teal-300',   border: 'border-teal-700'   },
  water:    { bg: 'bg-blue-950',   text: 'text-blue-300',   border: 'border-blue-700'   },
  earth:    { bg: 'bg-amber-950',  text: 'text-amber-300',  border: 'border-amber-700'  },
  physical: { bg: 'bg-slate-800',  text: 'text-slate-300',  border: 'border-slate-600'  },
};

export const STAT_LABELS: Record<string, string> = {
  strength:     'STR',
  dexterity:    'DEX',
  intelligence: 'INT',
  wisdom:       'WIS',
  vitality:     'VIT',
};

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
  rogue:                'Rogue',
  hunter:               'Hunter',
  experimental:         'Experimental',
};

export const LS_KEY = 'reincarnated-loadout-build';
