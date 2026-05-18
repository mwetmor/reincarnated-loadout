// Pitch page static data
// Phase 1: hardcoded from engine output + gandalf curation
// When star-lord's seasons.json + heroes-manifest.json land, replace this module with
// imports from those files and remove the inline consts.
// TODO(drax): remove inline season data when star-lord delivers seasons.json

export type Substrate =
  | 'fire'
  | 'water'
  | 'earth'
  | 'wind'
  | 'lightning'
  | 'holy'
  | 'shadow'
  | 'physical';

/** Tailwind classes per substrate — accent text / bg / border */
export const SUBSTRATE_ACCENT: Record<
  Substrate,
  { text: string; bg: string; border: string }
> = {
  fire:      { text: 'text-red-500',    bg: 'bg-red-900/40',    border: 'border-red-800'    },
  water:     { text: 'text-cyan-400',   bg: 'bg-cyan-950/40',   border: 'border-cyan-800'   },
  earth:     { text: 'text-amber-700',  bg: 'bg-stone-900/40',  border: 'border-stone-700'  },
  wind:      { text: 'text-slate-300',  bg: 'bg-slate-900/40',  border: 'border-slate-700'  },
  lightning: { text: 'text-yellow-300', bg: 'bg-yellow-950/40', border: 'border-yellow-700' },
  holy:      { text: 'text-amber-200',  bg: 'bg-amber-950/40',  border: 'border-amber-700'  },
  shadow:    { text: 'text-purple-400', bg: 'bg-gray-900/60',   border: 'border-purple-900' },
  physical:  { text: 'text-gray-400',   bg: 'bg-gray-900/40',   border: 'border-gray-700'   },
};

/** Accent hex for the rule line (1px top border above pair-rationale blocks) */
export const SUBSTRATE_RULE_COLOR: Record<Substrate, string> = {
  fire:      '#ef4444', // red-500
  water:     '#22d3ee', // cyan-400
  earth:     '#b45309', // amber-700
  wind:      '#cbd5e1', // slate-300
  lightning: '#fde047', // yellow-300
  holy:      '#fde68a', // amber-200
  shadow:    '#c084fc', // purple-400
  physical:  '#9ca3af', // gray-400
};

export interface HeroSlot {
  className: string;
  substrate: Substrate;
  archetype: string;
  /** position in the lineup composite: center | left-flank | right-flank | back-left | back-right */
  position: 'center' | 'left-flank' | 'right-flank' | 'back-left' | 'back-right';
  /** path set by star-lord pipeline; null until Phase 2 */
  portraitPath: string | null;
}

export interface SeasonData {
  seasonId: string;
  anchorName: string;
  themeElement: string;
  /** dominant substrate for accent palette */
  accentSubstrate: Substrate;
  /** 1-2 sentence cosmological flavor blurb built from slot_fills */
  flavorBlurb: string;
  slotFills: string[];
  /** one of the three pair_rationales to display — from gandalf curation */
  featuredPairLabel: string;
  featuredPairRationale: string;
  heroes: HeroSlot[];
}

export interface HeroOfEngine {
  className: string;
  seasonId: string;
  anchorName: string;
  substrate: Substrate;
  archetype: string;
  whyThisHero: string;
  featuredPairLabel: string;
  featuredPairRationale: string;
  portraitPath: string | null;
}

// ---------------------------------------------------------------------------
// Hero of the Engine
// Source: gandalf curation § 1
// ---------------------------------------------------------------------------
export const HERO_OF_ENGINE: HeroOfEngine = {
  className: 'Canary of the Drowned Seam',
  seasonId: 'season_002013',
  anchorName: "The Dwarves' Empty Halls",
  substrate: 'fire',
  archetype: 'fire_mage',
  // TODO(drax): swap portraitPath for star-lord manifest path when Phase 2 lands
  portraitPath: null,
  whyThisHero:
    "This is what the engine does on a good day. The LLM took a fire substrate and authored it through the lens of a coal-mining underworld — fusing mining-mortality folklore (the canary as harbinger), industrial disaster (the drowned seam as flooded coal-vein), and fantasy elemental magic into a single coherent identity. No human named this class. The whole compound metaphor was composed by the LLM from the season's substrate grammar and the anchor's narrative register.",
  featuredPairLabel: 'Thermal pair',
  featuredPairRationale:
    'Seam Pressure builds in pockets until the coal-vein ruptures outward in cascading release, while Damp Creep is the slow wet air that seeps through abandoned corridors and settles into lungs and joints without ever announcing itself.',
};

// ---------------------------------------------------------------------------
// Seasons (5 canonical-7 seasons)
// Source: engine output + gandalf curation § 2–3
// TODO(drax): replace with import from star-lord's seasons.json when Phase 2 lands
// ---------------------------------------------------------------------------
export const SEASONS: SeasonData[] = [
  // ── S11 The Border Wall ──────────────────────────────────────────────────
  {
    seasonId: 'season_002011',
    anchorName: 'The Border Wall',
    themeElement: 'pitch',
    accentSubstrate: 'lightning',
    flavorBlurb:
      'A fortified crossing where contraband ignites under inspection and tar immersion coats every surface that tries to move through. The wall does not merely stop — it transforms.',
    slotFills: [
      'Contraband Ignition',
      'Tar Immersion',
      'Checkpoint Hold',
      'Crossing Surge',
      'Toll Strike',
      'Declared Passage',
      'Smuggled Transit',
      'Gate Signal',
    ],
    featuredPairLabel: 'Thermal pair',
    featuredPairRationale:
      'Contraband Ignition is what accumulates in hidden pockets and detonates at the moment of inspection — volatile, cascading, exposed; Tar Immersion is what coats every surface at the crossing and never fully dries, binding travelers in slow, ambient arrest rather than sudden rupture.',
    heroes: [
      { className: 'Wall-Shocked Smuggler',  substrate: 'lightning', archetype: 'lightning_mage',    position: 'center',      portraitPath: null },
      { className: 'Wall Warden',            substrate: 'physical',  archetype: 'physical_grappler', position: 'left-flank',  portraitPath: null },
      { className: 'Border Canoness',        substrate: 'holy',      archetype: 'holy_controller',   position: 'right-flank', portraitPath: null },
      { className: 'Pitch Smuggler',         substrate: 'fire',      archetype: 'fire_mage',         position: 'back-left',   portraitPath: null },
      { className: 'Brine Cartographer',     substrate: 'water',     archetype: 'experimental',      position: 'back-right',  portraitPath: null },
    ],
  },
  // ── S12 The Cartographer's Tower ─────────────────────────────────────────
  {
    seasonId: 'season_002012',
    anchorName: "The Cartographer's Tower",
    themeElement: 'charcoal',
    accentSubstrate: 'shadow',
    flavorBlurb:
      'A tower of accumulated notation where smolder cascades through charcoal marks and the terra incognita swallows the boundaries of every known map. To chart this place is to erase it.',
    slotFills: [
      'Smolder Cascade',
      'Cartographic Haze',
      'Fixed Meridian',
      'Border Erasure',
      'Charcoal Stroke',
      'True Survey',
      'Terra Incognita',
      'Parallel Transit',
    ],
    featuredPairLabel: 'Luminance pair',
    featuredPairRationale:
      'True Survey floods a region with authoritative measurement — what is named is amplified, what contradicts the record is exposed and harmed — while Terra Incognita withdraws the territory from all known charts, draining presence and leaving targets in an unmapped void that cannot be reached or reinforced.',
    heroes: [
      { className: 'Unmapped Cartographer',       substrate: 'shadow',    archetype: 'shadow_mage',       position: 'center',      portraitPath: null },
      { className: 'Salt-Charted Cartomancer',    substrate: 'water',     archetype: 'water_mage',        position: 'left-flank',  portraitPath: null },
      { className: 'Cartographer of Sacred Winds',substrate: 'holy',      archetype: 'holy_controller',   position: 'right-flank', portraitPath: null },
      { className: 'Chartbound Stormscribe',      substrate: 'lightning', archetype: 'lightning_mage',    position: 'back-left',   portraitPath: null },
      { className: 'Charcoal-Handed Surveyor',    substrate: 'physical',  archetype: 'physical_warrior',  position: 'back-right',  portraitPath: null },
    ],
  },
  // ── S13 The Dwarves' Empty Halls ─────────────────────────────────────────
  {
    seasonId: 'season_002013',
    anchorName: "The Dwarves' Empty Halls",
    themeElement: 'coal',
    accentSubstrate: 'holy',
    flavorBlurb:
      'An underground city where civilization withdrew and only echoes remain. Seam pressure builds in sealed pockets; forge remembrance is the residual heat-glow of a hearth not yet cold — the hall\'s last testament to what was built here.',
    slotFills: [
      'Seam Pressure',
      'Damp Creep',
      'Load-Bearing Stillness',
      'Collapse Draft',
      'Pickfall',
      'Forge Remembrance',
      'Withdrawal Soot',
      'Shaft Echo',
    ],
    featuredPairLabel: 'Luminance pair',
    featuredPairRationale:
      'Forge Remembrance is the residual heat-glow of a hearth not yet cold — the hall\'s last testament to what was built here, which consecrates the ground and exposes what stands in it — while Withdrawal Soot is the residue of extinguished industry that coats perception, dims presence, and quietly claims what the living left behind.',
    heroes: [
      { className: 'Candlewright of the Sunken Forge', substrate: 'holy',     archetype: 'holy_caster',     position: 'center',      portraitPath: null },
      { className: 'Canary of the Drowned Seam',       substrate: 'fire',     archetype: 'fire_mage',       position: 'left-flank',  portraitPath: null },
      { className: 'Salt-Keeper of the Sunken Seam',   substrate: 'water',    archetype: 'water_controller',position: 'right-flank', portraitPath: null },
      { className: 'Collapsed Shaft Warden',           substrate: 'earth',    archetype: 'earth_controller',position: 'back-left',   portraitPath: null },
      { className: 'Shaft Diver',                      substrate: 'physical', archetype: 'hunter',          position: 'back-right',  portraitPath: null },
    ],
  },
  // ── S14 The Plague City ───────────────────────────────────────────────────
  {
    seasonId: 'season_002014',
    anchorName: 'The Plague City',
    themeElement: 'pitch',
    accentSubstrate: 'wind',
    flavorBlurb:
      'A quarantined city where pitch bloom erupts from sealed humors and miasmal seep fills lungs and alleys before anything knew to flee. The chalk ward holds; the pall surge tests every door.',
    slotFills: [
      'Pitch Bloom',
      'Miasmal Seep',
      'Chalk Ward',
      'Pall Surge',
      'Carrier Strike',
      'Quarantine Light',
      'Door Unmarking',
      'Contagion Arc',
    ],
    featuredPairLabel: 'Position pair',
    featuredPairRationale:
      'Chalk Ward is the mark on the door that says this threshold holds and nothing crosses it, while Pall Surge is the momentum of the dying crowd that swept barriers aside and carried everything — the living, the dead, the meaning of streets — somewhere else entirely.',
    heroes: [
      { className: 'Plague Wind Censer',              substrate: 'wind',      archetype: 'wind_caster',         position: 'center',      portraitPath: null },
      { className: 'Plague Lantern Bearer',           substrate: 'holy',      archetype: 'holy_caster',         position: 'left-flank',  portraitPath: null },
      { className: 'Chalk-Handed Quarantine Warden',  substrate: 'earth',     archetype: 'earth_controller',    position: 'right-flank', portraitPath: null },
      { className: 'Quarantine Lector',               substrate: 'lightning', archetype: 'lightning_controller',position: 'back-left',   portraitPath: null },
      { className: 'Plague Diver',                    substrate: 'physical',  archetype: 'hunter',              position: 'back-right',  portraitPath: null },
    ],
  },
  // ── S15 The Throne Room of the Mad King ──────────────────────────────────
  {
    seasonId: 'season_002015',
    anchorName: 'The Throne Room of the Mad King',
    themeElement: 'brand',
    accentSubstrate: 'earth',
    flavorBlurb:
      'A court of absolute, disintegrating authority where royal decrees compound into consuming mandate and the sovereign seal fixes jurisdiction with the weight of the unyielding. The mad king sees what he chooses to see.',
    slotFills: [
      'Royal Decree',
      'Court Obligation',
      'Sovereign Seal',
      'Exile Writ',
      'Gauntlet Strike',
      'Legitimate Claim',
      'Unspoken Censure',
      'Mad Proclamation',
    ],
    featuredPairLabel: 'Position pair',
    featuredPairRationale:
      'The Sovereign Seal fixes a target beneath the full weight of legitimate authority — an immovable stamp of jurisdiction — while the Exile Writ tears that same authority away and casts its subject beyond the court\'s borders entirely.',
    heroes: [
      { className: 'Marble-Tongued Royal Scribe',          substrate: 'earth',     archetype: 'earth_caster',      position: 'center',      portraitPath: null },
      { className: 'Banished Royal Herald',                substrate: 'wind',      archetype: 'wind_controller',   position: 'left-flank',  portraitPath: null },
      { className: 'Windborne Herald of the Fractured Court', substrate: 'holy',   archetype: 'holy_controller',   position: 'right-flank', portraitPath: null },
      { className: "Mad King's Lector",                    substrate: 'lightning', archetype: 'lightning_mage',    position: 'back-left',   portraitPath: null },
      { className: "Exile's Gauntlet",                     substrate: 'physical',  archetype: 'hunter',            position: 'back-right',  portraitPath: null },
    ],
  },
];
