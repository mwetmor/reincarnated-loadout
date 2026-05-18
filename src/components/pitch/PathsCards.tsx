// PathsCards — three commercial paths + contact surface.
// Per dispatch § 6.2.5.

const PATHS = [
  {
    label: 'Engine-as-tool licensing',
    description:
      'Could the per-season cosmology generator + substrate engine be useful to live-service studios that need fresh seasonal thematic content at scale? Potentially an API layer for seasonal ARPGs or dungeon-loop mobile titles.',
  },
  {
    label: 'Mobile-first indie ship',
    description:
      'Reincarnated as a real product — solo-developed mobile ARPG, mobile-feel-target Dungeon-of-Exile-class, seasonal live-service model. Likely needs a publisher partnership for distribution and localization.',
  },
  {
    label: 'Platform-deal exploration',
    description:
      'Apple Arcade and Netflix Games subscription portfolios favor deep replayable seasonal titles without F2P monetization pressure. Worth exploring whether the seasonal-novelty hook fits a platform-exclusivity window.',
  },
];

export function PathsCards() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-10 border-t border-gray-800">
      <p className="font-mono uppercase tracking-wide text-xs text-gray-500 mb-1">
        Directions
      </p>
      <p className="text-sm leading-relaxed text-gray-400 mb-8 max-w-prose">
        Three directions I'm thinking about. Not committed to any yet — looking for honest reads.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {PATHS.map((path) => (
          <div
            key={path.label}
            className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-4"
          >
            <p className="font-mono uppercase tracking-wide text-[10px] text-gray-500 mb-2">
              {path.label}
            </p>
            <p className="text-sm leading-relaxed text-gray-300">
              {path.description}
            </p>
          </div>
        ))}
      </div>

      {/* Contact line */}
      <div className="flex items-center gap-2 min-h-[44px]">
        <span className="font-mono uppercase tracking-wide text-[10px] text-gray-500">Contact</span>
        <a
          href="mailto:mhwetmore@gmail.com"
          className="text-sm text-gray-400 hover:text-gray-200 transition-colors underline underline-offset-2"
        >
          mhwetmore@gmail.com
        </a>
      </div>
    </section>
  );
}
