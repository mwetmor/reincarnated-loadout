"""
compute-twolayer-layout.py — Phase 3 two-layer + buffer-space layout pre-computation.

Drax Phase 3, 2026-06-09. Per dispatch 2026-06-09-drax-forge-phase-3-two-layer-buffer-space-prototype.md.

Architecture:
  Layer 1 — Primitive-anchor layer: 8 element-family anchors (fire/water/earth/wind/
             lightning/holy/shadow/physical). Large nebula-cloud visual register.
             Fixed positions at generous spacing to create deliberate buffer space.

  Layer 2 — Kit-cluster layer: 1000 constellation centroids, spatially proximate
             to their primary-element anchor. Sunflower-spiral arrangement within
             a zone radius around each anchor.

  Buffer space:
    - Hybrid kits (is_hybrid=True, two elements_json entries) are placed in the
      midpoint zone between their two element anchors.
    - High-primitive-set-size kits (top quartile PSS, non-hybrid) placed near
      their element anchor but at greater radial distance (outer ring).
    - This creates discoverable buffer-territory content.

  Rare-lineage gap observation:
    PROVISIONAL 37-kit corpus has no truly rare cultural-tradition kits (all 14
    cultural traditions have 90-124 representatives). Buffer space is populated
    by hybrid kits + high-PSS cross-substrate kits as prototype stand-ins.
    TODO(drax): replace with actual rare-lineage kits when engine ships real
    cycle-15+ content with marginal-lineage kits.

Positioning algorithm baseline: fixed-anchor + radial projection (k-means anchor variant).
Alternative (Phase 3.3): force-directed layout with inter-anchor repulsion.

Output: public/data/cosmograph/twolayer_layout.json
"""

import json
import math
import random

random.seed(42)

# ── Load source data ─────────────────────────────────────────────────────────

with open('public/data/cosmograph/kit_constellations.json') as f:
    kits = json.load(f)

with open('public/data/cosmograph/constellation_layout.json') as f:
    baseline_layout = json.load(f)

# ── World space ──────────────────────────────────────────────────────────────

WORLD_W = 11000
WORLD_H = 8500
# Expanded world vs Phase 2 (9000x7000) — more room for buffer space

# ── Element anchor definitions ────────────────────────────────────────────────

# 8 element anchors in 4×2 arrangement with generous padding
# Anchor visual register: large nebula clouds (120px inner radius, 220px outer glow)
# Kit cluster register: small star clusters (70px radius, same as Phase 2 MAX_CONSTELLATION_RADIUS)

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

# Anchor positions: 4 columns × 2 rows
# Row 1: fire, water, earth, wind (top)
# Row 2: lightning, holy, shadow, physical (bottom)
# Buffer between rows: ~4200px (enormous empty zone in middle — key to architecture)
# Buffer between columns: ~2250px

COLS = 4
ROWS = 2
PAD_X = 1375
PAD_Y = 1400
SPACING_X = (WORLD_W - 2 * PAD_X) / (COLS - 1)  # ~2750
SPACING_Y = (WORLD_H - 2 * PAD_Y) / (ROWS - 1)  # ~5700

ANCHOR_POSITIONS = {}
for i, el in enumerate(ELEMENTS):
    row = i // COLS
    col = i % COLS
    x = PAD_X + col * SPACING_X
    y = PAD_Y + row * SPACING_Y
    ANCHOR_POSITIONS[el] = {'x': round(x, 1), 'y': round(y, 1)}

print("Anchor positions:")
for el, pos in ANCHOR_POSITIONS.items():
    print(f"  {el}: ({pos['x']}, {pos['y']})")

# Verify spacing
xs = [p['x'] for p in ANCHOR_POSITIONS.values()]
ys = [p['y'] for p in ANCHOR_POSITIONS.values()]
min_spacing_x = min(abs(xs[i] - xs[j]) for i in range(len(xs)) for j in range(len(xs)) if i != j and ys[i] == ys[j] if abs(ys[i] - ys[j]) < 1)
min_spacing_y = SPACING_Y
print(f"Min col spacing: {SPACING_X:.0f}px  Row spacing: {SPACING_Y:.0f}px")

# ── Kit classification ────────────────────────────────────────────────────────

# Parse each kit's elements, hybridness, PSS
for k in kits:
    k['_elements'] = json.loads(k['elements_json']) if isinstance(k['elements_json'], str) else k['elements_json']
    k['_is_hybrid'] = k.get('is_hybrid', False)
    k['_pss'] = k.get('primitive_set_size', 0)

# PSS quartiles for high-PSS classification
pss_values = sorted(k['_pss'] for k in kits)
pss_q75 = pss_values[int(len(pss_values) * 0.75)]  # 75th percentile
print(f"PSS Q75: {pss_q75}")

hybrid_kits = [k for k in kits if k['_is_hybrid']]
mono_high_pss = [k for k in kits if not k['_is_hybrid'] and k['_pss'] >= pss_q75]
regular_kits = [k for k in kits if not k['_is_hybrid'] and k['_pss'] < pss_q75]
print(f"Hybrid kits: {len(hybrid_kits)}  High-PSS mono: {len(mono_high_pss)}  Regular: {len(regular_kits)}")

# ── Zone radii ────────────────────────────────────────────────────────────────

ANCHOR_INNER_R = 130       # Primitive-anchor inner nebula radius (world px)
ANCHOR_OUTER_GLOW_R = 260  # Primitive-anchor outer glow radius (world px)

KIT_ZONE_INNER_R = 320    # Min distance from anchor center for kit centroids
KIT_ZONE_OUTER_R = 1050   # Max distance for regular kits (dense zone around anchor)
HIGH_PSS_OUTER_R = 1250   # High-PSS kits extend to outer ring (closer to buffer)

MAX_KIT_RADIUS = 70        # Per-kit constellation cluster radius (same as Phase 2)

# ── Placement functions ───────────────────────────────────────────────────────

def sunflower_spiral(n, min_r, max_r, cx, cy, jitter=20):
    """
    Place n points in a sunflower spiral between min_r and max_r from (cx, cy).
    Returns list of (x, y) tuples.
    """
    points = []
    golden_angle = math.pi * (3 - math.sqrt(5))
    for i in range(n):
        # Radius: sqrt-distributed for uniform area density
        r = min_r + (max_r - min_r) * math.sqrt((i + 0.5) / n)
        theta = i * golden_angle
        x = cx + r * math.cos(theta) + random.uniform(-jitter, jitter)
        y = cy + r * math.sin(theta) + random.uniform(-jitter, jitter)
        points.append((x, y))
    return points

def midpoint_buffer_placement(elements_list, anchor_positions, min_r, max_r, jitter=30):
    """
    For hybrid kits: place between the two element anchors' midpoint.
    min_r / max_r from the midpoint.
    """
    if len(elements_list) < 2:
        return None
    e1, e2 = elements_list[0], elements_list[1]
    if e1 not in anchor_positions or e2 not in anchor_positions:
        return None
    p1 = anchor_positions[e1]
    p2 = anchor_positions[e2]
    mx = (p1['x'] + p2['x']) / 2
    my = (p1['y'] + p2['y']) / 2
    # Random angle, random radius in buffer zone
    angle = random.uniform(0, 2 * math.pi)
    r = random.uniform(min_r, max_r)
    x = mx + r * math.cos(angle) + random.uniform(-jitter, jitter)
    y = my + r * math.sin(angle) + random.uniform(-jitter, jitter)
    return (x, y)

# ── Place regular kits by primary element ─────────────────────────────────────

# Group regular kits by primary_element
element_kit_groups = {el: [] for el in ELEMENTS}
for k in regular_kits:
    el = k.get('primary_element') or (k['_elements'][0] if k['_elements'] else 'physical')
    if el not in ANCHOR_POSITIONS:
        el = 'physical'
    element_kit_groups[el].append(k)

# Assign positions: sunflower spiral within KIT_ZONE_INNER_R..KIT_ZONE_OUTER_R
kit_positions = {}  # kit_id -> (cx, cy, zone_type, primary_element)

for el, el_kits in element_kit_groups.items():
    anchor = ANCHOR_POSITIONS[el]
    # Physical has 244 regular kits — expand its zone proportionally
    # Other elements have 24-50 regular kits each
    n = len(el_kits)
    # Scale outer radius to maintain ~40% packing density (allows visual breathing room)
    # Packing density = n * pi*kit_r^2 / (pi*(outer^2 - inner^2))
    # Solve for outer: outer = sqrt(n * kit_r^2 / 0.40 + inner^2)
    kit_r = MAX_KIT_RADIUS
    target_density = 0.35
    outer_r = math.sqrt(n * kit_r**2 / target_density + KIT_ZONE_INNER_R**2)
    outer_r = min(outer_r, 1200)  # Cap at 1200px (must stay within world bounds at buffer)
    outer_r = max(outer_r, KIT_ZONE_OUTER_R)  # Floor at default
    positions = sunflower_spiral(
        len(el_kits),
        KIT_ZONE_INNER_R,
        outer_r,
        anchor['x'],
        anchor['y'],
        jitter=25
    )
    for k, (px, py) in zip(el_kits, positions):
        kit_positions[k['kit_id']] = {
            'cx': round(px, 1),
            'cy': round(py, 1),
            'zone': 'primary',
            'element': el,
            'attribute': k.get('kit_attribute', 'STR'),
        }

# ── Place high-PSS mono kits in outer ring ────────────────────────────────────

# Group by primary element, place at extended radius
element_outer_counts = {}
for k in mono_high_pss:
    el = k.get('primary_element') or (k['_elements'][0] if k['_elements'] else 'physical')
    if el not in ANCHOR_POSITIONS:
        el = 'physical'
    element_outer_counts[el] = element_outer_counts.get(el, 0) + 1

# Place outer ring kits by element
element_outer_kits = {el: [] for el in ELEMENTS}
for k in mono_high_pss:
    el = k.get('primary_element') or (k['_elements'][0] if k['_elements'] else 'physical')
    if el not in ANCHOR_POSITIONS:
        el = 'physical'
    element_outer_kits[el].append(k)

for el, outer_kits in element_outer_kits.items():
    anchor = ANCHOR_POSITIONS[el]
    n = len(outer_kits)
    if n == 0:
        continue
    kit_r = MAX_KIT_RADIUS
    target_density = 0.35
    # Find inner radius: first find regular zone outer radius for this element
    n_regular = len(element_kit_groups[el])
    inner_r_outer = math.sqrt(n_regular * kit_r**2 / target_density + KIT_ZONE_INNER_R**2)
    inner_r_outer = min(inner_r_outer, 1200)
    inner_r_outer = max(inner_r_outer, KIT_ZONE_OUTER_R)
    outer_r_outer = math.sqrt(n * kit_r**2 / target_density + inner_r_outer**2)
    outer_r_outer = min(outer_r_outer, HIGH_PSS_OUTER_R)
    outer_r_outer = max(outer_r_outer, inner_r_outer + 100)

    positions = sunflower_spiral(n, inner_r_outer, outer_r_outer, anchor['x'], anchor['y'], jitter=30)
    for k, (px, py) in zip(outer_kits, positions):
        kit_positions[k['kit_id']] = {
            'cx': round(px, 1),
            'cy': round(py, 1),
            'zone': 'outer',  # closer to buffer — higher PSS/cross-substrate
            'element': el,
            'attribute': k.get('kit_attribute', 'STR'),
        }

# ── Place hybrid kits in buffer zones ─────────────────────────────────────────

# Hybrid kits: between two element anchors (buffer zone content)
BUFFER_ZONE_MIN_R = 0     # Can be at the midpoint itself
BUFFER_ZONE_MAX_R = 400   # Spread around midpoint

hybrid_placed = 0
hybrid_fallback = 0

for k in hybrid_kits:
    elements = k['_elements']
    pos = midpoint_buffer_placement(
        elements,
        ANCHOR_POSITIONS,
        BUFFER_ZONE_MIN_R,
        BUFFER_ZONE_MAX_R,
        jitter=40
    )
    if pos:
        px, py = pos
        hybrid_placed += 1
        kit_positions[k['kit_id']] = {
            'cx': round(px, 1),
            'cy': round(py, 1),
            'zone': 'buffer',  # buffer space content — discoverable
            'element': elements[0] if elements else 'physical',
            'attribute': k.get('kit_attribute', 'STR'),
            'hybrid_elements': elements,
        }
    else:
        # Fallback: primary element zone
        el = k.get('primary_element') or (elements[0] if elements else 'physical')
        if el not in ANCHOR_POSITIONS:
            el = 'physical'
        anchor = ANCHOR_POSITIONS[el]
        angle = random.uniform(0, 2 * math.pi)
        r = random.uniform(KIT_ZONE_INNER_R, KIT_ZONE_OUTER_R)
        px = anchor['x'] + r * math.cos(angle)
        py = anchor['y'] + r * math.sin(angle)
        hybrid_fallback += 1
        kit_positions[k['kit_id']] = {
            'cx': round(px, 1),
            'cy': round(py, 1),
            'zone': 'primary',
            'element': el,
            'attribute': k.get('kit_attribute', 'STR'),
        }

print(f"Hybrid placed in buffer: {hybrid_placed}  Fallback: {hybrid_fallback}")

# ── Verify coverage ───────────────────────────────────────────────────────────

total_placed = len(kit_positions)
print(f"Total kits placed: {total_placed} / {len(kits)}")
if total_placed != len(kits):
    missing = [k['kit_id'] for k in kits if k['kit_id'] not in kit_positions]
    print(f"Missing: {missing[:5]}")

# ── Zone distribution stats ───────────────────────────────────────────────────

zone_counts = {}
for pos in kit_positions.values():
    z = pos['zone']
    zone_counts[z] = zone_counts.get(z, 0) + 1
print("Zone distribution:", zone_counts)

# ── Min nearest-neighbor distance check ──────────────────────────────────────

# Sample check: any centroid collisions?
centroids = [(pos['cx'], pos['cy']) for pos in kit_positions.values()]
sample_size = min(200, len(centroids))
sample = random.sample(centroids, sample_size)
min_dist = float('inf')
for i in range(len(sample)):
    for j in range(i + 1, len(sample)):
        dx = sample[i][0] - sample[j][0]
        dy = sample[i][1] - sample[j][1]
        d = math.sqrt(dx*dx + dy*dy)
        if d < min_dist:
            min_dist = d
print(f"Min NN distance (sample {sample_size}): {min_dist:.1f}px (target >140px = 2×MAX_KIT_RADIUS)")

# ── Build output ──────────────────────────────────────────────────────────────

# Anchor layer
anchors = []
for el in ELEMENTS:
    pos = ANCHOR_POSITIONS[el]
    # Count kits in this anchor's zone
    zone_count = sum(1 for p in kit_positions.values() if p.get('element') == el and p['zone'] == 'primary')
    outer_count = sum(1 for p in kit_positions.values() if p.get('element') == el and p['zone'] == 'outer')
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

# Kit centroids
centroids_out = []
for kit_id, pos in kit_positions.items():
    entry = {
        'kit_id': kit_id,
        'cx': pos['cx'],
        'cy': pos['cy'],
        'zone': pos['zone'],
        'element': pos['element'],
        'attribute': pos['attribute'],
    }
    if 'hybrid_elements' in pos:
        entry['hybrid_elements'] = pos['hybrid_elements']
    centroids_out.append(entry)

# Buffer content summary
buffer_centroids = [c for c in centroids_out if c['zone'] == 'buffer']
outer_centroids = [c for c in centroids_out if c['zone'] == 'outer']
primary_centroids = [c for c in centroids_out if c['zone'] == 'primary']

print(f"\nOutput summary:")
print(f"  Anchors: {len(anchors)}")
print(f"  Kit centroids: {len(centroids_out)}")
print(f"    Primary zone: {len(primary_centroids)}")
print(f"    Outer ring (high-PSS): {len(outer_centroids)}")
print(f"    Buffer zone (hybrid): {len(buffer_centroids)}")

output = {
    'meta': {
        'world_w': WORLD_W,
        'world_h': WORLD_H,
        'anchor_count': len(anchors),
        'kit_count': len(centroids_out),
        'max_kit_radius': MAX_KIT_RADIUS,
        'anchor_inner_r': ANCHOR_INNER_R,
        'anchor_outer_r': ANCHOR_OUTER_GLOW_R,
        'kit_zone_inner_r': KIT_ZONE_INNER_R,
        'kit_zone_outer_r': KIT_ZONE_OUTER_R,
        'high_pss_outer_r': HIGH_PSS_OUTER_R,
        'buffer_zone_max_r': BUFFER_ZONE_MAX_R,
        'positioning_algorithm': 'fixed-anchor-radial-projection (Phase 3 baseline)',
        'generated_by': 'compute-twolayer-layout.py — drax Phase 3 2026-06-09',
        'buffer_content_note': (
            'PROVISIONAL corpus has no true rare-lineage kits (all 14 cultural traditions '
            'have 90-124 representatives). Buffer zone populated by hybrid kits (is_hybrid=True, '
            'cross-element substrate). High-PSS kits (>= Q75 PSS) placed in outer ring as '
            'cross-substrate boundary content. '
            'TODO(drax): replace with actual rare-lineage kits when engine ships real '
            'cycle-15+ marginal-lineage content.'
        ),
        'anchor_subset_choice': '7-elements + physical = 8 anchors (dispatch § 2.2 option 1)',
        'anchor_subset_rationale': (
            'Element anchors chosen as most player-intuitive anchor framing per dispatch § 2.2 '
            'first suggested subset. Weapon-form-family alternative not tested at Phase 3 — '
            'surface in close report for Pattern B canonical-curation discussion.'
        ),
        'column_spacing_px': round(SPACING_X, 1),
        'row_spacing_px': round(SPACING_Y, 1),
    },
    'anchors': anchors,
    'centroids': centroids_out,
}

output_path = 'public/data/cosmograph/twolayer_layout.json'
with open(output_path, 'w') as f:
    json.dump(output, f, separators=(',', ':'))

import os
size_mb = os.path.getsize(output_path) / 1_000_000
print(f"\nWritten to {output_path} ({size_mb:.2f} MB)")
print("Done.")
