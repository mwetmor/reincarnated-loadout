/**
 * constellationModeLayout.ts
 * Mode B (kit-as-bounded-constellation) layout engine.
 *
 * Phase 1 spike — drax 2026-06-07, per dispatch § 3.2 + § 3.3.
 *
 * Two-stage layout:
 *   Stage 1 — Inter-constellation placement:
 *     Force-directed layout of N constellation CENTROIDS across the canvas.
 *     Repulsion between all pairs; spring attraction proportional to shared-primitive-fraction.
 *     Result: kits sharing more primitives cluster near each other; all well-separated.
 *     NOTE: UMAP centroid_x/y CANNOT be used as Mode B starting positions — all 1000 kit
 *     centroids span only 43×56 px on canvas (< one constellation radius). Phase 1 analysis
 *     confirmed: NN distance mean = 1.3px at 1.0x zoom. Mode B requires a SEPARATE layout
 *     algorithm for constellation positions. UMAP positions are preserved for Mode A (primitive-
 *     galaxy) only.
 *
 *   Stage 2 — Intra-constellation arrangement:
 *     Per-kit-primitive-instance positions arranged within MAX_CONSTELLATION_RADIUS of centroid.
 *     Force-directed: intra-kit springs attract kit-mate instances; repulsion floor prevents overlap.
 *     Result: each constellation is a local cluster of per-kit primitive copies.
 *
 * Force config per dispatch § 3.3 (c1 global bound):
 *   MAX_CONSTELLATION_RADIUS: 70px (tuned from 60-80 range — 40px is tight; 70px reads clean)
 *   INTRA_KIT_SPRING_STRENGTH: 0.9
 *   INTER_KIT_REPULSION: 0.3
 *   CENTROID_ATTRACTION_BY_SHARED_PRIMITIVES: 0.2
 *   REPULSION_FLOOR: 10px
 *
 * Lasso semantics per dispatch § 2.3 + Gate-1 Finding 2 INFO:
 *   - Lasso captures per-kit primitive instances
 *   - DEDUPE to unique primitive_ids BEFORE composite-score resolution
 *   - Avoids double-counting: kit_001:fire + kit_002:fire → both reduce to 'fire' before scoring
 *
 * TODO(drax): remove centroid-position override when engine ships UMAP coordinates
 * that are valid for Mode B layout (i.e., when per-kit primitive sets are positioned in
 * their own independent space, not the shared substrate space). See Gate-1 Finding 4 INFO:
 * UMAP-derived centroid_x/y makes CENTROID_ATTRACTION redundant in Mode B — but ONLY if
 * the centroid coordinates are spread across the visualization space rather than collapsed
 * into a 43x56px box. This is a structural consequence of all kits sharing the same primitive
 * vocabulary (all kit centroids converge to the center of the primitive space).
 */

import type { KitConstellation, PrimitiveEntry } from '../data/cosmographTypes';

// ─── Constants (c1 global bound per dispatch § 3.3) ──────────────────────────

export const MAX_CONSTELLATION_RADIUS = 70;  // px at 1.0× zoom
export const INTRA_KIT_SPRING_STRENGTH = 0.9;
export const INTER_KIT_REPULSION_STAGE1 = 15000;  // canvas px² repulsion for centroid layout
export const INTER_KIT_REST_LENGTH = 320;          // px — target spacing between constellation centroids
export const REPULSION_FLOOR = 10;  // px — minimum inter-star gap within constellation
export const CENTROID_ATTRACTION_BY_SHARED_PRIMITIVES = 0.2;  // as spring constant modifier

// ─── Types ────────────────────────────────────────────────────────────────────

/** Node ID for a per-kit primitive instance: 'kit_001:fire' */
export type InstanceNodeId = string;

export interface ConstellationCentroidPos {
  kit_id: string;
  cx: number;  // canvas x of this kit's constellation centroid
  cy: number;  // canvas y
}

export interface InstanceNode {
  nodeId: InstanceNodeId;          // '{kit_id}:{primitive_id}'
  kit_id: string;
  primitive_id: string;
  x: number;                      // canvas x
  y: number;                      // canvas y
  bdi_weight: number;
  primitive_family: string;
  element_coupling_json: string;
  attribute_coupling_json: string;
  provenance_tag: string;
  visibility_at_default_zoom: boolean;
}

export interface ConstellationModeLayout {
  centroids: ConstellationCentroidPos[];           // kit_id → canvas position
  instanceNodes: InstanceNode[];                   // all per-kit primitive instances
  instanceNodesByKit: Map<string, InstanceNode[]>; // kit_id → instances
  intraKitEdges: Array<[InstanceNodeId, InstanceNodeId]>; // spring pairs within kit
}

// ─── Stage 1: Compute shared-primitive-fraction matrix ────────────────────────

function computeSharedFractions(
  kits: KitConstellation[],
  primitiveSets: Map<string, Set<string>>
): number[][] {
  const n = kits.length;
  const W: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      if (i === j) { W[i][j] = 1; continue; }
      const si = primitiveSets.get(kits[i].kit_id)!;
      const sj = primitiveSets.get(kits[j].kit_id)!;
      let shared = 0;
      let union = si.size;
      for (const id of sj) {
        if (si.has(id)) shared++;
        else union++;
      }
      const frac = union > 0 ? shared / union : 0;
      W[i][j] = frac;
      W[j][i] = frac;
    }
  }
  return W;
}

// ─── Stage 1: Force-directed centroid layout ──────────────────────────────────

function runCentroidForceLayout(
  kits: KitConstellation[],
  W: number[][],
  canvasW: number,
  canvasH: number,
  seed: number = 42
): ConstellationCentroidPos[] {
  const n = kits.length;
  const margin = MAX_CONSTELLATION_RADIUS + 30;

  // Seeded pseudo-random initial positions
  let rng = seed;
  const rand = () => {
    rng = (rng * 1664525 + 1013904223) & 0xffffffff;
    return (rng >>> 0) / 0xffffffff;
  };

  const pos: Array<[number, number]> = Array.from(
    { length: n },
    () => [
      margin + rand() * (canvasW - 2 * margin),
      margin + rand() * (canvasH - 2 * margin),
    ]
  );

  const ITERATIONS = 800;
  const K_spring = CENTROID_ATTRACTION_BY_SHARED_PRIMITIVES * 0.004;
  const K_repel = INTER_KIT_REPULSION_STAGE1;
  const rest = INTER_KIT_REST_LENGTH;

  for (let it = 0; it < ITERATIONS; it++) {
    const forces: Array<[number, number]> = Array.from({ length: n }, () => [0, 0]);
    const cooling = 0.35 * (1 - (it / ITERATIONS) * 0.85);

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[j][0] - pos[i][0];
        const dy = pos[j][1] - pos[i][1];
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;

        // Spring attraction weighted by shared primitive fraction
        const springF = K_spring * W[i][j] * (dist - rest);
        // Repulsion (inverse square)
        const repelF = -K_repel / (dist * dist);

        const totalF = springF + repelF;
        const fx = totalF * (dx / dist);
        const fy = totalF * (dy / dist);

        forces[i][0] += fx;
        forces[i][1] += fy;
        forces[j][0] -= fx;
        forces[j][1] -= fy;
      }
    }

    for (let i = 0; i < n; i++) {
      const nx = pos[i][0] + forces[i][0] * cooling;
      const ny = pos[i][1] + forces[i][1] * cooling;
      pos[i][0] = Math.max(margin, Math.min(canvasW - margin, nx));
      pos[i][1] = Math.max(margin, Math.min(canvasH - margin, ny));
    }
  }

  return pos.map(([cx, cy], i) => ({ kit_id: kits[i].kit_id, cx, cy }));
}

// ─── Stage 2: Intra-constellation force layout ────────────────────────────────

/**
 * Place per-kit primitive instances within MAX_CONSTELLATION_RADIUS of their centroid.
 * Uses a lightweight force-directed layout: intra-kit repulsion + centroid attraction.
 */
function runIntraConstellationLayout(
  centroid: ConstellationCentroidPos,
  primitiveIds: string[],
  _primitiveById: Map<string, PrimitiveEntry>
): Array<{ primitive_id: string; x: number; y: number }> {
  const n = primitiveIds.length;
  if (n === 0) return [];

  // Start: arrange primitives in a circle of MAX_CONSTELLATION_RADIUS * 0.7
  const startRadius = MAX_CONSTELLATION_RADIUS * 0.7;
  const pos: Array<[number, number]> = primitiveIds.map((_, i) => {
    const angle = (i / n) * 2 * Math.PI;
    return [
      centroid.cx + Math.cos(angle) * startRadius,
      centroid.cy + Math.sin(angle) * startRadius,
    ];
  });

  const ITERATIONS = 200;
  const K_attract = INTRA_KIT_SPRING_STRENGTH * 0.08;  // pull toward centroid
  const K_repel = 800;   // inter-star repulsion within constellation

  for (let it = 0; it < ITERATIONS; it++) {
    const forces: Array<[number, number]> = Array.from({ length: n }, () => [0, 0]);
    const cooling = 0.5 * (1 - (it / ITERATIONS) * 0.9);

    // Inter-star repulsion (keep them apart)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[j][0] - pos[i][0];
        const dy = pos[j][1] - pos[i][1];
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;

        // Hard floor repulsion
        const targetDist = REPULSION_FLOOR * 2;
        if (dist < targetDist) {
          const repelF = K_repel / (dist * dist);
          forces[i][0] -= repelF * (dx / dist);
          forces[i][1] -= repelF * (dy / dist);
          forces[j][0] += repelF * (dx / dist);
          forces[j][1] += repelF * (dy / dist);
        }
      }
    }

    // Centroid attraction: pull each star back toward kit centroid
    for (let i = 0; i < n; i++) {
      const dx = centroid.cx - pos[i][0];
      const dy = centroid.cy - pos[i][1];
      forces[i][0] += K_attract * dx;
      forces[i][1] += K_attract * dy;
    }

    // Apply forces + clamp to radius
    for (let i = 0; i < n; i++) {
      let nx = pos[i][0] + forces[i][0] * cooling;
      let ny = pos[i][1] + forces[i][1] * cooling;

      // Clamp to constellation radius
      const ddx = nx - centroid.cx;
      const ddy = ny - centroid.cy;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      if (dist > MAX_CONSTELLATION_RADIUS) {
        const scale = MAX_CONSTELLATION_RADIUS / dist;
        nx = centroid.cx + ddx * scale;
        ny = centroid.cy + ddy * scale;
      }

      pos[i] = [nx, ny];
    }
  }

  return primitiveIds.map((pid, i) => ({
    primitive_id: pid,
    x: pos[i][0],
    y: pos[i][1],
  }));
}

// ─── Main: compute full Mode B layout ────────────────────────────────────────

/**
 * Compute the complete Mode B layout for a given set of kits.
 *
 * @param kits - the sample cohort (Phase 1: 5-10; Phase 2: all 1000)
 * @param primitiveById - lookup map for primitive entries
 * @param canvasW - canvas width in px
 * @param canvasH - canvas height in px
 */
export function computeConstellationModeLayout(
  kits: KitConstellation[],
  primitiveById: Map<string, PrimitiveEntry>,
  canvasW: number,
  canvasH: number
): ConstellationModeLayout {
  // Parse primitive sets for each kit
  const primitiveSets = new Map<string, Set<string>>();
  for (const kit of kits) {
    let ids: string[] = [];
    try { ids = JSON.parse(kit.primitive_set_json) as string[]; } catch { /* skip */ }
    primitiveSets.set(kit.kit_id, new Set(ids));
  }

  // Stage 1: shared-fraction matrix + centroid force layout
  const W = computeSharedFractions(kits, primitiveSets);
  const centroids = runCentroidForceLayout(kits, W, canvasW, canvasH);

  // Build centroid lookup
  const centroidByKitId = new Map<string, ConstellationCentroidPos>();
  for (const c of centroids) centroidByKitId.set(c.kit_id, c);

  // Stage 2: intra-constellation layout for each kit
  const instanceNodes: InstanceNode[] = [];
  const instanceNodesByKit = new Map<string, InstanceNode[]>();
  const intraKitEdges: Array<[InstanceNodeId, InstanceNodeId]> = [];

  for (const kit of kits) {
    const centroid = centroidByKitId.get(kit.kit_id)!;
    const primitiveIds = [...(primitiveSets.get(kit.kit_id) ?? [])];

    // Filter to primitives that exist in the registry
    const validIds = primitiveIds.filter(id => primitiveById.has(id));

    // Intra-constellation force layout
    const placed = runIntraConstellationLayout(centroid, validIds, primitiveById);

    const kitNodes: InstanceNode[] = [];
    for (const { primitive_id, x, y } of placed) {
      const prim = primitiveById.get(primitive_id);
      if (!prim) continue;
      const node: InstanceNode = {
        nodeId: `${kit.kit_id}:${primitive_id}`,
        kit_id: kit.kit_id,
        primitive_id,
        x,
        y,
        bdi_weight: prim.bdi_weight,
        primitive_family: prim.primitive_family,
        element_coupling_json: prim.element_coupling_json,
        attribute_coupling_json: prim.attribute_coupling_json,
        provenance_tag: prim.provenance_tag,
        visibility_at_default_zoom: prim.visibility_at_default_zoom,
      };
      kitNodes.push(node);
      instanceNodes.push(node);
    }

    instanceNodesByKit.set(kit.kit_id, kitNodes);

    // All-pairs intra-kit edges (for MST rendering or edge rendering)
    for (let i = 0; i < kitNodes.length; i++) {
      for (let j = i + 1; j < kitNodes.length; j++) {
        intraKitEdges.push([kitNodes[i].nodeId, kitNodes[j].nodeId]);
      }
    }
  }

  return { centroids, instanceNodes, instanceNodesByKit, intraKitEdges };
}

// ─── Lasso resolution for Mode B ─────────────────────────────────────────────

/**
 * For Mode B lasso resolution:
 * 1. Collect all instance nodes within lasso polygon
 * 2. DEDUPE to unique primitive_ids (per Gate-1 Finding 2 INFO)
 * 3. Compute which kit's centroid falls within lasso (primary resolution)
 * 4. Return deduped primitive set for composite-score input
 *
 * Called by the Mode B canvas; the deduped primitive IDs feed into
 * the standard resolveLasso() algorithm unchanged.
 */
export function dedupeInstanceNodes(
  capturedNodeIds: Set<InstanceNodeId>
): Set<string> {
  const uniquePrimitiveIds = new Set<string>();
  for (const nodeId of capturedNodeIds) {
    // nodeId format: '{kit_id}:{primitive_id}'
    const colonIdx = nodeId.indexOf(':');
    if (colonIdx > 0) {
      const primitiveId = nodeId.slice(colonIdx + 1);
      uniquePrimitiveIds.add(primitiveId);
    }
  }
  return uniquePrimitiveIds;
}
