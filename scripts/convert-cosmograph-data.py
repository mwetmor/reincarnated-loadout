"""
convert-cosmograph-data.py
Build-time script: converts elrond's cosmograph parquet files to JSON
for browser consumption at /forge. Outputs to public/data/cosmograph/.

Run: python3 scripts/convert-cosmograph-data.py

Outputs:
  public/data/cosmograph/primitive_registry.json
  public/data/cosmograph/kit_constellations.json
  public/data/cosmograph/flag_enum_attachments.json
  (region_labels.json and faction_overlays.json already JSON; copied by elrond)

NOTE: parquet source files (*.parquet) remain in public/data/cosmograph/ for
reference but are NOT fetched by the browser. The *.json files are served
to the browser. This keeps the client bundle lean (no runtime parquet parser).

TODO(drax): remove parquet source files from public/ after build-time
  conversion is confirmed stable. For now, keeping both for reference.
"""

import pyarrow.parquet as pq
import json
import os

SRC = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'cosmograph')

def parquet_to_json(parquet_filename: str, json_filename: str) -> int:
    """Convert a parquet file to a JSON array of row objects. Returns row count."""
    table = pq.read_table(os.path.join(SRC, parquet_filename))
    rows = []
    for i in range(len(table)):
        row = {}
        for col in table.column_names:
            val = table[col][i].as_py()
            row[col] = val
        rows.append(row)
    out_path = os.path.join(SRC, json_filename)
    with open(out_path, 'w') as f:
        json.dump(rows, f, separators=(',', ':'))
    size_kb = os.path.getsize(out_path) / 1024
    print(f'  {json_filename}: {len(rows)} rows, {size_kb:.1f} KB')
    return len(rows)


def main():
    print('Converting cosmograph parquet -> JSON...')

    count = parquet_to_json('primitive_registry.parquet', 'primitive_registry.json')
    assert count == 570, f'Expected 570 primitives, got {count}'

    count = parquet_to_json('kit_constellations.parquet', 'kit_constellations.json')
    assert count == 1000, f'Expected 1000 kits, got {count}'

    count = parquet_to_json('flag_enum_attachments.parquet', 'flag_enum_attachments.json')
    assert count == 1000, f'Expected 1000 flag attachments, got {count}'

    # Verify region_labels.json and faction_overlays.json exist (already JSON)
    for fname in ('region_labels.json', 'faction_overlays.json'):
        path = os.path.join(SRC, fname)
        assert os.path.exists(path), f'Missing: {path}'
        with open(path) as f:
            data = json.load(f)
        print(f'  {fname}: valid JSON, top-level keys: {list(data.keys())}')

    print('Done. All 5 data files ready for browser consumption.')


if __name__ == '__main__':
    main()
