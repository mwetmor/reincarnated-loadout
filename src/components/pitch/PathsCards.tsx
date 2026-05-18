// PathsCards — three commercial paths + contact surface.
// Per dispatch § 6.2.5.

const PATHS = [
  {
    label: 'Engine-as-tool licensing',
    description:
      'The substrate engine, seasonal content generator, and balance loop available as an API layer for live-service studios building seasonal ARPGs or dungeon-loop mobile titles.',
  },
  {
    label: 'Mobile-first indie ship',
    description:
      'A publisher partnership path: Reincarnated ships as a solo-developer mobile ARPG with publisher distribution, localization, and UA support. Dungeon of Exile-class feel target; seasonal live-service model.',
  },
  {
    label: 'Platform deal exploration',
    description:
      'Apple Arcade and Netflix Games operate subscription-model portfolios that favor deep, replayable seasonal titles without premium monetization pressure. The engine\'s LLM-driven seasonal content is a natural fit for platform-exclusivity windows.',
  },
];

export function PathsCards() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-10 border-t border-gray-800">
      <p className="font-mono uppercase tracking-wide text-xs text-gray-500 mb-1">
        Paths and conversations
      </p>
      <p className="text-sm leading-relaxed text-gray-400 mb-8 max-w-prose">
        Three conversations are open. This is a private preview surface, not a public marketing page.
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
