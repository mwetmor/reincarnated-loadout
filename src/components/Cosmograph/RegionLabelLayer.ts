/**
 * RegionLabelLayer.ts
 * Pixi.js rendering for Phase 3 region-label overlays.
 *
 * Renders per dispatch § 4.5:
 *   1. 6 emergent mechanic-family centroid labels (primary — most informative)
 *   2. Tier + scaling-pattern annotation block (positioned at the skill-tree-position
 *      primitive cluster, which sits at x≈17, y≈1.0-1.5 in UMAP space)
 *   3. Chain architecture: two subtle vertical demarcations in the skill-geometry region
 *
 * BC bin labels (34 total) are deferred — the 34-bin grid is too dense to render
 * as individual labels without overwhelming the cosmograph; a future optional
 * toggle overlay can surface them at Phase 5.
 *
 * All labels render at default opacity 0.35-0.45 (discoverable, not loud).
 * Hover brightening: Phase 4+ interaction (not yet wired in Phase 3).
 *
 * Discipline #11 (empirical inspection):
 * - Mechanic primitive cluster: x=[7.3, 10.5] y=[12.1, 14.6] in UMAP space
 * - Skill-tree-position cluster: x≈17, y≈1.0-1.5 — isolated from mechanic cluster
 * - Emergent mechanic family centroids confirmed from region_labels.json clusters[]
 */

import * as PIXI from 'pixi.js';
import type { RegionLabels } from '../../data/cosmographTypes';
import type { ProjectionState } from './coordinateProjection';
import { toCanvas } from './coordinateProjection';

// ─── Style constants ──────────────────────────────────────────────────────────

const MECHANIC_FAMILY_LABEL_STYLE: Partial<PIXI.TextStyle> = {
  fontFamily: 'ui-monospace, monospace',
  fontSize: 9,
  fill: 0x7799CC,
  align: 'center',
  letterSpacing: 0.4,
};

const DEFAULT_LABEL_ALPHA = 0.40;

// ─── Emergent mechanic-family centroid labels ─────────────────────────────────

/**
 * Render 6 emergent mechanic-family centroid labels at their UMAP cluster centroids.
 * Labels: e.g. "emergent::damage|close|high" per cluster label field.
 * Per dispatch § 4.5: small text, muted color, low default opacity.
 */
export function renderEmergentMechanicLabels(
  app: PIXI.Application,
  regionLabels: RegionLabels,
  proj: ProjectionState
): PIXI.Container {
  const container = new PIXI.Container();
  const clusters = regionLabels.emergent_mechanic_family_labels.clusters;

  // Effect-category color tints for mechanic labels
  const effectColors: Record<string, number> = {
    damage:   0x7799CC,
    control:  0x77CCAA,
    mobility: 0xCCAA55,
  };

  for (const cluster of clusters) {
    const { x, y } = toCanvas(cluster.centroid_x, cluster.centroid_y, proj);

    const color = effectColors[cluster.dominant_effect_category ?? ''] ?? 0x8899BB;

    // Marker circle at centroid
    const g = new PIXI.Graphics();
    g.beginFill(color, 0.25);
    g.drawCircle(x, y, 6);
    g.endFill();
    g.lineStyle(0.5, color, 0.5);
    g.drawCircle(x, y, 8);
    g.lineStyle(0);
    container.addChild(g);

    // Label text
    const label = new PIXI.Text(cluster.label, new PIXI.TextStyle({
      ...MECHANIC_FAMILY_LABEL_STYLE,
      fill: color,
    }));
    label.x = x - label.width / 2;
    label.y = y + 11; // below the centroid marker
    label.alpha = DEFAULT_LABEL_ALPHA + 0.05;
    container.addChild(label);

    // Member count subscript
    const countStyle = new PIXI.TextStyle({
      fontFamily: 'ui-monospace, monospace',
      fontSize: 7,
      fill: color,
      align: 'center',
    });
    const countLabel = new PIXI.Text(`(${cluster.member_count} mechanics)`, countStyle);
    countLabel.x = x - countLabel.width / 2;
    countLabel.y = y + 22;
    countLabel.alpha = DEFAULT_LABEL_ALPHA - 0.10;
    container.addChild(countLabel);
  }

  app.stage.addChild(container);
  return container;
}

// ─── Skill-tree tier + scaling pattern annotation block ───────────────────────

/**
 * Render tier + scaling-pattern annotation near the skill-tree-position
 * primitive cluster (isolated at x≈17, y≈1.0-1.5 in UMAP space).
 *
 * Rather than horizontal canvas-wide bands (which the UMAP structure doesn't
 * support — tiers aren't sorted vertically across the full embedding), we render
 * a compact annotation block positioned at the canvas location of the
 * skill-tree-position cluster. This is substrate-honest: the tier primitives
 * cluster together in one region of the sky.
 */
export function renderTierAnnotationBlock(
  app: PIXI.Application,
  proj: ProjectionState
): PIXI.Container {
  const container = new PIXI.Container();

  // Anchor point: UMAP centroid of skill-tree-position cluster (≈17.2, 1.3)
  const TIER_ANCHOR_UMAP = { x: 17.22, y: 1.3 };
  const anchor = toCanvas(TIER_ANCHOR_UMAP.x, TIER_ANCHOR_UMAP.y, proj);

  // Tier definitions
  const tiers = [
    { label: 'T1 Rotation',       color: 0x6688AA, pattern: 'additive' },
    { label: 'T2 β-Pair',         color: 0x7799BB, pattern: 'additive + multiplicative' },
    { label: 'T3 Build-Defining', color: 0x88AACC, pattern: 'multiplicative' },
    { label: 'T4 Capstone',       color: 0xDDAA33, pattern: 'transformative' },
  ];

  // Draw a subtle bounding box for the annotation block
  const boxW = 165;
  const boxH = tiers.length * 16 + 18;
  const boxX = anchor.x + 14;
  const boxY = anchor.y - 8;

  const boxG = new PIXI.Graphics();
  boxG.lineStyle(0.5, 0x445566, 0.30);
  boxG.beginFill(0x020408, 0.60);
  boxG.drawRoundedRect(boxX, boxY, boxW, boxH, 3);
  boxG.endFill();
  container.addChild(boxG);

  // Header
  const headerStyle = new PIXI.TextStyle({
    fontFamily: 'ui-monospace, monospace',
    fontSize: 7.5,
    fill: 0x556677,
    letterSpacing: 0.5,
  });
  const header = new PIXI.Text('SKILL-TREE DEPTH', headerStyle);
  header.x = boxX + 6;
  header.y = boxY + 5;
  header.alpha = 0.55;
  container.addChild(header);

  // Tier rows
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    const rowY = boxY + 16 + i * 16;

    const tierStyle = new PIXI.TextStyle({
      fontFamily: 'ui-monospace, monospace',
      fontSize: 8,
      fill: t.color,
      letterSpacing: 0.2,
    });
    const tierLabel = new PIXI.Text(`${t.label}`, tierStyle);
    tierLabel.x = boxX + 6;
    tierLabel.y = rowY;
    tierLabel.alpha = DEFAULT_LABEL_ALPHA + 0.10;
    container.addChild(tierLabel);

    const patternStyle = new PIXI.TextStyle({
      fontFamily: 'ui-monospace, monospace',
      fontSize: 7,
      fill: 0x445566,
      letterSpacing: 0.1,
    });
    const patternLabel = new PIXI.Text(`→ ${t.pattern}`, patternStyle);
    patternLabel.x = boxX + 6 + tierLabel.width + 4;
    patternLabel.y = rowY + 1;
    patternLabel.alpha = DEFAULT_LABEL_ALPHA - 0.05;
    container.addChild(patternLabel);
  }

  app.stage.addChild(container);
  return container;
}

// ─── Chain architecture demarcation ──────────────────────────────────────────

/**
 * Render chain architecture labels near the chain_architecture primitive cluster.
 * Two primitives: 3-Chain Class + 4-Chain Class at x≈16.82-16.86, y≈1.07-1.28 UMAP.
 * Rendered as small glyph + label pair.
 */
export function renderChainArchitectureLabels(
  app: PIXI.Application,
  proj: ProjectionState
): PIXI.Container {
  const container = new PIXI.Container();

  const chains = [
    { label: '3-Chain', umap_x: 16.82, umap_y: 1.07, desc: '2× T4 + 1× T3-only', color: 0x7788AA },
    { label: '4-Chain', umap_x: 16.86, umap_y: 1.28, desc: '3× T4 + 1× T3-only', color: 0x8899BB },
  ];

  for (const ch of chains) {
    const { x, y } = toCanvas(ch.umap_x, ch.umap_y, proj);

    // Small bracket glyph
    const g = new PIXI.Graphics();
    g.lineStyle(0.6, ch.color, 0.40);
    g.moveTo(x - 5, y - 3);
    g.lineTo(x - 5, y + 3);
    g.lineTo(x + 1, y + 3);
    g.lineStyle(0);
    container.addChild(g);

    const style = new PIXI.TextStyle({
      fontFamily: 'ui-monospace, monospace',
      fontSize: 8,
      fill: ch.color,
      letterSpacing: 0.2,
    });
    const label = new PIXI.Text(`${ch.label}: ${ch.desc}`, style);
    label.x = x + 3;
    label.y = y - label.height / 2;
    label.alpha = DEFAULT_LABEL_ALPHA - 0.05;
    container.addChild(label);
  }

  app.stage.addChild(container);
  return container;
}
