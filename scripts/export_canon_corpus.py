#!/usr/bin/env python3
"""
export_canon_corpus.py — Export the 267 canonical KIT records from corpus.db to
static JSON for the loadout /canon inspection surface.

READ-ONLY against the single source of truth:
  /Users/admin/Games/reincarnated-collaboration/agentic_orchestration/research/curated/corpus.db
(opened via a `file:...?mode=ro` URI — never written, never copied into this repo).

Plus a READ-ONLY spine-status sidecar (a JSON file):
  /Users/admin/Games/reincarnated-collaboration/agentic_orchestration/elrond/notes/
    2026-07-22-tier3-family-membership-sidecar.json

The pool is `SELECT * FROM canon_corpus WHERE corpus_class='record'` -> 267 rows.
Annex (corpus_class='annex') and system (corpus_class='system') classes are OUT of scope.

Outputs (public/canon/ — a build-time asset dir, NOT bundled into the JS):
  public/canon/index.json              267 summary rows + an export-provenance block
  public/canon/kits/<kit_id>.json      the FULL per-kit join, one file per kit

Design notes:
  * Every column of every joined row is emitted (RENDER EVERY COLUMN is the bar).
  * JSON-string columns (core_skills, mapping_json, asserts_json, facts_json,
    payload_json, provenance_json, raw_json, exact_json, ...) are parsed into real
    objects. If a parse fails, the raw string is kept under `<col>` and a sibling
    `<col>__parse_error` flag is set (fail-visible, never silently dropped).
  * Output ordering is deterministic (sorted keys, kit_id-sorted rows) so re-runs
    diff cleanly.
  * Fails LOUDLY (non-zero exit) if the DB or the sidecar is absent.

Run from reincarnated-loadout/:
  python3 scripts/export_canon_corpus.py
"""
import datetime
import json
import os
import sqlite3
import sys

# ---------------------------------------------------------------------------
# Paths — the DB + sidecar live in the sibling meta-repo; outputs stay in-repo.
# ---------------------------------------------------------------------------
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DB_PATH = (
    '/Users/admin/Games/reincarnated-collaboration/agentic_orchestration/'
    'research/curated/corpus.db'
)
SIDECAR_PATH = (
    '/Users/admin/Games/reincarnated-collaboration/agentic_orchestration/'
    'elrond/notes/2026-07-22-tier3-family-membership-sidecar.json'
)
OUT_DIR = os.path.join(REPO_ROOT, 'public', 'canon')
KITS_DIR = os.path.join(OUT_DIR, 'kits')

# JSON-string columns to parse into real objects, per table. If parse fails the
# raw string is retained and a `<col>__parse_error` sibling flag is added.
JSON_COLS = {
    'canon_corpus': ['core_skills', 'source_urls'],
    'canon_engine_key': ['provenance_json', 'raw_json', 'mob_verbs', 'flags'],
    'kit_mapping': ['mapping_json'],
    'kit_delta_t4': ['asserts_json'],
    'skill_geometry_band': ['exact_json'],
    'mechanic_gap_docket': ['provenance_json', 'evidence_kits'],
    'kit_dossier': ['payload_json'],
    'canon_probe_facts': ['facts_json'],
}

# The 14 positional slots of canon_corpus.atlas_coords (a pipe-delimited string).
# Labels are derived empirically by correlating each slot's value against the
# spine's axis columns (attr/range/tempo/amp/proxy/commit) and the engine key
# (geometry/ctrl/def/econ) across records. Labeled positionally + honestly; the
# UI shows slot index + value + this label so nothing is misattributed.
ATLAS_SLOT_LABELS = [
    'motion / mobility',        # 0  e.g. rooted
    'delivery',                 # 1  e.g. projectile
    'amplitude (damage var.)',  # 2  e.g. flat
    'geometry',                 # 3  e.g. multi_projectile
    'control function',         # 4  e.g. damage
    'control ailment',          # 5  e.g. none
    'defensive profile',        # 6  e.g. mitigate
    'resource economy',         # 7  e.g. free
    'proxy density',            # 8  e.g. light
    'engagement range',         # 9  e.g. ranged
    'damage tempo',             # 10 e.g. high
    'commitment',               # 11 e.g. instant
    'activation',               # 12 e.g. active
    'cadence / dependency',     # 13 e.g. one-shot
]


def die(msg):
    print(f"FATAL: {msg}", file=sys.stderr)
    sys.exit(1)


def parse_json_cols(row_dict, table):
    """Parse the JSON-string columns for a table's row into real objects.
    On failure keep the raw string and set a `<col>__parse_error` flag."""
    for col in JSON_COLS.get(table, []):
        if col not in row_dict:
            continue
        raw = row_dict[col]
        if raw is None or raw == '':
            row_dict[col] = None
            continue
        try:
            row_dict[col] = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            # keep the raw string, flag the failure (fail-visible, never dropped)
            row_dict[col] = raw
            row_dict[f'{col}__parse_error'] = True
    return row_dict


def fetch_all(conn, sql, params=()):
    return [dict(r) for r in conn.execute(sql, params).fetchall()]


def fetch_one(conn, sql, params=()):
    r = conn.execute(sql, params).fetchone()
    return dict(r) if r is not None else None


def split_atlas_coords(val):
    """Split the 14-slot pipe string into labeled slots. Honest on shape drift:
    returns None if empty; if the slot count != 14 the labels degrade gracefully."""
    if not val:
        return None
    parts = val.split('|')
    slots = []
    for i, p in enumerate(parts):
        slots.append({
            'index': i,
            'label': ATLAS_SLOT_LABELS[i] if i < len(ATLAS_SLOT_LABELS) else f'slot {i}',
            'value': p,
        })
    return {'raw': val, 'slot_count': len(parts), 'expected_slots': 14, 'slots': slots}


def load_sidecar(path):
    with open(path, 'r') as f:
        data = json.load(f)
    memberships = data.get('memberships', [])
    by_kit = {}
    for r in memberships:
        kid = r.get('kit_id')
        if kid is None:
            continue
        on_spine = bool(r.get('on_spine'))
        shadowed_by = r.get('shadowed_by')
        if on_spine and not shadowed_by:
            status = 'ACTIVE'
        elif shadowed_by:
            status = 'SHADOWED'
        elif not on_spine:
            status = 'OFF-SPINE'
        else:
            status = 'UNPLACED'
        by_kit[kid] = {
            'spine_status': status,
            'on_spine': on_spine,
            'shadowed_by': shadowed_by,
            'family': r.get('family'),
            'tier': r.get('tier'),
            'source_artifact': r.get('source_artifact'),
        }
    return by_kit, data


def derive_spine_status(kit_id, sidecar_by_kit):
    entry = sidecar_by_kit.get(kit_id)
    if entry is None:
        return {'spine_status': 'UNPLACED', 'on_spine': None, 'shadowed_by': None,
                'family': None, 'tier': None, 'source_artifact': None,
                'note': 'not present in the tier-3 family-membership sidecar'}
    return entry


def best_citation(citations):
    """Pick the single best build-guide link for the header button:
    prefer a NON-quarantined maxroll.gg row; else first non-quarantined rank-1;
    else first non-quarantined; else first row (even if quarantined, flagged)."""
    non_q = [c for c in citations if not c.get('quarantined')]
    for c in non_q:
        if (c.get('site') or '').lower() == 'maxroll.gg':
            return c
    for c in non_q:
        rc = (c.get('rank_class') or '').lower()
        if rc in ('rank-1', 'rank1', 'primary', 'attested', 'attested-era'):
            return c
    if non_q:
        return non_q[0]
    return citations[0] if citations else None


def main():
    if not os.path.exists(DB_PATH):
        die(f"corpus.db not found at {DB_PATH} — cannot export. (READ-ONLY source of truth.)")
    if not os.path.exists(SIDECAR_PATH):
        die(f"spine-status sidecar not found at {SIDECAR_PATH} — cannot derive spine_status.")

    os.makedirs(KITS_DIR, exist_ok=True)

    sidecar_by_kit, sidecar_raw = load_sidecar(SIDECAR_PATH)

    # READ-ONLY connection via file: URI (mode=ro).
    conn = sqlite3.connect(f'file:{DB_PATH}?mode=ro', uri=True)
    conn.row_factory = sqlite3.Row

    # --- export provenance / schema stamp (latest schema_meta by applied_utc) ---
    schema_latest = fetch_one(
        conn,
        "SELECT version, applied_utc FROM corpus_schema_meta ORDER BY applied_utc DESC LIMIT 1",
    )
    schema_meta_rows = conn.execute("SELECT count(*) FROM corpus_schema_meta").fetchone()[0]

    class_counts = {
        r['corpus_class']: r['n']
        for r in conn.execute(
            "SELECT corpus_class, count(*) AS n FROM canon_corpus GROUP BY corpus_class"
        ).fetchall()
    }

    # --- the 267 record spine rows ---
    records = fetch_all(
        conn,
        "SELECT * FROM canon_corpus WHERE corpus_class='record' ORDER BY kit_id",
    )
    if len(records) != 267:
        print(f"WARNING: expected 267 record rows, got {len(records)}", file=sys.stderr)

    index_rows = []
    written = 0

    for spine in records:
        kit_id = spine['kit_id']
        spine = parse_json_cols(spine, 'canon_corpus')
        spine['atlas_coords_parsed'] = split_atlas_coords(spine.get('atlas_coords'))

        spine_status = derive_spine_status(kit_id, sidecar_by_kit)

        engine_key = fetch_one(
            conn, "SELECT * FROM canon_engine_key WHERE kit_id=?", (kit_id,)
        )
        if engine_key:
            engine_key = parse_json_cols(engine_key, 'canon_engine_key')

        mapping = fetch_one(conn, "SELECT * FROM kit_mapping WHERE kit_id=?", (kit_id,))
        if mapping:
            mapping = parse_json_cols(mapping, 'kit_mapping')

        delta_t4 = fetch_one(conn, "SELECT * FROM kit_delta_t4 WHERE kit_id=?", (kit_id,))
        if delta_t4:
            delta_t4 = parse_json_cols(delta_t4, 'kit_delta_t4')

        geometry_bands = fetch_all(
            conn,
            "SELECT * FROM skill_geometry_band WHERE kit_id=? ORDER BY skill_ordinal",
            (kit_id,),
        )
        geometry_bands = [parse_json_cols(b, 'skill_geometry_band') for b in geometry_bands]

        recognition_hooks = fetch_all(
            conn,
            "SELECT * FROM recognition_hook WHERE kit_id=? ORDER BY rank, hook_id",
            (kit_id,),
        )

        acceptance_asserts = fetch_all(
            conn,
            "SELECT * FROM kit_acceptance_assert WHERE kit_id=? ORDER BY assert_id",
            (kit_id,),
        )

        # deviations, each with its mechanic_gap_docket joined (LEFT — many have no docket)
        deviations = fetch_all(
            conn,
            "SELECT * FROM kit_deviation WHERE kit_id=? ORDER BY deviation_id",
            (kit_id,),
        )
        for dev in deviations:
            docket_id = dev.get('docket_id')
            dev['docket'] = None
            if docket_id not in (None, ''):
                dk = fetch_one(
                    conn, "SELECT * FROM mechanic_gap_docket WHERE docket_id=?", (docket_id,)
                )
                if dk:
                    dev['docket'] = parse_json_cols(dk, 'mechanic_gap_docket')

        citations = fetch_all(
            conn,
            "SELECT * FROM kit_citations WHERE kit_id=? ORDER BY quarantined ASC, rank_class, id",
            (kit_id,),
        )

        verify_ledger = fetch_all(
            conn,
            "SELECT * FROM verify_ledger WHERE kit_id=? ORDER BY claim_family, id",
            (kit_id,),
        )

        dossier = fetch_all(
            conn,
            "SELECT * FROM kit_dossier WHERE kit_id=? ORDER BY family, id",
            (kit_id,),
        )
        dossier = [parse_json_cols(d, 'kit_dossier') for d in dossier]

        probe_facts = fetch_all(
            conn,
            "SELECT * FROM canon_probe_facts WHERE kit_id=? ORDER BY family, id",
            (kit_id,),
        )
        probe_facts = [parse_json_cols(p, 'canon_probe_facts') for p in probe_facts]

        best_cite = best_citation(citations)

        kit_payload = {
            'kit_id': kit_id,
            'spine_status': spine_status,
            'spine': spine,
            'engine_key': engine_key,
            'mapping': mapping,
            'delta_t4': delta_t4,
            'geometry_bands': geometry_bands,
            'recognition_hooks': recognition_hooks,
            'acceptance_asserts': acceptance_asserts,
            'deviations': deviations,
            'citations': citations,
            'best_citation': best_cite,
            'verify_ledger': verify_ledger,
            'dossier': dossier,
            'probe_facts': probe_facts,
            '_row_counts': {
                'geometry_bands': len(geometry_bands),
                'recognition_hooks': len(recognition_hooks),
                'acceptance_asserts': len(acceptance_asserts),
                'deviations': len(deviations),
                'citations': len(citations),
                'verify_ledger': len(verify_ledger),
                'dossier': len(dossier),
                'probe_facts': len(probe_facts),
            },
        }

        out_path = os.path.join(KITS_DIR, f'{kit_id}.json')
        with open(out_path, 'w') as f:
            json.dump(kit_payload, f, indent=2, sort_keys=True, ensure_ascii=False)
        written += 1

        # --- the compact index summary row ---
        verify_confirmed = sum(1 for v in verify_ledger if v.get('verdict') == 'CONFIRMED')
        verify_contradicted = sum(1 for v in verify_ledger if v.get('verdict') == 'CONTRADICTED')

        index_rows.append({
            'kit_id': kit_id,
            'folk_name': spine.get('folk_name'),
            'game': spine.get('game'),
            'tier': spine.get('tier'),
            'canon_tier': spine.get('canon_tier'),
            'court': spine.get('court'),
            'element': spine.get('original_element') or spine.get('elem_raw'),
            'grade': mapping.get('grade') if mapping else None,
            'terminal_state': mapping.get('terminal_state') if mapping else None,
            'range_val': spine.get('range_val'),
            'tempo_val': spine.get('tempo_val'),
            'amp_val': spine.get('amp_val'),
            'avg_conf': spine.get('avg_conf'),
            'spine_status': spine_status['spine_status'],
            'shadowed_by': spine_status.get('shadowed_by'),
            'bands_count': len(geometry_bands),
            'citations_count': len(citations),
            'verify_confirmed': verify_confirmed,
            'verify_contradicted': verify_contradicted,
            'best_citation_url': best_cite.get('url') if best_cite else None,
            'best_citation_site': best_cite.get('site') if best_cite else None,
            'best_citation_quarantined': bool(best_cite.get('quarantined')) if best_cite else None,
        })

    # spine-status distribution across the 267 (for the index header caption)
    spine_status_dist = {}
    for r in index_rows:
        spine_status_dist[r['spine_status']] = spine_status_dist.get(r['spine_status'], 0) + 1

    index_payload = {
        'export_provenance': {
            'source_db': DB_PATH,
            'source_sidecar': SIDECAR_PATH,
            'sidecar_run': sidecar_raw.get('run'),
            'sidecar_ruling': sidecar_raw.get('ruling'),
            'sidecar_date': sidecar_raw.get('date'),
            'schema_version': schema_latest['version'] if schema_latest else None,
            'schema_applied_utc': schema_latest['applied_utc'] if schema_latest else None,
            'schema_meta_row_count': schema_meta_rows,
            'exported_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'corpus_class_counts': class_counts,
            'record_count': len(records),
            'kit_files_written': written,
            'atlas_slot_labels': ATLAS_SLOT_LABELS,
            'spine_status_distribution': spine_status_dist,
        },
        'kits': sorted(index_rows, key=lambda r: r['kit_id']),
    }

    index_out = os.path.join(OUT_DIR, 'index.json')
    with open(index_out, 'w') as f:
        json.dump(index_payload, f, indent=2, sort_keys=True, ensure_ascii=False)

    conn.close()

    # size accounting
    total_bytes = os.path.getsize(index_out)
    for name in os.listdir(KITS_DIR):
        total_bytes += os.path.getsize(os.path.join(KITS_DIR, name))

    print(f"Wrote index.json ({os.path.getsize(index_out):,} bytes) with {len(index_rows)} rows")
    print(f"Wrote {written} per-kit files to {KITS_DIR}/")
    print(f"Schema stamp: {schema_latest['version'] if schema_latest else '?'} "
          f"(applied {schema_latest['applied_utc'] if schema_latest else '?'})")
    print(f"spine_status distribution: {spine_status_dist}")
    print(f"Total payload size: {total_bytes:,} bytes ({total_bytes / 1024 / 1024:.2f} MB)")
    if written != 267:
        die(f"expected 267 kit files, wrote {written}")


if __name__ == '__main__':
    main()
