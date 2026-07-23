// canonTypes — the /canon inspection surface data contract.
//
// Source of truth is corpus.db (267 canon_corpus records, corpus_class='record'),
// exported READ-ONLY by scripts/export_canon_corpus.py into:
//   public/canon-data/index.json          — summary rows + export provenance
//   public/canon-data/kits/<kit_id>.json  — the FULL per-kit join (lazy-fetched)
//
// DESIGN: the detail payload must render EVERY column of EVERY joined row. Rather
// than freeze a column list (which would silently drop new columns when the engine
// schema grows), the row shapes are open `CanonRow = Record<string, JsonValue>` and
// the UI walks every key. Only the STRUCTURE of the join (which tables hang where)
// is typed; the columns inside each row are rendered generically + completely.

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** An open row: every DB column, whatever it is, survives to the UI. */
export type CanonRow = Record<string, JsonValue>;

// ---- index.json ----

export type SpineStatus = 'ACTIVE' | 'SHADOWED' | 'OFF-SPINE' | 'UNPLACED';

export interface CanonIndexRow {
  kit_id: string;
  folk_name: string | null;
  game: string | null;
  tier: string | null;
  canon_tier: string | null;
  court: string | null;
  element: string | null;
  grade: string | null;
  terminal_state: string | null;
  range_val: string | null;
  tempo_val: string | null;
  amp_val: string | null;
  avg_conf: number | null;
  spine_status: SpineStatus;
  shadowed_by: string | null;
  bands_count: number;
  citations_count: number;
  verify_confirmed: number;
  verify_contradicted: number;
  best_citation_url: string | null;
  best_citation_site: string | null;
  best_citation_quarantined: boolean | null;
}

export interface CanonExportProvenance {
  source_db: string;
  source_sidecar: string;
  sidecar_run: string | null;
  sidecar_ruling: string | null;
  sidecar_date: string | null;
  schema_version: string | null;
  schema_applied_utc: string | null;
  schema_meta_row_count: number;
  exported_utc: string;
  corpus_class_counts: Record<string, number>;
  record_count: number;
  kit_files_written: number;
  atlas_slot_labels: string[];
  spine_status_distribution: Record<string, number>;
}

export interface CanonIndex {
  export_provenance: CanonExportProvenance;
  kits: CanonIndexRow[];
}

// ---- kits/<kit_id>.json ----

export interface AtlasSlot {
  index: number;
  label: string;
  value: string;
}

export interface AtlasCoordsParsed {
  raw: string;
  slot_count: number;
  expected_slots: number;
  slots: AtlasSlot[];
}

export interface SpineStatusDetail {
  spine_status: SpineStatus;
  on_spine: boolean | null;
  shadowed_by: string | null;
  family: string | null;
  tier: string | null;
  source_artifact: string | null;
  note?: string;
}

/** A deviation row with its (optional) joined mechanic_gap_docket. */
export type CanonDeviationRow = CanonRow & { docket?: CanonRow | null };

export interface CanonKitDetail {
  kit_id: string;
  spine_status: SpineStatusDetail;
  // The spine is an open row plus a parsed atlas_coords convenience field.
  spine: CanonRow & { atlas_coords_parsed?: AtlasCoordsParsed | null };
  engine_key: CanonRow | null;
  mapping: CanonRow | null;
  delta_t4: CanonRow | null;
  geometry_bands: CanonRow[];
  recognition_hooks: CanonRow[];
  acceptance_asserts: CanonRow[];
  deviations: CanonDeviationRow[];
  citations: CanonRow[];
  best_citation: CanonRow | null;
  verify_ledger: CanonRow[];
  dossier: CanonRow[];
  probe_facts: CanonRow[];
  _row_counts: Record<string, number>;
}

// ---- display helpers (tone maps; faithful, not invented) ----

const GAME_LABEL: Record<string, string> = {
  d2: 'Diablo II',
  d3: 'Diablo III',
  d4: 'Diablo IV',
  poe1: 'Path of Exile',
  poe2: 'Path of Exile 2',
  gd: 'Grim Dawn',
  le: 'Last Epoch',
  tq: 'Titan Quest',
};

export function displayGame(game: string | null | undefined): string {
  if (!game) return '—';
  return GAME_LABEL[game] ?? game;
}

/** Tailwind classes for a mapping grade badge (EXACT / CLOSE / DRIFT / ...). */
export function gradeTone(grade: string | null | undefined): string {
  const g = (grade ?? '').toUpperCase();
  if (g.includes('EXACT')) return 'border-emerald-700 bg-emerald-950/40 text-emerald-300';
  if (g.includes('CLOSE')) return 'border-teal-700 bg-teal-950/40 text-teal-300';
  if (g.includes('DRIFT') || g.includes('LOOSE'))
    return 'border-amber-700 bg-amber-950/40 text-amber-300';
  if (g.includes('FAIL') || g.includes('BREAK'))
    return 'border-rose-700 bg-rose-950/40 text-rose-300';
  return 'border-slate-700 bg-slate-900/40 text-slate-300';
}

/** Tailwind classes for a verify verdict badge. */
export function verdictTone(verdict: string | null | undefined): string {
  const v = (verdict ?? '').toUpperCase();
  if (v === 'CONFIRMED') return 'border-emerald-700 bg-emerald-950/30 text-emerald-300';
  if (v === 'CONTRADICTED') return 'border-rose-700 bg-rose-950/30 text-rose-300';
  if (v === 'UNSUPPORTED') return 'border-amber-700 bg-amber-950/30 text-amber-300';
  if (v === 'SOURCE_NOT_FOUND' || v === 'SOURCE-NOT-FOUND')
    return 'border-slate-700 bg-slate-900/40 text-slate-400';
  return 'border-slate-700 bg-slate-900/40 text-slate-300';
}

/** Tailwind classes for a spine-status badge. */
export function spineStatusTone(status: SpineStatus | string | null | undefined): string {
  const s = (status ?? '').toUpperCase();
  if (s === 'ACTIVE') return 'border-emerald-700 bg-emerald-950/40 text-emerald-300';
  if (s === 'SHADOWED') return 'border-violet-700 bg-violet-950/40 text-violet-300';
  if (s === 'OFF-SPINE') return 'border-slate-700 bg-slate-900/40 text-slate-400';
  return 'border-slate-800 bg-slate-900/30 text-slate-500'; // UNPLACED
}
