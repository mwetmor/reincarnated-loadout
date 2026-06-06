/**
 * coordinateProjection.ts
 * Shared UMAP → canvas coordinate projection used by all cosmograph rendering layers.
 *
 * Extracted from CosmographCanvas.tsx at Phase 3 to enable multi-file rendering modules.
 * All Phase 3+ components import ProjectionState + toCanvas from here.
 */

import type { PrimitiveEntry } from '../../data/cosmographTypes';

export interface ProjectionState {
  scale: number;
  offsetX: number;
  offsetY: number;
  umapMinX: number;
  umapMinY: number;
}

export function computeProjection(
  canvasW: number,
  canvasH: number,
  primitives: PrimitiveEntry[],
  paddingFraction = 0.07
): ProjectionState {
  const allX = primitives.map(p => p.embedding_x);
  const allY = primitives.map(p => p.embedding_y);
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
  const scale = Math.min(scaleX, scaleY);

  const renderW = (rangeX + padX * 2) * scale;
  const renderH = (rangeY + padY * 2) * scale;

  return {
    scale,
    offsetX: (canvasW - renderW) / 2 + padX * scale,
    offsetY: (canvasH - renderH) / 2 + padY * scale,
    umapMinX: minX,
    umapMinY: minY,
  };
}

export function toCanvas(
  ux: number,
  uy: number,
  proj: ProjectionState
): { x: number; y: number } {
  return {
    x: proj.offsetX + (ux - proj.umapMinX) * proj.scale,
    y: proj.offsetY + (uy - proj.umapMinY) * proj.scale,
  };
}
