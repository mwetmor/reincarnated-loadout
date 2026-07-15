// atlasTypes.ts — shapes for the interactive-atlas Glance package.
//
// These mirror the build-time derivative `public/atlas/atlas-interactive.json`
// produced by scripts/atlas/build-atlas-interactive.mjs. Every field is a copy
// (or mechanical derivation) of an EMITTED atlas-edition2.json field — no
// invention on the render side (drax render-faithfully discipline).
//
// Spec: agentic_orchestration/gandalf/notes/2026-07-15-atlas-interactive-glance-spec.md §5

/** Quadrant = sign pair of (x, y): EN / ES / WN / WS (region names, spec §5). */
export type Quadrant = 'EN' | 'ES' | 'WN' | 'WS';

/** Kit class: live (active 469) | graveyard (supplementary 37, death-class marked). */
export type KitClass = 'live' | 'graveyard';

/** The four legend classes in Matt's vocabulary (spec §4). */
export type LegendClass = 'condensations' | 'live' | 'graveyard' | 'ghosts';

/** One live-or-graveyard kit row. */
export interface AtlasKitRow {
  kit_id: string;
  cls: KitClass;
  /** gateA_group: one of the 6 named condensation groups, or null for Single live. */
  condensation: string | null;
  /** death_class: a death-class string for graveyard kits; null for live. */
  death_class: string | null;
  x: number;
  y: number;
  quadrant: Quadrant;
}

/** One feasible ghost-cell row (the meso lattice). */
export interface AtlasGhostRow {
  /** Emitted 7-tuple, order == pole_vocabulary.core_order. */
  core: string[];
  depth: number;
  lit: boolean;
  kit_count: number;
  x: number;
  y: number;
  quadrant: Quadrant;
}

export interface AtlasCoreAxis {
  axis: string;
  values: string[];
}

export interface AtlasPoleVocabulary {
  axis_names: { dim1: string; dim2: string };
  core_order: string[];
  core_axes: AtlasCoreAxis[];
  quadrant_regions: Record<Quadrant, string>;
}

export interface AtlasInteractiveCounts {
  kits: number;
  kits_live: number;
  kits_graveyard: number;
  kits_condensation_members: number;
  ghosts: number;
  ghosts_lit: number;
}

export interface AtlasInteractiveData {
  schema_version: string;
  derived_from: {
    atlas_version: string;
    emitted_at: string;
    emitter_script: string;
    source_bytes: number;
  };
  counts: AtlasInteractiveCounts;
  pole_vocabulary: AtlasPoleVocabulary;
  kits: AtlasKitRow[];
  ghosts: AtlasGhostRow[];
}

// ---- Skin / canvas binding (spec §6 + renderer §10.8e) ----
// NAMING TRUTH (caught + ratified 2026-07-15): the names are inverted vs intuition.
//   'instrument' = LIGHT canvas #f7f8fa
//   'archive'    = DARK  canvas #0e1016   <- the BLACK COPY that LEADS
// All skin selection binds to CANVAS, never to skin name.
export type SkinName = 'instrument' | 'archive';
export type CanvasKind = 'light' | 'dark';

export interface SkinCanvasEntry {
  canvas: CanvasKind;
  hex: string;
}

export interface RenderProvenance {
  skin_canvas_map: Record<SkinName, SkinCanvasEntry>;
  skins: SkinName[];
  counts: { active: number; supplementary: number; total: number; grouped: number };
  // (other provenance fields exist but are not consumed by the page skeleton)
  [k: string]: unknown;
}

/** The four quadrant labels, in a stable render order (NW-clockwise-ish). */
export const QUADRANT_ORDER: Quadrant[] = ['WN', 'EN', 'WS', 'ES'];

// ---- Legend entries (spec §4 vocabulary) ----
// Kept here (not in the component file) so the legend component stays
// components-only for react-refresh.
export interface LegendEntry {
  id: LegendClass;
  label: string;
  /** Swatch color — scaffold only; the real highlight is a stroke halo (r7). */
  swatch: string;
  hint: string;
}

/** Four entries, top-to-bottom order per spec §4. */
export const LEGEND_ENTRIES: LegendEntry[] = [
  {
    id: 'condensations',
    label: 'Condensations',
    swatch: 'bg-indigo-400',
    hint: 'the six named groups (WHIRLWIND, TOTEM-SENTRY, TRAP-MINE, CHANNELED-BEAM, AURA, MINION-PET)',
  },
  {
    id: 'live',
    label: 'Live Kits',
    swatch: 'bg-emerald-400',
    hint: 'all live marks — singles + condensation members',
  },
  {
    id: 'graveyard',
    label: 'Graveyard',
    swatch: 'bg-rose-500/80',
    hint: 'the death-classed † kits',
  },
  {
    id: 'ghosts',
    label: 'Ghosts',
    swatch: 'bg-gray-500',
    hint: 'feasible-but-unlit lattice — meso + drill-in ground',
  },
];
