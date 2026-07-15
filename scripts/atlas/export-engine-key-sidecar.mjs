#!/usr/bin/env node
// export-engine-key-sidecar.mjs
// D2-a: one-shot READ-ONLY derivation of the 14-axis engine-key sidecar from
// corpus.db `canon_engine_key`, joined by kit_id into the atlas build at slim time.
//
// PURPOSE: builds carry a FULL 14-axis coordinate in the corpus (the `cell_key`
// column: 14 pipe-joined parts). This exporter derives, WITH A RECEIPT, the axis
// NAMES + part-ORDER from the data layer — never hand-typed — and emits a sidecar
// `{ __provenance__, axes[], rows[] }` next to kit-provenance-sidecar.json.
//
// DERIVATION LAW (D2-a, same inversion-guard discipline as D1-e):
//   1. The 14-part ORDER is the emitter's OWN `CK_IDX` for the shared-7 core axes
//      (ghost_field_edition1.py: movement=0, delivery=1, treatment=4, function=5,
//      proxy=8, activation=12, dependency=13) EXTENDED to the full 14 by empirical
//      positional correspondence against the named engine-key + corpus columns.
//   2. For EVERY one of the 14 positions, this script re-proves the column
//      correspondence at run time (≥ threshold match on the atlas rows) and REFUSES
//      to emit if any position's best-matching column drops below the floor — the
//      derivation guard (extends verify:atlas-guard). A doctored part-order fails loud.
//   3. The axis VALUE for a build is `cell_key.split('|')[pos]` — the authoritative
//      coordinate — NOT the named column (the named column only NAMES the axis). The
//      `blank` token (== null column) is normalised to null (renders `—`); `unknown`
//      is a CURATED value and is preserved literally (D2-b).
//
// READ-ONLY: corpus.db is never written. Uses the `sqlite3` CLI (no node sqlite dep).
//
// Run: node scripts/atlas/export-engine-key-sidecar.mjs
//   Emits scripts/atlas/engine-key-sidecar.json
// Spec: agentic_orchestration/gandalf/notes/2026-07-15-atlas-interactive-glance-spec.md §9.2 D2-a

import { execFileSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB = resolve(
  '/Users/admin/Games/reincarnated-collaboration/agentic_orchestration/research/curated/corpus.db'
);
const OUT = resolve(__dirname, 'engine-key-sidecar.json');

// ---- The DERIVED 14-axis schema (order + name + naming-column) ----
// ORDER is the emitter's CK_IDX (shared-7) extended to 14 by empirical proof; the
// naming COLUMN for each position is the column this exporter re-verifies matches the
// cell_key part on the atlas rows. `axis` is the human axis name (the shared-7 use the
// emitter's CORE names verbatim; the +7 kit-only use the column's semantic family).
const AXIS_SCHEMA = [
  { pos: 0, axis: 'movement', column: 'mob_policy_while_casting', grain: 'kit' },
  { pos: 1, axis: 'delivery', column: 'delivery_value', grain: 'kit' },
  { pos: 2, axis: 'amplitude', column: 'amp_val', grain: 'kit' },
  { pos: 3, axis: 'geometry', column: 'geometry_value', grain: 'kit' },
  { pos: 4, axis: 'treatment', column: 'ctrl_treatment', grain: 'kit' },
  { pos: 5, axis: 'function', column: 'ctrl_function', grain: 'kit' },
  { pos: 6, axis: 'defense', column: 'def_bin', grain: 'kit' },
  { pos: 7, axis: 'economy', column: 'economy_model', grain: 'kit' },
  { pos: 8, axis: 'proxy', column: 'proxy_val', grain: 'kit' },
  { pos: 9, axis: 'range', column: 'range_val', grain: 'kit' },
  { pos: 10, axis: 'tempo', column: 'tempo_val', grain: 'kit' },
  { pos: 11, axis: 'commit', column: 'commit_val', grain: 'kit' },
  { pos: 12, axis: 'activation', column: 'activation_val', grain: 'kit' },
  { pos: 13, axis: 'dependency', column: 'dependency_val', grain: 'kit' },
];

const N_PARTS = 14;
// The null-sentinel token in cell_key (== a null named column). Normalised to null so
// the renderer shows `—` (no data), distinct from the CURATED value 'unknown' (D2-b).
const BLANK_SENTINEL = 'blank';

// Per-position correspondence floor: the best-matching column must equal the cell_key
// part on at least this fraction of rows where BOTH are present (part != blank).
// (Movement/defense carry ~130 `blank` rows where the column is legitimately null; the
// floor is computed on present-part rows so those don't drag the proof.)
const CORRESPONDENCE_FLOOR = 0.98;

function sqliteJson(query) {
  const out = execFileSync('sqlite3', [DB, '-json', query], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const t = out.trim();
  return t === '' ? [] : JSON.parse(t);
}

function main() {
  if (!existsSync(DB)) {
    console.error(`EXPORT-FAIL: corpus.db not found at ${DB} (READ-ONLY source).`);
    process.exit(2);
  }

  // Pull engine-key rows + the naming columns from BOTH tables (LEFT JOIN corpus).
  const cols = AXIS_SCHEMA.map((a) => a.column);
  const engineCols = [
    'geometry_value',
    'delivery_value',
    'ctrl_treatment',
    'ctrl_function',
    'def_bin',
    'economy_model',
    'activation_val',
    'dependency_val',
    'mob_policy_while_casting',
  ];
  const corpusCols = ['proxy_val', 'range_val', 'tempo_val', 'amp_val', 'commit_val'];
  const selEngine = engineCols.filter((c) => cols.includes(c)).map((c) => `ek.${c} AS ${c}`);
  const selCorpus = corpusCols.filter((c) => cols.includes(c)).map((c) => `cc.${c} AS ${c}`);
  const query =
    `SELECT ek.kit_id AS kit_id, ek.cell_key AS cell_key, ` +
    [...selEngine, ...selCorpus].join(', ') +
    ` FROM canon_engine_key ek LEFT JOIN canon_corpus cc ON cc.kit_id = ek.kit_id ` +
    `WHERE ek.cell_key IS NOT NULL AND ek.cell_key != '';`;

  const raw = sqliteJson(query);

  // Keep only well-formed 14-part rows.
  const keyed = raw.filter((r) => String(r.cell_key).split('|').length === N_PARTS);

  // ---- DERIVATION GUARD: re-prove each position's column correspondence ----
  // For each position, count present-part rows and matching rows; refuse to emit if
  // any position's match-rate on present-part rows < CORRESPONDENCE_FLOOR.
  const receipt = [];
  const norm = (v) => (v == null ? null : String(v));
  for (const ax of AXIS_SCHEMA) {
    let present = 0;
    let match = 0;
    for (const r of keyed) {
      const part = String(r.cell_key).split('|')[ax.pos];
      if (part === BLANK_SENTINEL) continue; // sentinel: column is legitimately null
      present++;
      if (norm(r[ax.column]) === part) match++;
    }
    const rate = present === 0 ? 0 : match / present;
    receipt.push({
      pos: ax.pos,
      axis: ax.axis,
      column: ax.column,
      present_rows: present,
      matching_rows: match,
      match_rate: Number(rate.toFixed(4)),
    });
    if (rate < CORRESPONDENCE_FLOOR) {
      console.error(
        `DERIVATION GUARD FAILED: position ${ax.pos} (axis '${ax.axis}') best column ` +
          `'${ax.column}' matches the cell_key part on only ${match}/${present} present rows ` +
          `(${(rate * 100).toFixed(1)}% < ${(CORRESPONDENCE_FLOOR * 100).toFixed(0)}% floor). ` +
          `The part-order or column mapping is WRONG — refusing to emit a mis-derived sidecar. ` +
          `Re-derive against canon_engine_key + the emitter's CK_IDX. HALT.`
      );
      process.exit(1);
    }
  }

  // ---- Emit rows: kit_id -> { axes values } (from cell_key split; blank -> null) ----
  const rows = keyed.map((r) => {
    const parts = String(r.cell_key).split('|');
    const values = {};
    for (const ax of AXIS_SCHEMA) {
      const v = parts[ax.pos];
      // blank sentinel -> null (renders —); 'unknown' curated value preserved literally.
      values[ax.axis] = v === BLANK_SENTINEL ? null : v;
    }
    return { kit_id: r.kit_id, cell_key: r.cell_key, values };
  });

  const out = {
    __provenance__: {
      source_db: DB,
      table: 'canon_engine_key (LEFT JOIN canon_corpus on kit_id for the naming columns)',
      query,
      export_date: new Date().toISOString(),
      rows_total: raw.length,
      rows_14part: keyed.length,
      note:
        'D2-a one-shot READ-ONLY sidecar: the FULL 14-axis engine-key coordinate per build. ' +
        'The axis VALUE is cell_key.split("|")[pos] (the authoritative coordinate). The `blank` ' +
        'token (== null named column) is normalised to null (renders —); `unknown` is a CURATED ' +
        'value preserved literally. Zero invention. corpus.db is READ-ONLY.',
      // THE DERIVATION RECEIPT (D2-a acceptance 51): part-order + per-position column
      // correspondence, re-proven at export time against the atlas-adjacent corpus rows.
      part_order_source:
        "emitter ghost_field_edition1.py CK_IDX {movement:0, delivery:1, treatment:4, " +
        "function:5, proxy:8, activation:12, dependency:13} (the shared-7) extended to the " +
        "full 14 by empirical positional correspondence (this receipt).",
      derivation_receipt: receipt,
      correspondence_floor: CORRESPONDENCE_FLOOR,
      // Emitter-proven kit->meso crosswalk verdict (D2-b shared-column law). From
      // ghost_field_edition1.py REG2FIT + the fit2reg_* transforms.
      shared_column_verdict: {
        method:
          "an axis SHARES a column with the ghost meso-7 iff the emitter maps it IDENTITY " +
          "(fit2reg_direct2) so kit + meso tokens are the same vocabulary. movement + delivery " +
          "are TRANSFORMED (fit2reg_movement renames full-move->FREE-MOVE; fit2reg_delivery " +
          "grain-collapses geometry+proxy and renames tokens) => NOT shared.",
        shared:
          "treatment, function, proxy, activation, dependency (5) — emitter REG2FIT identity on " +
          "shared tokens (meso-only extras hybrid/silence never appear at kit grain).",
        not_shared_named_transform:
          "movement (FREE-MOVE<-full-move rename), delivery (grain-collapse) — kit + meso keep " +
          "SEPARATE columns.",
      },
    },
    axes: AXIS_SCHEMA.map((a) => ({ pos: a.pos, axis: a.axis, column: a.column, grain: a.grain })),
    rows,
  };

  writeFileSync(OUT, JSON.stringify(out, null, 0));

  console.log('engine-key-sidecar.json exported:');
  console.log(`  source : ${DB} (READ-ONLY)`);
  console.log(`  out    : ${OUT}`);
  console.log(`  rows   : ${rows.length} (of ${raw.length} engine-key rows; 14-part only)`);
  console.log('  derivation receipt (pos · axis · column · match/present):');
  for (const r of receipt) {
    console.log(
      `    [${String(r.pos).padStart(2)}] ${r.axis.padEnd(11)} ${r.column.padEnd(24)} ` +
        `${r.matching_rows}/${r.present_rows} (${(r.match_rate * 100).toFixed(1)}%)`
    );
  }
}

main();
