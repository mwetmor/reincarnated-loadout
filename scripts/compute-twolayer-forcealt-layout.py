"""
compute-twolayer-forcealt-layout.py — Phase 3.3 alternative positioning algorithm.

Drax Phase 3.3, 2026-06-09. Per dispatch § 1.4 + § 3.3.

Alternative algorithm: force-directed with anchor repulsion.
Anchors are fixed; kits start near their element anchor and are pushed
by inter-kit repulsion and pulled by anchor attraction.

This compares against the Phase 3.1 baseline (fixed-anchor + radial projection).

Key difference from Phase 3.1:
  - Phase 3.1: sunflower spiral placement (deterministic geometric zones)
  - Phase 3.3 alt: force-directed from sunflower seed positions
    (kit positions drift under inter-kit repulsion + anchor spring)
    Goal: more organic, emergent kit clustering vs geometric spiral

Buffer space preserved differently:
  - Phase 3.1: explicit buffer by placing hybrids at inter-anchor midpoints
  - Phase 3.3 alt: buffer emerges from anchor repulsion pushing kits apart

Tradeoff surface (to report in close report):
  - Geometric (Phase 3.1): Predictable, clean, buffer is by design
  - Force-directed (Phase 3.3): Organic, buffer emerges, but less predictable
    and dependent on convergence. Harder to control visual weight per region.
    Physical cluster may dominate (428 kits) without special handling.

Output: public/data/cosmograph/twolayer_layout_alt.json
"""

import json
import math
import random

random.seed(123)  # Different seed from baseline for independent comparison

# ── Load source data ─────────────────────────────────────────────────────────

with open('public/data/cosmograph/kit_constellations.json') as f:
    kits = json.load(f)

# ── World space (same as Phase 3.1 for direct comparison) ───────────────────

WORLD_W = 11000
WORLD_H = 8500

ELEMENTS = ['fire', 'water', 'earth', 'wind', 'lightning', 'holy', 'shadow', 'physical']

ELEMENT_COLORS = {
    'fire':      '#E85520',
    'water':     '#2299DD',
    'earth':     '#A07040',
    'wind':      '#88CC88',
    'lightning': '#AA66EE',
    'holy':      '#DDAA33',
    'shadow':    '#7744AA',
    'physical':  '#8899AA',
}

# Same anchor positions as Phase 3.1 baseline (for direct comparison)
COLS = 4
ROWS = 2
PAD_X = 1375
PAD_Y = 1400
SPACING_X = (WORLD_W - 2 * PAD_X) / (COLS - 1)
SPACING_Y = (WORLD_H - 2 * PAD_Y) / (ROWS - 1)

ANCHOR_POSITIONS = {}
for i, el in enumerate(ELEMENTS):
    row = i // COLS
    col = i % COLS
    x = PAD_X + col * SPACING_X
    y = PAD_Y + row * SPACING_Y
    ANCHOR_POSITIONS[el] = {'x': round(x, 1), 'y': round(y, 1)}

ANCHOR_INNER_R = 130
ANCHOR_OUTER_GLOW_R = 260

# ── Kit classification (same as Phase 3.1) ────────────────────────────────────

for k in kits:
    k['_elements'] = json.loads(k['elements_json']) if isinstance(k['elements_json'], str) else k['elements_json']
    k['_is_hybrid'] = k.get('is_hybrid', False)
    k['_pss'] = k.get('primitive_set_size', 0)

pss_values = sorted(k['_pss'] for k in kits)
pss_q75 = pss_values[int(len(pss_values) * 0.75)]

# ── Force-directed layout ─────────────────────────────────────────────────────

# Parameters
ANCHOR_SPRING_K = 0.006      # Spring constant: pull toward element anchor
ANCHOR_SPRING_REST = 700     # Rest length: kits settle at ~700px from anchor
KIT_REPULSION_K = 8000       # Repulsion between kits
HYBRID_MIDPOINT_BIAS = 0.5   # Hybrid kits pulled toward midpoint between two anchors
MAX_ITERATIONS = 80
DAMPING = 0.85
DT = 0.8
MAX_FORCE = 180
MAX_KIT_RADIUS = 70

# Initialize kit positions near their element anchor (seed from sunflower spiral)
import math as _math

def sunflower_seed(n_kits_per_element, el_name):
    """Seed positions for force-directed: spread around anchor."""
    anchor = ANCHOR_POSITIONS[el_name]
    positions = []
    golden_angle = _math.pi * (3 - _math.sqrt(5))
    for i in range(n_kits_per_element):
        r = 350 + 600 * _math.sqrt((i + 0.5) / max(n_kits_per_element, 1))
        theta = i * golden_angle
        x = anchor['x'] + r * _math.cos(theta) + random.uniform(-30, 30)
        y = anchor['y'] + r * _math.sin(theta) + random.uniform(-30, 30)
        positions.append([x, y])
    return positions

# Assign initial positions by element
kit_data = []
element_groups = {el: [] for el in ELEMENTS}
for k in kits:
    el = k.get('primary_element') or (k['_elements'][0] if k['_elements'] else 'physical')
    if el not in ANCHOR_POSITIONS:
        el = 'physical'
    element_groups[el].append(k)

for el, el_kits in element_groups.items():
    seeds = sunflower_seed(len(el_kits), el)
    for k, (sx, sy) in zip(el_kits, seeds):
        kit_data.append({
            'kit': k,
            'x': sx, 'y': sy,
            'vx': 0.0, 'vy': 0.0,
            'el': el,
            'is_hybrid': k['_is_hybrid'],
            'hybrid_els': k['_elements'][:2] if k['_is_hybrid'] and len(k['_elements']) >= 2 else [el, el],
        })

n = len(kit_data)
print(f"Force-directed layout: {n} kits, {MAX_ITERATIONS} iterations")

# Force-directed iterations
for iteration in range(MAX_ITERATIONS):
    # Per-kit net force
    forces = [[0.0, 0.0] for _ in range(n)]

    # Kit-kit repulsion (O(N^2) — expensive but feasible for 1000 kits × 80 iters)
    # Use spatial bucketing for speed: bucket side ~400px
    BUCKET = 450
    buckets = {}
    for i, d in enumerate(kit_data):
        bx = int(d['x'] / BUCKET)
        by = int(d['y'] / BUCKET)
        key = (bx, by)
        if key not in buckets:
            buckets[key] = []
        buckets[key].append(i)

    for i, di in enumerate(kit_data):
        bx = int(di['x'] / BUCKET)
        by = int(di['y'] / BUCKET)
        # Check neighboring buckets
        for dbx in range(-1, 2):
            for dby in range(-1, 2):
                key = (bx + dbx, by + dby)
                for j in (buckets.get(key) or []):
                    if j <= i:
                        continue
                    dj = kit_data[j]
                    dx = di['x'] - dj['x']
                    dy = di['y'] - dj['y']
                    dist2 = dx * dx + dy * dy
                    if dist2 < 1.0:
                        dx, dy = random.uniform(-1, 1), random.uniform(-1, 1)
                        dist2 = 1.0
                    if dist2 > BUCKET * BUCKET * 4:
                        continue  # Beyond repulsion range
                    dist = _math.sqrt(dist2)
                    rep = KIT_REPULSION_K / dist2
                    rep = min(rep, MAX_FORCE)
                    fx = rep * dx / dist
                    fy = rep * dy / dist
                    forces[i][0] += fx
                    forces[i][1] += fy
                    forces[j][0] -= fx
                    forces[j][1] -= fy

    # Anchor spring attraction
    for i, di in enumerate(kit_data):
        if di['is_hybrid']:
            # Hybrid: pulled toward midpoint of two element anchors
            a1 = ANCHOR_POSITIONS[di['hybrid_els'][0]]
            a2 = ANCHOR_POSITIONS[di['hybrid_els'][1]]
            tx = (a1['x'] + a2['x']) / 2
            ty = (a1['y'] + a2['y']) / 2
            dx = tx - di['x']
            dy = ty - di['y']
            dist = _math.sqrt(dx * dx + dy * dy)
            # Stronger hybrid midpoint pull (to create buffer-space content)
            spring_k_hybrid = ANCHOR_SPRING_K * 1.8
            rest_hybrid = ANCHOR_SPRING_REST * HYBRID_MIDPOINT_BIAS
            ext = dist - rest_hybrid
            if dist > 1.0:
                f = spring_k_hybrid * ext
                forces[i][0] += f * dx / dist
                forces[i][1] += f * dy / dist
        else:
            # Mono-element: pulled toward own anchor
            a = ANCHOR_POSITIONS[di['el']]
            dx = a['x'] - di['x']
            dy = a['y'] - di['y']
            dist = _math.sqrt(dx * dx + dy * dy)
            if dist > 1.0:
                ext = dist - ANCHOR_SPRING_REST
                f = ANCHOR_SPRING_K * ext
                forces[i][0] += f * dx / dist
                forces[i][1] += f * dy / dist

    # Apply forces + damping
    for i, di in enumerate(kit_data):
        fx, fy = forces[i]
        mag = _math.sqrt(fx * fx + fy * fy)
        if mag > MAX_FORCE:
            fx *= MAX_FORCE / mag
            fy *= MAX_FORCE / mag
        di['vx'] = (di['vx'] + fx * DT) * DAMPING
        di['vy'] = (di['vy'] + fy * DT) * DAMPING
        di['x'] += di['vx'] * DT
        di['y'] += di['vy'] * DT
        # World boundary clamp
        di['x'] = max(200, min(WORLD_W - 200, di['x']))
        di['y'] = max(200, min(WORLD_H - 200, di['y']))

    if (iteration + 1) % 20 == 0:
        total_v = sum(_math.sqrt(d['vx']**2 + d['vy']**2) for d in kit_data)
        print(f"  iter {iteration+1}: total velocity = {total_v:.1f}")

print("Force-directed layout complete.")

# ── Classify zones (post-layout) ─────────────────────────────────────────────

# Determine zone for each kit based on proximity to anchors
def get_zone(d):
    if d['is_hybrid']:
        a1 = ANCHOR_POSITIONS[d['hybrid_els'][0]]
        a2 = ANCHOR_POSITIONS[d['hybrid_els'][1]]
        mid_x = (a1['x'] + a2['x']) / 2
        mid_y = (a1['y'] + a2['y']) / 2
        dist_mid = _math.sqrt((d['x'] - mid_x)**2 + (d['y'] - mid_y)**2)
        # Classify as buffer if near midpoint rather than either anchor
        dist_a1 = _math.sqrt((d['x'] - a1['x'])**2 + (d['y'] - a1['y'])**2)
        dist_a2 = _math.sqrt((d['x'] - a2['x'])**2 + (d['y'] - a2['y'])**2)
        if dist_mid < min(dist_a1, dist_a2):
            return 'buffer'
        return 'primary'
    else:
        # Find closest anchor
        my_anchor = ANCHOR_POSITIONS[d['el']]
        dist_own = _math.sqrt((d['x'] - my_anchor['x'])**2 + (d['y'] - my_anchor['y'])**2)
        if dist_own > ANCHOR_SPRING_REST * 1.2:
            return 'outer'
        return 'primary'

zone_counts = {}
for d in kit_data:
    z = get_zone(d)
    zone_counts[z] = zone_counts.get(z, 0) + 1
print(f"Zone distribution: {zone_counts}")

# ── Min NN distance check ─────────────────────────────────────────────────────

sample = random.sample(kit_data, min(200, len(kit_data)))
min_dist = float('inf')
for i in range(len(sample)):
    for j in range(i+1, len(sample)):
        dx = sample[i]['x'] - sample[j]['x']
        dy = sample[i]['y'] - sample[j]['y']
        d = _math.sqrt(dx*dx + dy*dy)
        if d < min_dist:
            min_dist = d
print(f"Min NN distance (sample 200): {min_dist:.1f}px")

# ── Build output ──────────────────────────────────────────────────────────────

anchors = []
for el in ELEMENTS:
    pos = ANCHOR_POSITIONS[el]
    zone_count = sum(1 for d in kit_data if d['el'] == el and get_zone(d) == 'primary')
    outer_count = sum(1 for d in kit_data if d['el'] == el and get_zone(d) == 'outer')
    anchors.append({
        'anchor_id': f'anchor_{el}',
        'element': el,
        'x': pos['x'],
        'y': pos['y'],
        'inner_radius': ANCHOR_INNER_R,
        'outer_glow_radius': ANCHOR_OUTER_GLOW_R,
        'color': ELEMENT_COLORS[el],
        'zone_kit_count': zone_count,
        'outer_kit_count': outer_count,
    })

centroids_out = []
for d in kit_data:
    k = d['kit']
    el = d['el']
    zone = get_zone(d)
    entry = {
        'kit_id': k['kit_id'],
        'cx': round(d['x'], 1),
        'cy': round(d['y'], 1),
        'zone': zone,
        'element': el,
        'attribute': k.get('kit_attribute', 'STR'),
    }
    if d['is_hybrid']:
        entry['hybrid_elements'] = d['hybrid_els']
    centroids_out.append(entry)

output = {
    'meta': {
        'world_w': WORLD_W,
        'world_h': WORLD_H,
        'anchor_count': len(anchors),
        'kit_count': len(centroids_out),
        'max_kit_radius': MAX_KIT_RADIUS,
        'anchor_inner_r': ANCHOR_INNER_R,
        'anchor_outer_r': ANCHOR_OUTER_GLOW_R,
        'kit_zone_inner_r': 0,
        'kit_zone_outer_r': int(ANCHOR_SPRING_REST * 1.2),
        'high_pss_outer_r': int(ANCHOR_SPRING_REST * 1.5),
        'buffer_zone_max_r': int(ANCHOR_SPRING_REST * 0.5),
        'positioning_algorithm': 'force-directed (anchor-spring + kit-repulsion, Phase 3.3 alternative)',
        'generated_by': 'compute-twolayer-forcealt-layout.py — drax Phase 3.3 2026-06-09',
        'buffer_content_note': (
            'Buffer zone populated by hybrid kits (is_hybrid=True) that converge to '
            'inter-anchor midpoint zone under force-directed layout. '
            'Emergent buffer vs designed buffer (Phase 3.1). '
            'TODO(drax): same rare-lineage gap as Phase 3.1 baseline.'
        ),
        'anchor_subset_choice': '7-elements + physical = 8 anchors (same as Phase 3.1)',
        'force_params': {
            'anchor_spring_k': ANCHOR_SPRING_K,
            'anchor_spring_rest': ANCHOR_SPRING_REST,
            'kit_repulsion_k': KIT_REPULSION_K,
            'hybrid_midpoint_bias': HYBRID_MIDPOINT_BIAS,
            'max_iterations': MAX_ITERATIONS,
            'damping': DAMPING,
        },
        'column_spacing_px': round(SPACING_X, 1),
        'row_spacing_px': round(SPACING_Y, 1),
    },
    'anchors': anchors,
    'centroids': centroids_out,
}

output_path = 'public/data/cosmograph/twolayer_layout_alt.json'
with open(output_path, 'w') as f:
    json.dump(output, f, separators=(',', ':'))

import os
size_mb = os.path.getsize(output_path) / 1_000_000
print(f"\nWritten to {output_path} ({size_mb:.2f} MB)")
print("Done.")
