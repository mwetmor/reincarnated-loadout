// /pitch — Pitch page (Phase 1 scaffold)
// Structured per sprint dispatch § 6.2 sections:
//   1. Headline + Hero of the Engine spotlight
//   2. The Engine in One Paragraph + stat cards
//   3. Season Hype Pieces (5 seasons)
//   4. The Hive paragraph
//   5. Paths and Conversations
// Footer: handled by App.tsx global footer + transparency disclosure rendered here
//
// Phase 1: placeholders throughout. Star-lord portrait pipeline + seasons.json → Phase 2.
// TODO(drax): Phase 2 — swap HeroPortraitPlaceholder for <img> using heroes-manifest.json

import { HERO_OF_ENGINE, SEASONS } from '../data/pitch/pitchData';
import { HeroOfEngineSpotlight } from '../components/pitch/HeroOfEngineSpotlight';
import { SeasonHypePiece } from '../components/pitch/SeasonHypePiece';
import { PathsCards } from '../components/pitch/PathsCards';

// Static stat counts — sourced from engine output (5 seasons, 7 substrates, 55 classes across 5 seasons)
// TODO(drax): pull from seasons.json when star-lord delivers it
const STATS = [
  { label: 'Seasons', value: 5 },
  { label: 'Heroes', value: 55 },
  { label: 'Substrates', value: 7 },
];

export function Pitch() {
  return (
    <div className="bg-gray-950 text-gray-100 min-h-screen">
      {/* ─── 1. Headline + Hero of the Engine ─────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pt-10">
        {/* Page headline */}
        <h1 className="text-lg md:text-2xl font-semibold text-gray-100 leading-snug mb-1">
          Reincarnated — an LLM-authored seasonal ARPG
        </h1>
        <p className="text-sm text-gray-500 max-w-prose mb-10">
          A private preview surface for publisher conversations. Not a public marketing page.
        </p>
      </div>

      <HeroOfEngineSpotlight hero={HERO_OF_ENGINE} />

      {/* ─── 2. The Engine in One Paragraph ──────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-10 border-t border-gray-800">
        <p className="font-mono uppercase tracking-wide text-xs text-gray-500 mb-4">
          The engine
        </p>
        <p className="text-base leading-relaxed text-gray-300 max-w-prose mb-8">
          Eight Claude agents. A canonical-7 substrate set. An LLM that authors a new world every
          season — substrate vocabulary, cosmological slot-fills, hero names, monster mythos, gear
          pools, and a balance loop that runs until the fight mathematics converge. Mobile-feel
          target: Dungeon of Exile-class. Solo developer, hand-crafted engine, AI-augmented
          production operating under structured dispatch and review protocols.
        </p>

        {/* Three stat cards */}
        <div className="flex flex-wrap gap-4">
          {STATS.map(({ label, value }) => (
            <div
              key={label}
              className="bg-gray-900 border border-gray-800 rounded-lg px-5 py-3 min-h-[44px] flex items-center gap-3"
            >
              <span className="font-semibold tabular-nums text-xl text-gray-100">{value}</span>
              <span className="font-mono uppercase tracking-wide text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 3. Season Hype Pieces ────────────────────────────────────────── */}
      <section>
        <div className="max-w-6xl mx-auto px-4 pt-10">
          <p className="font-mono uppercase tracking-wide text-xs text-gray-500 mb-1">
            Season hype pieces
          </p>
          <p className="text-sm leading-relaxed text-gray-400 max-w-prose">
            Five canonical-7 seasons. Each world is authored end-to-end by the engine's LLM layer —
            substrate vocabulary, cosmological slot-fills, class names, and pair-rationale prose
            composed within the substrate grammar.
          </p>
        </div>

        {SEASONS.map((season) => (
          <SeasonHypePiece key={season.seasonId} season={season} />
        ))}
      </section>

      {/* ─── 4. The Hive ─────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-10 border-t border-gray-800">
        <p className="font-mono uppercase tracking-wide text-xs text-gray-500 mb-4">
          The hive
        </p>
        <p className="text-base leading-relaxed text-gray-300 max-w-prose">
          Reincarnated is built by an agentic engineering team — eight Claude agents with scoped
          seams, structured dispatches, gated reviews, and a hive-mind operating protocol. The team
          has shipped a stable engine, five canonical seasons, a mobile-playable demo, and this
          analytics surface. The agentic workflow is a production methodology, not a content
          authorship shortcut: the design, balance, and creative direction are hand-crafted; the LLM
          accelerates production within those rails.
        </p>
      </section>

      {/* ─── 5. Paths and Conversations ──────────────────────────────────── */}
      <PathsCards />

      {/* ─── Transparency disclosure (appended before global footer) ─────── */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <p className="font-mono uppercase tracking-wide text-[9px] text-gray-700 leading-relaxed max-w-prose">
          Hero portraits generated by OpenAI GPT Image 2 from engine-authored substrate identity +
          per-season LLM cosmology. Art direction: human-curated. No AI-generated text in shipped
          product surfaces.
        </p>
      </div>
    </div>
  );
}
