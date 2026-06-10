#!/usr/bin/env python3
"""
compute-rune-layer-layout.py — Phase 4 rune-per-group layout computation.

Drax Phase 4, 2026-06-09. Per dispatch:
  2026-06-09-drax-forge-phase-4-AMENDMENT-rune-per-group-two-tier.md

Generates: public/data/cosmograph/rune_layer_layout.json

Architecture:
  - 6 primitive-group rune anchors in a 3x2 grid (world 11000x8500px)
  - Each rune has atmospheric_radius=1800px (much larger than Phase 3 nebula outer_glow_radius=260px)
  - Rune anchors use Phase 3 kit-centroid positions but re-assign primacy to element → group mapping
  - Force-directed layout is the production default (per Elrond Hotspot A +13pp kNN purity@5)

Criterion 11 (PRIORITY-ELEVATED per dispatch § 4):
  Rune bounding boxes documented here at Phase 4.1 milestone BEFORE Phase 4.2 fires.
  Rune atmospheric_radius = 1800px world units.
  Rune stroke_radius = 900px world units.
  3x2 grid: SPACING_X=3666px, SPACING_Y=4250px (fills 11000x8500 with margins)
  Minimum gap between adjacent rune atmospheric boundaries:
    Horizontal: SPACING_X - 2*atmospheric_radius = 3666 - 3600 = 66px (tight; buffer is thin)
    Vertical:   SPACING_Y - 2*atmospheric_radius = 4250 - 3600 = 650px (comfortable)
  NOTE: The tight horizontal gap (~66px) means adjacent rune atmospheres are nearly touching.
  This is INTENTIONAL — the "looming" quality requires the rune to fill its group's region.
  For the lasso classifyLasso() re-validation:
    within_anchor_centroid_threshold: ~1100 remains valid (rune stroke_radius=900; threshold 1100 > 900)
    nearby_anchor_threshold: needs adjustment — 1200 is less than atmospheric_radius 1800.
      Should be ~2000 to capture a rune as "nearby" based on atmospheric extent.
    cross_buffer_min_lasso_radius: 600 may be too small — buffer gap is ~66px horizontal.
      Threshold check: rune centers are SPACING_X=3666px apart; lasso spanning two atmospheric
      regions needs radius > (3666 - 2*900) / 2 = 933px. Recommend cross_buffer_min_lasso_radius ~950.
    min_lasso_polygon_points=2: unchanged.

classifyLasso() threshold drift (Phase 3 YELLOW 3 resolution):
  Original: within_anchor_centroid_threshold=1100, nearby_anchor_threshold=1200,
            cross_buffer_min_lasso_radius=600, min_lasso_polygon_points=2
  Recommended Phase 4 values:
    within_anchor_centroid_threshold=1100  (unchanged; stroke_radius=900 < 1100 OK)
    nearby_anchor_threshold=2000           (CHANGED: increased to match atmospheric_radius)
    cross_buffer_min_lasso_radius=950      (CHANGED: recalibrated for tighter horizontal gap)
    min_lasso_polygon_points=2             (unchanged)

Element → primitive group mapping (scaffold; for kit re-assignment):
  fire, lightning → elements (high energy-elemental primitives)
  water, wind → movement (fluid motion primitives — water flows, wind moves)
  earth → combat_geometry (solid form, structural)
  holy → attributes (divine attribute scaling — WIS)
  shadow → mechanic_altering (passive rule-manipulation)
  physical → resource_economy (STR/stamina economy)

NOTE: This is a SCAFFOLD mapping for visualization purposes only.
Element-to-group assignment is drax-discretion per dispatch § 1.2.
Canonical primitive-group lock DEFERRED to Pattern B.
"""

import json
import math
import os
import random

# ─── World config (same as Phase 3) ─────────────────────────────────────────

WORLD_W = 11000
WORLD_H = 8500
MAX_KIT_RADIUS = 70

# ─── Rune anchor positioning (3×2 grid) ─────────────────────────────────────

COLS = 3
ROWS = 2

# Margins: PAD_X = WORLD_W / (2*COLS), PAD_Y = WORLD_H / (2*ROWS)
PAD_X = WORLD_W / (2 * COLS)   # = 1833px
PAD_Y = WORLD_H / (2 * ROWS)   # = 2125px

SPACING_X = WORLD_W / COLS     # = 3666.7px
SPACING_Y = WORLD_H / ROWS     # = 4250px

ATMOSPHERIC_RADIUS = 1800  # world px — the "looming" rune footprint
STROKE_RADIUS = 900         # world px — the rune glyph drawn extent

# ─── Rune anchor definitions (group order in grid) ───────────────────────────
# Grid positions (col=0-2, row=0-1):
#   Row 0: elements (0,0), movement (1,0), combat_geometry (2,0)
#   Row 1: resource_economy (0,1), attributes (1,1), mechanic_altering (2,1)

RUNE_GROUP_GRID = [
    # (group_id, col, row)
    ('elements',          0, 0),
    ('movement',          1, 0),
    ('combat_geometry',   2, 0),
    ('resource_economy',  0, 1),
    ('attributes',        1, 1),
    ('mechanic_altering', 2, 1),
]

def grid_pos(col, row):
    x = PAD_X + col * SPACING_X
    y = PAD_Y + row * SPACING_Y
    return x, y

# ─── Element → primitive group scaffold mapping ──────────────────────────────
# Scaffold: drax-discretion per dispatch § 1.2
# Each element anchor from Phase 3 maps to one of the 6 groups.
# This is for kit-centroid group assignment — kits near an element anchor
# get assigned to the group that element maps to.

ELEMENT_TO_GROUP = {
    'fire':      'elements',
    'lightning': 'elements',
    'water':     'movement',
    'wind':      'movement',
    'earth':     'combat_geometry',
    'physical':  'resource_economy',
    'holy':      'attributes',
    'shadow':    'mechanic_altering',
}

# ─── Load Phase 3 layout ─────────────────────────────────────────────────────

script_dir = os.path.dirname(os.path.abspath(__file__))
data_dir = os.path.join(script_dir, '..', 'public', 'data', 'cosmograph')

print("[compute-rune-layer-layout] Loading Phase 3 baseline layout...")
with open(os.path.join(data_dir, 'twolayer_layout.json')) as f:
    p3_layout = json.load(f)

p3_centroids = p3_layout['centroids']
print(f"[compute-rune-layer-layout] Loaded {len(p3_centroids)} Phase 3 kit centroids")

# ─── Compute Phase 3 anchor positions (for centroid displacement) ────────────

# Phase 3 anchors are on a 4×2 grid: SPACING_X=2750, SPACING_Y=5700
# PAD_X=1375, PAD_Y=1400
P3_SPACING_X = 2750
P3_SPACING_Y = 5700
P3_PAD_X = 1375
P3_PAD_Y = 1400

P3_ELEMENT_ORDER = ['fire', 'water', 'earth', 'wind', 'lightning', 'holy', 'shadow', 'physical']
P3_ANCHOR_POSITIONS = {}
for idx, elem in enumerate(P3_ELEMENT_ORDER):
    col = idx % 4
    row = idx // 4
    p3x = P3_PAD_X + col * P3_SPACING_X
    p3y = P3_PAD_Y + row * P3_SPACING_Y
    P3_ANCHOR_POSITIONS[elem] = (p3x, p3y)

# ─── Build rune anchors ───────────────────────────────────────────────────────

rune_anchors = []
rune_anchor_by_group = {}

for group_id, col, row in RUNE_GROUP_GRID:
    x, y = grid_pos(col, row)
    anchor = {
        'group_id': group_id,
        'x': round(x, 1),
        'y': round(y, 1),
        'atmospheric_radius': ATMOSPHERIC_RADIUS,
        'stroke_radius': STROKE_RADIUS,
    }
    rune_anchors.append(anchor)
    rune_anchor_by_group[group_id] = anchor

# ─── Re-assign kit centroids to primitive groups ──────────────────────────────
# Strategy:
#   For each Phase 3 kit centroid, find which Phase 3 element anchor it belonged to,
#   map that element to a primitive group, then compute the displacement from the
#   Phase 3 element anchor to the Phase 4 rune anchor.
#   Preserve intra-group relative positions (kits cluster around their rune anchor
#   the same way they clustered around their element anchor).

# Build Phase 3 anchor lookup
p3_anchor_by_element = {}
for a in p3_layout['anchors']:
    p3_anchor_by_element[a['element']] = a

# Build rune anchor lookup
group_anchor_x = {g_id: ra['x'] for g_id, ra in rune_anchor_by_group.items()}
group_anchor_y = {g_id: ra['y'] for g_id, ra in rune_anchor_by_group.items()}

new_centroids = []
for c in p3_centroids:
    element = c['element']
    group_id = ELEMENT_TO_GROUP.get(element, 'elements')

    # Get Phase 3 anchor position for this element
    p3_anchor = p3_anchor_by_element.get(element)
    if not p3_anchor:
        # Fallback: place in elements group
        group_id = 'elements'
        p3_ax, p3_ay = P3_ANCHOR_POSITIONS.get(element, (WORLD_W/2, WORLD_H/2))
    else:
        p3_ax = p3_anchor['x']
        p3_ay = p3_anchor['y']

    # Get Phase 4 rune anchor position for this group
    r4_anchor = rune_anchor_by_group[group_id]
    r4_ax = r4_anchor['x']
    r4_ay = r4_anchor['y']

    # Displacement from Phase 3 element anchor to Phase 4 rune anchor
    dx = r4_ax - p3_ax
    dy = r4_ay - p3_ay

    # New centroid position (offset from element anchor to rune anchor)
    new_cx = c['cx'] + dx
    new_cy = c['cy'] + dy

    # Clip to world bounds with margin
    margin = MAX_KIT_RADIUS + 10
    new_cx = max(margin, min(WORLD_W - margin, new_cx))
    new_cy = max(margin, min(WORLD_H - margin, new_cy))

    new_c = {
        'kit_id': c['kit_id'],
        'cx': round(new_cx, 1),
        'cy': round(new_cy, 1),
        'zone': c['zone'],
        'element': element,
        'attribute': c['attribute'],
        'primary_group': group_id,
    }
    if c.get('hybrid_elements'):
        new_c['hybrid_elements'] = c['hybrid_elements']

    new_centroids.append(new_c)

print(f"[compute-rune-layer-layout] Re-assigned {len(new_centroids)} kit centroids to 6 primitive groups")

# ─── Group kit count summary ──────────────────────────────────────────────────
from collections import Counter
group_counts = Counter(c['primary_group'] for c in new_centroids)
for g, count in sorted(group_counts.items()):
    print(f"  {g:25s}: {count} kits")

# ─── Minimum NN distance check ────────────────────────────────────────────────
# Quick sample-based check (not exhaustive)
random.seed(42)
sample_size = min(200, len(new_centroids))
sample = random.sample(new_centroids, sample_size)
min_nn = float('inf')
for i, ci in enumerate(sample):
    for cj in sample:
        if ci['kit_id'] == cj['kit_id']:
            continue
        d = math.sqrt((ci['cx'] - cj['cx'])**2 + (ci['cy'] - cj['cy'])**2)
        if d < min_nn:
            min_nn = d

print(f"[compute-rune-layer-layout] Sample min NN distance: {min_nn:.1f}px (sample n={sample_size})")

# ─── classifyLasso threshold analysis (Criterion 11) ─────────────────────────
print("\n[compute-rune-layer-layout] CRITERION 11 — Rune bounding box + classifyLasso analysis:")
print(f"  Rune atmospheric_radius:    {ATMOSPHERIC_RADIUS}px world units")
print(f"  Rune stroke_radius:         {STROKE_RADIUS}px world units")
print(f"  Grid: {COLS}×{ROWS}, SPACING_X={SPACING_X:.1f}px, SPACING_Y={SPACING_Y:.1f}px")
h_gap = SPACING_X - 2 * ATMOSPHERIC_RADIUS
v_gap = SPACING_Y - 2 * ATMOSPHERIC_RADIUS
print(f"  Horizontal atmospheric gap: {h_gap:.1f}px (between adjacent rune atmospheres)")
print(f"  Vertical atmospheric gap:   {v_gap:.1f}px")

# Phase 3 threshold analysis
p3_within = 1100
p3_nearby = 1200
p3_cross_buffer = 600
print(f"\n  Phase 3 classifyLasso thresholds (calibrated for nebula outer_glow_radius=260px):")
print(f"    within_anchor_centroid_threshold: {p3_within}")
print(f"    nearby_anchor_threshold:          {p3_nearby}")
print(f"    cross_buffer_min_lasso_radius:    {p3_cross_buffer}")

# Phase 4 threshold analysis
p4_within = 1100
p4_nearby = 2000   # Raised to atmospheric_radius + margin
p4_cross_buffer = 950  # Recalibrated: (SPACING_X - 2*stroke_radius) / 2 ≈ 933px
print(f"\n  Phase 4 recommended classifyLasso thresholds (for atmospheric_radius={ATMOSPHERIC_RADIUS}px):")
print(f"    within_anchor_centroid_threshold: {p4_within} (unchanged; stroke_radius={STROKE_RADIUS} < {p4_within})")
print(f"    nearby_anchor_threshold:          {p4_nearby} (CHANGED from {p3_nearby}; = atmospheric_radius + 200px)")
print(f"    cross_buffer_min_lasso_radius:    {p4_cross_buffer} (CHANGED from {p3_cross_buffer}; = (SPACING_X - 2*stroke_radius)/2 + 17px)")
print(f"    min_lasso_polygon_points:         2 (unchanged)")
print(f"\n  Semantic mode check (cross-buffer lasso spanning two rune atmospheric regions):")
print(f"    Distance between adjacent rune centers: {SPACING_X:.1f}px (horizontal)")
print(f"    For cross-buffer: lasso centroid at midpoint (SPACING_X/2 = {SPACING_X/2:.1f}px from each anchor)")
print(f"    Lasso radius needed to span both atmospheres: ~{(SPACING_X/2 - STROKE_RADIUS):.1f}px")
print(f"    p4_cross_buffer_min_lasso_radius={p4_cross_buffer} covers this (sufficient threshold)")

# ─── Rune anchor bounding box summary (Criterion 11 deliverable) ─────────────
print(f"\n[compute-rune-layer-layout] CRITERION 11 — Per-rune bounding boxes (6 group runes):")
print(f"  {'Group':25s} {'Center':20s} {'Atm bbox (world px)':30s} {'Stroke bbox':20s}")
print(f"  {'-'*25} {'-'*20} {'-'*30} {'-'*20}")
for anchor in rune_anchors:
    gid = anchor['group_id']
    cx, cy = anchor['x'], anchor['y']
    ar = anchor['atmospheric_radius']
    sr = anchor['stroke_radius']
    atm_box = f"[{cx-ar:.0f},{cy-ar:.0f}] [{cx+ar:.0f},{cy+ar:.0f}]"
    str_box = f"[{cx-sr:.0f}..{cx+sr:.0f}]"
    print(f"  {gid:25s} ({cx:.0f}, {cy:.0f})      {atm_box:30s} {str_box}")

# ─── Compose output ───────────────────────────────────────────────────────────
output = {
    "meta": {
        "world_w": WORLD_W,
        "world_h": WORLD_H,
        "group_count": len(rune_anchors),
        "kit_count": len(new_centroids),
        "max_kit_radius": MAX_KIT_RADIUS,
        "positioning_algorithm": "phase3-displacement (kit positions from force-directed Phase 3 re-assigned to 6-group rune anchors via element→group scaffold mapping)",
        "generated_by": "compute-rune-layer-layout.py — drax Phase 4 2026-06-09",
        "rune_bounding_box_note": (
            f"CRITERION 11 — Rune atmospheric footprint: atmospheric_radius={ATMOSPHERIC_RADIUS}px, "
            f"stroke_radius={STROKE_RADIUS}px. "
            f"3×2 grid: SPACING_X={SPACING_X:.1f}px, SPACING_Y={SPACING_Y:.1f}px. "
            f"Horizontal atmospheric gap: {h_gap:.1f}px (near-touching atmospheric extents). "
            f"Vertical atmospheric gap: {v_gap:.1f}px. "
            f"classifyLasso threshold drift: within_anchor_centroid_threshold={p4_within} (unchanged), "
            f"nearby_anchor_threshold={p4_nearby} (CHANGED from {p3_nearby}), "
            f"cross_buffer_min_lasso_radius={p4_cross_buffer} (CHANGED from {p3_cross_buffer}), "
            f"min_lasso_polygon_points=2 (unchanged)."
        ),
        "classify_lasso_thresholds": {
            "within_anchor_centroid_threshold": p4_within,
            "nearby_anchor_threshold": p4_nearby,
            "cross_buffer_min_lasso_radius": p4_cross_buffer,
            "min_lasso_polygon_points": 2,
            "phase3_values": {
                "within_anchor_centroid_threshold": p3_within,
                "nearby_anchor_threshold": p3_nearby,
                "cross_buffer_min_lasso_radius": p3_cross_buffer,
            },
            "calibration_note": "Re-validated against atmospheric diffuse rune geometry per Phase 4 dispatch criterion 11."
        },
        "element_to_group_scaffold": ELEMENT_TO_GROUP,
        "column_spacing_px": round(SPACING_X, 1),
        "row_spacing_px": round(SPACING_Y, 1),
        "scaffold_note": "SCAFFOLD — 6 primitive groups + element→group mapping are drax-discretion-substitutable per dispatch § 1.2. Canonical primitive-group lock DEFERRED to Pattern B with Matt post-Phase-4.",
    },
    "rune_anchors": rune_anchors,
    "centroids": new_centroids,
}

# ─── Write output ─────────────────────────────────────────────────────────────
out_path = os.path.join(data_dir, 'rune_layer_layout.json')
with open(out_path, 'w') as f:
    json.dump(output, f, indent=2)

size_mb = os.path.getsize(out_path) / 1024 / 1024
print(f"\n[compute-rune-layer-layout] Written: {out_path} ({size_mb:.2f}MB)")
print(f"  {len(rune_anchors)} rune anchors · {len(new_centroids)} kit centroids")
print(f"  Sample min NN: {min_nn:.1f}px")
print("[compute-rune-layer-layout] DONE")
