/**
 * lassoResolution.ts
 * Point-in-polygon + composite-score kit matching per dispatch § 5.2.
 *
 * Math projection (Discipline #1 — math-before-code, verified at Phase 1):
 *   - Point-in-polygon: 570 stars × ~20 lasso vertices ≈ 11,400 ray-cast tests = <1 ms
 *   - Composite-score: 1000 kits × mean 34 primitives/kit = 34,000 element checks = <2 ms
 *   - Total latency: <5 ms → instant interactive feel
 */

import type { PrimitiveEntry, KitConstellation, LassoMatch } from '../data/cosmographTypes';

export interface Point {
  x: number;
  y: number;
}

/**
 * Ray-casting point-in-polygon test.
 * Returns true if (px, py) is inside the polygon defined by vertices.
 */
function pointInPolygon(px: number, py: number, vertices: Point[]): boolean {
  let inside = false;
  const n = vertices.length;
  let j = n - 1;
  for (let i = 0; i < n; i++) {
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
    j = i;
  }
  return inside;
}

export interface LassoResolutionInput {
  lassoPolygon: Point[];        // vertices in cosmograph coordinate space
  primitives: PrimitiveEntry[];
  kits: KitConstellation[];
  primitiveById: Map<string, PrimitiveEntry>;
  topN?: number;                // default 3
}

export interface LassoResolutionResult {
  lassoPrimitiveIds: Set<string>;
  matches: LassoMatch[];
  emptyLasso: boolean;
  ambiguous: boolean;           // top-2 scores within 5% of each other
  noBestMatch: boolean;         // top score < 0.3
}

/**
 * Resolve a lasso polygon to the top-N best-matching kit constellations.
 * Per dispatch § 5.2 algorithm.
 */
export function resolveLasso(input: LassoResolutionInput): LassoResolutionResult {
  const { lassoPolygon, primitives, kits, primitiveById, topN = 3 } = input;

  if (lassoPolygon.length < 3) {
    return { lassoPrimitiveIds: new Set(), matches: [], emptyLasso: true, ambiguous: false, noBestMatch: false };
  }

  // Step 1: point-in-polygon for each primitive
  const lassoPrimitiveIds = new Set<string>();
  for (const p of primitives) {
    if (pointInPolygon(p.embedding_x, p.embedding_y, lassoPolygon)) {
      lassoPrimitiveIds.add(p.primitive_id);
    }
  }

  if (lassoPrimitiveIds.size === 0) {
    return { lassoPrimitiveIds, matches: [], emptyLasso: true, ambiguous: false, noBestMatch: false };
  }

  // Step 2: score each kit
  const scored: LassoMatch[] = [];

  for (const kit of kits) {
    const primitiveSet = JSON.parse(kit.primitive_set_json) as string[];

    const intersection = primitiveSet.filter(id => lassoPrimitiveIds.has(id));
    const intersectionCount = intersection.length;

    if (intersectionCount === 0) continue;

    const coverage_fraction = intersectionCount / primitiveSet.length;
    const density_score = intersectionCount / lassoPrimitiveIds.size;

    // weight_score: sum of bdi_weight for lasso-intersecting primitives / total bdi_weight in kit
    let intersectWeightSum = 0;
    let totalWeightSum = 0;
    for (const id of primitiveSet) {
      const prim = primitiveById.get(id);
      if (!prim) continue;
      totalWeightSum += prim.bdi_weight;
      if (lassoPrimitiveIds.has(id)) {
        intersectWeightSum += prim.bdi_weight;
      }
    }
    const weight_score = totalWeightSum > 0 ? intersectWeightSum / totalWeightSum : 0;

    const composite_score = 0.4 * coverage_fraction + 0.3 * density_score + 0.3 * weight_score;

    scored.push({ kit, coverage_fraction, density_score, weight_score, composite_score });
  }

  // Step 3: sort descending by composite_score
  scored.sort((a, b) => b.composite_score - a.composite_score);

  const topMatches = scored.slice(0, topN);

  const noBestMatch = topMatches.length === 0 || topMatches[0].composite_score < 0.3;
  const ambiguous =
    !noBestMatch &&
    topMatches.length >= 2 &&
    Math.abs(topMatches[0].composite_score - topMatches[1].composite_score) /
      topMatches[0].composite_score < 0.05;

  return {
    lassoPrimitiveIds,
    matches: topMatches,
    emptyLasso: false,
    ambiguous,
    noBestMatch,
  };
}
