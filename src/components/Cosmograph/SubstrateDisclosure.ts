/**
 * SubstrateDisclosure.ts
 * Substrate-honest disclosure overlay per dispatch § 4.4 + gandalf Phase 3 spec note.
 *
 * Renders two disclosure strings at appropriate canvas position:
 *
 * 1. Factional structure disclosure:
 *    "Per-element factional identity surfaces post-Phase 5+ LLM cohesion clustering
 *     on the Pareto-reduced ~30-kit population. Current view shows attribute-group
 *     structure — what the substrate actually says."
 *
 * 2. Constellation PROVISIONAL disclosure:
 *    "All constellations PROVISIONAL — engine has not yet composed these patterns."
 *
 * Rendered as a subtle info block at canvas bottom-left corner.
 * Low opacity (0.35) — discoverable text, not competing with the cosmograph.
 *
 * This is the drax-side implementation of Discipline #59 (substrate-coverage honesty):
 * gaps not papered over; substrate-state disclosed at the rendering layer.
 */

import * as PIXI from 'pixi.js';

export function renderSubstrateDisclosure(app: PIXI.Application): PIXI.Container {
  const container = new PIXI.Container();

  const lineStyle = new PIXI.TextStyle({
    fontFamily: 'ui-monospace, monospace',
    fontSize: 8,
    fill: 0x556688,
    align: 'left',
    letterSpacing: 0.3,
    wordWrap: true,
    wordWrapWidth: 420,
  });

  const lines = [
    'Faction structure: attribute-group (STR / INT / WIS) — substrate-actual.',
    'Per-element factional identity: post-Phase 5+ LLM cohesion clustering on Pareto-reduced ~30-kit population.',
    'All constellations PROVISIONAL — engine has not yet composed these patterns.',
  ];

  const x = 12;
  let y = app.screen.height - 48;

  for (const line of lines) {
    const text = new PIXI.Text(line, lineStyle);
    text.x = x;
    text.y = y;
    text.alpha = 0.35;
    container.addChild(text);
    y += 14;
  }

  app.stage.addChild(container);
  return container;
}
