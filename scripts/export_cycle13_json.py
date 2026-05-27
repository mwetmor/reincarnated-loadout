#!/usr/bin/env python3
"""
export_cycle13_json.py — Export cycle13_characters.db to static JSON
for consumption by the React loadout app.

Outputs to: public/data/cycle13/
  - characters.json    (all 16 characters + season metadata)
  - gear/<character_id>.json  (all 110 gear rows per character)
  - t4/<character_id>.json    (T4 candidates per character)

Run from reincarnated-loadout/:
  python3 scripts/export_cycle13_json.py
"""
import json
import sqlite3
import os
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'cycle13_characters.db')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'cycle13')

def main():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: DB not found at {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(os.path.join(OUT_DIR, 'gear'), exist_ok=True)
    os.makedirs(os.path.join(OUT_DIR, 't4'), exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Season row
    season_row = conn.execute("SELECT * FROM season").fetchone()
    season = dict(season_row)
    season['raw_metadata_json'] = json.loads(season['raw_metadata_json']) if season.get('raw_metadata_json') else None

    # All 16 characters
    char_rows = conn.execute(
        "SELECT * FROM character WHERE season_id = ? ORDER BY attribute, element, character_id",
        (season['season_id'],)
    ).fetchall()

    characters = []
    for row in char_rows:
        c = dict(row)
        # Parse JSON columns
        c['bc_tuple'] = json.loads(c.pop('bc_tuple_json'))
        c['chain_composition'] = json.loads(c.pop('chain_composition_json'))
        c['wr_bracket_details'] = json.loads(c.pop('wr_bracket_details_json')) if c.get('wr_bracket_details_json') else None
        characters.append(c)

    # Write characters.json
    payload = {
        'season': season,
        'characters': characters,
    }
    out_path = os.path.join(OUT_DIR, 'characters.json')
    with open(out_path, 'w') as f:
        json.dump(payload, f, indent=2)
    print(f"Wrote {len(characters)} characters to {out_path}")

    # Per-character gear
    for char in characters:
        cid = char['character_id']
        gear_rows = conn.execute(
            "SELECT * FROM gear_instance WHERE character_id = ? ORDER BY slot, rarity_tier_order",
            (cid,)
        ).fetchall()

        gear_list = []
        for row in gear_rows:
            g = dict(row)
            g['partition_modifiers'] = json.loads(g.pop('partition_modifiers_json'))
            g['capability_modifiers'] = json.loads(g.pop('capability_modifiers_json'))
            g['t4_annotation'] = json.loads(g.pop('t4_annotation_json')) if g.get('t4_annotation_json') else None
            g['set_bonus'] = json.loads(g.pop('set_bonus_json')) if g.get('set_bonus_json') else None
            g['triggered_passive'] = json.loads(g.pop('triggered_passive_json')) if g.get('triggered_passive_json') else None
            gear_list.append(g)

        out_path = os.path.join(OUT_DIR, 'gear', f'{cid}.json')
        with open(out_path, 'w') as f:
            json.dump(gear_list, f, indent=2)
        print(f"  gear/{cid}.json — {len(gear_list)} rows")

    # Per-character T4 candidates
    for char in characters:
        cid = char['character_id']
        t4_rows = conn.execute(
            "SELECT * FROM character_t4_candidate WHERE character_id = ? ORDER BY rowid",
            (cid,)
        ).fetchall()

        t4_list = []
        for row in t4_rows:
            t = dict(row)
            t['scope_projection_data'] = json.loads(t.pop('scope_projection_data_json')) if t.get('scope_projection_data_json') else None
            t['category_a_params'] = json.loads(t.pop('category_a_params_json')) if t.get('category_a_params_json') else {}
            t['category_bc_params'] = json.loads(t.pop('category_bc_params_json')) if t.get('category_bc_params_json') else {}
            t4_list.append(t)

        out_path = os.path.join(OUT_DIR, 't4', f'{cid}.json')
        with open(out_path, 'w') as f:
            json.dump(t4_list, f, indent=2)
        print(f"  t4/{cid}.json — {len(t4_list)} candidates")

    conn.close()
    print(f"\nDone. Output at {OUT_DIR}/")

if __name__ == '__main__':
    main()
