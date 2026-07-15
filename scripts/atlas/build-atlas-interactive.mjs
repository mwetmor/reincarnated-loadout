#!/usr/bin/env node
// build-atlas-interactive.mjs
// Build-time data-slim script for the interactive-atlas Glance package.
//
// PURPOSE: produce `public/atlas/atlas-interactive.json` FROM the vendored
// `data-src/atlas/atlas-edition2.json` by COPY / GROUP of emitted fields ONLY.
// No invention. Every field emitted here is a direct copy (or a mechanical
// derivation — quadrant sign-pair) of an EMITTED atlas field.
//
// The full 7.49MB atlas JSON must NEVER ship to the client bundle. This script
// is the seam: the fat source stays in `data-src/` (never imported, never in
// `public/`), and only the ~1.9MB derivative lands in `public/atlas/`.
//
// BUILD-FAIL GUARD: if any expected emitted field is missing or renamed in the
// source atlas, this script FAILS LOUDLY (non-zero exit) rather than emitting a
// silently-degraded derivative. Same guard class as the render-provenance JSON
// (spec §5). Demonstrate with a doctored field-rename: the guard fires.
//
// Spec: agentic_orchestration/gandalf/notes/2026-07-15-atlas-interactive-glance-spec.md §5
// Data of record: atlas-edition2.json (Edition-II, emitted 2026-07-15T19:20:12Z)
//
// Run: node scripts/atlas/build-atlas-interactive.mjs
//   Optional first arg: alternate source path (used by the doctored-field test).
//   Optional --out: alternate output path (used by the doctored-field test).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

const DEFAULT_SOURCE = resolve(REPO_ROOT, 'data-src/atlas/atlas-edition2.json');
const DEFAULT_OUT = resolve(REPO_ROOT, 'public/atlas/atlas-interactive.json');

// D1-h: the READ-ONLY corpus provenance sidecar, vendored as a build input. Joined
// on kit_id to add folk_name/game/era_year/stabilization_patch to kit rows so the
// pivot's build leaf rows read `folk_name — game year (patch)` instead of the slug.
// Exported one-shot from corpus.db canon_corpus; carries its own provenance header.
// The FROZEN atlas-edition2.json is UNTOUCHED — this join happens at slim-build time.
const DEFAULT_SIDECAR = resolve(__dirname, 'kit-provenance-sidecar.json');

// D2-a: the READ-ONLY 14-axis ENGINE-KEY sidecar, vendored as a build input. Joined on
// kit_id to add the FULL 14-axis coordinate (cell_key split) to build rows so the pivot
// grid shows real per-build axis codes (not `—`, which D1-g emitted before this pass
// superseded it). Exported one-shot from corpus.db canon_engine_key (+ canon_corpus
// naming columns) by scripts/atlas/export-engine-key-sidecar.mjs; carries its own
// provenance + derivation-receipt header. The FROZEN atlas-edition2.json is UNTOUCHED.
const DEFAULT_ENGINE_KEY_SIDECAR = resolve(__dirname, 'engine-key-sidecar.json');

// ---- CLI ----
const argv = process.argv.slice(2);
let sourcePath = DEFAULT_SOURCE;
let outPath = DEFAULT_OUT;
let sidecarPath = DEFAULT_SIDECAR;
let engineKeySidecarPath = DEFAULT_ENGINE_KEY_SIDECAR;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--out') {
    outPath = resolve(argv[++i]);
  } else if (a === '--sidecar') {
    sidecarPath = resolve(argv[++i]);
  } else if (a === '--engine-key-sidecar') {
    engineKeySidecarPath = resolve(argv[++i]);
  } else if (!a.startsWith('--')) {
    sourcePath = resolve(argv[i]);
  }
}

// ---- Build-fail guard machinery ----
class BuildFailError extends Error {}

/** Assert `obj` has own property `key`; else HALT loudly. */
function requireField(obj, key, ctx) {
  if (obj == null || !Object.prototype.hasOwnProperty.call(obj, key)) {
    throw new BuildFailError(
      `BUILD-FAIL GUARD: expected emitted field '${key}' missing in ${ctx}. ` +
        `The atlas source schema changed (field renamed or dropped). ` +
        `Refusing to emit a silently-degraded derivative. ` +
        `Reconcile scripts/atlas/build-atlas-interactive.mjs against the new emit, ` +
        `then re-run.`
    );
  }
  return obj[key];
}

/**
 * Read an OPTIONAL emitted field that is present on only one point-kind.
 * Returns the value if the key exists, else the provided default (null).
 * These are kind-specific in the emit: `death_class` only on graveyard points,
 * `gateA_group` only on live points. Absence is legal; a RENAME is caught by the
 * downstream presence-floor assertions (see build()).
 */
function readOptional(obj, key, dflt = null) {
  return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : dflt;
}

/** Assert `obj` is an array of expected length (or non-empty if len omitted). */
function requireArray(obj, key, ctx, expectedLen) {
  const v = requireField(obj, key, ctx);
  if (!Array.isArray(v)) {
    throw new BuildFailError(
      `BUILD-FAIL GUARD: emitted field '${key}' in ${ctx} is ${typeof v}, expected array.`
    );
  }
  if (expectedLen != null && v.length !== expectedLen) {
    throw new BuildFailError(
      `BUILD-FAIL GUARD: emitted array '${key}' in ${ctx} has length ${v.length}, ` +
        `expected ${expectedLen}. Lattice/point count drift — reconcile before emit.`
    );
  }
  return v;
}

// ---- Quadrant: sign pair of (x, y) under region names EN / ES / WN / WS ----
// x >= 0 => EAST, x < 0 => WEST ; y >= 0 => NORTH, y < 0 => SOUTH.
// (Region-name convention per spec §5; PERFORM side = EAST, EMBODY side = NORTH.)
function quadrant(x, y) {
  return (x >= 0 ? 'E' : 'W') + (y >= 0 ? 'N' : 'S');
}

/**
 * Build a kit_id -> provenance-row map from the vendored corpus sidecar (D1-h).
 * The sidecar is `{ __provenance__, rows: [{kit_id, folk_name, game, era_year,
 * stabilization_patch}] }`. Every atlas kit_id MUST resolve a row WITH a folk_name
 * (build HALT otherwise — extends the verify:atlas-guard pattern). Other fields are
 * optional; missing => null => the renderer shows nothing (zero invention).
 */
function loadProvenanceIndex(sidecar) {
  const rows = requireArray(sidecar, 'rows', 'kit-provenance-sidecar');
  const index = new Map();
  for (const r of rows) {
    const kitId = requireField(r, 'kit_id', 'kit-provenance-sidecar.rows[]');
    // folk_name/game/era_year/stabilization_patch are read defensively — a MISSING
    // key on a row is legal (the row simply carries less), but a full-column rename
    // is caught by the atlas-side coverage floor (every atlas kit needs folk_name).
    index.set(kitId, {
      folk_name: readOptional(r, 'folk_name'),
      game: readOptional(r, 'game'),
      era_year: readOptional(r, 'era_year'),
      stabilization_patch: readOptional(r, 'stabilization_patch'),
    });
  }
  return index;
}

/**
 * Build a kit_id -> engine-key-values map from the D2-a engine-key sidecar.
 * The sidecar is `{ __provenance__, axes:[{pos,axis,column,grain}], rows:[{kit_id,
 * cell_key, values:{<axis>:<value|null>}}] }`. Returns { axes, index } where index is
 * kit_id -> { cell_key, values }. Not every atlas kit need have an engine key (kits
 * absent show `—` per D2-b) — this is a SOFT join (unlike the D1-h folk_name floor).
 * The `axes` schema is carried through to pole_vocabulary so the client renders the
 * DERIVED axis names/order (never a hand-typed client constant).
 */
function loadEngineKeyIndex(sidecar) {
  const axes = requireArray(sidecar, 'axes', 'engine-key-sidecar');
  // Guard: the axes schema must carry pos/axis/column for each of the 14 (derivation
  // truth). A missing/renamed field => the sidecar is malformed => HALT (never emit a
  // silently-degraded axis schema).
  for (const a of axes) {
    requireField(a, 'pos', 'engine-key-sidecar.axes[]');
    requireField(a, 'axis', 'engine-key-sidecar.axes[]');
    requireField(a, 'column', 'engine-key-sidecar.axes[]');
  }
  const rows = requireArray(sidecar, 'rows', 'engine-key-sidecar');
  const index = new Map();
  for (const r of rows) {
    const kitId = requireField(r, 'kit_id', 'engine-key-sidecar.rows[]');
    const values = requireField(r, 'values', 'engine-key-sidecar.rows[]');
    const cellKey = readOptional(r, 'cell_key');
    index.set(kitId, { cell_key: cellKey, values });
  }
  // Carry the derivation receipt through for the provenance panel (audit trail).
  const provenance = readOptional(sidecar, '__provenance__');
  return { axes, index, provenance };
}

function build(source, provenanceIndex, engineKey) {
  // --- Top-level fields we depend on (copy, never invent) ---
  const atlasVersion = requireField(source, 'atlas_version', 'atlas root');
  const emittedAt = requireField(source, 'emitted_at', 'atlas root');
  const emitterScript = requireField(source, 'emitter_script', 'atlas root');
  const counts = requireField(source, 'counts', 'atlas root');
  const basis = requireField(source, 'basis', 'atlas root');
  const axisNames = requireField(basis, 'axis_names', 'atlas.basis');
  const points = requireArray(source, 'points', 'atlas root');
  const ghostField = requireField(source, 'ghost_field', 'atlas root');

  // --- Ghost sub-structure ---
  const coreOrder = requireArray(ghostField, 'core_order', 'atlas.ghost_field', 7);
  const feasibleCells = requireArray(ghostField, 'feasible_cells', 'atlas.ghost_field');

  // --- Emitted counts we reconcile against (fail-fast on drift) ---
  // NOTE: `grouped` (=86) lives in render-provenance.json, NOT in atlas.counts.
  // atlas.counts carries {active, supplementary, total, null_death_class_sentineled}.
  // Grouped-member count is reconciled internally (derived gateA_group scan).
  const nActive = requireField(counts, 'active', 'atlas.counts');
  const nSupplementary = requireField(counts, 'supplementary', 'atlas.counts');
  const nTotal = requireField(counts, 'total', 'atlas.counts');

  // ============================================================
  // PER-KIT ROWS
  //   class: live | graveyard   (graveyard = supplementary marks,
  //     each carrying a death_class; live = the active 469, death_class == null)
  //   condensation membership: gateA_group (one of 6 named groups) or null
  //   x, y: emitted point coords (signed, origin-centred projection space)
  //   quadrant: derived sign-pair
  // ============================================================
  const kits = [];
  let seenActive = 0;
  let seenSupplementary = 0;
  let seenGrouped = 0;
  let seenGraveyardWithDeathClass = 0;
  // D1-h provenance-join coverage counters (reported; folk_name is a HARD floor).
  let covFolkName = 0;
  let covGame = 0;
  let covYear = 0;
  let covPatch = 0;
  const missingFolkName = [];
  // D2-a engine-key join coverage (SOFT — kits absent show `—`). Per-axis non-null
  // coverage on the atlas set is reported (acceptance 50). `blank`->null is already
  // applied in the sidecar; `unknown` is a curated non-null value (counts as covered).
  const engineAxes = engineKey?.axes ?? [];
  let covEngineKey = 0; // kits that resolved ANY engine key
  const covPerAxis = new Map(engineAxes.map((a) => [a.axis, 0]));
  for (const p of points) {
    // Universal fields — STRICT: a rename of any of these HALTS the build.
    const kitId = requireField(p, 'kit_id', 'atlas.points[]');
    const supplementary = requireField(p, 'supplementary', 'atlas.points[]');
    const x = requireField(p, 'x', 'atlas.points[]');
    const y = requireField(p, 'y', 'atlas.points[]');
    // Kind-specific fields — OPTIONAL per point-kind (present on only one kind).
    // A rename across ALL points is caught by the presence-floor asserts below.
    const gateAGroup = readOptional(p, 'gateA_group'); // live points only
    const deathClass = readOptional(p, 'death_class'); // graveyard points only

    const cls = supplementary ? 'graveyard' : 'live';
    if (supplementary) {
      seenSupplementary++;
      if (deathClass != null) seenGraveyardWithDeathClass++;
    } else {
      seenActive++;
    }
    if (gateAGroup != null) seenGrouped++;

    // D1-h: JOIN the corpus provenance row on kit_id. folk_name is MANDATORY per the
    // atlas coverage floor (probed 506/506); a missing folk_name => build HALT.
    const prov = provenanceIndex.get(kitId) ?? null;
    const folkName = prov?.folk_name ?? null;
    if (folkName != null && folkName !== '') covFolkName++;
    else missingFolkName.push(kitId);
    const game = prov?.game ?? null;
    if (game != null && game !== '') covGame++;
    const eraYear = prov?.era_year ?? null;
    if (eraYear != null && eraYear !== '') covYear++;
    const patch = prov?.stabilization_patch ?? null;
    if (patch != null && patch !== '') covPatch++;

    // D2-a: JOIN the 14-axis engine key on kit_id (SOFT — absent => null => renders —).
    const ek = engineKey?.index?.get(kitId) ?? null;
    const engineKeyValues = ek?.values ?? null; // { <axis>: <value|null> } or null
    if (engineKeyValues != null) {
      covEngineKey++;
      for (const a of engineAxes) {
        const v = engineKeyValues[a.axis];
        // covered = a non-null value (blank was already normalised to null in the
        // sidecar; 'unknown' is a curated value and DOES count as covered).
        if (v != null && v !== '') covPerAxis.set(a.axis, covPerAxis.get(a.axis) + 1);
      }
    }

    kits.push({
      kit_id: kitId,
      cls,
      condensation: gateAGroup, // null for Single live kits
      death_class: deathClass, // null for live; a death-class string for graveyard
      x,
      y,
      quadrant: quadrant(x, y),
      // D1-h corpus provenance (copies of canon_corpus fields; null renders nothing).
      folk_name: folkName,
      game, // slug (e.g. 'chronicon'); title-cased for DISPLAY only, string traces to corpus
      era_year: eraYear, // number|null
      stabilization_patch: patch, // string|null
      // D2-a engine-key: the full 14-axis coordinate (cell_key split, blank->null).
      // null when the kit has no engine key; individual axes null when that part was
      // `blank`; 'unknown' preserved literally (curated value, D2-b).
      engine_key: engineKeyValues,
    });
  }

  // D1-h HARD FLOOR: every atlas kit must resolve a sidecar folk_name (probed 506/506).
  // A miss means the sidecar is stale vs the atlas point set — HALT rather than ship
  // slug fallbacks (extends the verify:atlas-guard never-degrade contract).
  if (missingFolkName.length > 0) {
    throw new BuildFailError(
      `BUILD-FAIL GUARD: ${missingFolkName.length} atlas kit_id(s) resolved NO folk_name in the ` +
        `corpus provenance sidecar (e.g. ${missingFolkName.slice(0, 5).join(', ')}). ` +
        `The sidecar is stale vs the atlas point set. Re-export ` +
        `scripts/atlas/kit-provenance-sidecar.json from corpus.db, then re-run. HALT.`
    );
  }

  // Reconcile against emitted counts — drift => HALT (guard extends to counts).
  if (seenActive !== nActive) {
    throw new BuildFailError(
      `BUILD-FAIL GUARD: derived live-kit count ${seenActive} != emitted counts.active ${nActive}.`
    );
  }
  if (seenSupplementary !== nSupplementary) {
    throw new BuildFailError(
      `BUILD-FAIL GUARD: derived graveyard-kit count ${seenSupplementary} != emitted counts.supplementary ${nSupplementary}.`
    );
  }
  if (kits.length !== nTotal) {
    throw new BuildFailError(
      `BUILD-FAIL GUARD: kit row count ${kits.length} != emitted counts.total ${nTotal}.`
    );
  }

  // Presence-floor asserts — catch a RENAME of a kind-specific field even though
  // that field is legally absent on the OTHER kind. If `gateA_group` were renamed
  // across all live points, seenGrouped collapses to 0; if `death_class` were
  // renamed across all graveyard points, seenGraveyardWithDeathClass collapses.
  if (seenGrouped === 0) {
    throw new BuildFailError(
      `BUILD-FAIL GUARD: zero condensation members found — the 'gateA_group' field ` +
        `appears renamed or dropped across all live points (expected 6 named groups). HALT.`
    );
  }
  const distinctGroups = new Set(
    kits.filter((k) => k.condensation != null).map((k) => k.condensation)
  );
  if (distinctGroups.size !== 6) {
    throw new BuildFailError(
      `BUILD-FAIL GUARD: found ${distinctGroups.size} distinct condensation groups ` +
        `(${[...distinctGroups].join(', ')}), expected 6. Group vocabulary drift — HALT.`
    );
  }
  if (seenGraveyardWithDeathClass !== seenSupplementary) {
    throw new BuildFailError(
      `BUILD-FAIL GUARD: ${seenGraveyardWithDeathClass}/${seenSupplementary} graveyard kits ` +
        `carry a death_class — the 'death_class' field appears renamed or dropped. HALT.`
    );
  }

  // ============================================================
  // PER-GHOST-CELL ROWS
  //   core: emitted 7-tuple (order == core_order)
  //   depth: emitted denominator depth
  //   lit / kit_count: emitted (used by pivot leaf + legend Ghosts branch)
  //   x, y, quadrant: emitted coords + derived sign-pair
  // ============================================================
  const ghosts = [];
  for (const c of feasibleCells) {
    const core = requireField(c, 'core', 'atlas.ghost_field.feasible_cells[]');
    if (!Array.isArray(core) || core.length !== coreOrder.length) {
      throw new BuildFailError(
        `BUILD-FAIL GUARD: ghost cell 'core' arity ${
          Array.isArray(core) ? core.length : 'not-array'
        } != core_order arity ${coreOrder.length}.`
      );
    }
    const depth = requireField(c, 'depth', 'atlas.ghost_field.feasible_cells[]');
    const lit = requireField(c, 'lit', 'atlas.ghost_field.feasible_cells[]');
    const kitCount = requireField(c, 'kit_count', 'atlas.ghost_field.feasible_cells[]');
    const x = requireField(c, 'x', 'atlas.ghost_field.feasible_cells[]');
    const y = requireField(c, 'y', 'atlas.ghost_field.feasible_cells[]');

    ghosts.push({
      core,
      depth,
      lit,
      kit_count: kitCount,
      x,
      y,
      quadrant: quadrant(x, y),
    });
  }

  // ============================================================
  // POLE VOCABULARY
  //   axis_names: the two projection-plane axis pole strings (verbatim)
  //   core_axes: for each ghost core axis, its name + the emitted distinct
  //     value set (derived by scan of feasible_cells; used as pivot levels).
  //     These VALUE SETS are pure copies of what the emit contains — no synthesis.
  // ============================================================
  const coreAxisValues = coreOrder.map(() => new Set());
  for (const c of feasibleCells) {
    for (let i = 0; i < coreOrder.length; i++) {
      coreAxisValues[i].add(c.core[i]);
    }
  }
  // D2-a: derive the engine-key axis VALUE vocabularies on the atlas set (scan of the
  // joined engine_key values) so the client renders DERIVED names/order + can show the
  // vocabulary without shipping the corpus. `null` values (blank sentinel) are skipped;
  // `unknown` (curated) is included.
  const engineAxisValues = new Map(engineAxes.map((a) => [a.axis, new Set()]));
  for (const k of kits) {
    if (k.engine_key == null) continue;
    for (const a of engineAxes) {
      const v = k.engine_key[a.axis];
      if (v != null && v !== '') engineAxisValues.get(a.axis).add(v);
    }
  }

  const poleVocabulary = {
    axis_names: axisNames, // { dim1: "PERFORM <-> DEPLOY", dim2: "EMBODY <-> LAUNCH" }
    core_order: coreOrder,
    core_axes: coreOrder.map((name, i) => ({
      axis: name,
      values: [...coreAxisValues[i]].sort(),
    })),
    // D2-a: the DERIVED 14-axis engine-key schema (order + name + naming-column + grain)
    // carried verbatim from the sidecar's receipt so the client NEVER hand-types axis
    // names/order. Values are the derived-on-atlas vocabularies (audit + column headers).
    engine_key_axes: engineAxes.map((a) => ({
      pos: a.pos,
      axis: a.axis,
      column: a.column,
      grain: a.grain ?? 'kit',
      values: [...(engineAxisValues.get(a.axis) ?? new Set())].sort(),
    })),
    // Region-name legend so the pivot / quadrant labels never re-derive convention.
    quadrant_regions: {
      EN: 'EAST-NORTH',
      ES: 'EAST-SOUTH',
      WN: 'WEST-NORTH',
      WS: 'WEST-SOUTH',
    },
  };

  return {
    // --- provenance stamp: this derivative's lineage back to the fat source ---
    schema_version: '1.0',
    derived_from: {
      atlas_version: atlasVersion,
      emitted_at: emittedAt,
      emitter_script: emitterScript,
      source_bytes: null, // filled in by caller (post-read)
    },
    counts: {
      kits: kits.length,
      kits_live: seenActive,
      kits_graveyard: seenSupplementary,
      kits_condensation_members: seenGrouped,
      ghosts: ghosts.length,
      ghosts_lit: ghosts.reduce((n, g) => n + (g.lit ? 1 : 0), 0),
    },
    // D1-h provenance-join coverage on the atlas kit set (receipts; folk_name is a floor).
    provenance_coverage: {
      folk_name: covFolkName,
      game: covGame,
      era_year: covYear,
      stabilization_patch: covPatch,
      total: kits.length,
    },
    // D2-a engine-key join coverage on the atlas kit set (receipts; SOFT join).
    // per_axis = kits with a NON-NULL value on that axis ('unknown' counts; blank/null
    // does not). Reported for acceptance 50 (per-axis coverage on the atlas 506).
    engine_key_coverage: {
      kits_with_engine_key: covEngineKey,
      per_axis: Object.fromEntries(engineAxes.map((a) => [a.axis, covPerAxis.get(a.axis)])),
      total: kits.length,
      // The derivation receipt from the sidecar (part-order + column correspondence),
      // carried through so the provenance panel + audits can cite it without the corpus.
      derivation: engineKey?.provenance ?? null,
    },
    pole_vocabulary: poleVocabulary,
    kits,
    ghosts,
  };
}

// ---- Main ----
function main() {
  if (!existsSync(sourcePath)) {
    console.error(
      `BUILD-FAIL: source atlas not found at ${sourcePath}. ` +
        `Vendor atlas-edition2.json into data-src/atlas/ before building.`
    );
    process.exit(2);
  }

  const raw = readFileSync(sourcePath, 'utf8');
  let source;
  try {
    source = JSON.parse(raw);
  } catch (e) {
    console.error(`BUILD-FAIL: source atlas is not valid JSON — ${e.message}`);
    process.exit(2);
  }

  // D1-h: load the READ-ONLY corpus provenance sidecar (build HALT if absent —
  // the build names depend on it; degrading to slugs is not allowed).
  if (!existsSync(sidecarPath)) {
    console.error(
      `BUILD-FAIL: corpus provenance sidecar not found at ${sidecarPath}. ` +
        `Export it from corpus.db (scripts/atlas/kit-provenance-sidecar.json) before building.`
    );
    process.exit(2);
  }
  let sidecar;
  try {
    sidecar = JSON.parse(readFileSync(sidecarPath, 'utf8'));
  } catch (e) {
    console.error(`BUILD-FAIL: provenance sidecar is not valid JSON — ${e.message}`);
    process.exit(2);
  }

  // D2-a: load the READ-ONLY 14-axis engine-key sidecar (build HALT if absent — builds
  // must show their real axis codes; the D1-g `—` state is superseded). This is a SOFT
  // JOIN per kit (a kit absent from the sidecar shows `—`), but the sidecar FILE must
  // exist and be well-formed, or the axis schema cannot be derived => HALT.
  if (!existsSync(engineKeySidecarPath)) {
    console.error(
      `BUILD-FAIL: engine-key sidecar not found at ${engineKeySidecarPath}. ` +
        `Export it from corpus.db (scripts/atlas/export-engine-key-sidecar.mjs) before building.`
    );
    process.exit(2);
  }
  let engineKeySidecar;
  try {
    engineKeySidecar = JSON.parse(readFileSync(engineKeySidecarPath, 'utf8'));
  } catch (e) {
    console.error(`BUILD-FAIL: engine-key sidecar is not valid JSON — ${e.message}`);
    process.exit(2);
  }

  let out;
  try {
    const provenanceIndex = loadProvenanceIndex(sidecar);
    const engineKey = loadEngineKeyIndex(engineKeySidecar);
    out = build(source, provenanceIndex, engineKey);
  } catch (e) {
    if (e instanceof BuildFailError) {
      console.error(e.message);
      process.exit(1);
    }
    throw e;
  }

  out.derived_from.source_bytes = Buffer.byteLength(raw, 'utf8');

  const minified = JSON.stringify(out);
  writeFileSync(outPath, minified);

  const outBytes = Buffer.byteLength(minified, 'utf8');
  const srcBytes = out.derived_from.source_bytes;
  console.log('atlas-interactive.json built:');
  console.log(`  source : ${sourcePath}`);
  console.log(`  out    : ${outPath}`);
  console.log(`  kits   : ${out.counts.kits} (live ${out.counts.kits_live}, graveyard ${out.counts.kits_graveyard}, condensation-members ${out.counts.kits_condensation_members})`);
  console.log(`  ghosts : ${out.counts.ghosts} (lit ${out.counts.ghosts_lit})`);
  const pc = out.provenance_coverage;
  console.log(
    `  provenance (D1-h corpus join, /${pc.total}): folk_name ${pc.folk_name}, game ${pc.game}, ` +
      `era_year ${pc.era_year}, stabilization_patch ${pc.stabilization_patch}`
  );
  const ec = out.engine_key_coverage;
  console.log(
    `  engine-key (D2-a 14-axis join, /${ec.total}): kits_with_key ${ec.kits_with_engine_key}`
  );
  console.log(
    '    per-axis coverage: ' +
      Object.entries(ec.per_axis)
        .map(([ax, n]) => `${ax}=${n}`)
        .join(' ')
  );
  console.log(
    `  size   : ${outBytes.toLocaleString()} B (${(outBytes / 1024 / 1024).toFixed(2)} MB) ` +
      `vs source ${srcBytes.toLocaleString()} B (${(srcBytes / 1024 / 1024).toFixed(2)} MB) ` +
      `= ${((outBytes / srcBytes) * 100).toFixed(1)}%`
  );
}

main();
