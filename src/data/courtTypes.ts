/**
 * Court of Forms — TypeScript types for drax loadout consumption.
 *
 * Mirrors the Python CourtForm / CourtSkill / CourtVisualSignature dataclasses
 * in reincarnated-engine/src/reincarnated/foundation/court_persistence.py.
 *
 * Data flow: Path A static export — engine writes JSON snapshot to
 * public/data/court.json; loadout reads at boot via useCourtData().
 *
 * Cross-seam contract: MIGRATION.md §v1.2 (drax-loadout D17).
 *
 * TODO(drax): remove the Path A static export workaround when rocket ships
 * court_persistence.py export_json() — see QUESTION to rocket in hive log.
 */

// ---------------------------------------------------------------------------
// Per-form sub-types
// ---------------------------------------------------------------------------

export interface CourtSkill {
  /** Engine-internal skill identifier. */
  skill_id: string;
  /** LLM-generated or engine-assigned skill name. */
  name: string;
  /** Role in combat function: "primary_attack" | "burst_damage" | "control" | etc. */
  role: string;
  /** Geometry type: "projectile" | "cone" | "circle" | etc. */
  geometry_type: string;
  /** Canonical substrate element: "fire" | "shadow" | etc. */
  canonical_element: string;
  /** Whether this skill is the substrate's iconic ability. */
  is_iconic: boolean;
}

export interface CourtVisualSignature {
  /** Drax-side cipher sprite identifier. */
  sprite_ref: string;
  /** Drax/star-lord VFX register reference name. */
  vfx_register_ref: string;
  /** Embodiment tag: "humanoid" | "slime" | "dragonling" | etc. */
  embodiment_tag: string;
}

// ---------------------------------------------------------------------------
// CourtForm — one row from court_forms table
// ---------------------------------------------------------------------------

export interface CourtForm {
  // Identity
  /** Earth Self identifier (player-chosen per cosmology). */
  earth_self_id: string;
  /** Integer season number this form was ascended from. */
  season_number: number;
  /** Always "ascension" — Passage forms never enter the Court. */
  ritual_outcome: string;

  // Form identity
  /** LLM-generated full name, e.g. "Lantern-Keeper of Yomi's Winds". */
  form_name: string;
  /** Canonical substrate: "fire" | "water" | "earth" | "wind" | "lightning" | "holy" | "shadow". */
  substrate: string;
  /** Composed archetype name, e.g. "shadow_caster". */
  archetype_name: string;
  /** Canonical role: "damage" | "support" | "control" | "hybrid". */
  role: string;
  /** Universal function tag: "RANGED" | "FRONT_LINE" | etc. */
  class_role_function: string;

  // Skills (full kit)
  skills: CourtSkill[];

  // Visual signature
  visual_signature: CourtVisualSignature;

  // Cosmological / narrative
  /** Per-substrate court_resonance snippet from Layer-1 declaration. */
  court_resonance: string;
  /** Season anchor/cosmological context string. */
  season_cosmology: string;
  /** Significant events: boss kills, path-taken markers, etc. */
  key_moments: string[];
  /** Trial path: "body_swap" | "mirror" | "mixed" | "no_trials". */
  path_taken: string;

  /** ISO-8601 timestamp of ascension. */
  ascended_at_iso: string;
}

// ---------------------------------------------------------------------------
// Court export envelope
// ---------------------------------------------------------------------------

/**
 * The JSON shape written by rocket's court_persistence.py export step
 * (Path A static export per MIGRATION.md §v1.2).
 *
 * File location: public/data/court.json (loadout-side consumer path).
 * Engine source: ~/.config/reincarnated/court_export.json → copied or
 * symlinked to public/data/court.json on export.
 *
 * TODO(drax): remove Path A workaround when rocket ships export_json().
 * See MIGRATION.md §v1.2 QUESTION to rocket.
 */
export interface CourtExport {
  /** "1.0" — increment when schema changes. */
  schema_version: string;
  /** ISO-8601 timestamp when export was generated. null on empty/bootstrap file. */
  exported_at: string | null;
  /** Earth Self identifier. null on empty/bootstrap file. */
  earth_self_id: string | null;
  /** All ascended forms, ordered by season_number ASC (mirrors list_forms() order). */
  forms: CourtForm[];
}

// ---------------------------------------------------------------------------
// Substrate color palette (v0.28, extended for canonical-7)
// ---------------------------------------------------------------------------

/**
 * Substrate colors for Court browser cards and badges.
 * Extends ELEMENT_COLORS from constants.ts with lightning, holy, shadow.
 * All seven canonical substrates represented.
 */
export const SUBSTRATE_COLORS: Record<
  string,
  { bg: string; text: string; border: string; accent: string }
> = {
  fire:      { bg: 'bg-orange-950',  text: 'text-orange-300',  border: 'border-orange-700',  accent: 'bg-orange-600'  },
  water:     { bg: 'bg-blue-950',    text: 'text-blue-300',    border: 'border-blue-700',    accent: 'bg-blue-600'    },
  earth:     { bg: 'bg-amber-950',   text: 'text-amber-300',   border: 'border-amber-700',   accent: 'bg-amber-600'   },
  wind:      { bg: 'bg-teal-950',    text: 'text-teal-300',    border: 'border-teal-700',    accent: 'bg-teal-600'    },
  lightning: { bg: 'bg-yellow-950',  text: 'text-yellow-300',  border: 'border-yellow-600',  accent: 'bg-yellow-500'  },
  holy:      { bg: 'bg-amber-900',   text: 'text-amber-200',   border: 'border-amber-500',   accent: 'bg-amber-400'   },
  shadow:    { bg: 'bg-purple-950',  text: 'text-purple-300',  border: 'border-purple-700',  accent: 'bg-purple-600'  },
};

/**
 * Grouping labels per substrate (from vfx-manifest.json v1.1).
 * Used as secondary display label on Court cards.
 */
export const SUBSTRATE_GROUPING_LABEL: Record<string, string> = {
  fire:      'ignition',
  water:     'suffusion',
  earth:     'bulwark',
  wind:      'displacement',
  lightning: 'resonance',
  holy:      'radiance',
  shadow:    'penumbra',
};

/**
 * Path-taken display labels (player-facing).
 */
export const PATH_TAKEN_LABEL: Record<string, string> = {
  body_swap:  'Body-Swap Path',
  mirror:     'Mirror Trial',
  mixed:      'Mixed Path',
  no_trials:  'No Trials',
};

/**
 * Role display labels (player-facing).
 */
export const COURT_ROLE_LABEL: Record<string, string> = {
  damage:  'Damage',
  support: 'Support',
  control: 'Control',
  hybrid:  'Hybrid',
};
