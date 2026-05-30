// HeroOfEngineSpotlight — above-the-fold Hero of the Engine section.
// Large portrait (placeholder), substrate-accent framing, gandalf prose card.
// Visual moment: generous whitespace breaks the dense-rhythm rule.

import { type HeroOfEngine, type Substrate, SUBSTRATE_ACCENT, SUBSTRATE_RULE_COLOR } from '../../data/pitch/pitchData';
import { HeroPortraitPlaceholder } from './HeroPortraitPlaceholder';
import { CosmologyPairBlock } from './CosmologyPairBlock';

interface HeroOfEngineSpotlightProps {
  hero: HeroOfEngine;
}

function accentHex(substrate: Substrate): string {
  return SUBSTRATE_RULE_COLOR[substrate];
}

export function HeroOfEngineSpotlight({ hero }: HeroOfEngineSpotlightProps) {
  const accent = SUBSTRATE_ACCENT[hero.substrate];

  return (
    <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
      {/* Section eyebrow */}
      <p className="font-mono uppercase tracking-wide text-xs text-gray-500 mb-6">
        Hero of the Engine
      </p>

      {/* Main layout: portrait left on desktop, prose right */}
      <div className="flex flex-col md:flex-row items-start gap-8 md:gap-12">
        {/* Portrait — centered on mobile, left-anchored on desktop */}
        <div className="w-full md:w-auto md:flex-shrink-0 flex justify-center md:justify-start">
          <div className="w-[200px] sm:w-[240px] md:w-[280px]">
            {hero.modelPath ? (
              // Animated 3D hero via Google <model-viewer> web component (Meshy GLB export)
              // Falls back to static portrait if model fails to load (poster attribute)
              <model-viewer
                src={hero.modelPath}
                alt={hero.className}
                poster={hero.portraitPath ?? undefined}
                auto-rotate
                camera-controls
                shadow-intensity="1"
                exposure="1"
                loading="eager"
                reveal="auto"
                style={{
                  width: '100%',
                  aspectRatio: '3/4',
                  borderRadius: '0.5rem',
                  backgroundColor: '#0a0a0a',
                }}
              />
            ) : hero.portraitPath ? (
              <img
                src={hero.portraitPath}
                alt={hero.className}
                className="w-full rounded-lg object-cover aspect-[3/4]"
              />
            ) : (
              <HeroPortraitPlaceholder
                className={hero.className}
                substrate={hero.substrate}
                size="large"
              />
            )}
          </div>
        </div>

        {/* Prose card */}
        <div className="flex-1 min-w-0">
          {/* Substrate accent rule — gradient from accent hex to transparent */}
          <div
            className="h-0.5 mb-5 rounded-full"
            style={{
              background: `linear-gradient(to right, ${accentHex(hero.substrate)}, transparent)`,
            }}
            aria-hidden="true"
          />

          {/* Class name */}
          <h2 className={['text-2xl md:text-3xl font-semibold mb-1', accent.text].join(' ')}>
            {hero.className}
          </h2>

          {/* Season + substrate metadata */}
          <p className="font-mono uppercase tracking-wide text-xs text-gray-500 mb-4">
            {hero.anchorName} &nbsp;·&nbsp; {hero.substrate} substrate &nbsp;·&nbsp; {hero.archetype}
          </p>

          {/* Gandalf's why-this-hero prose */}
          <p className="text-sm leading-relaxed text-gray-300 mb-8">
            {hero.whyThisHero}
          </p>

          {/* Pair-rationale prose — literary register */}
          <CosmologyPairBlock
            pairLabel={hero.featuredPairLabel}
            rationale={hero.featuredPairRationale}
            accentSubstrate={hero.substrate}
          />
        </div>
      </div>
    </section>
  );
}
