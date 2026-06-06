/**
 * mstConstellation.ts
 * Minimum-spanning-tree computation for constellation rendering.
 *
 * Produces N-1 edges per kit over the kit's primitive_set_json positions
 * (Kruskal's algorithm; Euclidean distance in embedding_x/y space).
 *
 * Phase 3 — Discipline #1 (math-before-code):
 *   Mean primitive_set_size = 34.3 → ~33 MST edges per kit → ~33K edges total.
 *   Lines rendered ONLY on zoom-in, lasso hover, or faction-highlight (cull-by-default).
 *   Default zoom renders centroid dim-points only (1000 points; near-zero cost).
 *
 * Gandalf design-state record 2026-06-06: cull-by-default is the LOD discipline.
 * No pre-baked LOD cap. Worst-case faction-highlight ≈ 4,700 segments — within envelope.
 */

import type { PrimitiveEntry, KitConstellation } from '../data/cosmographTypes';

export interface MSTEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Build a lookup: primitive_id → (embedding_x, embedding_y) */
type PrimCoords = { x: number; y: number };

function buildPrimCoordMap(primitives: PrimitiveEntry[]): Map<string, PrimCoords> {
  const map = new Map<string, PrimCoords>();
  for (const p of primitives) {
    map.set(p.primitive_id, { x: p.embedding_x, y: p.embedding_y });
  }
  return map;
}

/**
 * Kruskal's MST over the primitive positions of a single kit.
 * Returns N-1 edges (in UMAP coordinate space, not canvas space).
 * Missing primitives (not in coordMap) are silently skipped.
 */
function kruskalMST(primitiveIds: string[], coordMap: Map<string, PrimCoords>): MSTEdge[] {
  // Resolve all IDs to coordinates (skip missing)
  const nodes: Array<{ id: string; x: number; y: number }> = [];
  for (const id of primitiveIds) {
    const c = coordMap.get(id);
    if (c) nodes.push({ id, x: c.x, y: c.y });
  }

  if (nodes.length < 2) return [];

  // Build all edges with Euclidean distance
  type Edge = { i: number; j: number; dist: number };
  const edges: Edge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      edges.push({ i, j, dist: Math.sqrt(dx * dx + dy * dy) });
    }
  }
  edges.sort((a, b) => a.dist - b.dist);

  // Union-Find
  const parent = nodes.map((_, idx) => idx);
  const rank = new Array<number>(nodes.length).fill(0);

  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]; // path compression
      x = parent[x];
    }
    return x;
  }

  function union(a: number, b: number): boolean {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return false;
    if (rank[ra] < rank[rb]) parent[ra] = rb;
    else if (rank[ra] > rank[rb]) parent[rb] = ra;
    else { parent[rb] = ra; rank[ra]++; }
    return true;
  }

  const mstEdges: MSTEdge[] = [];
  for (const e of edges) {
    if (mstEdges.length >= nodes.length - 1) break;
    if (union(e.i, e.j)) {
      mstEdges.push({
        x1: nodes[e.i].x,
        y1: nodes[e.i].y,
        x2: nodes[e.j].x,
        y2: nodes[e.j].y,
      });
    }
  }

  return mstEdges;
}

/**
 * Pre-compute MST edges for all kits (called once on data load).
 * Returns a map: kit_id → MSTEdge[] (in UMAP space).
 *
 * At ~1000 kits × 34-node Kruskal = O(n² log n) per kit.
 * 34 nodes → 561 candidate edges → fast per kit. Total ~10ms.
 */
export function buildAllMSTEdges(
  kits: KitConstellation[],
  primitives: PrimitiveEntry[]
): Map<string, MSTEdge[]> {
  const coordMap = buildPrimCoordMap(primitives);
  const result = new Map<string, MSTEdge[]>();

  for (const kit of kits) {
    let primitiveIds: string[] = [];
    try {
      primitiveIds = JSON.parse(kit.primitive_set_json) as string[];
    } catch {
      // malformed JSON — skip
    }
    result.set(kit.kit_id, kruskalMST(primitiveIds, coordMap));
  }

  return result;
}

/**
 * Compute centroid of a convex hull given as [[x, y], ...] coordinate pairs.
 * Used to derive faction label anchor when JSON centroid is null.
 */
export function hullCentroid(hull: [number, number][]): { x: number; y: number } {
  if (hull.length === 0) return { x: 0, y: 0 };
  let sx = 0, sy = 0;
  for (const [hx, hy] of hull) {
    sx += hx;
    sy += hy;
  }
  return { x: sx / hull.length, y: sy / hull.length };
}
