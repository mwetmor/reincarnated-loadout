/**
 * CosmographCanvas.tsx — Pixi.js v7 WebGL rendering surface for /forge.
 *
 * Phase 1: Pixi.js Application mount + deep-space background. Canvas renders.
 * Phase 2: 570 primitive stars with bdi_weight brightness + element-coupling color + provenance encoding.
 * Phase 3: 1000 PROVISIONAL constellation MST lines + 7 faction halos + region-label overlays.
 * Phase 4: Lasso interaction + side panel + flag-enum visualization.
 * Phase 5: Perf pass + zoom + viewport culling + Vercel deploy.
 *
 * Painterly cosmic aesthetic (register-locked per cosmograph-pivot § 3 + § 4):
 * - Deep-space background: near-black → navy at edges
 * - Stars: soft-glow radial alpha falloff (NOT crisp pixel disks)
 * - Avoid: solar-system / orbital-path / hexagonal-grid reflexes
 */

import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import type { CosmographData } from '../../data/cosmographData';

interface CosmographCanvasProps {
  data: CosmographData;
}

// Cosmograph coordinate space → canvas pixel space
// UMAP range: embedding_x [-10.06, 25.65], embedding_y [-21.79, 15.99]
// Canvas: roughly fills container width × height.
// Phase 1: establish projection transform. Phase 2: render stars using it.

interface ProjectionState {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  umapMinX: number;
  umapMinY: number;
  umapRangeX: number;
  umapRangeY: number;
}

function computeProjection(
  canvasW: number,
  canvasH: number,
  data: CosmographData,
  paddingFraction = 0.07
): ProjectionState {
  const allX = data.primitives.map(p => p.embedding_x);
  const allY = data.primitives.map(p => p.embedding_y);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;

  const padX = rangeX * paddingFraction;
  const padY = rangeY * paddingFraction;

  const scaleX = canvasW / (rangeX + padX * 2);
  const scaleY = canvasH / (rangeY + padY * 2);
  // Use uniform scale (smaller of the two) to preserve UMAP aspect ratio
  const scale = Math.min(scaleX, scaleY);

  const renderW = (rangeX + padX * 2) * scale;
  const renderH = (rangeY + padY * 2) * scale;

  return {
    scaleX: scale,
    scaleY: scale,
    offsetX: (canvasW - renderW) / 2 + padX * scale,
    offsetY: (canvasH - renderH) / 2 + padY * scale,
    umapMinX: minX,
    umapMinY: minY,
    umapRangeX: rangeX,
    umapRangeY: rangeY,
  };
}

function drawDeepSpaceBackground(app: PIXI.Application): PIXI.Graphics {
  const bg = new PIXI.Graphics();

  // Near-black base fill
  bg.beginFill(0x020408, 1.0);
  bg.drawRect(0, 0, app.screen.width, app.screen.height);
  bg.endFill();

  // Subtle navy gradient at edges — draw radial-gradient-like vignette
  // Pixi.js v7 doesn't have native radial gradient on Graphics, but we can
  // approximate with a large semi-transparent dark oval at edges.
  // Simple approach: draw dark edge overlays
  const edgeAlpha = 0.35;
  const edgeColor = 0x000812;

  // Left edge
  const leftEdge = new PIXI.Graphics();
  leftEdge.beginFill(edgeColor, edgeAlpha);
  leftEdge.drawRect(0, 0, app.screen.width * 0.15, app.screen.height);
  leftEdge.endFill();
  leftEdge.alpha = edgeAlpha;
  app.stage.addChild(leftEdge);

  // Right edge
  const rightEdge = new PIXI.Graphics();
  rightEdge.beginFill(edgeColor, edgeAlpha);
  rightEdge.drawRect(app.screen.width * 0.85, 0, app.screen.width * 0.15, app.screen.height);
  rightEdge.endFill();
  app.stage.addChild(rightEdge);

  // Top edge
  const topEdge = new PIXI.Graphics();
  topEdge.beginFill(edgeColor, edgeAlpha);
  topEdge.drawRect(0, 0, app.screen.width, app.screen.height * 0.10);
  topEdge.endFill();
  app.stage.addChild(topEdge);

  // Bottom edge
  const bottomEdge = new PIXI.Graphics();
  bottomEdge.beginFill(edgeColor, edgeAlpha);
  bottomEdge.drawRect(0, app.screen.height * 0.90, app.screen.width, app.screen.height * 0.10);
  bottomEdge.endFill();
  app.stage.addChild(bottomEdge);

  return bg;
}

// Phase 1 placeholder text while star rendering is built in Phase 2
function drawPhase1Placeholder(
  app: PIXI.Application,
  data: CosmographData,
  projection: ProjectionState
): void {
  const style = new PIXI.TextStyle({
    fontFamily: 'ui-monospace, monospace',
    fontSize: 11,
    fill: 0x4a5568,
    align: 'center',
  });

  const visibleCount = data.primitives.filter(p => p.visibility_at_default_zoom).length;
  const text = new PIXI.Text(
    `Phase 1 scaffold — Pixi.js ${PIXI.VERSION} mounted\n` +
    `${data.primitives.length} substrate primitives · ${visibleCount} first-class stars\n` +
    `${data.kits.length} PROVISIONAL constellations · ${data.factionOverlays.factions.length} faction halos\n` +
    `UMAP x: [${projection.umapMinX.toFixed(2)}, ${(projection.umapMinX + projection.umapRangeX).toFixed(2)}] ` +
    `y: [${projection.umapMinY.toFixed(2)}, ${(projection.umapMinY + projection.umapRangeY).toFixed(2)}]\n` +
    `Star rendering loads in Phase 2.`,
    style
  );
  text.x = app.screen.width / 2 - text.width / 2;
  text.y = app.screen.height / 2 - text.height / 2;
  app.stage.addChild(text);

  // Draw faint star dots at correct UMAP coordinates to confirm projection
  // (77 first-class stars only — validates coordinate transform)
  const starDots = new PIXI.Graphics();
  for (const p of data.primitives) {
    if (!p.visibility_at_default_zoom) continue;
    const sx = projection.offsetX + (p.embedding_x - projection.umapMinX) * projection.scaleX;
    const sy = projection.offsetY + (p.embedding_y - projection.umapMinY) * projection.scaleY;
    starDots.beginFill(0x667788, 0.5);
    starDots.drawCircle(sx, sy, 2);
    starDots.endFill();
  }
  app.stage.addChild(starDots);
}

export function CosmographCanvas({ data }: CosmographCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Create Pixi.js Application
    const app = new PIXI.Application({
      width: w,
      height: h,
      backgroundColor: 0x020408,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    appRef.current = app;
    container.appendChild(app.view as HTMLCanvasElement);

    // Compute UMAP → canvas projection
    const projection = computeProjection(w, h, data);

    // Draw deep-space background
    const bg = drawDeepSpaceBackground(app);
    app.stage.addChildAt(bg, 0);

    // Phase 1 placeholder with 77 first-class star positions
    drawPhase1Placeholder(app, data, projection);

    console.info(
      `[CosmographCanvas] Pixi.js ${PIXI.VERSION} mounted — ${w}×${h}px — ` +
      `scale ${projection.scaleX.toFixed(2)}px/UMAP-unit`
    );

    // Cleanup on unmount
    return () => {
      app.destroy(true, { children: true, texture: true, baseTexture: true });
      appRef.current = null;
    };
  }, [data]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ cursor: 'crosshair' }}
    />
  );
}
