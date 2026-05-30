// /pitch — Summary page
// Structured per sprint dispatch § 6.2 sections:
//   1. Headline + Hero of the Engine spotlight
//   2. The Engine in One Paragraph + stat cards
//   3. Cycle 14 — Season 002 Marquee (Season of the Ironsoil Wide-Front)
//   4. The team paragraph
//   5. Paths and Conversations
// Footer: handled by App.tsx global footer + transparency disclosure rendered here
//
// Season filter: Summary page shows ONLY cycle-14-wave-5-season-002.
// Seasons 001 and 003 remain accessible via /loadout, /sample, /analytics, /encounters.
// Historical seasons section removed from Summary (kept data in pitchData.ts for other routes).
//
// Marquee layout: 4 faction sections with group portraits + per-kit individuals.
// Images: public/pitch/season_002/factions/{cluster_id}_group.png
//         public/pitch/season_002/kits/{kit_id}.png
// Image gen: drax cascade-r4-v1-season-002-marquee-reshape session (4 group + 12 individual)
// Hero of Season: Crushguard of the Shattered Gate (season_001 cluster 3 — curated marquee hero)
//                 Retained per KR dispatch out-of-scope clause; substrate-honest showcase.
// TODO(drax): Phase 2 — swap HeroPortraitPlaceholder for <img> using heroes-manifest.json

import { HERO_OF_ENGINE } from '../data/pitch/pitchData';
import { CYCLE14_SEASON_002 } from '../data/cycle14SeasonData';
import { HeroOfEngineSpotlight } from '../components/pitch/HeroOfEngineSpotlight';
import { PathsCards } from '../components/pitch/PathsCards';
import { Season002Marquee } from '../components/Cycle14/Season002Marquee';

// Static stat counts — sourced from engine output (5 seasons, 7 substrates)
// TODO(drax): pull from seasons.json when star-lord delivers it
const STATS = [
  { label: 'Seasons', value: 5 },
  { label: 'Substrates', value: 7 },
];

export function Pitch() {
  return (
    <div className="bg-gray-950 text-gray-100 min-h-screen">
      {/* ─── 1. Headline + Hero of the Engine ─────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pt-10">
        {/* Page headline */}
        <h1 className="text-lg md:text-2xl font-semibold text-gray-100 leading-snug mb-1">
          Summary (internal)
        </h1>
        <p className="text-sm text-gray-500 max-w-prose mb-6">
          A snapshot of what the engine has built so far — substrate identities, per-season worlds, the team running it. Internal preview; notes shared with informed readers.
        </p>

        {/* Working-title experiment — playable-concept name, dynamically populated from Hero of the Engine */}
        <div className="mb-4 border-l-2 border-amber-700/40 pl-4 max-w-prose">
          <p className="font-mono uppercase tracking-wide text-[10px] text-gray-500 mb-1.5">
            Working title — playable concept
          </p>
          <p className="text-base text-gray-200 leading-snug mb-2 italic">
            This Week I Was Re-incarnated as a{' '}
            <span className="not-italic font-semibold text-gray-100">{HERO_OF_ENGINE.className}</span>.
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            The fill-in-the-blank rotates per season — the engine's per-season Hero of the Engine selection populates the title each cycle.
          </p>
        </div>

        {/* Live demo link — paired callout (same visual register) for the playable thing */}
        <div className="mb-10 border-l-2 border-amber-700/40 pl-4 max-w-prose">
          <p className="font-mono uppercase tracking-wide text-[10px] text-gray-500 mb-1.5">
            Live playable demo
          </p>
          <p className="text-base mb-2 leading-snug">
            <a
              href="https://reincarnated-demo.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-100 hover:text-amber-200 underline underline-offset-2 transition-colors font-medium"
            >
              → reincarnated-demo.vercel.app
            </a>
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Best on PC — for mobile, open the link in your phone's browser, then add it to your homescreen as a web app for full-screen play.
          </p>
        </div>
      </div>

      <HeroOfEngineSpotlight hero={HERO_OF_ENGINE} />

      {/* ─── 2. The Engine in One Paragraph ──────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-10 border-t border-gray-800">
        <p className="font-mono uppercase tracking-wide text-xs text-gray-500 mb-4">
          The engine
        </p>
        <p className="text-base leading-relaxed text-gray-300 max-w-prose mb-8">
          An engine that generates a complete fantasy world per season — substrate vocabulary,
          cosmological slot-fills, class names, monster mythos, gear pools, and a balance loop that
          runs until the fight math converges. Built by one developer working with a small team of
          Claude agents under structured dispatches. Mobile-feel target: Dungeon-of-Exile-class.
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

      {/* ─── 3. Season 002 Marquee — Season of the Ironsoil Wide-Front ─────── */}
      <section className="border-t border-gray-800">
        <Season002Marquee season={CYCLE14_SEASON_002} />
      </section>

      {/* ─── 4. The team ─────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-10 border-t border-gray-800">
        <p className="font-mono uppercase tracking-wide text-xs text-gray-500 mb-4">
          The team
        </p>
        <p className="text-base leading-relaxed text-gray-300 max-w-prose">
          I work with a small team of Claude agents on this — each scoped to a specific seam of the
          codebase (generation, simulation, telemetry, UI, design, QA, research, coordination). I
          author the dispatches; the agents implement, test, and iterate within structured rails.
          So far they've helped me ship the engine, five seasons, a mobile-playable demo, and the
          loadout app you're reading this on. Design, balance, and creative direction are
          hand-authored. The LLM accelerates production inside those rails — it doesn't write the
          rails.
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
