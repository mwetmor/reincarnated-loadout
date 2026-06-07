#!/usr/bin/env python3
"""
compute-constellation-layout.py
Pre-compute Mode B (kit-as-bounded-constellation) layout for the full 1000-kit corpus.

Gandalf-endorsed over Web Worker approach (Phase 1 scale concern finding, 2026-06-07).
Run once at build time; outputs static JSON loaded by ConstellationModeCanvas.

Output: public/data/cosmograph/constellation_layout.json

Architecture:
  Stage 1 — Grid layout with element-sorted placement.
    - 1000 kits sorted by (element, attribute) for element-regional clustering.
    - Placed on a 32×32 grid over world space (WORLD_W × WORLD_H).
    - Small deterministic random jitter (±JITTER_PX) for visual variety.
    - Grid cell spacing guarantees minimum inter-centroid distance > 2×MAX_CONSTELLATION_RADIUS.

    Rationale for grid over force-directed layout:
    All 1000 kits have Jaccard similarity ~0.224 (uniform — no clustering signal).
    F-R repulsion collapses all centroids into the center (aggregate attraction overwhelms
    repulsion). Pure repulsion clusters at boundary. Grid is the correct choice for
    uniform-similarity corpora where force-layout has no gradient to follow.

  Stage 2 — Sunflower (Vogel golden-angle) intra-constellation placement.
    - Per-kit: place primitive instances within MAX_CONSTELLATION_RADIUS via
      deterministic golden-angle spiral. Evenly distributed, no overlap.

Force config carried from Phase 1 c1 global bound:
  MAX_CONSTELLATION_RADIUS = 70 px

TODO(drax): when engine ships kit-to-kit similarity 2D embedding (separate from
  primitive-space UMAP), rerun with that embedding for centroid seeding to enable
  genuine element-clustering at the centroid layer. See Phase 1 UMAP-degenerate finding.
"""

import json
import math
import os
import time
import numpy as np

# ─── Configuration ────────────────────────────────────────────────────────────

MAX_CONSTELLATION_RADIUS = 70   # px (c1 global bound, Phase 1 landing)

# World canvas — must be large enough for 1000 non-overlapping 70px-radius circles.
# Formula: at 32×32 grid with WORLD_W=9000, WORLD_H=7000, MARGIN=150:
#   cell_w = (9000-300)/32 = 271.9 px, cell_h = (7000-300)/32 = 209.4 px
#   Min inter-centroid = cell_h - 2×JITTER = 209.4 - 40 = 169.4 px > 140 px ✓
WORLD_W = 9000    # logical world width (px)
WORLD_H = 7000    # logical world height (px)
MARGIN = 150      # px from world edge for centroid placement

# Jitter: random offset per centroid to break perfect grid regularity.
# Constrained so min spacing stays > 2×MAX_CONSTELLATION_RADIUS = 140 px.
# At cell_h = 209.4 px: JITTER_PX = 20 → min spacing = 209.4 - 40 = 169.4 px ✓
JITTER_PX = 20

# Grid dimensions
NCOLS = 32   # columns in grid (ceil(sqrt(1000)) = 32)
NROWS = 32   # rows  (32×32 = 1024 ≥ 1000)

# Sunflower spiral parameters (Stage 2)
GOLDEN_ANGLE = math.pi * (3.0 - math.sqrt(5.0))   # ≈ 2.3999 rad

# Element ordering for regional grouping in grid (left → right)
ELEMENT_ORDER = {
    'fire': 0, 'lightning': 1, 'water': 2, 'wind': 3,
    'earth': 4, 'physical': 5, 'shadow': 6, 'holy': 7,
}
ATTR_ORDER = {'STR': 0, 'DEX': 1, 'INT': 2, 'WIS': 3}

# ─── Paths ────────────────────────────────────────────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, '..', 'public', 'data', 'cosmograph')
KIT_JSON = os.path.join(DATA_DIR, 'kit_constellations.json')
PRIM_JSON = os.path.join(DATA_DIR, 'primitive_registry.json')
OUT_JSON = os.path.join(DATA_DIR, 'constellation_layout.json')


# ─── Data loading ─────────────────────────────────────────────────────────────

def load_data():
    with open(KIT_JSON) as f:
        kits = json.load(f)
    with open(PRIM_JSON) as f:
        prims = json.load(f)
    return kits, prims


# ─── Stage 1: Grid layout with element-sorted placement ───────────────────────

def run_stage1_grid_layout(kits, seed=42):
    """
    Sort kits by (element, attribute) for element-regional clustering,
    then place on NCOLS×NROWS grid with small random jitter.

    Grid guarantees minimum inter-centroid distance > 2×MAX_CONSTELLATION_RADIUS.

    Returns: dict[kit_id → (cx, cy)]
    """
    rng = np.random.default_rng(seed)

    # Sort kit indices by (element, attribute) for regional element clustering
    sorted_indices = sorted(
        range(len(kits)),
        key=lambda i: (
            ELEMENT_ORDER.get(kits[i]['primary_element'], 8),
            ATTR_ORDER.get(kits[i]['kit_attribute'], 4),
            kits[i]['kit_id'],   # stable tie-break
        )
    )

    # Grid cell dimensions
    usable_w = WORLD_W - 2 * MARGIN
    usable_h = WORLD_H - 2 * MARGIN
    cell_w = usable_w / NCOLS
    cell_h = usable_h / NROWS

    # Verify spacing guarantee
    min_spacing = min(cell_w, cell_h) - 2 * JITTER_PX
    collision_threshold = MAX_CONSTELLATION_RADIUS * 2  # 140 px
    if min_spacing < collision_threshold:
        print(f'  WARNING: min spacing {min_spacing:.1f}px < collision threshold {collision_threshold}px')
        print(f'    Consider reducing JITTER_PX or increasing WORLD size')
    else:
        print(f'  Grid spacing guarantee: min {min_spacing:.1f}px > {collision_threshold}px threshold ✓')

    print(f'  Grid: {NCOLS}×{NROWS}, cell_w={cell_w:.1f}px, cell_h={cell_h:.1f}px, jitter=±{JITTER_PX}px')

    positions = {}
    for rank, kit_idx in enumerate(sorted_indices):
        col = rank % NCOLS
        row = rank // NCOLS
        cx = MARGIN + col * cell_w + cell_w / 2 + rng.uniform(-JITTER_PX, JITTER_PX)
        cy = MARGIN + row * cell_h + cell_h / 2 + rng.uniform(-JITTER_PX, JITTER_PX)
        positions[kits[kit_idx]['kit_id']] = (float(cx), float(cy))

    # Diagnostic: nearest-neighbor distance (sample of 100)
    kit_ids = list(positions.keys())
    sample_n = min(len(kit_ids), 100)
    all_pos = np.array([positions[k] for k in kit_ids[:sample_n]])
    nn_dists = []
    for i in range(sample_n):
        d = np.linalg.norm(all_pos - all_pos[i], axis=1)
        d[i] = np.inf
        nn_dists.append(d.min())
    nn_dists = np.array(nn_dists)

    print(f'  NN distance (sample {sample_n}): min={nn_dists.min():.1f}px  '
          f'median={np.median(nn_dists):.1f}px  mean={nn_dists.mean():.1f}px')
    overlap_ct = (nn_dists < collision_threshold).sum()
    if overlap_ct > 0:
        print(f'  WARNING: {overlap_ct} sampled centroids within collision threshold')
    else:
        print(f'  OK: All sampled centroids above collision threshold.')

    return positions


# ─── Stage 2: Sunflower intra-constellation placement ────────────────────────

def sunflower_positions(n, cx, cy, max_radius):
    """
    Place n stars within a circle of max_radius centered at (cx, cy) via Vogel spiral.
    Returns list of (x, y).
    """
    if n == 0:
        return []
    if n == 1:
        return [(cx, cy)]

    result = []
    for i in range(n):
        # Scale: 0.12× inner (avoid center crowding) → 0.97× outer (avoid edge)
        r_frac = math.sqrt((i + 0.5) / n)
        r = max_radius * (0.12 + 0.85 * r_frac)
        theta = i * GOLDEN_ANGLE
        result.append((cx + r * math.cos(theta), cy + r * math.sin(theta)))
    return result


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    print('=' * 60)
    print('compute-constellation-layout.py')
    print('Mode B pre-compute — drax Phase 2, 2026-06-07')
    print(f'World: {WORLD_W}×{WORLD_H} px  MAX_RADIUS: {MAX_CONSTELLATION_RADIUS} px')
    print('=' * 60)

    # 1. Load data
    print('\n[1/3] Loading data...')
    kits, prims = load_data()
    print(f'  {len(kits)} kits, {len(prims)} primitives')
    assert len(kits) == 1000, f'Expected 1000 kits, got {len(kits)}'
    assert len(kits) <= NCOLS * NROWS, f'Grid ({NCOLS}×{NROWS}) too small for {len(kits)} kits'

    prim_by_id = {p['primitive_id']: p for p in prims}

    # 2. Stage 1: grid centroid layout
    print('\n[2/3] Stage 1: grid layout with element-sorted placement...')
    t0 = time.time()
    centroid_positions = run_stage1_grid_layout(kits)
    print(f'  Done in {time.time() - t0:.3f}s')

    # 3. Stage 2 + output
    print('\n[3/3] Stage 2: sunflower star placement + building JSON...')
    t0 = time.time()

    centroids_out = []
    clusters_out = {}

    for kit in kits:
        cx, cy = centroid_positions[kit['kit_id']]

        # Kit primitive set (filter to registered primitives)
        prim_ids_in_kit = json.loads(kit['primitive_set_json'])
        valid_ids = [pid for pid in prim_ids_in_kit if pid in prim_by_id]

        centroids_out.append({
            'kit_id': kit['kit_id'],
            'cx': round(cx, 2),
            'cy': round(cy, 2),
            'element': kit['primary_element'],
            'attribute': kit['kit_attribute'],
        })

        # Sunflower placement within constellation bound
        star_positions = sunflower_positions(len(valid_ids), cx, cy, MAX_CONSTELLATION_RADIUS)
        clusters_out[kit['kit_id']] = [
            {'p': pid, 'x': round(x, 2), 'y': round(y, 2)}
            for pid, (x, y) in zip(valid_ids, star_positions)
        ]

    total_nodes = sum(len(v) for v in clusters_out.values())
    print(f'  Stage 2 complete in {time.time() - t0:.3f}s')
    print(f'  Total instance nodes: {total_nodes} ({len(kits)} constellations, '
          f'mean {total_nodes / len(kits):.1f} per kit)')

    # Check first-class node count (visibility_at_default_zoom)
    first_class_count = 0
    for kit in kits:
        valid_ids = json.loads(kit['primitive_set_json'])
        for pid in valid_ids:
            p = prim_by_id.get(pid)
            if p and p.get('visibility_at_default_zoom'):
                first_class_count += 1
    print(f'  First-class (visibility_at_default_zoom=True): {first_class_count} nodes')

    # 4. Write output JSON
    output = {
        'meta': {
            'n_kits': len(kits),
            'n_primitives': len(prims),
            'world_w': WORLD_W,
            'world_h': WORLD_H,
            'max_constellation_radius': MAX_CONSTELLATION_RADIUS,
            'stage1_method': 'grid-element-sorted',
            'stage1_ncols': NCOLS,
            'stage1_nrows': NROWS,
            'stage1_jitter_px': JITTER_PX,
            'stage2_method': 'sunflower-vogel-spiral',
            'generated_by': 'compute-constellation-layout.py — drax Phase 2 2026-06-07',
            'umap_caveat': (
                'UMAP centroid_x/y NOT used for Mode B placement — degenerate '
                '(all 1000 kit centroids span 43x56 px, < one MAX_CONSTELLATION_RADIUS). '
                'TODO(drax): replace grid layout with engine kit-to-kit similarity '
                '2D embedding when available.'
            ),
        },
        'centroids': centroids_out,
        'clusters': clusters_out,
    }

    with open(OUT_JSON, 'w') as f:
        json.dump(output, f, separators=(',', ':'))

    size_kb = os.path.getsize(OUT_JSON) / 1024
    print(f'\nOutput: {OUT_JSON}')
    print(f'  {size_kb:.1f} KB ({size_kb / 1024:.2f} MB)')
    print(f'  {len(centroids_out)} centroids, {len(clusters_out)} clusters, '
          f'{total_nodes} instance nodes')
    print('\nDone. Run: cd ~/Games/reincarnated-loadout && npm run build')


if __name__ == '__main__':
    main()
